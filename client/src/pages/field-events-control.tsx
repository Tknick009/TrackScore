import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMeet } from "@/contexts/MeetContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Copy,
  ExternalLink,
  Settings,
  Trash2,
  Play,
  Loader2,
  Target,
  CheckCircle2,
  Clock,
  Users,
  Download,
  FolderOpen,
  Save,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import type {
  Event,
  FieldEventSession,
  FieldEventSessionWithDetails,
  InsertFieldEventSession,
  FieldEventAthlete,
} from "@shared/schema";
import { isHeightEvent, isDistanceEvent } from "@shared/schema";

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return <Badge className="bg-green-600 text-white">In Progress</Badge>;
    case "check_in":
      return <Badge className="bg-blue-600 text-white">Check-In</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "setup":
    default:
      return <Badge variant="outline">Setup</Badge>;
  }
}

function isFieldEvent(eventType: string): boolean {
  return isHeightEvent(eventType) || isDistanceEvent(eventType);
}

function isWindAffectedFieldEvent(eventType: string): boolean {
  return eventType === "long_jump" || eventType === "triple_jump";
}

interface EVTEventSummary {
  eventNumber: number;
  eventName: string;
  athleteCount: number;
}

interface EVTAthlete {
  bibNumber: string;
  order: number;
  lastName: string;
  firstName: string;
  team: string;
  flight: number;
}

interface CheckInAthleteState {
  bibNumber: string;
  firstName: string;
  lastName: string;
  team: string;
  flight: number;
  status: "checked_in" | "dns";
}

interface SessionCardProps {
  session: FieldEventSessionWithDetails;
  athletes: FieldEventAthlete[];
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
  onExportLFF: () => void;
}

function SessionCard({ session, athletes, onEdit, onDelete, onUpdateStatus, onExportLFF }: SessionCardProps) {
  const { toast } = useToast();
  // Use database event name if available, otherwise use EVT event name
  const eventName = session.event?.name || session.evtEventName || "Unknown Event";
  const checkedInCount = athletes.filter(a => a.checkInStatus === "checked_in").length;
  const totalAthletes = athletes.length;

  const copyAccessCode = () => {
    if (session.accessCode) {
      navigator.clipboard.writeText(session.accessCode);
      toast({ title: "Access code copied!" });
    }
  };

  const getProgressText = () => {
    if (session.status === "setup") return "Not started";
    if (session.status === "check_in") return `${checkedInCount} of ${totalAthletes} checked in`;
    if (session.status === "completed") return "Event completed";
    
    const flightText = `Flight ${session.currentFlightNumber || 1}`;
    const attemptText = isHeightEvent(session.event?.eventType || "")
      ? `Height ${(session.currentHeightIndex || 0) + 1}`
      : `Attempt ${session.currentAttemptNumber || 1} of ${session.totalAttempts || 6}`;
    return `${flightText}, ${attemptText}`;
  };

  return (
    <Card data-testid={`card-session-${session.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-lg" data-testid={`text-session-event-${session.id}`}>
                {eventName}
              </h3>
              {getStatusBadge(session.status || "setup")}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Access Code:</span>
              <code className="bg-muted px-2 py-0.5 rounded font-mono font-bold" data-testid={`text-access-code-${session.id}`}>
                {session.accessCode || "N/A"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={copyAccessCode}
                data-testid={`button-copy-code-${session.id}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span data-testid={`text-athletes-${session.id}`}>
                  {checkedInCount} checked in
                </span>
              </div>
              <span>|</span>
              <span data-testid={`text-progress-${session.id}`}>{getProgressText()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            asChild
            data-testid={`button-view-standings-${session.id}`}
          >
            <a href={`/field/${session.accessCode}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Standings
            </a>
          </Button>

          {session.status === "setup" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateStatus("check_in")}
              data-testid={`button-start-checkin-${session.id}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Start Check-In
            </Button>
          )}

          {session.status === "check_in" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onUpdateStatus("in_progress")}
              data-testid={`button-start-event-${session.id}`}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Event
            </Button>
          )}

          {session.status === "in_progress" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateStatus("completed")}
              data-testid={`button-complete-event-${session.id}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            data-testid={`button-edit-session-${session.id}`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Config
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportLFF}
            data-testid={`button-export-lff-${session.id}`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export LFF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            data-testid={`button-delete-session-${session.id}`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            End Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  athletes: CheckInAthleteState[];
  onAthleteStatusChange: (bibNumber: string, status: "checked_in" | "dns") => void;
  onStartEvent: () => void;
  isPending: boolean;
}

function CheckInDialog({
  open,
  onOpenChange,
  eventName,
  athletes,
  onAthleteStatusChange,
  onStartEvent,
  isPending,
}: CheckInDialogProps) {
  const checkedInCount = athletes.filter(a => a.status === "checked_in").length;
  const totalCount = athletes.length;

  // Group athletes by flight
  const athletesByFlight = athletes.reduce((acc, athlete) => {
    const flight = athlete.flight || 1;
    if (!acc[flight]) acc[flight] = [];
    acc[flight].push(athlete);
    return acc;
  }, {} as Record<number, CheckInAthleteState[]>);
  
  const flightNumbers = Object.keys(athletesByFlight).map(Number).sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle data-testid="text-checkin-dialog-title">
            {eventName} - Check In
          </DialogTitle>
          <DialogDescription>
            Mark athletes as checked in or DNS (Did Not Start)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            {flightNumbers.map(flightNum => (
              <div key={flightNum} className="space-y-2">
                <h3 className="font-semibold text-sm bg-muted px-3 py-2 rounded-md sticky top-0 z-10">
                  Flight {flightNum} ({athletesByFlight[flightNum].length} athletes)
                </h3>
                <div className="space-y-2">
                  {athletesByFlight[flightNum].map((athlete, idx) => (
                    <div
                      key={athlete.bibNumber || idx}
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                      data-testid={`row-athlete-${athlete.bibNumber}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <code className="bg-background px-2 py-1 rounded font-mono text-sm font-bold min-w-[60px] text-center">
                          {athlete.bibNumber || "-"}
                        </code>
                        <span className="font-medium truncate">
                          {athlete.firstName} {athlete.lastName}
                        </span>
                        <span className="text-muted-foreground text-sm truncate">
                          {athlete.team}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={athlete.status === "checked_in" ? "default" : "outline"}
                          onClick={() => onAthleteStatusChange(athlete.bibNumber, "checked_in")}
                          data-testid={`button-checkin-${athlete.bibNumber}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          In
                        </Button>
                        <Button
                          size="sm"
                          variant={athlete.status === "dns" ? "destructive" : "outline"}
                          onClick={() => onAthleteStatusChange(athlete.bibNumber, "dns")}
                          data-testid={`button-dns-${athlete.bibNumber}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          DNS
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground" data-testid="text-checkin-count">
              {checkedInCount} of {totalCount} checked in
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-checkin">
                Cancel
              </Button>
              <Button
                onClick={onStartEvent}
                disabled={isPending}
                data-testid="button-start-event-checkin"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Event
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FieldEventsControl() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [editingSession, setEditingSession] = useState<FieldEventSession | null>(null);
  const [evtDirectoryPath, setEvtDirectoryPath] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedEvtEvent, setSelectedEvtEvent] = useState<EVTEventSummary | null>(null);
  const [checkInAthletes, setCheckInAthletes] = useState<CheckInAthleteState[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<number | null>(null);

  const { data: evtConfig, isLoading: configLoading } = useQuery<{ directoryPath: string }>({
    queryKey: ["/api/evt-config"],
    queryFn: () => fetch("/api/evt-config").then(r => r.json()),
    staleTime: 0,
  });

  useEffect(() => {
    if (evtConfig?.directoryPath && !evtDirectoryPath) {
      setEvtDirectoryPath(evtConfig.directoryPath);
    }
  }, [evtConfig?.directoryPath]);

  const { data: evtEventsData, isLoading: evtEventsLoading, refetch: refetchEvtEvents } = useQuery<{ events: EVTEventSummary[] }>({
    queryKey: ["/api/evt-events"],
    queryFn: () => fetch("/api/evt-events").then(r => r.json()),
    enabled: !!evtConfig?.directoryPath,
    refetchInterval: 5000,
  });

  const evtEvents = evtEventsData?.events || [];

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json()),
    enabled: !!currentMeetId,
  });

  const fieldEvents = useMemo(() => 
    events.filter(e => isFieldEvent(e.eventType)),
    [events]
  );

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<FieldEventSessionWithDetails[]>({
    queryKey: ["/api/field-sessions"],
    queryFn: async () => {
      const response = await fetch("/api/field-sessions");
      if (!response.ok) return [];
      const allSessions: FieldEventSession[] = await response.json();
      // Enrich sessions with event data where available
      return allSessions.map(session => {
        const eventData = session.eventId ? events.find(e => e.id === session.eventId) : undefined;
        return { ...session, event: eventData } as FieldEventSessionWithDetails;
      });
    },
    refetchInterval: 10000,
  });

  const { data: athletesBySession } = useQuery<Record<number, FieldEventAthlete[]>>({
    queryKey: ["/api/field-athletes", "bySession", sessions.map(s => s.id).join(",")],
    queryFn: async () => {
      const result: Record<number, FieldEventAthlete[]> = {};
      for (const session of sessions) {
        const response = await fetch(`/api/field-sessions/${session.id}/athletes`);
        if (response.ok) {
          result[session.id] = await response.json();
        } else {
          result[session.id] = [];
        }
      }
      return result;
    },
    enabled: sessions.length > 0,
    refetchInterval: 10000,
  });

  const handleSaveEvtConfig = async () => {
    setIsSavingConfig(true);
    try {
      await apiRequest("POST", "/api/evt-config", { directoryPath: evtDirectoryPath });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-events"] });
      toast({ title: "EVT directory path saved" });
    } catch (error: any) {
      toast({
        title: "Failed to save config",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleOpenEvent = async (evtEvent: EVTEventSummary) => {
    try {
      const response = await fetch(`/api/evt-events/${evtEvent.eventNumber}/athletes`);
      if (!response.ok) throw new Error("Failed to load athletes");
      
      const data = await response.json();
      const athletes: EVTAthlete[] = data.athletes || [];
      
      setCheckInAthletes(athletes.map(a => ({
        bibNumber: a.bibNumber,
        firstName: a.firstName,
        lastName: a.lastName,
        team: a.team,
        flight: a.flight || 1,
        status: "checked_in" as const,
      })));
      
      setSelectedEvtEvent(evtEvent);
      setCheckInDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to load athletes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAthleteStatusChange = (bibNumber: string, status: "checked_in" | "dns") => {
    setCheckInAthletes(prev =>
      prev.map(a => a.bibNumber === bibNumber ? { ...a, status } : a)
    );
  };

  const handleStartEventFromCheckIn = async () => {
    if (!selectedEvtEvent || !currentMeetId) return;
    
    setIsCreatingSession(true);
    try {
      const accessCode = generateAccessCode();
      const sessionData: InsertFieldEventSession = {
        eventId: null,  // EVT-based sessions don't need a database event ID
        status: "check_in",
        measurementUnit: "metric",
        recordWind: false,
        hasFinals: false,
        prelimAttempts: 3,
        finalsAttempts: 3,
        athletesToFinals: 8,
        totalAttempts: 6,
        accessCode,
        evtEventNumber: selectedEvtEvent.eventNumber,
        evtEventName: selectedEvtEvent.eventName,
      };
      
      const sessionResponse = await apiRequest("POST", "/api/field-sessions", sessionData);
      const session = await sessionResponse.json();
      setCreatedSessionId(session.id);
      
      for (const athlete of checkInAthletes) {
        await apiRequest("POST", `/api/field-sessions/${session.id}/athletes`, {
          sessionId: session.id,
          flightNumber: 1,
          orderInFlight: checkInAthletes.indexOf(athlete) + 1,
          checkInStatus: athlete.status,
          competitionStatus: athlete.status === "dns" ? "dns" : "waiting",
          evtBibNumber: athlete.bibNumber,
          evtFirstName: athlete.firstName,
          evtLastName: athlete.lastName,
          evtTeam: athlete.team,
        });
      }
      
      await apiRequest("PATCH", `/api/field-sessions/${session.id}`, { status: "in_progress" });
      
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
      
      setCheckInDialogOpen(false);
      setSelectedEvtEvent(null);
      setCheckInAthletes([]);
      
      toast({ title: "Event started successfully" });
      
      window.open(`/field/${accessCode}`, "_blank");
    } catch (error: any) {
      toast({
        title: "Failed to start event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertFieldEventSession> }) =>
      apiRequest("PATCH", `/api/field-sessions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
      setEditingSession(null);
      toast({ title: "Session updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/field-sessions/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
      toast({ title: "Session ended" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to end session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (sessionId: number, status: string) => {
    updateSessionMutation.mutate({ id: sessionId, data: { status } });
  };

  const handleExportLFF = async (session: FieldEventSessionWithDetails) => {
    try {
      const units = session.measurementUnit === 'english' ? 'english' : 'metric';
      const response = await fetch(`/api/field-sessions/${session.id}/lff?units=${units}`);
      if (!response.ok) {
        throw new Error('Failed to export LFF');
      }
      const content = await response.text();
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.eventId || 'event'}-1-1.lff`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "LFF file exported successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to export LFF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isLoading = eventsLoading || sessionsLoading;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Field Event Management</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            EVT Directory Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              placeholder="/path/to/lynx/evt/directory"
              value={evtDirectoryPath || evtConfig?.directoryPath || ""}
              onChange={(e) => setEvtDirectoryPath(e.target.value)}
              className="flex-1"
              data-testid="input-evt-directory"
            />
            <Button
              onClick={handleSaveEvtConfig}
              disabled={isSavingConfig}
              data-testid="button-save-evt-config"
            >
              {isSavingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetchEvtEvents()}
              data-testid="button-refresh-evt"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Set the directory path where FinishLynx EVT files are stored. Events will be automatically detected.
          </p>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Sessions
          </h2>
          <div className="space-y-3">
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                athletes={athletesBySession?.[session.id] || []}
                onEdit={() => setEditingSession(session)}
                onDelete={() => deleteSessionMutation.mutate(session.id)}
                onUpdateStatus={(status) => handleUpdateStatus(session.id, status)}
                onExportLFF={() => handleExportLFF(session)}
              />
            ))}
          </div>
        </div>
      )}

      {evtEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            EVT Events ({evtEvents.length})
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {evtEvents.map((evt) => (
                  <li
                    key={evt.eventNumber}
                    className="flex items-center justify-between gap-4 p-4"
                    data-testid={`item-evt-event-${evt.eventNumber}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="font-mono min-w-[40px] justify-center">
                        {evt.eventNumber}
                      </Badge>
                      <span className="font-medium">{evt.eventName}</span>
                      <span className="text-sm text-muted-foreground">
                        {evt.athleteCount} athletes
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenEvent(evt)}
                      data-testid={`button-open-event-${evt.eventNumber}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Open Event
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {!evtConfig?.directoryPath && evtEvents.length === 0 && sessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configure EVT Directory</h3>
            <p className="text-muted-foreground">
              Set the EVT directory path above to load field events from FinishLynx.
            </p>
          </CardContent>
        </Card>
      )}

      {evtConfig?.directoryPath && evtEvents.length === 0 && sessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No EVT Files Found</h3>
            <p className="text-muted-foreground">
              No .evt files found in the configured directory. Make sure FinishLynx is exporting EVT files to this location.
            </p>
          </CardContent>
        </Card>
      )}

      <CheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        eventName={selectedEvtEvent?.eventName || ""}
        athletes={checkInAthletes}
        onAthleteStatusChange={handleAthleteStatusChange}
        onStartEvent={handleStartEventFromCheckIn}
        isPending={isCreatingSession}
      />

      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Session Configuration</DialogTitle>
            <DialogDescription>
              Update the officiating session settings
            </DialogDescription>
          </DialogHeader>

          {editingSession && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Measurement Unit</Label>
                <Select
                  value={editingSession.measurementUnit || "metric"}
                  onValueChange={(val) => setEditingSession({ ...editingSession, measurementUnit: val })}
                >
                  <SelectTrigger data-testid="select-edit-measurement-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (meters)</SelectItem>
                    <SelectItem value="english">English (feet-inches)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="edit-record-wind">Record Wind</Label>
                <Switch
                  id="edit-record-wind"
                  checked={editingSession.recordWind || false}
                  onCheckedChange={(val) => setEditingSession({ ...editingSession, recordWind: val })}
                  data-testid="switch-edit-record-wind"
                />
              </div>

              <div className="space-y-2">
                <Label>Total Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={editingSession.totalAttempts || 6}
                  onChange={(e) => setEditingSession({ 
                    ...editingSession, 
                    totalAttempts: parseInt(e.target.value) || 6 
                  })}
                  data-testid="input-edit-total-attempts"
                />
              </div>

              <div className="space-y-2">
                <Label>LFF Auto-Export Path</Label>
                <Input
                  type="text"
                  placeholder="/path/to/export/directory"
                  value={editingSession.lffExportPath || ""}
                  onChange={(e) => setEditingSession({ 
                    ...editingSession, 
                    lffExportPath: e.target.value || null
                  })}
                  data-testid="input-edit-lff-export-path"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to disable auto-export. When set, LFF files will be automatically exported after every mark change.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingSession) {
                  updateSessionMutation.mutate({
                    id: editingSession.id,
                    data: {
                      measurementUnit: editingSession.measurementUnit,
                      recordWind: editingSession.recordWind,
                      totalAttempts: editingSession.totalAttempts,
                      lffExportPath: editingSession.lffExportPath,
                    },
                  });
                }
              }}
              disabled={updateSessionMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateSessionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
