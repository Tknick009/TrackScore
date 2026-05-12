/**
 * Field Events Dashboard — dark-themed professional timing interface.
 * Designed to feel like AthleticFIELD / professional sports management software.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Settings2,

  Wind,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  Ruler,
  ChevronDown,
  ChevronUp,
  X as XIcon,

} from "lucide-react";
import type { ExternalScoreboard, InsertExternalScoreboard, FieldEventSession, FieldHeight } from "@shared/schema";

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
// Event type detection helpers
// ---------------------------------------------------------------------------

function getEventType(name: string): "horizontal" | "vertical" | "unknown" {
  const n = name.toLowerCase();
  if (/high\s*jump|hj|pole\s*vault|pv/.test(n)) return "vertical";
  if (/long\s*jump|lj|triple\s*jump|tj|shot\s*put|sp|discus|disc|javelin|jav|hammer|weight\s*throw|wt/.test(n)) return "horizontal";
  return "unknown";
}

function getEventBadge(name: string): { abbr: string; color: string } {
  const n = name.toLowerCase();
  if (/shot\s*put|sp/.test(n)) return { abbr: "SP", color: "bg-orange-600" };
  if (/discus|disc/.test(n)) return { abbr: "DT", color: "bg-blue-600" };
  if (/javelin|jav/.test(n)) return { abbr: "JT", color: "bg-red-600" };
  if (/hammer|weight/.test(n)) return { abbr: "HT", color: "bg-amber-600" };
  if (/high\s*jump|hj/.test(n)) return { abbr: "HJ", color: "bg-violet-600" };
  if (/pole\s*vault|pv/.test(n)) return { abbr: "PV", color: "bg-indigo-600" };
  if (/long\s*jump|lj/.test(n)) return { abbr: "LJ", color: "bg-emerald-600" };
  if (/triple\s*jump|tj/.test(n)) return { abbr: "TJ", color: "bg-teal-600" };
  return { abbr: "FE", color: "bg-slate-600" };
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

  // Settings drawer
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Scoreboard state
  const [sbModalOpen, setSbModalOpen] = useState(false);
  const [editingSb, setEditingSb] = useState<ExternalScoreboard | null>(null);
  const [deletingSb, setDeletingSb] = useState<ExternalScoreboard | null>(null);
  const [sbForm, setSbForm] = useState<ScoreboardFormData>(emptyScoreboardForm);

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
    refetchInterval: 10000, // EVT file changes are infrequent
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<FieldEventSession[]>({
    queryKey: ["/api/field-sessions"],
    refetchInterval: 15000, // WS field_event_update handles real-time; polling is fallback
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
        description: result.updatedSessions > 0 ? `Updated ${result.updatedSessions} session(s).` : undefined,
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

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  const liveSessions = sessions.filter((s) => s.status === "in_progress");
  const checkInSessions = sessions.filter((s) => s.status === "check_in");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const setupSessions = sessions.filter((s) => s.status === "setup" || !s.status);
  const activeSb = scoreboards.filter((s) => s.isActive);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (configLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ═══════════════════════════════════════════════════════════════════
          TOP BAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-100 leading-tight">Field Events</h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                {sessions.length === 0 ? "No sessions" : `${sessions.length} event${sessions.length !== 1 ? "s" : ""} loaded`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => window.open("/Officiate", "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Officiate
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* ═══════════════════════════════════════════════════════════════
            STAT CARDS
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Live"
            value={liveSessions.length}
            icon={<Zap className="h-4 w-4" />}
            color="emerald"
            pulse={liveSessions.length > 0}
          />
          <StatCard
            label="Check-In"
            value={checkInSessions.length}
            icon={<Users className="h-4 w-4" />}
            color="amber"
          />
          <StatCard
            label="Setup"
            value={setupSessions.length}
            icon={<Clock className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label="Complete"
            value={completedSessions.length}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="slate"
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SCOREBOARD STATUS BAR
            ═══════════════════════════════════════════════════════════════ */}
        {scoreboards.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800">
            <Monitor className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-400">Scoreboards:</span>
            {scoreboards.map((sb) => (
              <span key={sb.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sb.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sb.isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
                {sb.name}
              </span>
            ))}
            <button
              className="ml-auto text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              onClick={() => setSettingsOpen(true)}
            >
              Manage →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            EVENT CARDS GRID
            ═══════════════════════════════════════════════════════════════ */}
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-slate-600" />
            </div>
            <h2 className="text-lg font-medium text-slate-300 mb-1">No Field Events</h2>
            <p className="text-sm text-slate-500 max-w-md mb-4">
              Configure your EVT directory in Settings to auto-provision events from FinishLynx, or sessions will appear here once created.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Open Settings
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <EventCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SETTINGS DRAWER
          ═══════════════════════════════════════════════════════════════════ */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="bg-slate-900 border-slate-800 text-slate-100 w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-slate-100">Field Event Settings</SheetTitle>
            <SheetDescription className="text-slate-400">EVT configuration and external scoreboard connections.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* EVT Config */}
            <section>
              <h3 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-500" />
                EVT Configuration
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">EVT Directory Path</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="/path/to/lynx/evt"
                      value={evtDir}
                      onChange={(e) => setEvtDir(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
                    />
                    <Button variant="outline" size="icon" className="shrink-0 bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200" onClick={() => refetchEvt()}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {evtEvents.length > 0 && (
                    <p className="text-[11px] text-emerald-400">{evtEvents.length} EVT files detected</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Results Directory (LFF Export)</Label>
                  <Input
                    placeholder="/path/to/results"
                    value={resultsDir}
                    onChange={(e) => setResultsDir(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-2 block">Horizontal Event Defaults</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Prelim</Label>
                      <Input type="number" min={1} max={10} value={prelimAttempts} onChange={(e) => setPrelimAttempts(parseInt(e.target.value) || 3)} className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider">To Finals</Label>
                      <Input type="number" min={1} max={24} value={finalists} onChange={(e) => setFinalists(parseInt(e.target.value) || 8)} className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Finals</Label>
                      <Input type="number" min={1} max={10} value={finalsAttempts} onChange={(e) => setFinalsAttempts(parseInt(e.target.value) || 3)} className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8" />
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={handleSaveConfig} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Configuration
                </Button>
              </div>
            </section>

            <Separator className="bg-slate-800" />

            {/* External Scoreboards */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-500" />
                  External Scoreboards
                </h3>
                <Button variant="outline" size="sm" className="h-7 bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs" onClick={openCreateSb} disabled={scoreboards.length >= 20}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>

              {sbLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                </div>
              ) : scoreboards.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  No scoreboards configured.
                </div>
              ) : (
                <div className="space-y-2">
                  {scoreboards.map((sb) => (
                    <div key={sb.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${sb.isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
                          <span className="text-sm font-medium text-slate-200 truncate">{sb.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 ml-4">{sb.targetIp}:{sb.targetPort}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {sb.isActive ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10" onClick={() => stopSb.mutate(sb.id)} title="Stop"><Square className="h-3 w-3" /></Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={() => startSb.mutate(sb.id)} title="Start"><Play className="h-3 w-3" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => sendSb.mutate(sb.id)} title="Send"><Send className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={() => openEditSb(sb)} title="Edit"><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeletingSb(sb)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════
          SCOREBOARD CREATE / EDIT DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={sbModalOpen} onOpenChange={(open) => !open && closeSbModal()}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingSb ? "Edit Scoreboard" : "Add Scoreboard"}</DialogTitle>
            <DialogDescription className="text-slate-400">Configure an LSS output connection for field event data.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Name *</Label>
              <Input placeholder="e.g. High Jump Display" value={sbForm.name} onChange={(e) => setSbForm({ ...sbForm, name: e.target.value })} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">LSS Directory</Label>
              <Input placeholder="/path/to/lss" value={sbForm.lssDirectory} onChange={(e) => setSbForm({ ...sbForm, lssDirectory: e.target.value })} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Target IP *</Label>
                <Input placeholder="192.168.1.100" value={sbForm.targetIp} onChange={(e) => setSbForm({ ...sbForm, targetIp: e.target.value })} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Target Port *</Label>
                <Input type="number" placeholder="5000" min={1} max={65535} value={sbForm.targetPort} onChange={(e) => setSbForm({ ...sbForm, targetPort: e.target.value })} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Field Event Session</Label>
              <Select value={sbForm.sessionId || "none"} onValueChange={(v) => setSbForm({ ...sbForm, sessionId: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none">None</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.evtEventName || `Session #${s.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Follow Device</Label>
              <Input placeholder="e.g. Throws" value={sbForm.followDeviceName} onChange={(e) => setSbForm({ ...sbForm, followDeviceName: e.target.value })} className="bg-slate-800 border-slate-700 text-slate-100 text-sm" />
              <p className="text-[11px] text-slate-500">Leave empty for all devices.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" onClick={closeSbModal}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleSbSubmit} disabled={sbSubmitting}>
              {sbSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editingSb ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION
          ═══════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={deletingSb !== null} onOpenChange={(open) => !open && setDeletingSb(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete "{deletingSb?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This will permanently remove the scoreboard connection.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white" onClick={() => deletingSb && deleteSb.mutate(deletingSb.id)} disabled={deleteSb.isPending}>
              {deleteSb.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "emerald" | "amber" | "blue" | "slate";
  pulse?: boolean;
}) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-500/5 border-emerald-500/20",
      icon: "text-emerald-400 bg-emerald-500/10",
      value: "text-emerald-400",
    },
    amber: {
      bg: "bg-amber-500/5 border-amber-500/20",
      icon: "text-amber-400 bg-amber-500/10",
      value: "text-amber-400",
    },
    blue: {
      bg: "bg-blue-500/5 border-blue-500/20",
      icon: "text-blue-400 bg-blue-500/10",
      value: "text-blue-400",
    },
    slate: {
      bg: "bg-slate-500/5 border-slate-500/20",
      icon: "text-slate-400 bg-slate-500/10",
      value: "text-slate-400",
    },
  };

  const c = colorMap[color];

  return (
    <div className={`relative rounded-xl border p-3 ${c.bg}`}>
      {pulse && value > 0 && (
        <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        <div>
          <p className={`text-xl font-bold tabular-nums leading-none ${c.value}`}>{value}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Card
// ---------------------------------------------------------------------------

function EventCard({ session }: { session: FieldEventSession }) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [showHeights, setShowHeights] = useState(false);
  const [newHeight, setNewHeight] = useState("");

  const handleSendResults = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSending(true);
    try {
      const res = await apiRequest("POST", `/api/field-sessions/${session.id}/export-lff`, {});
      const data = await res.json();
      toast({ title: "Results sent", description: data.filePath || "LFF exported successfully" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to export LFF";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    in_progress: {
      label: "LIVE",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
    check_in: {
      label: "CHECK-IN",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    setup: {
      label: "SETUP",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
    completed: {
      label: "COMPLETE",
      color: "text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
    },
  };

  const status = statusConfig[session.status || "setup"] || statusConfig.setup;
  const name = session.evtEventName || `Session #${session.id}`;
  const eventType = getEventType(name);

  return (
    <div className={`rounded-xl border ${status.border} ${status.bg} p-4 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-black/20`}>
      {/* Top row: emoji + name + status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getEventBadge(name).color} text-white text-xs font-bold`}>{getEventBadge(name).abbr}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{name}</h3>
            {session.evtEventNumber && (
              <p className="text-[11px] text-slate-500 font-mono">Event #{session.evtEventNumber}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${status.color} ${status.bg} border ${status.border}`}>
          {status.label}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span className="capitalize">{eventType}</span>
        <span>·</span>
        <span>{session.measurementUnit === "english" ? "Imperial" : "Metric"}</span>
        {session.recordWind && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5 text-blue-400">
              <Wind className="h-3 w-3" />Wind
            </span>
          </>
        )}
        {session.accessCode && (
          <>
            <span>·</span>
            <code className="font-mono text-slate-400">{session.accessCode}</code>
          </>
        )}
      </div>

      {/* Vertical heights progression */}
      {eventType === "vertical" && (
        <VerticalHeightsSection
          sessionId={session.id}
          showHeights={showHeights}
          setShowHeights={setShowHeights}
          newHeight={newHeight}
          setNewHeight={setNewHeight}
        />
      )}

      {/* Send Results button */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-1.5 w-full justify-center"
          disabled={isSending}
          onClick={handleSendResults}
        >
          {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Send Results
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vertical Heights Section (inline in event card)
// ---------------------------------------------------------------------------

function VerticalHeightsSection({
  sessionId,
  showHeights,
  setShowHeights,
  newHeight,
  setNewHeight,
}: {
  sessionId: number;
  showHeights: boolean;
  setShowHeights: (v: boolean) => void;
  newHeight: string;
  setNewHeight: (v: string) => void;
}) {
  const { toast } = useToast();

  const { data: heights = [], isLoading } = useQuery<FieldHeight[]>({
    queryKey: ["/api/field-sessions", sessionId, "heights"],
    enabled: showHeights,
  });

  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);

  const handleAddHeight = async () => {
    const val = parseFloat(newHeight);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Enter a valid height", variant: "destructive" });
      return;
    }
    const maxIndex = heights.length > 0 ? Math.max(...heights.map(h => h.heightIndex)) : -1;
    try {
      await apiRequest("POST", `/api/field-sessions/${sessionId}/heights`, {
        heightMeters: val,
        heightIndex: maxIndex + 1,
        isActive: true,
        isJumpOff: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "heights"] });
      setNewHeight("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to add height";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleDeleteHeight = async (heightId: number) => {
    try {
      await apiRequest("DELETE", `/api/field-heights/${heightId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "heights"] });
    } catch {
      toast({ title: "Failed to delete height", variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/50">
      <button
        className="flex items-center justify-between w-full text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
        onClick={() => setShowHeights(!showHeights)}
      >
        <span className="flex items-center gap-1.5">
          <Ruler className="h-3 w-3" />
          Height Progression {sortedHeights.length > 0 && `(${sortedHeights.length})`}
        </span>
        {showHeights ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {showHeights && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
          ) : (
            <>
              {sortedHeights.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sortedHeights.map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-mono"
                    >
                      {h.heightMeters.toFixed(2)}m
                      <button
                        onClick={() => handleDeleteHeight(h.id)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  step="0.01"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                  placeholder="Height (m)"
                  className="h-7 text-[11px] bg-slate-800 border-slate-700 text-slate-200 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHeight()}
                />
                <Button
                  size="sm"
                  className="h-7 px-2 text-[10px] bg-violet-600 hover:bg-violet-500"
                  onClick={handleAddHeight}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
