import { useState, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const eventName = session.event?.name || "Unknown Event";
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

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableEvents: Event[];
  onSubmit: (data: InsertFieldEventSession) => void;
  isPending: boolean;
}

function CreateSessionDialog({
  open,
  onOpenChange,
  availableEvents,
  onSubmit,
  isPending,
}: CreateSessionDialogProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [measurementUnit, setMeasurementUnit] = useState<string>("metric");
  const [recordWind, setRecordWind] = useState(false);
  const [prelimAttempts, setPrelimAttempts] = useState(3);
  const [finalsAttempts, setFinalsAttempts] = useState(3);
  const [hasFinals, setHasFinals] = useState(false);
  const [athletesToFinals, setAthletesToFinals] = useState(8);
  const [totalAttempts, setTotalAttempts] = useState(6);

  const selectedEvent = availableEvents.find(e => e.id === selectedEventId);
  const isVertical = selectedEvent ? isHeightEvent(selectedEvent.eventType) : false;
  const showWindOption = selectedEvent ? isWindAffectedFieldEvent(selectedEvent.eventType) : false;

  const handleSubmit = () => {
    if (!selectedEventId) return;
    
    const accessCode = generateAccessCode();
    const sessionData: InsertFieldEventSession = {
      eventId: selectedEventId,
      status: "setup",
      measurementUnit,
      recordWind: showWindOption ? recordWind : false,
      hasFinals: isVertical ? false : hasFinals,
      prelimAttempts: isVertical ? 3 : (hasFinals ? prelimAttempts : 3),
      finalsAttempts: isVertical ? 3 : (hasFinals ? finalsAttempts : 3),
      athletesToFinals: isVertical ? 8 : (hasFinals ? athletesToFinals : 8),
      totalAttempts: isVertical ? 3 : (hasFinals ? prelimAttempts + finalsAttempts : totalAttempts),
      accessCode,
    };
    
    onSubmit(sessionData);
  };

  const resetForm = () => {
    setSelectedEventId("");
    setMeasurementUnit("metric");
    setRecordWind(false);
    setPrelimAttempts(3);
    setFinalsAttempts(3);
    setHasFinals(false);
    setAthletesToFinals(8);
    setTotalAttempts(6);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { 
      onOpenChange(val); 
      if (!val) resetForm();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Field Event Session</DialogTitle>
          <DialogDescription>
            Configure a new officiating session for a field event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Choose a field event" />
              </SelectTrigger>
              <SelectContent>
                {availableEvents.map(event => (
                  <SelectItem key={event.id} value={event.id} data-testid={`option-event-${event.id}`}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Measurement Unit</Label>
            <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
              <SelectTrigger data-testid="select-measurement-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (meters)</SelectItem>
                <SelectItem value="english">English (feet-inches)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showWindOption && (
            <div className="flex items-center justify-between">
              <Label htmlFor="record-wind">Record Wind</Label>
              <Switch
                id="record-wind"
                checked={recordWind}
                onCheckedChange={setRecordWind}
                data-testid="switch-record-wind"
              />
            </div>
          )}

          {!isVertical && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="has-finals">Prelim/Finals Format</Label>
                <Switch
                  id="has-finals"
                  checked={hasFinals}
                  onCheckedChange={setHasFinals}
                  data-testid="switch-has-finals"
                />
              </div>

              {hasFinals ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prelim Attempts</Label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={prelimAttempts}
                        onChange={(e) => setPrelimAttempts(parseInt(e.target.value) || 3)}
                        data-testid="input-prelim-attempts"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Finals Attempts</Label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={finalsAttempts}
                        onChange={(e) => setFinalsAttempts(parseInt(e.target.value) || 3)}
                        data-testid="input-finals-attempts"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Athletes to Finals</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={athletesToFinals}
                      onChange={(e) => setAthletesToFinals(parseInt(e.target.value) || 8)}
                      data-testid="input-athletes-to-finals"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Total Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={totalAttempts}
                    onChange={(e) => setTotalAttempts(parseInt(e.target.value) || 6)}
                    data-testid="input-total-attempts"
                  />
                </div>
              )}
            </>
          )}

          {isVertical && (
            <p className="text-sm text-muted-foreground">
              Height progression will be configured after session creation.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEventId || isPending}
            data-testid="button-confirm-create"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Session"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FieldEventsControl() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<FieldEventSession | null>(null);

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
    queryKey: ["/api/field-sessions", "all", currentMeetId],
    queryFn: async () => {
      const allSessions: FieldEventSessionWithDetails[] = [];
      for (const event of fieldEvents) {
        const response = await fetch(`/api/field-sessions/event/${event.id}`);
        if (response.ok) {
          const session = await response.json();
          if (session) {
            const eventData = events.find(e => e.id === session.eventId);
            allSessions.push({ ...session, event: eventData });
          }
        }
      }
      return allSessions;
    },
    enabled: fieldEvents.length > 0,
    refetchInterval: 10000,
  });

  const sessionsMap = useMemo(() => {
    const map = new Map<string, FieldEventSessionWithDetails>();
    sessions.forEach(s => map.set(s.eventId, s));
    return map;
  }, [sessions]);

  const eventsWithoutSessions = useMemo(() => 
    fieldEvents.filter(e => !sessionsMap.has(e.id)),
    [fieldEvents, sessionsMap]
  );

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

  const createSessionMutation = useMutation({
    mutationFn: (data: InsertFieldEventSession) =>
      apiRequest("POST", "/api/field-sessions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
      setCreateDialogOpen(false);
      toast({ title: "Session created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleCreateSession = (eventId: string) => {
    setCreateDialogOpen(true);
  };

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
        <Button
          onClick={() => setCreateDialogOpen(true)}
          disabled={eventsWithoutSessions.length === 0}
          data-testid="button-create-session"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Session
        </Button>
      </div>

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

      {eventsWithoutSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" data-testid="text-events-without-sessions-header">
            Events Without Sessions
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {eventsWithoutSessions.map(event => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-4 p-4"
                    data-testid={`item-event-${event.id}`}
                  >
                    <span className="font-medium">{event.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCreateDialogOpen(true);
                      }}
                      data-testid={`button-create-session-${event.id}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Session
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {sessions.length === 0 && eventsWithoutSessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Field Events</h3>
            <p className="text-muted-foreground">
              This meet has no field events configured.
            </p>
          </CardContent>
        </Card>
      )}

      <CreateSessionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        availableEvents={eventsWithoutSessions}
        onSubmit={(data) => createSessionMutation.mutate(data)}
        isPending={createSessionMutation.isPending}
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
              
              <div className="space-y-2">
                <Label>EVT File Path (FinishLynx Athletes)</Label>
                <Input
                  type="text"
                  placeholder="/path/to/lynx.evt"
                  value={editingSession.evtFilePath || ""}
                  onChange={(e) => setEditingSession({ 
                    ...editingSession, 
                    evtFilePath: e.target.value || null
                  })}
                  data-testid="input-edit-evt-file-path"
                />
                <p className="text-xs text-muted-foreground">
                  Path to FinishLynx .evt file. Athletes will be automatically imported when the file changes.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>EVT Event Number</Label>
                <Input
                  type="number"
                  placeholder="e.g., 17"
                  value={editingSession.evtEventNumber || ""}
                  onChange={(e) => setEditingSession({ 
                    ...editingSession, 
                    evtEventNumber: e.target.value ? parseInt(e.target.value) : null
                  })}
                  data-testid="input-edit-evt-event-number"
                />
                <p className="text-xs text-muted-foreground">
                  Event number in the EVT file to import athletes from. Leave blank to import all athletes.
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
                      evtFilePath: editingSession.evtFilePath,
                      evtEventNumber: editingSession.evtEventNumber,
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
