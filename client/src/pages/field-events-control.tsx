/**
 * Field Events — professional dashboard for managing field event sessions,
 * EVT configuration, and external scoreboard connections.
 *
 * This page lives inside the main app layout (sidebar visible).
 * Officials open the Officiate view (field-command) from here.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Save,
  RefreshCw,
  ExternalLink,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  Send,
  ChevronDown,
  ChevronRight,
  Settings2,
  Wifi,
  WifiOff,
  Wind,
} from "lucide-react";
import type { ExternalScoreboard, InsertExternalScoreboard, FieldEventSession } from "@shared/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

const emptyScoreboardForm: ScoreboardFormData = {
  name: "",
  lssDirectory: "",
  targetIp: "",
  targetPort: "",
  sessionId: "",
  followDeviceName: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    in_progress: "bg-emerald-500",
    completed: "bg-slate-400",
    check_in: "bg-amber-500",
    setup: "bg-blue-400",
  };
  const color = colors[status || "setup"] || colors.setup;
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "in_progress" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function StatusLabel({ status }: { status: string | null }) {
  const labels: Record<string, string> = {
    in_progress: "Live",
    completed: "Complete",
    check_in: "Check-In",
    setup: "Setup",
  };
  return <span className="text-xs capitalize">{labels[status || "setup"] || "Setup"}</span>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FieldEventsControl() {
  const { toast } = useToast();

  // EVT config state
  const [evtDir, setEvtDir] = useState("");
  const [resultsDir, setResultsDir] = useState("");
  const [prelimAttempts, setPrelimAttempts] = useState(3);
  const [finalists, setFinalists] = useState(8);
  const [finalsAttempts, setFinalsAttempts] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Scoreboard state
  const [sbModalOpen, setSbModalOpen] = useState(false);
  const [editingSb, setEditingSb] = useState<ExternalScoreboard | null>(null);
  const [deletingSb, setDeletingSb] = useState<ExternalScoreboard | null>(null);
  const [sbForm, setSbForm] = useState<ScoreboardFormData>(emptyScoreboardForm);
  const [scoreboardsOpen, setScoreboardsOpen] = useState(false);

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  const { data: evtConfig, isLoading: configLoading } = useQuery<EVTConfigData>({
    queryKey: ["/api/evt-config"],
    queryFn: () => fetch("/api/evt-config").then((r) => r.json()),
    staleTime: 0,
  });

  const { data: evtEventsData, refetch: refetchEvt } = useQuery<{ events: EVTEventSummary[] }>({
    queryKey: ["/api/evt-events"],
    queryFn: () => fetch("/api/evt-events").then((r) => r.json()),
    enabled: !!evtConfig?.directoryPath,
    refetchInterval: 5000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<FieldEventSession[]>({
    queryKey: ["/api/field-sessions"],
    refetchInterval: 5000,
  });

  const { data: scoreboards = [], isLoading: sbLoading } = useQuery<ExternalScoreboard[]>({
    queryKey: ["/api/external-scoreboards"],
  });

  const evtEvents = evtEventsData?.events || [];

  // -----------------------------------------------------------------------
  // EVT config sync
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (evtConfig) {
      if (evtConfig.directoryPath && !evtDir) setEvtDir(evtConfig.directoryPath);
      if (evtConfig.resultsDirectory && !resultsDir) setResultsDir(evtConfig.resultsDirectory);
      if (evtConfig.horizontalPrelimAttempts !== undefined) setPrelimAttempts(evtConfig.horizontalPrelimAttempts);
      if (evtConfig.horizontalFinalists !== undefined) setFinalists(evtConfig.horizontalFinalists);
      if (evtConfig.horizontalFinalAttempts !== undefined) setFinalsAttempts(evtConfig.horizontalFinalAttempts);
    }
  }, [evtConfig]);

  // Auto-provision
  const [hasProvisioned, setHasProvisioned] = useState(false);
  useEffect(() => {
    if (evtEvents.length > 0 && !hasProvisioned) {
      (async () => {
        try {
          const res = await fetch("/api/evt-events/provision-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const result = await res.json();
            if (result.created > 0) {
              toast({ title: `Provisioned ${result.created} session${result.created > 1 ? "s" : ""}` });
              queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
            }
          }
          setHasProvisioned(true);
        } catch {
          // silent
        }
      })();
    }
  }, [evtEvents.length, hasProvisioned]);

  // -----------------------------------------------------------------------
  // EVT config save
  // -----------------------------------------------------------------------

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await apiRequest("POST", "/api/evt-config", {
        directoryPath: evtDir,
        resultsDirectory: resultsDir,
        horizontalPrelimAttempts: prelimAttempts,
        horizontalFinalists: finalists,
        horizontalFinalAttempts: finalsAttempts,
      });
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/evt-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
      toast({
        title: "Configuration saved",
        description: result.updatedSessions > 0
          ? `Updated ${result.updatedSessions} session(s).`
          : undefined,
      });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Scoreboard mutations
  // -----------------------------------------------------------------------

  const createSb = useMutation({
    mutationFn: (data: InsertExternalScoreboard) => apiRequest("POST", "/api/external-scoreboards", data).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] }); toast({ title: "Scoreboard created" }); closeSbModal(); },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateSb = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertExternalScoreboard> }) => apiRequest("PATCH", `/api/external-scoreboards/${id}`, data).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] }); toast({ title: "Scoreboard updated" }); closeSbModal(); },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteSb = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/external-scoreboards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] }); toast({ title: "Scoreboard deleted" }); setDeletingSb(null); },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const startSb = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/external-scoreboards/${id}/start`).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] }); },
    onError: (e: Error) => toast({ title: "Start failed", description: e.message, variant: "destructive" }),
  });

  const stopSb = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/external-scoreboards/${id}/stop`).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] }); },
    onError: (e: Error) => toast({ title: "Stop failed", description: e.message, variant: "destructive" }),
  });

  const sendSb = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/external-scoreboards/${id}/send`).then((r) => r.json()),
    onSuccess: () => toast({ title: "Data sent" }),
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  // -----------------------------------------------------------------------
  // Scoreboard form helpers
  // -----------------------------------------------------------------------

  const openCreateSb = () => { setSbForm(emptyScoreboardForm); setEditingSb(null); setSbModalOpen(true); };
  const openEditSb = (sb: ExternalScoreboard) => {
    setSbForm({
      name: sb.name,
      lssDirectory: sb.lssDirectory || "",
      targetIp: sb.targetIp,
      targetPort: String(sb.targetPort),
      sessionId: sb.sessionId ? String(sb.sessionId) : "",
      followDeviceName: sb.followDeviceName || "",
    });
    setEditingSb(sb);
    setSbModalOpen(true);
  };
  const closeSbModal = () => { setSbModalOpen(false); setEditingSb(null); setSbForm(emptyScoreboardForm); };

  const handleSbSubmit = () => {
    if (!sbForm.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!sbForm.targetIp.trim()) return toast({ title: "IP required", variant: "destructive" });
    const port = parseInt(sbForm.targetPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) return toast({ title: "Invalid port", variant: "destructive" });

    const payload: InsertExternalScoreboard = {
      name: sbForm.name.trim(),
      lssDirectory: sbForm.lssDirectory.trim() || null,
      targetIp: sbForm.targetIp.trim(),
      targetPort: port,
      sessionId: sbForm.sessionId ? parseInt(sbForm.sessionId, 10) : null,
      followDeviceName: sbForm.followDeviceName.trim() || null,
    };
    if (editingSb) {
      updateSb.mutate({ id: editingSb.id, data: payload });
    } else {
      createSb.mutate(payload);
    }
  };

  const sbSubmitting = createSb.isPending || updateSb.isPending;

  const getSessionName = (id: number | null) => {
    if (!id) return "—";
    const s = sessions.find((x) => x.id === id);
    return s?.evtEventName || `#${id}`;
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (configLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const liveSessions = sessions.filter((s) => s.status === "in_progress");
  const activeSb = scoreboards.filter((s) => s.isActive);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Field Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            {liveSessions.length > 0 && <> · <span className="text-emerald-600 font-medium">{liveSessions.length} live</span></>}
            {activeSb.length > 0 && <> · {activeSb.length} scoreboard{activeSb.length !== 1 ? "s" : ""} active</>}
          </p>
        </div>
        <Button onClick={() => window.open("/field-command", "_blank")} data-testid="button-officiate">
          <ExternalLink className="h-4 w-4 mr-2" />
          Officiate
        </Button>
      </div>

      {/* ── Sessions Table ──────────────────────────────────────── */}
      <div className="border rounded-lg">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Event Sessions</h2>
        </div>
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No field event sessions.</p>
            <p className="text-xs mt-1">Configure the EVT directory below to auto-provision from FinishLynx.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="w-[80px]">Event #</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[70px]">Wind</TableHead>
                <TableHead className="w-[80px]">Unit</TableHead>
                <TableHead className="w-[80px]">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="py-2.5">
                    <StatusDot status={s.status} />
                  </TableCell>
                  <TableCell className="py-2.5 font-medium">
                    {s.evtEventName || `Session #${s.id}`}
                  </TableCell>
                  <TableCell className="py-2.5 text-muted-foreground text-xs tabular-nums">
                    {s.evtEventNumber || "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StatusLabel status={s.status} />
                  </TableCell>
                  <TableCell className="py-2.5">
                    {s.recordWind ? (
                      <Wind className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                    {s.measurementUnit === "english" ? "Imperial" : "Metric"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {s.accessCode ? (
                      <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{s.accessCode}</code>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── EVT Configuration (collapsible) ─────────────────────── */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">EVT Configuration</h2>
                {evtEvents.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">{evtEvents.length} EVT files</Badge>
                )}
              </div>
              {configOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Separator />
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">EVT Directory Path</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="/path/to/lynx/evt"
                      value={evtDir}
                      onChange={(e) => setEvtDir(e.target.value)}
                      className="text-sm"
                      data-testid="input-evt-directory"
                    />
                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => refetchEvt()} data-testid="button-refresh-evt">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Results Directory (LFF Export)</Label>
                  <Input
                    placeholder="/path/to/results"
                    value={resultsDir}
                    onChange={(e) => setResultsDir(e.target.value)}
                    className="text-sm"
                    data-testid="input-results-directory"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Horizontal Event Defaults</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Prelim Attempts</Label>
                    <Input type="number" min={1} max={10} value={prelimAttempts} onChange={(e) => setPrelimAttempts(parseInt(e.target.value) || 3)} className="text-sm h-9" data-testid="input-prelim-attempts" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">To Finals</Label>
                    <Input type="number" min={1} max={24} value={finalists} onChange={(e) => setFinalists(parseInt(e.target.value) || 8)} className="text-sm h-9" data-testid="input-finalists" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Finals Attempts</Label>
                    <Input type="number" min={1} max={10} value={finalsAttempts} onChange={(e) => setFinalsAttempts(parseInt(e.target.value) || 3)} className="text-sm h-9" data-testid="input-finals-attempts" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveConfig} disabled={isSaving} data-testid="button-save-evt-config">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save</>}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* ── External Scoreboards (collapsible) ─────────────────── */}
      <Collapsible open={scoreboardsOpen} onOpenChange={setScoreboardsOpen}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">External Scoreboards</h2>
                {scoreboards.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {activeSb.length}/{scoreboards.length} active
                  </Badge>
                )}
              </div>
              {scoreboardsOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Separator />
            <div className="p-4">
              {sbLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : scoreboards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No scoreboards configured.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreateSb}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add Scoreboard
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Name</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoreboards.map((sb) => (
                        <TableRow key={sb.id}>
                          <TableCell className="py-2 font-medium text-sm">{sb.name}</TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground font-mono">{sb.targetIp}:{sb.targetPort}</TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">{getSessionName(sb.sessionId)}</TableCell>
                          <TableCell className="py-2">
                            {sb.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                <Wifi className="h-3 w-3" />On
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <WifiOff className="h-3 w-3" />Off
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="inline-flex items-center gap-0.5">
                              {sb.isActive ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => stopSb.mutate(sb.id)} title="Stop"><Square className="h-3 w-3" /></Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startSb.mutate(sb.id)} title="Start"><Play className="h-3 w-3" /></Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendSb.mutate(sb.id)} title="Send"><Send className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSb(sb)} title="Edit"><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingSb(sb)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={openCreateSb} disabled={scoreboards.length >= 20}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />Add
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* ── Scoreboard Create/Edit Dialog ────────────────────────── */}
      <Dialog open={sbModalOpen} onOpenChange={(open) => !open && closeSbModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSb ? "Edit Scoreboard" : "Add Scoreboard"}</DialogTitle>
            <DialogDescription>Configure an LSS output connection for field event data.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="e.g. High Jump Display" value={sbForm.name} onChange={(e) => setSbForm({ ...sbForm, name: e.target.value })} className="text-sm" data-testid="input-scoreboard-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">LSS Directory</Label>
              <Input placeholder="/path/to/lss" value={sbForm.lssDirectory} onChange={(e) => setSbForm({ ...sbForm, lssDirectory: e.target.value })} className="text-sm" data-testid="input-lss-directory" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Target IP *</Label>
                <Input placeholder="192.168.1.100" value={sbForm.targetIp} onChange={(e) => setSbForm({ ...sbForm, targetIp: e.target.value })} className="text-sm" data-testid="input-target-ip" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Port *</Label>
                <Input type="number" placeholder="5000" min={1} max={65535} value={sbForm.targetPort} onChange={(e) => setSbForm({ ...sbForm, targetPort: e.target.value })} className="text-sm" data-testid="input-target-port" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Field Event Session</Label>
              <Select value={sbForm.sessionId || "none"} onValueChange={(v) => setSbForm({ ...sbForm, sessionId: v === "none" ? "" : v })}>
                <SelectTrigger className="text-sm" data-testid="select-session"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.evtEventName || `Session #${s.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Follow Device</Label>
              <Input placeholder="e.g. Throws" value={sbForm.followDeviceName} onChange={(e) => setSbForm({ ...sbForm, followDeviceName: e.target.value })} className="text-sm" data-testid="input-follow-device" />
              <p className="text-[11px] text-muted-foreground">Leave empty for all devices.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeSbModal}>Cancel</Button>
            <Button size="sm" onClick={handleSbSubmit} disabled={sbSubmitting}>
              {sbSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editingSb ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      <AlertDialog open={deletingSb !== null} onOpenChange={(open) => !open && setDeletingSb(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingSb?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the scoreboard connection.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingSb && deleteSb.mutate(deletingSb.id)} disabled={deleteSb.isPending}>
              {deleteSb.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
