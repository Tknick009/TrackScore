import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import {
  X,
  Settings,
  UserPlus,
  Star,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  Trash2,
  Ruler,
  LogOut,
  Activity,
} from "lucide-react";
import type {
  FieldEventSession,
  FieldEventSessionWithDetails,
  FieldEventMark,
  FieldHeight,
  InsertFieldEventMark,
} from "@shared/schema";
import { isHeightEvent } from "@shared/schema";
import { useFieldSession, type EnrichedAthlete, getAthleteDisplayInfo } from "@/hooks/useFieldSession";
import HorizontalEventPanel from "@/components/field/HorizontalEventPanel";
import VerticalEventPanel from "@/components/field/VerticalEventPanel";

const SESSION_STORAGE_KEY = "field_official_session";
const DEVICE_NAME_KEY = "fieldDeviceName";

// ==================== JOIN SESSION VIEW ====================

function JoinSession({ onJoin }: { onJoin: (sessionId: number) => void }) {
  const [deviceName, setDeviceName] = useState<string>(() => {
    return localStorage.getItem(DEVICE_NAME_KEY) || "";
  });

  const handleDeviceNameChange = (value: string) => {
    setDeviceName(value);
    localStorage.setItem(DEVICE_NAME_KEY, value);
  };

  const { data: meets, isLoading: meetsLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/meets"],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<FieldEventSession[]>({
    queryKey: ["/api/field-sessions"],
    refetchInterval: 10000,
  });

  const handleSelectEvent = (sessionId: number) => {
    if (!deviceName.trim()) {
      localStorage.setItem(DEVICE_NAME_KEY, "Field Official");
      setDeviceName("Field Official");
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, String(sessionId));
    onJoin(sessionId);
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
      <div className="text-center">
        <Activity className="h-10 w-10 mx-auto text-primary mb-3" />
        <h1 className="text-2xl font-bold">Field Command Center</h1>
        <p className="text-muted-foreground mt-1">Select an event to begin officiating</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="device-name">Device Name</Label>
        <Input
          id="device-name"
          value={deviceName}
          onChange={(e) => handleDeviceNameChange(e.target.value)}
          placeholder="e.g., iPad #1"
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">Identifies this device in activity logs</p>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Active Events</h2>
        {sessionsLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="p-6 text-center border rounded-lg">
            <p className="text-muted-foreground">No active field events. Create one from the meet control page.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const name = s.evtEventName || "Unnamed Event";
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectEvent(s.id)}
                  className="w-full p-4 rounded-lg border hover:bg-muted/50 active:bg-muted transition-colors text-left flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-base">{name}</p>
                    <p className="text-sm text-muted-foreground">Session #{s.id}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ADD ATHLETE DIALOG ====================

function AddAthleteDialog({
  isOpen,
  onClose,
  sessionId,
  totalFlights,
  meetId,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  totalFlights: number;
  meetId?: string;
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bibNumber, setBibNumber] = useState("");
  const [team, setTeam] = useState("");
  const [flight, setFlight] = useState("1");

  const effectiveMeetId = meetId || sessionStorage.getItem("field_app_meet_id") || undefined;

  const { data: searchResults = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string; bibNumber?: string; teamName?: string }>>({
    queryKey: ["/api/athletes", { meetId: effectiveMeetId, search: searchQuery }],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const params = new URLSearchParams();
      if (effectiveMeetId) params.append("meetId", String(effectiveMeetId));
      params.append("search", searchQuery);
      const res = await fetch(`/api/athletes?${params.toString()}`);
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const selectAthlete = (athlete: { firstName?: string; lastName?: string; bibNumber?: string; teamName?: string; team?: string }) => {
    setFirstName(athlete.firstName || "");
    setLastName(athlete.lastName || "");
    setBibNumber(athlete.bibNumber || "");
    setTeam(athlete.teamName || athlete.team || "");
    setSearchQuery("");
    setShowDropdown(false);
  };

  const addAthleteMutation = useMutation({
    mutationFn: async (data: {
      evtFirstName: string;
      evtLastName: string;
      evtBibNumber: string;
      evtTeam: string;
      flightNumber: number;
      orderInFlight: number;
      checkInStatus: string;
      competitionStatus: string;
    }) => apiRequest("POST", `/api/field-sessions/${sessionId}/athletes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      setFirstName("");
      setLastName("");
      setBibNumber("");
      setTeam("");
      setFlight("1");
      setSearchQuery("");
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to add athlete", variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const athletesRes = await fetch(`/api/field-sessions/${sessionId}/athletes`);
    const athletes = await athletesRes.json();
    const maxOrder = athletes.reduce((max: number, a: { orderInFlight?: number }) => Math.max(max, a.orderInFlight || 0), 0);

    addAthleteMutation.mutate({
      evtFirstName: firstName.trim(),
      evtLastName: lastName.trim(),
      evtBibNumber: bibNumber.trim(),
      evtTeam: team.trim(),
      flightNumber: parseInt(flight),
      orderInFlight: maxOrder + 1,
      checkInStatus: "checked_in",
      competitionStatus: "competing",
    });
  };

  const flightOptions = Array.from({ length: totalFlights + 1 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Athlete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 relative">
            <Label>Search Athlete</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(e.target.value.length >= 2);
                }}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search by name or bib..."
                className="pl-10"
              />
            </div>
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.slice(0, 10).map((athlete) => (
                  <button
                    key={athlete.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                    onMouseDown={() => selectAthlete(athlete)}
                  >
                    <span className="font-medium">{athlete.firstName} {athlete.lastName}</span>
                    <span className="text-sm text-muted-foreground">
                      {athlete.bibNumber && `#${athlete.bibNumber}`} {athlete.teamName && `- ${athlete.teamName}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">Or enter manually:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bib Number</Label>
              <Input value={bibNumber} onChange={(e) => setBibNumber(e.target.value)} placeholder="Bib #" />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Flight</Label>
            <Select value={flight} onValueChange={setFlight}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {flightOptions.map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    Flight {f} {f === totalFlights + 1 ? "(new)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={addAthleteMutation.isPending}>
            {addAthleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Athlete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== GENERATE FINALS DIALOG ====================

function GenerateFinalsDialog({
  isOpen,
  onClose,
  sessionId,
  athletes,
  marks,
  defaultCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  athletes: EnrichedAthlete[];
  marks: FieldEventMark[];
  defaultCount: number;
}) {
  const { toast } = useToast();
  const [count, setCount] = useState(defaultCount);

  const getBestMark = (athleteId: number): number | null => {
    const athleteMarks = marks.filter(m => m.athleteId === athleteId);
    const validMarks = athleteMarks.filter(m => m.markType === "mark" && m.measurement).map(m => m.measurement as number);
    return validMarks.length > 0 ? Math.max(...validMarks) : null;
  };

  const rankedAthletes = [...athletes]
    .filter(a => a.checkInStatus === "checked_in" && a.competitionStatus !== "dns")
    .map(a => ({ athlete: a, best: getBestMark(a.id) }))
    .sort((a, b) => {
      if (a.best === null && b.best === null) return 0;
      if (a.best === null) return 1;
      if (b.best === null) return -1;
      return b.best - a.best;
    });

  const finalists = rankedAthletes.slice(0, count);

  const generateFinalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/field-sessions/${sessionId}/generate-finals`, { count });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Generate Finals
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="finalist-count">Number of Finalists</Label>
            <Input
              id="finalist-count"
              type="number"
              min={1}
              max={rankedAthletes.length}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(rankedAthletes.length, parseInt(e.target.value) || 1)))}
              className="mt-1"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <div className="p-2 bg-muted text-sm font-medium sticky top-0">Athletes Advancing</div>
            {finalists.map((item, index) => {
              const info = getAthleteDisplayInfo(item.athlete);
              return (
                <div key={item.athlete.id} className="flex items-center gap-2 p-2 border-t">
                  <div className="w-6 text-center font-bold text-sm">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{info.name}</p>
                  </div>
                  <div className="text-sm font-mono">{item.best !== null ? item.best.toFixed(2) : "-"}</div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => generateFinalsMutation.mutate()}
            disabled={generateFinalsMutation.isPending || finalists.length === 0}
          >
            {generateFinalsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Finals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== EVENT SETTINGS DIALOG ====================

function EventSettingsDialog({
  isOpen,
  onClose,
  session,
  isVertical,
}: {
  isOpen: boolean;
  onClose: () => void;
  session: FieldEventSessionWithDetails;
  isVertical: boolean;
}) {
  const { toast } = useToast();
  const [prelimAttempts, setPrelimAttempts] = useState(session.prelimAttempts || 3);
  const [finalsAttempts, setFinalsAttempts] = useState(session.finalsAttempts || 3);
  const [athletesToFinals, setAthletesToFinals] = useState(session.athletesToFinals || 8);
  const [measurementUnit, setMeasurementUnit] = useState(session.measurementUnit || 'metric');
  const [recordWind, setRecordWind] = useState(session.recordWind || false);
  const [showBibNumbers, setShowBibNumbers] = useState(session.showBibNumbers !== false);
  const [aliveGroupSize, setAliveGroupSize] = useState(session.aliveGroupSize || 5);
  const [stopAliveAtCount, setStopAliveAtCount] = useState(session.stopAliveAtCount || 3);

  useEffect(() => {
    if (isOpen) {
      setPrelimAttempts(session.prelimAttempts || 3);
      setFinalsAttempts(session.finalsAttempts || 3);
      setAthletesToFinals(session.athletesToFinals || 8);
      setMeasurementUnit(session.measurementUnit || 'metric');
      setRecordWind(session.recordWind || false);
      setShowBibNumbers(session.showBibNumbers !== false);
      setAliveGroupSize(session.aliveGroupSize || 5);
      setStopAliveAtCount(session.stopAliveAtCount || 3);
    }
  }, [isOpen, session]);

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const deviceName = localStorage.getItem(DEVICE_NAME_KEY) || undefined;
      const updates: Record<string, unknown> = {
        measurementUnit,
        recordWind,
        showBibNumbers,
        deviceName,
      };
      if (isVertical) {
        updates.aliveGroupSize = aliveGroupSize;
        updates.stopAliveAtCount = stopAliveAtCount;
      } else {
        updates.prelimAttempts = prelimAttempts;
        updates.finalsAttempts = finalsAttempts;
        updates.athletesToFinals = athletesToFinals;
        updates.totalAttempts = prelimAttempts + finalsAttempts;
      }
      return apiRequest("PATCH", `/api/field-sessions/${session.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", session.id, "full"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save settings", variant: "destructive" });
    },
  });

  // Delete finals
  const [showDeleteFinals, setShowDeleteFinals] = useState(false);
  const [deleteFinalsMarks, setDeleteFinalsMarks] = useState(true);

  const deleteFinalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/field-sessions/${session.id}/finals`, {
        deleteFinalsMarks: deleteFinalsMarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", session.id, "full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", session.id, "athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", session.id, "marks"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete finals", variant: "destructive" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Event Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Measurement Unit</Label>
            <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (meters)</SelectItem>
                <SelectItem value="english">English (feet/inches)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isVertical ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prelim Attempts</Label>
                  <Input type="number" min={1} max={10} value={prelimAttempts} onChange={(e) => setPrelimAttempts(parseInt(e.target.value) || 3)} className="mt-1" />
                </div>
                <div>
                  <Label>Finals Attempts</Label>
                  <Input type="number" min={1} max={10} value={finalsAttempts} onChange={(e) => setFinalsAttempts(parseInt(e.target.value) || 3)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Athletes to Finals</Label>
                <Input type="number" min={1} max={20} value={athletesToFinals} onChange={(e) => setAthletesToFinals(parseInt(e.target.value) || 8)} className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="record-wind" checked={recordWind} onChange={(e) => setRecordWind(e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="record-wind">Record Wind</Label>
              </div>
              {session.isInFinals && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2 text-destructive">Danger Zone</p>
                  {!showDeleteFinals ? (
                    <Button variant="destructive" onClick={() => setShowDeleteFinals(true)} className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Finals
                    </Button>
                  ) : (
                    <div className="space-y-3 p-3 border border-destructive rounded-md bg-destructive/5">
                      <p className="text-sm font-medium">Are you sure?</p>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="delete-finals-marks" checked={deleteFinalsMarks} onChange={(e) => setDeleteFinalsMarks(e.target.checked)} className="h-4 w-4" />
                        <Label htmlFor="delete-finals-marks" className="text-sm">Also delete finals marks</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowDeleteFinals(false)} className="flex-1">Cancel</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteFinalsMutation.mutate()} disabled={deleteFinalsMutation.isPending} className="flex-1">
                          {deleteFinalsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Alive Group Size</Label>
                <Input type="number" min={1} max={20} value={aliveGroupSize} onChange={(e) => setAliveGroupSize(parseInt(e.target.value) || 5)} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Athletes jumping together</p>
              </div>
              <div>
                <Label>Stop Alive At</Label>
                <Input type="number" min={1} max={10} value={stopAliveAtCount} onChange={(e) => setStopAliveAtCount(parseInt(e.target.value) || 3)} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Resume rotation when X remain</p>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Display Settings</p>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="show-bib-numbers" checked={showBibNumbers} onChange={(e) => setShowBibNumbers(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="show-bib-numbers">Show Competitor Numbers</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => updateSettingsMutation.mutate()} disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== HEIGHTS DIALOG ====================

function HeightsDialog({
  isOpen,
  onClose,
  sessionId,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
}) {
  const { toast } = useToast();
  const [newHeightValue, setNewHeightValue] = useState("");

  const { data: heights = [], isLoading, refetch } = useQuery<FieldHeight[]>({
    queryKey: ["/api/field-sessions", sessionId, "heights"],
    enabled: isOpen,
  });

  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);

  const handleAddHeight = async () => {
    const val = parseFloat(newHeightValue);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Enter a valid height", variant: "destructive" });
      return;
    }
    const deviceName = localStorage.getItem(DEVICE_NAME_KEY) || undefined;
    const maxIndex = heights.length > 0 ? Math.max(...heights.map(h => h.heightIndex)) : -1;
    try {
      await apiRequest("POST", `/api/field-sessions/${sessionId}/heights`, {
        heightMeters: val,
        heightIndex: maxIndex + 1,
        isActive: true,
        isJumpOff: false,
        deviceName,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "heights"] });
      setNewHeightValue("");
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Manage Heights
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedHeights.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-mono font-semibold">{h.heightMeters.toFixed(2)}m</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteHeight(h.id)} className="text-destructive h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {sortedHeights.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No heights added yet</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={newHeightValue}
              onChange={(e) => setNewHeightValue(e.target.value)}
              placeholder="Height in meters (e.g. 1.50)"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddHeight()}
            />
            <Button onClick={handleAddHeight}>Add</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== EVENT TAB CONTENT (wraps hook + panel) ====================

function EventTabContent({ sessionId }: { sessionId: number }) {
  const fs = useFieldSession(sessionId);

  if (fs.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (fs.sessionError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive font-semibold">Failed to load session</p>
          <p className="text-sm text-muted-foreground mt-1">Session may have been deleted</p>
        </div>
      </div>
    );
  }

  if (fs.isVertical) {
    return <VerticalEventPanel fs={fs} />;
  }

  return <HorizontalEventPanel fs={fs} />;
}

// ==================== MAIN FIELD COMMAND CENTER ====================

export default function FieldCommandCenter() {
  const [, setLocation] = useLocation();
  const ws = useWebSocket();

  // All active sessions
  const { data: allSessions } = useQuery<FieldEventSession[]>({
    queryKey: ["/api/field-sessions"],
    refetchInterval: 15000,
  });

  // Active tab state — stores session IDs that the user has opened
  const [openTabs, setOpenTabs] = useState<number[]>(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? [parseInt(stored)] : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<number | null>(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? parseInt(stored) : null;
  });

  // UI state
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [showGenerateFinals, setShowGenerateFinals] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHeightsDialog, setShowHeightsDialog] = useState(false);

  // Current active session data for header controls
  const activeFs = activeSessionId ? useFieldSession(activeSessionId) : null;

  // WebSocket listener for session list updates
  useEffect(() => {
    if (!ws) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "field_session_update" || data.type === "field_session_created" || data.type === "field_session_deleted") {
          queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
        }
      } catch {
        // ignore
      }
    };
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  // Open a session tab
  const openSession = useCallback((sessionId: number) => {
    setOpenTabs(prev => {
      if (prev.includes(sessionId)) return prev;
      return [...prev, sessionId];
    });
    setActiveSessionId(sessionId);
    sessionStorage.setItem(SESSION_STORAGE_KEY, String(sessionId));
  }, []);

  // Close a session tab
  const closeTab = useCallback((sessionId: number) => {
    setOpenTabs(prev => {
      const next = prev.filter(id => id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(next.length > 0 ? next[next.length - 1] : null);
        if (next.length > 0) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, String(next[next.length - 1]));
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
      return next;
    });
  }, [activeSessionId]);

  // If no tabs are open and no active session, show join view
  if (openTabs.length === 0 || activeSessionId === null) {
    return <JoinSession onJoin={openSession} />;
  }

  // Get session names for tabs
  const getSessionName = (sessionId: number) => {
    const session = allSessions?.find(s => s.id === sessionId);
    return session?.evtEventName || `Session #${sessionId}`;
  };

  // Determine if active session is vertical (for showing Heights button)
  const isActiveVertical = activeFs?.isVertical || false;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* PERSISTENT EVENT TABS BAR */}
      <div className="bg-muted border-b shrink-0">
        <div className="flex items-center">
          {/* Event tabs */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-stretch min-w-max">
              {openTabs.map((tabSessionId) => {
                const isActive = tabSessionId === activeSessionId;
                const name = getSessionName(tabSessionId);
                return (
                  <div
                    key={tabSessionId}
                    className={`group flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 border-r cursor-pointer transition-colors ${
                      isActive
                        ? "bg-background border-b-2 border-b-primary font-semibold text-primary"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                    onClick={() => {
                      setActiveSessionId(tabSessionId);
                      sessionStorage.setItem(SESSION_STORAGE_KEY, String(tabSessionId));
                    }}
                  >
                    <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px]">{name}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity p-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tabSessionId);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {/* "+" button to add more event tabs */}
              <DropdownAddTab
                allSessions={allSessions || []}
                openTabs={openTabs}
                onAdd={openSession}
              />
            </div>
          </div>

          {/* Action buttons - always visible */}
          <div className="flex items-center gap-1 px-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setShowAddAthlete(true)}
              title="Add Athlete"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            {!isActiveVertical && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setShowGenerateFinals(true)}
                title="Generate Finals"
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            {isActiveVertical && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setShowHeightsDialog(true)}
                title="Manage Heights"
              >
                <Ruler className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* EVENT CONTENT */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Only render the active tab's content */}
        {activeSessionId && <EventTabContent key={activeSessionId} sessionId={activeSessionId} />}
      </div>

      {/* DIALOGS */}
      {activeFs?.session && (
        <>
          <AddAthleteDialog
            isOpen={showAddAthlete}
            onClose={() => setShowAddAthlete(false)}
            sessionId={activeSessionId}
            totalFlights={activeFs.totalFlights}
            meetId={sessionStorage.getItem("field_app_meet_id") || undefined}
          />

          {!isActiveVertical && (
            <GenerateFinalsDialog
              isOpen={showGenerateFinals}
              onClose={() => setShowGenerateFinals(false)}
              sessionId={activeSessionId}
              athletes={activeFs.athletes}
              marks={activeFs.marks}
              defaultCount={activeFs.session.athletesToFinals || 8}
            />
          )}

          <EventSettingsDialog
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            session={activeFs.session}
            isVertical={isActiveVertical}
          />

          {isActiveVertical && (
            <HeightsDialog
              isOpen={showHeightsDialog}
              onClose={() => setShowHeightsDialog(false)}
              sessionId={activeSessionId}
            />
          )}
        </>
      )}
    </div>
  );
}

// ==================== DROPDOWN ADD TAB ====================

function DropdownAddTab({
  allSessions,
  openTabs,
  onAdd,
}: {
  allSessions: FieldEventSession[];
  openTabs: number[];
  onAdd: (sessionId: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const unopenedSessions = allSessions.filter(s => !openTabs.includes(s.id));

  if (unopenedSessions.length === 0 && allSessions.length > 0) {
    return null; // All sessions are already open
  }

  return (
    <div className="relative">
      <button
        className="flex items-center justify-center px-3 py-2 sm:py-2.5 border-r hover:bg-background/50 text-muted-foreground transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg font-bold">+</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 bg-background border rounded-md shadow-lg min-w-[200px] max-h-64 overflow-y-auto">
            {unopenedSessions.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No more events available</div>
            ) : (
              unopenedSessions.map((s) => (
                <button
                  key={s.id}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                  onClick={() => {
                    onAdd(s.id);
                    setIsOpen(false);
                  }}
                >
                  {s.evtEventName || `Session #${s.id}`}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
