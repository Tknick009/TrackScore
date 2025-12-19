import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Menu, 
  ArrowLeft, 
  ChevronRight, 
  Loader2, 
  Check, 
  X, 
  Users,
  Play
} from "lucide-react";
import type { Meet, FieldEventSession } from "@shared/schema";

type AppScreen = "meet-entry" | "event-menu" | "check-in" | "officiating";

interface EVTEventSummary {
  eventNumber: number;
  eventName: string;
  athleteCount: number;
}

interface EVTAthlete {
  bibNumber: string;
  firstName: string;
  lastName: string;
  team: string;
  lane?: string;
}

interface CheckInStatus {
  [bibNumber: string]: "in" | "dns";
}

function MeetEntryScreen({ 
  onMeetSelected 
}: { 
  onMeetSelected: (meetId: string) => void;
}) {
  const [meetId, setMeetId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!meetId.trim()) {
      toast({
        title: "Enter Meet ID",
        description: "Please enter a valid meet ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/meets/${meetId}`);
      if (!response.ok) {
        throw new Error("Meet not found");
      }
      const meet: Meet = await response.json();
      onMeetSelected(meet.id);
      toast({ title: `Loaded: ${meet.name}` });
    } catch (error) {
      toast({
        title: "Meet not found",
        description: "Please check the meet ID and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Field Events</CardTitle>
          <p className="text-muted-foreground mt-2">
            Enter the Meet ID to get started
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Input
            placeholder="Meet ID"
            value={meetId}
            onChange={(e) => setMeetId(e.target.value.trim())}
            className="text-center text-lg h-14"
            data-testid="input-meet-id"
          />
          <Button
            onClick={handleSubmit}
            disabled={!meetId.trim() || isLoading}
            className="w-full h-14 text-lg"
            data-testid="button-enter-meet"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              "Enter Meet"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EventMenuScreen({ 
  meetId,
  onEventSelected,
  onBack
}: { 
  meetId: string;
  onEventSelected: (event: EVTEventSummary) => void;
  onBack: () => void;
}) {
  const { data: evtEventsData, isLoading } = useQuery<{ events: EVTEventSummary[] }>({
    queryKey: ["/api/evt-events"],
    refetchInterval: 10000,
  });

  const { data: meet } = useQuery<Meet>({
    queryKey: ["/api/meets", meetId],
  });

  const events = evtEventsData?.events || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="text-primary-foreground hover:bg-primary-foreground/20"
          data-testid="button-back-to-meet"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Select Event</h1>
          {meet && <p className="text-sm opacity-80">{meet.name}</p>}
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/20"
          data-testid="button-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No field events found</p>
            <p className="text-sm mt-1">Configure EVT directory in meet control</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event) => (
              <div
                key={event.eventNumber}
                onClick={() => onEventSelected(event)}
                className="flex items-center gap-3 p-4 cursor-pointer active:bg-muted/50 hover-elevate"
                data-testid={`event-row-${event.eventNumber}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">{event.eventNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{event.eventName}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.athleteCount} athlete{event.athleteCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckInScreen({
  meetId,
  event,
  onStartEvent,
  onBack
}: {
  meetId: string;
  event: EVTEventSummary;
  onStartEvent: (sessionId: number) => void;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>({});
  const [isStarting, setIsStarting] = useState(false);

  const { data: athletesData, isLoading } = useQuery<{ athletes: EVTAthlete[] }>({
    queryKey: ["/api/evt-events", event.eventNumber, "athletes"],
  });

  const athletes = athletesData?.athletes || [];

  useEffect(() => {
    if (athletes.length > 0) {
      const initial: CheckInStatus = {};
      athletes.forEach(a => {
        if (!checkInStatus[a.bibNumber]) {
          initial[a.bibNumber] = "in";
        }
      });
      setCheckInStatus(prev => ({ ...initial, ...prev }));
    }
  }, [athletes]);

  const toggleStatus = (bibNumber: string) => {
    setCheckInStatus(prev => ({
      ...prev,
      [bibNumber]: prev[bibNumber] === "in" ? "dns" : "in"
    }));
  };

  const checkedInCount = Object.values(checkInStatus).filter(s => s === "in").length;
  const dnsCount = Object.values(checkInStatus).filter(s => s === "dns").length;

  const handleStartEvent = async () => {
    setIsStarting(true);
    try {
      const checkedInAthletes = athletes.filter(a => checkInStatus[a.bibNumber] === "in");
      const dnsAthletes = athletes.filter(a => checkInStatus[a.bibNumber] === "dns");

      const response = await apiRequest("POST", "/api/field-sessions", {
        evtEventNumber: event.eventNumber,
        evtEventName: event.eventName,
        measurementUnit: "metric",
        status: "in_progress",
        totalAttempts: 6,
      });

      const session: FieldEventSession = await response.json();

      let orderInFlight = 1;
      for (const athlete of checkedInAthletes) {
        await apiRequest("POST", `/api/field-sessions/${session.id}/athletes`, {
          evtBibNumber: athlete.bibNumber,
          evtFirstName: athlete.firstName,
          evtLastName: athlete.lastName,
          evtTeam: athlete.team,
          checkInStatus: "checked_in",
          competitionStatus: "competing",
          flightNumber: 1,
          orderInFlight: orderInFlight++,
        });
      }

      for (const athlete of dnsAthletes) {
        await apiRequest("POST", `/api/field-sessions/${session.id}/athletes`, {
          evtBibNumber: athlete.bibNumber,
          evtFirstName: athlete.firstName,
          evtLastName: athlete.lastName,
          evtTeam: athlete.team,
          checkInStatus: "dns",
          competitionStatus: "dns",
          flightNumber: 1,
          orderInFlight: orderInFlight++,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
      toast({ title: "Event started successfully" });
      // Store meetId in sessionStorage for the Add Athlete search
      sessionStorage.setItem("field_app_meet_id", meetId);
      onStartEvent(session.id);
    } catch (error: any) {
      toast({
        title: "Failed to start event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-back-to-events"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Check-In</h1>
            <p className="text-sm opacity-80">{event.eventName}</p>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            {checkedInCount} In
          </span>
          <span className="flex items-center gap-1">
            <X className="h-4 w-4" />
            {dnsCount} DNS
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : athletes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No athletes found for this event</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {athletes.map((athlete) => {
              const status = checkInStatus[athlete.bibNumber] || "in";
              const isIn = status === "in";
              
              return (
                <div
                  key={athlete.bibNumber}
                  className="flex items-center gap-3 p-4"
                  data-testid={`checkin-athlete-${athlete.bibNumber}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {athlete.bibNumber}
                      </span>
                      <span className="font-semibold truncate">
                        {athlete.firstName} {athlete.lastName}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {athlete.team}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={isIn ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleStatus(athlete.bibNumber)}
                      className={isIn ? "bg-green-600 hover:bg-green-700" : ""}
                      data-testid={`button-checkin-${athlete.bibNumber}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      In
                    </Button>
                    <Button
                      variant={!isIn ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleStatus(athlete.bibNumber)}
                      className={!isIn ? "bg-red-600 hover:bg-red-700" : ""}
                      data-testid={`button-dns-${athlete.bibNumber}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      DNS
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <Button
          onClick={handleStartEvent}
          disabled={checkedInCount === 0 || isStarting}
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
          data-testid="button-start-event"
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Starting Event...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start Event ({checkedInCount} athletes)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function OfficiatingScreen({
  sessionId,
  onBack
}: {
  sessionId: number;
  onBack: () => void;
}) {
  useEffect(() => {
    window.location.href = `/field/${sessionId}`;
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function FieldApp() {
  const [screen, setScreen] = useState<AppScreen>("meet-entry");
  const [meetId, setMeetId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EVTEventSummary | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const handleMeetSelected = (id: string) => {
    setMeetId(id);
    setScreen("event-menu");
  };

  const handleEventSelected = (event: EVTEventSummary) => {
    setSelectedEvent(event);
    setScreen("check-in");
  };

  const handleStartEvent = (id: number) => {
    setSessionId(id);
    setScreen("officiating");
  };

  const handleBackToMeet = () => {
    setMeetId(null);
    setScreen("meet-entry");
  };

  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setScreen("event-menu");
  };

  switch (screen) {
    case "meet-entry":
      return <MeetEntryScreen onMeetSelected={handleMeetSelected} />;
    
    case "event-menu":
      return meetId ? (
        <EventMenuScreen 
          meetId={meetId} 
          onEventSelected={handleEventSelected}
          onBack={handleBackToMeet}
        />
      ) : null;
    
    case "check-in":
      return meetId && selectedEvent ? (
        <CheckInScreen
          meetId={meetId}
          event={selectedEvent}
          onStartEvent={handleStartEvent}
          onBack={handleBackToEvents}
        />
      ) : null;
    
    case "officiating":
      return sessionId ? (
        <OfficiatingScreen sessionId={sessionId} onBack={handleBackToEvents} />
      ) : null;
    
    default:
      return <MeetEntryScreen onMeetSelected={handleMeetSelected} />;
  }
}
