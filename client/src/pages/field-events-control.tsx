/**
 * Field Events — unified setup and management page.
 * 
 * Sections:
 * 1. Active Sessions — live overview of all field event sessions with status
 * 2. EVT Configuration — FinishLynx EVT directory, results directory, horizontal defaults
 * 3. External Scoreboards — configure LSS output connections (inline, not a separate page)
 * 4. Officiate — opens the full-screen officiating interface for tablets
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FolderOpen,
  Save,
  RefreshCw,
  Target,
  ExternalLink,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  Send,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { ExternalScoreboard, InsertExternalScoreboard, FieldEventSession } from "@shared/schema";

interface EVTConfigData {
  directoryPath: string;
  resultsDirectory?: string;
  horizontalPrelimAttempts?: number;
  horizontalFinalists?: number;
  horizontalFinalAttempts?: number;
}

interface EVTEventSummary {
  eventNumber: number;
  eventName: string;
  athleteCount: number;
}

type ScoreboardFormData = {
  name: string;
  lssDirectory: string;
  targetIp: string;
  targetPort: string;
  sessionId: string;
  followDeviceName: string;
};

const emptyFormData: ScoreboardFormData = {
  name: "",
  lssDirectory: "",
  targetIp: "",
  targetPort: "",
  sessionId: "",
  followDeviceName: "",
};

const MAX_SCOREBOARDS = 20;

export default function FieldEventsControl() {
  const { toast } = useToast();
  const [evtDirectoryPath, setEvtDirectoryPath] = useState("");
  const [resultsDirectory, setResultsDirectory] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Horizontal event defaults
  const [horizontalPrelimAttempts, setHorizontalPrelimAttempts] = useState(3);
  const [horizontalFinalists, setHorizontalFinalists] = useState(8);
  const [horizontalFinalAttempts, setHorizontalFinalAttempts] = useState(3);

  // Scoreboard state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScoreboard, setEditingScoreboard] = useState<ExternalScoreboard | null>(null);
  const [deleteScoreboard, setDeleteScoreboard] = useState<ExternalScoreboard | null>(null);
  const [formData, setFormData] = useState<ScoreboardFormData>(emptyFormData);

  // --- Queries ---

  const { data: evtConfig, isLoading: configLoading } = useQuery<EVTConfigData>({
    queryKey: ["/api/evt-config"],
    queryFn: () => fetch("/api/evt-config").then(r => r.json()),
    staleTime: 0,
  });

  const { data: evtEventsData, refetch: refetchEvtEvents } = useQuery<{ events: EVTEventSummary[] }>({
    queryKey: ["/api/evt-events"],
    queryFn: () => fetch("/api/evt-events").then(r => r.json()),
    enabled: !!evtConfig?.directoryPath,
    refetchInterval: 5000,
  });

  const { data: fieldSessions = [], isLoading: sessionsLoading } = useQuery<FieldEventSession[]>({
    queryKey: ["/api/field-sessions"],
    refetchInterval: 5000,
  });

  const { data: scoreboards = [], isLoading: scoreboardsLoading } = useQuery<ExternalScoreboard[]>({
    queryKey: ["/api/external-scoreboards"],
  });

  const evtEvents = evtEventsData?.events || [];

  // --- EVT Config Effects ---

  useEffect(() => {
    if (evtConfig) {
      if (evtConfig.directoryPath && !evtDirectoryPath) {
        setEvtDirectoryPath(evtConfig.directoryPath);
      }
      if (evtConfig.resultsDirectory && !resultsDirectory) {
        setResultsDirectory(evtConfig.resultsDirectory);
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

  // --- EVT Config Handlers ---

  const handleSaveEvtConfig = async () => {
    setIsSavingConfig(true);
    try {
      const response = await apiRequest("POST", "/api/evt-config", {
        directoryPath: evtDirectoryPath,
        resultsDirectory,
        horizontalPrelimAttempts,
        horizontalFinalists,
        horizontalFinalAttempts,
      });
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/evt-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });

      if (result.updatedSessions > 0) {
        toast({
          title: "Configuration saved",
          description: `Updated ${result.updatedSessions} existing horizontal event session(s) with new defaults.`
        });
      } else {
        toast({ title: "Configuration saved" });
      }
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

  // --- Scoreboard Mutations ---

  const createMutation = useMutation({
    mutationFn: async (data: InsertExternalScoreboard) => {
      const response = await apiRequest("POST", "/api/external-scoreboards", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard created" });
      setIsCreateOpen(false);
      setFormData(emptyFormData);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertExternalScoreboard> }) => {
      const response = await apiRequest("PATCH", `/api/external-scoreboards/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard updated" });
      setEditingScoreboard(null);
      setFormData(emptyFormData);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/external-scoreboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard deleted" });
      setDeleteScoreboard(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/external-scoreboards/${id}/start`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard started" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/external-scoreboards/${id}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard stopped" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to stop scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/external-scoreboards/${id}/send`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Data sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send data", description: error.message, variant: "destructive" });
    },
  });

  // --- Scoreboard Handlers ---

  const handleOpenCreate = () => {
    setFormData(emptyFormData);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (scoreboard: ExternalScoreboard) => {
    setFormData({
      name: scoreboard.name,
      lssDirectory: scoreboard.lssDirectory || "",
      targetIp: scoreboard.targetIp,
      targetPort: String(scoreboard.targetPort),
      sessionId: scoreboard.sessionId ? String(scoreboard.sessionId) : "",
      followDeviceName: scoreboard.followDeviceName || "",
    });
    setEditingScoreboard(scoreboard);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.targetIp.trim()) {
      toast({ title: "Target IP is required", variant: "destructive" });
      return;
    }
    const port = parseInt(formData.targetPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast({ title: "Target Port must be a valid port number (1-65535)", variant: "destructive" });
      return;
    }

    const payload: InsertExternalScoreboard = {
      name: formData.name.trim(),
      lssDirectory: formData.lssDirectory.trim() || null,
      targetIp: formData.targetIp.trim(),
      targetPort: port,
      sessionId: formData.sessionId ? parseInt(formData.sessionId, 10) : null,
      followDeviceName: formData.followDeviceName.trim() || null,
    };

    if (editingScoreboard) {
      updateMutation.mutate({ id: editingScoreboard.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setEditingScoreboard(null);
    setFormData(emptyFormData);
  };

  const getSessionDisplayName = (sessionId: number | null): string => {
    if (!sessionId) return "None";
    const session = fieldSessions.find((s) => s.id === sessionId);
    if (!session) return "Unknown session";
    if (session.evtEventName) return session.evtEventName;
    return `Session #${session.id}`;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-green-500/15 text-green-700 border-green-200">Live</Badge>;
      case "completed":
        return <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>;
      case "check_in":
        return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-200">Check-In</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Setup</Badge>;
    }
  };

  const isModalOpen = isCreateOpen || editingScoreboard !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canAddMore = scoreboards.length < MAX_SCOREBOARDS;

  if (configLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Field Events</h1>
        </div>
        <Button
          onClick={() => window.open("/field-command", "_blank")}
          data-testid="button-open-command-center"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Officiate
        </Button>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {fieldSessions.length} event{fieldSessions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : fieldSessions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No field event sessions yet.</p>
              <p className="text-xs mt-1">Configure the EVT directory below to auto-provision from FinishLynx.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fieldSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusBadge(session.status)}
                    <span className="font-medium text-sm truncate">
                      {session.evtEventName || `Session #${session.id}`}
                    </span>
                    {session.evtEventNumber && (
                      <span className="text-xs text-muted-foreground">
                        Event #{session.evtEventNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {session.recordWind && (
                      <span className="text-blue-600">Wind</span>
                    )}
                    <span>{session.measurementUnit === "english" ? "Imperial" : "Metric"}</span>
                    {session.accessCode && (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        {session.accessCode}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EVT Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            FinishLynx EVT Integration
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

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Results Directory (LFF Export Path)</Label>
            <Input
              placeholder="/path/to/results/directory"
              value={resultsDirectory || evtConfig?.resultsDirectory || ""}
              onChange={(e) => setResultsDirectory(e.target.value)}
              className="flex-1"
              data-testid="input-results-directory"
            />
            <p className="text-xs text-muted-foreground mt-1">
              LFF files will be automatically exported to this directory when marks are recorded.
            </p>
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

          {evtEvents.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">
                <strong>{evtEvents.length}</strong> EVT event{evtEvents.length !== 1 ? "s" : ""} detected
              </p>
            </div>
          )}

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

      {/* External Scoreboards */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              External Scoreboards
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenCreate}
              disabled={!canAddMore}
              data-testid="button-add-scoreboard"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <CardDescription>
            Configure LSS output connections to send field event data to external display systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scoreboardsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : scoreboards.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No external scoreboards configured.</p>
              <p className="text-xs mt-1">Add a scoreboard to send field event data via LSS to FinishLynx or other systems.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scoreboards.map((scoreboard) => (
                <div
                  key={scoreboard.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40"
                  data-testid={`card-scoreboard-${scoreboard.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`text-name-${scoreboard.id}`}>
                        {scoreboard.name}
                      </span>
                      <Badge
                        variant={scoreboard.isActive ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`badge-status-${scoreboard.id}`}
                      >
                        {scoreboard.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span>{scoreboard.targetIp}:{scoreboard.targetPort}</span>
                      <span className="mx-1.5">·</span>
                      <span>{getSessionDisplayName(scoreboard.sessionId)}</span>
                      {scoreboard.followDeviceName && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span>Following: {scoreboard.followDeviceName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(scoreboard)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {scoreboard.isActive ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stopMutation.mutate(scoreboard.id)} disabled={stopMutation.isPending}>
                        <Square className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startMutation.mutate(scoreboard.id)} disabled={startMutation.isPending}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendMutation.mutate(scoreboard.id)} disabled={sendMutation.isPending}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteScoreboard(scoreboard)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoreboard Create/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingScoreboard ? "Edit Scoreboard" : "Add Scoreboard"}
            </DialogTitle>
            <DialogDescription>
              Configure an external scoreboard connection for sending field event data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., High Jump Display"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-scoreboard-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lssDirectory">LSS Directory</Label>
              <Input
                id="lssDirectory"
                placeholder="e.g., /path/to/lss/files"
                value={formData.lssDirectory}
                onChange={(e) => setFormData({ ...formData, lssDirectory: e.target.value })}
                data-testid="input-lss-directory"
              />
              <p className="text-xs text-muted-foreground">
                Optional directory for reading/writing LSS files.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetIp">Target IP *</Label>
                <Input
                  id="targetIp"
                  placeholder="e.g., 192.168.1.100"
                  value={formData.targetIp}
                  onChange={(e) => setFormData({ ...formData, targetIp: e.target.value })}
                  data-testid="input-target-ip"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPort">Target Port *</Label>
                <Input
                  id="targetPort"
                  type="number"
                  placeholder="e.g., 5000"
                  min={1}
                  max={65535}
                  value={formData.targetPort}
                  onChange={(e) => setFormData({ ...formData, targetPort: e.target.value })}
                  data-testid="input-target-port"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionId">Field Event Session</Label>
              <Select
                value={formData.sessionId || "none"}
                onValueChange={(value) => setFormData({ ...formData, sessionId: value === "none" ? "" : value })}
              >
                <SelectTrigger data-testid="select-session">
                  <SelectValue placeholder="Select a session (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {fieldSessions.map((session) => (
                    <SelectItem key={session.id} value={String(session.id)}>
                      {session.evtEventName || `Session #${session.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followDeviceName">Follow Device (Optional)</Label>
              <Input
                id="followDeviceName"
                placeholder="e.g., Throws"
                value={formData.followDeviceName}
                onChange={(e) => setFormData({ ...formData, followDeviceName: e.target.value })}
                data-testid="input-follow-device"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to receive updates from all devices, or enter a device name to filter.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingScoreboard ? "Save Changes" : "Create Scoreboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteScoreboard !== null} onOpenChange={(open) => !open && setDeleteScoreboard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scoreboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteScoreboard?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScoreboard && deleteMutation.mutate(deleteScoreboard.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
