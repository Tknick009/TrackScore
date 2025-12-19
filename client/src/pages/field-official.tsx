import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Check, X, Minus, Loader2, ChevronDown, Users, Trophy, Grid3X3, Circle, MoreVertical, UserPlus, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { 
  FieldEventSession, 
  FieldEventSessionWithDetails,
  FieldEventAthlete, 
  FieldEventMark,
  InsertFieldEventMark,
  Athlete,
  Entry
} from "@shared/schema";

const SESSION_STORAGE_KEY = "field-official-session-id";

type EnrichedAthlete = FieldEventAthlete & { 
  entry?: Entry; 
  athlete?: Athlete;
};

function getAthleteDisplayInfo(athlete: EnrichedAthlete) {
  if (athlete.athlete) {
    return {
      name: `${athlete.athlete.firstName} ${athlete.athlete.lastName}`,
      bib: athlete.athlete.bibNumber || "-",
      team: (athlete.entry as any)?.team?.abbreviation || "",
    };
  }
  if (athlete.evtFirstName || athlete.evtLastName) {
    return {
      name: `${athlete.evtFirstName || ""} ${athlete.evtLastName || ""}`.trim() || "Unknown",
      bib: athlete.evtBibNumber || "-",
      team: athlete.evtTeam || "",
    };
  }
  return { name: "Unknown Athlete", bib: "-", team: "" };
}

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

function AthleteListItem({ 
  athlete, 
  isUp,
  marks,
  totalAttempts,
  bestMark,
  onClick,
  currentFlight,
  totalFlights,
  onMoveFlight,
}: { 
  athlete: EnrichedAthlete; 
  isUp: boolean;
  marks: FieldEventMark[];
  totalAttempts: number;
  bestMark: number | null;
  onClick: () => void;
  currentFlight: number;
  totalFlights: number;
  onMoveFlight: (athleteId: number, newFlight: number) => void;
}) {
  const info = getAthleteDisplayInfo(athlete);
  const flightOptions = Array.from({ length: totalFlights + 1 }, (_, i) => i + 1);

  return (
    <div
      className={`flex items-center gap-3 p-3 border-b border-border ${
        isUp ? "bg-green-50 dark:bg-green-950/30" : ""
      }`}
      data-testid={`athlete-row-${athlete.id}`}
    >
      {/* Status indicator */}
      <div className="w-16 shrink-0 text-center">
        {isUp ? (
          <Badge className="bg-green-600 text-white font-bold px-2 py-1">UP</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            {marks.length}/{totalAttempts}
          </span>
        )}
      </div>

      {/* Athlete info - clickable for mark entry */}
      <div 
        className="flex-1 min-w-0 cursor-pointer active:bg-muted/50" 
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{info.bib}</span>
          <span className="font-semibold truncate">{info.name}</span>
          <Badge variant="outline" className="text-xs">F{athlete.flightNumber || 1}</Badge>
        </div>
        {info.team && (
          <p className="text-xs text-muted-foreground truncate">{info.team}</p>
        )}
      </div>

      {/* Attempt dots */}
      <div className="flex gap-0.5 shrink-0">
        {Array.from({ length: totalAttempts }).map((_, i) => {
          const mark = marks[i];
          let bgColor = "bg-gray-300 dark:bg-gray-600";
          if (mark) {
            if (mark.markType === "mark") bgColor = "bg-green-500";
            else if (mark.markType === "foul") bgColor = "bg-red-500";
            else if (mark.markType === "pass") bgColor = "bg-yellow-500";
          }
          return <div key={i} className={`w-2.5 h-2.5 rounded-full ${bgColor}`} />;
        })}
      </div>

      {/* Best mark */}
      <div className="w-16 text-right shrink-0">
        {bestMark !== null ? (
          <span className="font-mono font-semibold text-sm">{bestMark.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0"
            data-testid={`button-athlete-menu-${athlete.id}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Move to Flight
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {flightOptions.map((flight) => (
                <DropdownMenuItem
                  key={flight}
                  disabled={flight === (athlete.flightNumber || 1)}
                  onClick={() => onMoveFlight(athlete.id, flight)}
                  data-testid={`menu-move-flight-${flight}`}
                >
                  Flight {flight}
                  {flight === (athlete.flightNumber || 1) && " (current)"}
                  {flight === totalFlights + 1 && " (new)"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MarkEntrySheet({
  athlete,
  attemptNumber,
  totalAttempts,
  onRecordMark,
  onClose,
  isPending
}: {
  athlete: EnrichedAthlete;
  attemptNumber: number;
  totalAttempts: number;
  onRecordMark: (markType: "mark" | "foul" | "pass", measurement?: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [measurement, setMeasurement] = useState("");
  const info = getAthleteDisplayInfo(athlete);

  const handleSubmit = (markType: "mark" | "foul" | "pass") => {
    onRecordMark(markType, markType === "mark" ? measurement : undefined);
    setMeasurement("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      
      {/* Sheet */}
      <div className="bg-card border-t-2 border-primary animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{info.bib}</Badge>
              <span className="font-bold text-lg">{info.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {info.team && `${info.team} • `}Attempt {attemptNumber} of {totalAttempts}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>

        {/* Input */}
        <div className="p-4">
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="Enter distance (meters)"
            value={measurement}
            onChange={(e) => setMeasurement(e.target.value)}
            className="h-16 text-2xl text-center font-mono"
            autoFocus
            data-testid="input-measurement"
          />
        </div>
        
        {/* Action buttons - large touch targets */}
        <div className="grid grid-cols-3 gap-2 p-4 pt-0">
          <Button
            onClick={() => handleSubmit("mark")}
            disabled={!measurement || isPending}
            className="h-16 text-lg bg-green-600 hover:bg-green-700"
            data-testid="button-record-mark"
          >
            <Check className="h-6 w-6 mr-2" />
            MARK
          </Button>
          <Button
            onClick={() => handleSubmit("foul")}
            disabled={isPending}
            className="h-16 text-lg bg-red-600 hover:bg-red-700"
            data-testid="button-record-foul"
          >
            <X className="h-6 w-6 mr-2" />
            FOUL
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit("pass")}
            disabled={isPending}
            className="h-16 text-lg"
            data-testid="button-record-pass"
          >
            <Minus className="h-6 w-6 mr-2" />
            PASS
          </Button>
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-4" />
      </div>
    </div>
  );
}

function StandingsView({ 
  athletes, 
  marks, 
  totalAttempts 
}: { 
  athletes: EnrichedAthlete[]; 
  marks: FieldEventMark[];
  totalAttempts: number;
}) {
  const getAthleteMarks = (athleteId: number) => {
    return marks.filter(m => m.athleteId === athleteId).sort((a, b) => a.attemptNumber - b.attemptNumber);
  };

  const getBestMark = (athleteId: number): number | null => {
    const athleteMarks = getAthleteMarks(athleteId);
    const validMarks = athleteMarks.filter(m => m.markType === "mark" && m.measurement).map(m => m.measurement as number);
    return validMarks.length > 0 ? Math.max(...validMarks) : null;
  };

  const rankedAthletes = [...athletes]
    .map(a => ({ athlete: a, best: getBestMark(a.id), marks: getAthleteMarks(a.id) }))
    .sort((a, b) => {
      if (a.best === null && b.best === null) return 0;
      if (a.best === null) return 1;
      if (b.best === null) return -1;
      return b.best - a.best;
    });

  return (
    <div className="divide-y">
      {rankedAthletes.map((item, index) => {
        const info = getAthleteDisplayInfo(item.athlete);
        return (
          <div key={item.athlete.id} className="flex items-center gap-3 p-3">
            <div className="w-8 text-center font-bold text-lg">
              {item.best !== null ? index + 1 : "-"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{info.name}</p>
              <p className="text-xs text-muted-foreground">{info.team || info.bib}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-lg">
                {item.best !== null ? item.best.toFixed(2) : "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.marks.filter(m => m.markType === "mark").length} marks
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewMarksView({ 
  athletes, 
  marks, 
  totalAttempts 
}: { 
  athletes: EnrichedAthlete[]; 
  marks: FieldEventMark[];
  totalAttempts: number;
}) {
  const getAthleteMarks = (athleteId: number) => {
    return marks.filter(m => m.athleteId === athleteId).sort((a, b) => a.attemptNumber - b.attemptNumber);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 sticky left-0 bg-background">Athlete</th>
            {Array.from({ length: totalAttempts }).map((_, i) => (
              <th key={i} className="text-center p-2 min-w-16">{i + 1}</th>
            ))}
            <th className="text-center p-2">Best</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map(athlete => {
            const info = getAthleteDisplayInfo(athlete);
            const athleteMarks = getAthleteMarks(athlete.id);
            const validMarks = athleteMarks.filter(m => m.markType === "mark" && m.measurement);
            const best = validMarks.length > 0 ? Math.max(...validMarks.map(m => m.measurement as number)) : null;

            return (
              <tr key={athlete.id} className="border-b">
                <td className="p-2 sticky left-0 bg-background">
                  <div className="font-semibold truncate max-w-32">{info.name}</div>
                </td>
                {Array.from({ length: totalAttempts }).map((_, i) => {
                  const mark = athleteMarks.find(m => m.attemptNumber === i + 1);
                  let content = "-";
                  let className = "text-muted-foreground";
                  if (mark) {
                    if (mark.markType === "mark" && mark.measurement) {
                      content = mark.measurement.toFixed(2);
                      className = "font-mono";
                    } else if (mark.markType === "foul") {
                      content = "X";
                      className = "text-red-500 font-bold";
                    } else if (mark.markType === "pass") {
                      content = "P";
                      className = "text-yellow-600 font-bold";
                    }
                  }
                  return (
                    <td key={i} className={`text-center p-2 ${className}`}>
                      {content}
                    </td>
                  );
                })}
                <td className="text-center p-2 font-mono font-bold">
                  {best !== null ? best.toFixed(2) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddAthleteDialog({
  isOpen,
  onClose,
  sessionId,
  totalFlights,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  totalFlights: number;
}) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bibNumber, setBibNumber] = useState("");
  const [team, setTeam] = useState("");
  const [flight, setFlight] = useState("1");

  const addAthleteMutation = useMutation({
    mutationFn: async (data: {
      evtFirstName: string;
      evtLastName: string;
      evtBibNumber: string;
      evtTeam: string;
      flightNumber: number;
      orderInFlight: number;
    }) => apiRequest("POST", `/api/field-sessions/${sessionId}/athletes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      toast({ title: "Athlete added" });
      setFirstName("");
      setLastName("");
      setBibNumber("");
      setTeam("");
      setFlight("1");
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
    const flightAthletes = athletes.filter((a: any) => (a.flightNumber || 1) === parseInt(flight));
    const maxOrder = flightAthletes.reduce((max: number, a: any) => Math.max(max, a.orderInFlight || 0), 0);
    
    addAthleteMutation.mutate({
      evtFirstName: firstName.trim(),
      evtLastName: lastName.trim(),
      evtBibNumber: bibNumber.trim(),
      evtTeam: team.trim(),
      flightNumber: parseInt(flight),
      orderInFlight: maxOrder + 1,
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                data-testid="input-add-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                data-testid="input-add-lastname"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bib Number</Label>
              <Input
                value={bibNumber}
                onChange={(e) => setBibNumber(e.target.value)}
                placeholder="Bib #"
                data-testid="input-add-bib"
              />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Team name"
                data-testid="input-add-team"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Flight</Label>
            <Select value={flight} onValueChange={setFlight}>
              <SelectTrigger data-testid="select-add-flight">
                <SelectValue />
              </SelectTrigger>
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
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-add">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addAthleteMutation.isPending}
            data-testid="button-confirm-add"
          >
            {addAthleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Athlete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("officiate");
  const [showAddAthlete, setShowAddAthlete] = useState(false);

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
      apiRequest("POST", "/api/field-marks", mark),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/field-sessions", sessionId, "marks"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/field-sessions", sessionId, "athletes"] 
      });
      toast({ title: "Mark recorded" });
      setSelectedAthleteId(null);
    },
    onError: () => {
      toast({
        title: "Failed to record mark",
        variant: "destructive",
      });
    },
  });

  const moveFlightMutation = useMutation({
    mutationFn: async ({ athleteId, newFlight }: { athleteId: number; newFlight: number }) => {
      const flightAthletes = (athletes || []).filter(a => (a.flightNumber || 1) === newFlight);
      const maxOrder = flightAthletes.reduce((max, a) => Math.max(max, a.orderInFlight || 0), 0);
      return apiRequest("PATCH", `/api/field-athletes/${athleteId}`, {
        flightNumber: newFlight,
        orderInFlight: maxOrder + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      toast({ title: "Athlete moved to new flight" });
    },
    onError: () => {
      toast({ title: "Failed to move athlete", variant: "destructive" });
    },
  });

  const handleMoveFlight = (athleteId: number, newFlight: number) => {
    moveFlightMutation.mutate({ athleteId, newFlight });
  };

  const handleLeave = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    onLeave();
  };

  const activeAthletes = athletes?.filter(
    (a) => a.checkInStatus === "checked_in" && a.competitionStatus !== "completed" && a.competitionStatus !== "dns"
  ) || [];
  
  const sortedAthletes = [...activeAthletes].sort((a, b) => {
    if (a.flightNumber !== b.flightNumber) {
      return (a.flightNumber || 1) - (b.flightNumber || 1);
    }
    return a.orderInFlight - b.orderInFlight;
  });

  const selectedAthlete = sortedAthletes.find(a => a.id === selectedAthleteId);
  
  const getAthleteMarks = (athleteId: number) => {
    return (marks || [])
      .filter(m => m.athleteId === athleteId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  };

  const getAthleteBestMark = (athleteId: number): number | null => {
    const athleteMarks = getAthleteMarks(athleteId);
    const validMarks = athleteMarks
      .filter(m => m.markType === "mark" && m.measurement)
      .map(m => m.measurement as number);
    return validMarks.length > 0 ? Math.max(...validMarks) : null;
  };

  const totalAttempts = session?.totalAttempts || 6;
  
  const selectedAthleteMarks = selectedAthlete ? getAthleteMarks(selectedAthlete.id) : [];
  const nextAttemptNumber = selectedAthleteMarks.length + 1;

  // Find who should be "Up" (first athlete with fewest attempts)
  const getUpAthlete = () => {
    if (sortedAthletes.length === 0) return null;
    const minAttempts = Math.min(...sortedAthletes.map(a => getAthleteMarks(a.id).length));
    return sortedAthletes.find(a => getAthleteMarks(a.id).length === minAttempts);
  };
  const upAthlete = getUpAthlete();

  const recordMark = (markType: "mark" | "foul" | "pass", measurement?: string) => {
    if (!selectedAthlete) return;

    const markData: InsertFieldEventMark = {
      sessionId,
      athleteId: selectedAthlete.id,
      attemptNumber: nextAttemptNumber,
      markType,
      measurement: markType === "mark" && measurement 
        ? parseFloat(measurement) 
        : undefined,
    };

    submitMarkMutation.mutate(markData);
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

  const eventName = session.event?.name || "Field Event";
  const totalFlights = Math.max(...(athletes?.map(a => a.flightNumber || 1) || [1]));
  const currentFlight = session.currentFlightNumber || 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-3 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-bold truncate" data-testid="text-event-name">
              {eventName}
            </h1>
            <p className="text-xs opacity-80">
              Flight {currentFlight} of {totalFlights} • {sortedAthletes.length} athletes
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowAddAthlete(true)}
            className="shrink-0 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-add-athlete"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLeave}
            className="shrink-0 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-leave-session"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b h-12 bg-background">
          <TabsTrigger value="officiate" className="flex-1 gap-1 data-[state=active]:bg-muted">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Officiate</span>
          </TabsTrigger>
          <TabsTrigger value="standings" className="flex-1 gap-1 data-[state=active]:bg-muted">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Standings</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="flex-1 gap-1 data-[state=active]:bg-muted">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Review</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="officiate" className="flex-1 m-0 overflow-auto">
          {sortedAthletes.length > 0 ? (
            <div className="divide-y">
              {sortedAthletes.map((athlete) => (
                <AthleteListItem
                  key={athlete.id}
                  athlete={athlete}
                  isUp={upAthlete?.id === athlete.id}
                  marks={getAthleteMarks(athlete.id)}
                  totalAttempts={totalAttempts}
                  bestMark={getAthleteBestMark(athlete.id)}
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  currentFlight={currentFlight}
                  totalFlights={totalFlights}
                  onMoveFlight={handleMoveFlight}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-lg">No athletes checked in</p>
              <p className="text-sm text-muted-foreground mt-2">
                Athletes will appear here once they check in
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setShowAddAthlete(true)}
                data-testid="button-add-athlete-empty"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Athlete
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="standings" className="flex-1 m-0 overflow-auto">
          <StandingsView 
            athletes={sortedAthletes} 
            marks={marks || []} 
            totalAttempts={totalAttempts} 
          />
        </TabsContent>

        <TabsContent value="review" className="flex-1 m-0 overflow-auto">
          <ReviewMarksView 
            athletes={sortedAthletes} 
            marks={marks || []} 
            totalAttempts={totalAttempts} 
          />
        </TabsContent>
      </Tabs>

      {/* Mark entry sheet */}
      {selectedAthlete && (
        <MarkEntrySheet
          athlete={selectedAthlete}
          attemptNumber={nextAttemptNumber}
          totalAttempts={totalAttempts}
          onRecordMark={recordMark}
          onClose={() => setSelectedAthleteId(null)}
          isPending={submitMarkMutation.isPending}
        />
      )}

      {/* Add Athlete Dialog */}
      <AddAthleteDialog
        isOpen={showAddAthlete}
        onClose={() => setShowAddAthlete(false)}
        sessionId={sessionId}
        totalFlights={totalFlights}
      />
    </div>
  );
}

export default function FieldOfficialPage() {
  const [, params] = useRoute("/field/:codeOrId");
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    const codeOrId = params?.codeOrId;
    
    if (codeOrId) {
      const numericId = parseInt(codeOrId, 10);
      if (!isNaN(numericId) && String(numericId) === codeOrId) {
        setSessionId(numericId);
        sessionStorage.setItem(SESSION_STORAGE_KEY, String(numericId));
        return;
      }
    }
    
    const storedId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedId) {
      setSessionId(parseInt(storedId, 10));
    }
  }, [params?.codeOrId]);

  const handleJoin = (id: number) => {
    setSessionId(id);
  };

  const handleLeave = () => {
    setSessionId(null);
  };

  if (sessionId) {
    return <FieldEntryUI sessionId={sessionId} onLeave={handleLeave} />;
  }

  const accessCode = params?.codeOrId && isNaN(parseInt(params.codeOrId, 10)) ? params.codeOrId : undefined;
  return <JoinSession onJoin={handleJoin} initialCode={accessCode} />;
}
