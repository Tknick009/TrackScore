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
  QrCode,
  Ruler,
  GripVertical,
  X,
} from "lucide-react";
import type {
  Event,
  FieldEventSession,
  FieldEventSessionWithDetails,
  InsertFieldEventSession,
  FieldEventAthlete,
  FieldHeight,
  InsertFieldHeight,
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

function metersToFeetInches(meters: number): string {
  const totalInches = meters * 39.3701;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const wholeInches = Math.floor(inches);
  const fraction = inches - wholeInches;
  
  let fractionStr = "";
  if (fraction >= 0.875) {
    fractionStr = "";
    return `${feet}' ${wholeInches + 1}"`;
  } else if (fraction >= 0.625) {
    fractionStr = "3/4";
  } else if (fraction >= 0.375) {
    fractionStr = "1/2";
  } else if (fraction >= 0.125) {
    fractionStr = "1/4";
  }
  
  if (fractionStr) {
    return `${feet}' ${wholeInches} ${fractionStr}"`;
  }
  return `${feet}' ${wholeInches}"`;
}

function isVerticalEvent(session: FieldEventSessionWithDetails): boolean {
  if (session.event?.eventType && isHeightEvent(session.event.eventType)) {
    return true;
  }
  const evtName = (session.evtEventName || "").toLowerCase();
  return evtName.includes("high jump") || evtName.includes("pole vault");
}

interface HeightsDialogProps {
  sessionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function HeightsDialog({ sessionId, open, onOpenChange }: HeightsDialogProps) {
  const { toast } = useToast();
  const [newHeightMeters, setNewHeightMeters] = useState("");
  const [localHeights, setLocalHeights] = useState<FieldHeight[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: heights = [], isLoading, refetch } = useQuery<FieldHeight[]>({
    queryKey: ["/api/field-sessions", sessionId, "heights"],
    queryFn: () => fetch(`/api/field-sessions/${sessionId}/heights`).then(r => r.json()),
    enabled: open,
  });

  useEffect(() => {
    if (open && heights.length > 0) {
      setLocalHeights([...heights].sort((a, b) => a.heightIndex - b.heightIndex));
    } else if (open && heights.length === 0 && !isLoading) {
      setLocalHeights([]);
    }
  }, [heights, open, isLoading]);

  const handleAddHeight = () => {
    const meters = parseFloat(newHeightMeters);
    if (isNaN(meters) || meters <= 0) {
      toast({ title: "Invalid height", description: "Please enter a valid height in meters", variant: "destructive" });
      return;
    }
    
    const newHeight: FieldHeight = {
      id: Date.now(),
      sessionId,
      heightIndex: localHeights.length,
      heightMeters: meters.toString(),
      isActive: true,
      isJumpOff: false,
      createdAt: new Date(),
    };
    
    const updatedHeights = [...localHeights, newHeight].sort((a, b) => 
      parseFloat(a.heightMeters) - parseFloat(b.heightMeters)
    );
    
    updatedHeights.forEach((h, idx) => { h.heightIndex = idx; });
    setLocalHeights(updatedHeights);
    setNewHeightMeters("");
  };

  const handleDeleteHeight = (index: number) => {
    const updated = localHeights.filter((_, i) => i !== index);
    updated.forEach((h, idx) => { h.heightIndex = idx; });
    setLocalHeights(updated);
  };

  const handleToggleActive = (index: number) => {
    const updated = [...localHeights];
    updated[index] = { ...updated[index], isActive: !updated[index].isActive };
    setLocalHeights(updated);
  };

  const handleToggleJumpOff = (index: number) => {
    const updated = [...localHeights];
    updated[index] = { ...updated[index], isJumpOff: !updated[index].isJumpOff };
    setLocalHeights(updated);
  };

  const handleUpdateHeight = (index: number, newMeters: string) => {
    const meters = parseFloat(newMeters);
    if (isNaN(meters) || meters <= 0) return;
    
    const updated = [...localHeights];
    updated[index] = { ...updated[index], heightMeters: meters.toString() };
    
    updated.sort((a, b) => parseFloat(a.heightMeters) - parseFloat(b.heightMeters));
    updated.forEach((h, idx) => { h.heightIndex = idx; });
    setLocalHeights(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const heightsToSave = localHeights.map((h, idx) => ({
        sessionId,
        heightIndex: idx,
        heightMeters: h.heightMeters,
        isActive: h.isActive,
        isJumpOff: h.isJumpOff,
      }));
      
      await apiRequest("PUT", `/api/field-sessions/${sessionId}/heights`, { heights: heightsToSave });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "heights"] });
      toast({ title: "Heights saved successfully" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Failed to save heights", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Configure Heights
          </DialogTitle>
          <DialogDescription>
            Set the height progression for this vertical event. Heights are automatically sorted in ascending order.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Height in meters (e.g., 1.85)"
                value={newHeightMeters}
                onChange={(e) => setNewHeightMeters(e.target.value)}
                data-testid="input-new-height"
              />
              {newHeightMeters && !isNaN(parseFloat(newHeightMeters)) && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {metersToFeetInches(parseFloat(newHeightMeters))}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddHeight}
              data-testid="button-add-height"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 max-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : localHeights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No heights configured yet.</p>
                <p className="text-sm">Add heights above to create a progression.</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {localHeights.map((height, index) => (
                  <div
                    key={height.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      height.isActive ? "bg-card" : "bg-muted/50 opacity-60"
                    } ${height.isJumpOff ? "border-yellow-500" : ""}`}
                    data-testid={`height-row-${index}`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24"
                          value={height.heightMeters}
                          onChange={(e) => handleUpdateHeight(index, e.target.value)}
                          data-testid={`input-height-${index}`}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {metersToFeetInches(parseFloat(height.heightMeters))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant={height.isActive ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleActive(index)}
                        className="text-xs px-2"
                        data-testid={`button-toggle-active-${index}`}
                      >
                        {height.isActive ? "Active" : "Inactive"}
                      </Button>
                      
                      <Button
                        variant={height.isJumpOff ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleJumpOff(index)}
                        className={`text-xs px-2 ${height.isJumpOff ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}`}
                        data-testid={`button-toggle-jumpoff-${index}`}
                      >
                        J/O
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteHeight(index)}
                        data-testid={`button-delete-height-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-heights">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-heights">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Heights"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EVTEventSummary {
  eventNumber: number;
  eventName: string;
  athleteCount: number;
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
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showHeightsDialog, setShowHeightsDialog] = useState(false);
  
  // Use database event name if available, otherwise use EVT event name
  const eventName = session.event?.name || session.evtEventName || "Unknown Event";
  const isVertical = isVerticalEvent(session);
  const checkedInCount = athletes.filter(a => a.checkInStatus === "checked_in").length;
  const totalAthletes = athletes.length;
  
  // Build the full URL for the field officiating page
  const fieldUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/field/${session.accessCode}`
    : `/field/${session.accessCode}`;

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRDialog(true)}
            data-testid={`button-show-qr-${session.id}`}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>

          {isVertical && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHeightsDialog(true)}
              data-testid={`button-configure-heights-${session.id}`}
            >
              <Ruler className="h-4 w-4 mr-2" />
              Configure Heights
            </Button>
          )}

          <HeightsDialog
            sessionId={session.id}
            open={showHeightsDialog}
            onOpenChange={setShowHeightsDialog}
          />

          <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Field Official Access
                </DialogTitle>
                <DialogDescription>
                  Scan this QR code to open the officiating page for {eventName}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={`/api/qr/url?url=${encodeURIComponent(fieldUrl)}`}
                    alt="QR Code for field officiating"
                    className="w-64 h-64"
                    data-testid={`img-qr-code-${session.id}`}
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Or enter this code manually:</p>
                  <code className="bg-muted px-4 py-2 rounded font-mono text-lg font-bold">
                    {session.accessCode}
                  </code>
                </div>
                <div className="text-center">
                  <a 
                    href={fieldUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {fieldUrl}
                  </a>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowQRDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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


export default function FieldEventsControl() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [editingSession, setEditingSession] = useState<FieldEventSession | null>(null);
  const [evtDirectoryPath, setEvtDirectoryPath] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Horizontal event defaults
  const [horizontalPrelimAttempts, setHorizontalPrelimAttempts] = useState(3);
  const [horizontalFinalists, setHorizontalFinalists] = useState(8);
  const [horizontalFinalAttempts, setHorizontalFinalAttempts] = useState(3);
  

  interface EVTConfigData {
    directoryPath: string;
    horizontalPrelimAttempts?: number;
    horizontalFinalists?: number;
    horizontalFinalAttempts?: number;
  }

  const { data: evtConfig, isLoading: configLoading } = useQuery<EVTConfigData>({
    queryKey: ["/api/evt-config"],
    queryFn: () => fetch("/api/evt-config").then(r => r.json()),
    staleTime: 0,
  });

  useEffect(() => {
    if (evtConfig) {
      if (evtConfig.directoryPath && !evtDirectoryPath) {
        setEvtDirectoryPath(evtConfig.directoryPath);
      }
      if (evtConfig.horizontalPrelimAttempts !== undefined) {
        setHorizontalPrelimAttempts(evtConfig.horizontalPrelimAttempts);
      }
      if (evtConfig.horizontalFinalists !== undefined) {
        setHorizontalFinalists(evtConfig.horizontalFinalists);
      }
      if (evtConfig.horizontalFinalAttempts !== undefined) {
        setHorizontalFinalAttempts(evtConfig.horizontalFinalAttempts);
      }
    }
  }, [evtConfig]);

  const { data: evtEventsData, isLoading: evtEventsLoading, refetch: refetchEvtEvents } = useQuery<{ events: EVTEventSummary[] }>({
    queryKey: ["/api/evt-events"],
    queryFn: () => fetch("/api/evt-events").then(r => r.json()),
    enabled: !!evtConfig?.directoryPath,
    refetchInterval: 5000,
  });

  const evtEvents = evtEventsData?.events || [];

  // Auto-provision sessions for all EVT events
  const [hasProvisioned, setHasProvisioned] = useState(false);
  
  useEffect(() => {
    if (evtEvents.length > 0 && !hasProvisioned) {
      const provisionSessions = async () => {
        try {
          const response = await fetch("/api/evt-events/provision-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (response.ok) {
            const result = await response.json();
            if (result.created > 0) {
              toast({ title: `Created ${result.created} event sessions` });
              queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
            }
          }
          setHasProvisioned(true);
        } catch (error) {
          console.error("Error provisioning sessions:", error);
        }
      };
      provisionSessions();
    }
  }, [evtEvents.length, hasProvisioned]);

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
      
      // Deduplicate sessions by evtEventNumber (keep the one with the highest ID, which is the newest)
      const seenEvtNumbers = new Map<number, FieldEventSession>();
      const uniqueSessions: FieldEventSession[] = [];
      
      for (const session of allSessions) {
        if (session.evtEventNumber !== null) {
          const existing = seenEvtNumbers.get(session.evtEventNumber);
          if (!existing || session.id > existing.id) {
            seenEvtNumbers.set(session.evtEventNumber, session);
          }
        } else {
          // Sessions without evtEventNumber are kept as-is
          uniqueSessions.push(session);
        }
      }
      
      // Add deduplicated EVT sessions
      uniqueSessions.push(...seenEvtNumbers.values());
      
      // Sort by evtEventNumber or id
      uniqueSessions.sort((a, b) => {
        if (a.evtEventNumber && b.evtEventNumber) return a.evtEventNumber - b.evtEventNumber;
        return a.id - b.id;
      });
      
      // Enrich sessions with event data where available
      return uniqueSessions.map(session => {
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
      await apiRequest("POST", "/api/evt-config", { 
        directoryPath: evtDirectoryPath,
        horizontalPrelimAttempts,
        horizontalFinalists,
        horizontalFinalAttempts,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-events"] });
      toast({ title: "Configuration saved" });
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
            Field Events Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">EVT Directory Path</Label>
            <div className="flex items-center gap-3">
              <Input
                placeholder="/path/to/lynx/evt/directory"
                value={evtDirectoryPath || evtConfig?.directoryPath || ""}
                onChange={(e) => setEvtDirectoryPath(e.target.value)}
                className="flex-1"
                data-testid="input-evt-directory"
              />
              <Button
                variant="outline"
                onClick={() => refetchEvtEvents()}
                data-testid="button-refresh-evt"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Horizontal Event Defaults (Throws &amp; Jumps)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Prelim Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={horizontalPrelimAttempts}
                  onChange={(e) => setHorizontalPrelimAttempts(parseInt(e.target.value) || 3)}
                  className="w-full"
                  data-testid="input-prelim-attempts"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Athletes to Finals</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={horizontalFinalists}
                  onChange={(e) => setHorizontalFinalists(parseInt(e.target.value) || 8)}
                  className="w-full"
                  data-testid="input-finalists"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Finals Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={horizontalFinalAttempts}
                  onChange={(e) => setHorizontalFinalAttempts(parseInt(e.target.value) || 3)}
                  className="w-full"
                  data-testid="input-finals-attempts"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These defaults apply to Long Jump, Triple Jump, Shot Put, Discus, Javelin, Hammer, etc.
              High Jump and Pole Vault are configured manually per session.
            </p>
          </div>
          
          <div className="flex justify-end pt-2">
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
                  Save Configuration
                </>
              )}
            </Button>
          </div>
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

      {evtConfig?.directoryPath && sessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Field Events</h3>
            <p className="text-muted-foreground">
              No field events found. Make sure FinishLynx is exporting EVT files to the configured directory.
            </p>
          </CardContent>
        </Card>
      )}

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
