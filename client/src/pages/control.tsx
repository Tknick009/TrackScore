import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Event, Athlete, InsertEntry } from "@shared/schema";
import { TrackResultForm } from "@/components/track-result-form";
import { FieldResultForm } from "@/components/field-result-form";
import { ConnectionStatus } from "@/components/connection-status";
import { LynxConfigPanel } from "@/components/lynx-config-panel";
import { DataIngestionPanel } from "@/components/data-ingestion-panel";
import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  Search,
  ChevronRight,
  Monitor,
  Users,
  Timer,
  Target,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";

function isTrackEvent(eventType: string): boolean {
  const trackEvents = [
    "100m", "200m", "400m", "800m", "1500m", "3000m", "5000m", "10000m",
    "100m_hurdles", "110m_hurdles", "400m_hurdles", "3000m_steeplechase",
    "4x100m_relay", "4x400m_relay", "4x800m_relay"
  ];
  return trackEvents.some(t => eventType.toLowerCase().includes(t.replace('_', '')));
}

function getEventStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return <Badge className="bg-green-600 text-white">Live</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    default:
      return <Badge variant="outline">Scheduled</Badge>;
  }
}

export default function Control() {
  const { toast } = useToast();
  const { currentMeetId, currentMeet } = useMeet();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventSearch, setEventSearch] = useState("");

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes", currentMeetId],
    queryFn: currentMeetId
      ? () => fetch(`/api/athletes?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return events;
    const search = eventSearch.toLowerCase();
    return events.filter(e => 
      e.name.toLowerCase().includes(search) ||
      e.eventNumber?.toString().includes(search) ||
      e.eventType.toLowerCase().includes(search)
    );
  }, [events, eventSearch]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      if (a.status === "scheduled" && b.status === "completed") return -1;
      if (b.status === "scheduled" && a.status === "completed") return 1;
      return (a.eventNumber || 0) - (b.eventNumber || 0);
    });
  }, [filteredEvents]);

  const liveEvents = events.filter(e => e.status === "in_progress");

  useEffect(() => {
    setSelectedEvent(null);
  }, [currentMeetId]);

  useEffect(() => {
    if (!eventsLoading && events.length > 0 && !selectedEvent) {
      const inProgressEvent = events.find(e => e.status === "in_progress");
      const scheduledEvent = events.find(e => e.status === "scheduled");
      setSelectedEvent(inProgressEvent || scheduledEvent || events[0]);
    }
  }, [events, eventsLoading, selectedEvent]);

  useEffect(() => {
    if (selectedEvent) {
      const updatedEvent = events.find(e => e.id === selectedEvent.id);
      if (updatedEvent && (updatedEvent.status !== selectedEvent.status || updatedEvent.name !== selectedEvent.name)) {
        setSelectedEvent(updatedEvent);
      }
    }
  }, [events, selectedEvent]);

  const updateEventStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/events/${data.id}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", currentMeetId] });
      toast({ title: "Event status updated" });
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: InsertEntry) => apiRequest("POST", "/api/entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries", currentMeetId] });
      toast({ title: "Result recorded", description: "The result has been saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording result",
        description: error.message || "Failed to save result",
        variant: "destructive",
      });
    },
  });

  if (!currentMeetId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Select a Meet
            </CardTitle>
            <CardDescription>
              Choose a meet to start managing events and recording results
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <MeetSelector />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <MeetSelector />
          {liveEvents.length > 0 && (
            <Badge className="bg-green-600 text-white gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {liveEvents.length} Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <Button variant="outline" size="sm" asChild>
            <Link href="/display" target="_blank" data-testid="link-open-display-header">
              <Monitor className="w-4 h-4 mr-2" />
              Display
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="pl-9"
                data-testid="input-event-search"
              />
            </div>
          </div>
          
          <div className="p-3 border-b">
            <LynxConfigPanel meetId={currentMeetId} />
          </div>

          <div className="p-3 border-b">
            <DataIngestionPanel meetId={currentMeetId} />
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {eventsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading events...
                </div>
              ) : sortedEvents.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {eventSearch ? "No matching events" : "No events yet"}
                </div>
              ) : (
                sortedEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEvent?.id === event.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    data-testid={`button-event-${event.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isTrackEvent(event.eventType) ? (
                          <Timer className="w-4 h-4 shrink-0" />
                        ) : (
                          <Target className="w-4 h-4 shrink-0" />
                        )}
                        <span className="font-medium truncate">{event.name}</span>
                      </div>
                      {getEventStatusBadge(event.status)}
                    </div>
                    <div className={`text-xs mt-1 ${
                      selectedEvent?.id === event.id 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground"
                    }`}>
                      {event.eventTime && <span>{event.eventTime}</span>}
                      {event.eventNumber && (
                        <span className="ml-2">Event #{event.eventNumber}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedEvent ? (
            <div className="h-full flex items-center justify-center p-6">
              <Card className="max-w-md text-center">
                <CardContent className="pt-6">
                  <PlayCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Select an Event</h2>
                  <p className="text-muted-foreground">
                    Choose an event from the list to start recording results and managing the competition.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedEvent.name}</CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-1">
                        {selectedEvent.eventTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {selectedEvent.eventTime}
                          </span>
                        )}
                        {selectedEvent.eventNumber && (
                          <span>Event #{selectedEvent.eventNumber}</span>
                        )}
                        <span className="capitalize">{selectedEvent.gender}</span>
                      </CardDescription>
                    </div>
                    {getEventStatusBadge(selectedEvent.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedEvent.status === "in_progress" ? "default" : "outline"}
                      onClick={() => updateEventStatusMutation.mutate({ 
                        id: selectedEvent.id, 
                        status: "in_progress" 
                      })}
                      disabled={updateEventStatusMutation.isPending}
                      data-testid="button-start-event"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Event
                    </Button>
                    <Button
                      variant={selectedEvent.status === "completed" ? "default" : "outline"}
                      onClick={() => updateEventStatusMutation.mutate({ 
                        id: selectedEvent.id, 
                        status: "completed" 
                      })}
                      disabled={updateEventStatusMutation.isPending}
                      data-testid="button-complete-event"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Event
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Record Results
                  </CardTitle>
                  <CardDescription>
                    {isTrackEvent(selectedEvent.eventType) 
                      ? "Enter times and positions for track events"
                      : "Enter marks and attempts for field events"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isTrackEvent(selectedEvent.eventType) ? (
                    <TrackResultForm
                      eventId={selectedEvent.id}
                      athletes={athletes}
                      onSubmit={(data) => createEntryMutation.mutate(data)}
                      isPending={createEntryMutation.isPending}
                    />
                  ) : (
                    <FieldResultForm
                      eventId={selectedEvent.id}
                      athletes={athletes}
                      onSubmit={(data) => createEntryMutation.mutate(data)}
                      isPending={createEntryMutation.isPending}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
