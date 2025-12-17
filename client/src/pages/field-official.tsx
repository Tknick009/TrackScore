import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, User, ChevronRight, Check, X, Minus, Loader2 } from "lucide-react";
import type { 
  FieldEventSession, 
  FieldEventSessionWithDetails,
  FieldEventAthlete, 
  FieldEventMark,
  InsertFieldEventMark,
  Event,
  Athlete,
  Entry
} from "@shared/schema";

const SESSION_STORAGE_KEY = "field-official-session-id";

type EnrichedAthlete = FieldEventAthlete & { 
  entry?: Entry; 
  athlete?: Athlete;
};

function JoinSession({ 
  onJoin, 
  initialCode 
}: { 
  onJoin: (sessionId: number) => void; 
  initialCode?: string;
}) {
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState(initialCode || "");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (accessCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Access code must be 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`/api/field-sessions/access/${accessCode.toUpperCase()}`);
      if (!response.ok) {
        throw new Error("Session not found");
      }
      const session: FieldEventSession = await response.json();
      sessionStorage.setItem(SESSION_STORAGE_KEY, String(session.id));
      onJoin(session.id);
      toast({ title: "Joined session successfully" });
    } catch (error) {
      toast({
        title: "Failed to join",
        description: "Invalid access code or session not found",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      handleJoin();
    }
  }, [initialCode]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Field Official Entry</CardTitle>
          <p className="text-muted-foreground mt-2">
            Enter the 6-character access code to join a field event session
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Input
            placeholder="ACCESS CODE"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 6))}
            className="text-center text-2xl tracking-widest font-mono h-16"
            maxLength={6}
            data-testid="input-access-code"
          />
          <Button
            onClick={handleJoin}
            disabled={accessCode.length !== 6 || isJoining}
            className="w-full h-14 text-lg"
            data-testid="button-join-session"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Session"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AthleteCard({ 
  athlete, 
  isUp 
}: { 
  athlete: EnrichedAthlete; 
  isUp?: boolean;
}) {
  const athleteData = athlete.athlete;
  const bibNumber = athleteData?.bibNumber || "-";
  const name = athleteData 
    ? `${athleteData.firstName} ${athleteData.lastName}` 
    : "Unknown Athlete";

  return (
    <Card className={isUp ? "border-2 border-primary bg-primary/5" : ""}>
      <CardContent className={`p-4 ${isUp ? "py-6" : "py-3"}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`flex items-center justify-center rounded-full bg-muted ${isUp ? "w-14 h-14" : "w-10 h-10"}`}>
              <User className={isUp ? "h-7 w-7" : "h-5 w-5"} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold truncate ${isUp ? "text-xl" : "text-base"}`} data-testid={`text-athlete-name-${athlete.id}`}>
                {isUp && <span className="text-primary mr-2">UP:</span>}
                {name}
              </p>
              {athlete.entry && (
                <p className="text-muted-foreground text-sm truncate">
                  Flight {athlete.flightNumber} • Order {athlete.orderInFlight}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${isUp ? "text-lg px-3 py-1" : ""}`}>
            #{bibNumber}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldEntryUI({ 
  sessionId, 
  onLeave 
}: { 
  sessionId: number; 
  onLeave: () => void;
}) {
  const { toast } = useToast();
  const [measurement, setMeasurement] = useState("");

  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery<FieldEventSessionWithDetails>({
    queryKey: ["/api/field-sessions", sessionId, "full"],
    refetchInterval: 5000,
  });

  const { data: athletes, isLoading: athletesLoading } = useQuery<EnrichedAthlete[]>({
    queryKey: ["/api/field-sessions", sessionId, "athletes"],
    refetchInterval: 5000,
    enabled: !!session,
  });

  const { data: marks } = useQuery<FieldEventMark[]>({
    queryKey: ["/api/field-sessions", sessionId, "marks"],
    refetchInterval: 5000,
    enabled: !!session,
  });

  const submitMarkMutation = useMutation({
    mutationFn: async (mark: InsertFieldEventMark) => 
      apiRequest("/api/field-marks", "POST", mark),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/field-sessions", sessionId, "marks"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/field-sessions", sessionId, "athletes"] 
      });
      setMeasurement("");
      toast({ title: "Mark recorded" });
    },
    onError: () => {
      toast({
        title: "Failed to record mark",
        variant: "destructive",
      });
    },
  });

  const handleLeave = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    onLeave();
  };

  if (sessionLoading || athletesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load session</p>
            <Button onClick={handleLeave} variant="outline" data-testid="button-leave-error">
              Return to Join
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAthletes = athletes?.filter(
    (a) => a.checkInStatus === "checked_in" && a.competitionStatus !== "completed"
  ) || [];
  
  const sortedAthletes = [...activeAthletes].sort((a, b) => {
    if (a.flightNumber !== b.flightNumber) {
      return (a.flightNumber || 1) - (b.flightNumber || 1);
    }
    return a.orderInFlight - b.orderInFlight;
  });

  const currentAthlete = sortedAthletes.find(a => a.competitionStatus === "up") || sortedAthletes[0];
  const onDeck = sortedAthletes.filter(a => a.id !== currentAthlete?.id).slice(0, 2);

  const getAthleteAttemptCount = (athleteId: number) => {
    return marks?.filter(m => m.athleteId === athleteId).length || 0;
  };

  const eventName = session.event?.name || "Field Event";
  const totalFlights = Math.max(...(athletes?.map(a => a.flightNumber || 1) || [1]));
  const currentFlight = session.currentFlightNumber || 1;

  const totalAttempts = session.totalAttempts || 6;
  const currentAttemptCount = currentAthlete 
    ? getAthleteAttemptCount(currentAthlete.id) 
    : 0;
  const nextAttemptNumber = currentAttemptCount + 1;

  const recordMark = (markType: "mark" | "foul" | "pass") => {
    if (!currentAthlete) return;

    const markData: InsertFieldEventMark = {
      sessionId,
      athleteId: currentAthlete.id,
      attemptNumber: nextAttemptNumber,
      markType,
      measurement: markType === "mark" && measurement 
        ? parseFloat(measurement) 
        : undefined,
    };

    submitMarkMutation.mutate(markData);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate" data-testid="text-event-name">
              {eventName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="secondary" data-testid="badge-flight-info">
                Flight {currentFlight} of {totalFlights}
              </Badge>
              <Badge 
                variant={session.status === "in_progress" ? "default" : "outline"}
                data-testid="badge-session-status"
              >
                {session.status === "in_progress" ? "In Progress" : session.status}
              </Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLeave}
            className="shrink-0"
            data-testid="button-leave-session"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-auto">
        {currentAthlete ? (
          <>
            <div>
              <AthleteCard athlete={currentAthlete} isUp />
              <p className="text-center text-muted-foreground mt-2" data-testid="text-attempt-info">
                Attempt {nextAttemptNumber} of {totalAttempts}
              </p>
            </div>

            {onDeck.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="h-4 w-4" />
                  Up Next
                </p>
                {onDeck.map((athlete, index) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))}
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg">
                No athletes currently active
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Waiting for athletes to be queued...
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {currentAthlete && (
        <footer className="border-t bg-card p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Enter measurement (m)"
              value={measurement}
              onChange={(e) => setMeasurement(e.target.value)}
              className="h-14 text-xl text-center font-mono"
              data-testid="input-measurement"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => recordMark("mark")}
              disabled={!measurement || submitMarkMutation.isPending}
              className="h-16 text-lg"
              data-testid="button-record-mark"
            >
              <Check className="h-5 w-5 mr-2" />
              Mark
            </Button>
            <Button
              variant="destructive"
              onClick={() => recordMark("foul")}
              disabled={submitMarkMutation.isPending}
              className="h-16 text-lg"
              data-testid="button-record-foul"
            >
              <X className="h-5 w-5 mr-2" />
              Foul
            </Button>
            <Button
              variant="secondary"
              onClick={() => recordMark("pass")}
              disabled={submitMarkMutation.isPending}
              className="h-16 text-lg"
              data-testid="button-record-pass"
            >
              <Minus className="h-5 w-5 mr-2" />
              Pass
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function FieldOfficialPage() {
  const [, params] = useRoute("/field/:accessCode");
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    const storedId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedId) {
      setSessionId(parseInt(storedId, 10));
    }
  }, []);

  const handleJoin = (id: number) => {
    setSessionId(id);
  };

  const handleLeave = () => {
    setSessionId(null);
  };

  if (sessionId) {
    return <FieldEntryUI sessionId={sessionId} onLeave={handleLeave} />;
  }

  return <JoinSession onJoin={handleJoin} initialCode={params?.accessCode} />;
}
