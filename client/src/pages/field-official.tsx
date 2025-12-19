import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Check, X, Minus, Loader2, ChevronDown, ChevronLeft, ChevronRight, Users, Trophy, Grid3X3, Circle, MoreVertical, UserPlus, ArrowRightLeft, Search, Star, Pencil, Trash2, Ruler, GripVertical, Plus, Settings, Delete } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogDescription } from "@/components/ui/dialog";
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
  FieldHeight,
  Athlete,
  Entry
} from "@shared/schema";
import { isHeightEvent } from "@shared/schema";

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

function metersToFeetInches(meters: number): string {
  const totalInches = meters * 39.3701;
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;
  const wholeInches = Math.floor(remainingInches);
  const fraction = remainingInches - wholeInches;
  
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

// Local height type for client-side state
type LocalHeight = {
  tempKey: string;
  heightIndex: number;
  heightMeters: number;
  isActive: boolean;
  isJumpOff: boolean;
};

function HeightsDialog({ 
  sessionId, 
  open, 
  onOpenChange 
}: { 
  sessionId: number; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [newHeightMeters, setNewHeightMeters] = useState("");
  const [localHeights, setLocalHeights] = useState<LocalHeight[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  const { data: heights = [], isLoading, refetch } = useQuery<FieldHeight[]>({
    queryKey: ["/api/field-sessions", sessionId, "heights"],
    queryFn: () => fetch(`/api/field-sessions/${sessionId}/heights`).then(r => r.json()),
    enabled: open,
  });

  useEffect(() => {
    if (open && heights.length > 0) {
      const sorted = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
      setLocalHeights(sorted.map(h => ({
        tempKey: `server-${h.id}`,
        heightIndex: h.heightIndex,
        heightMeters: typeof h.heightMeters === 'string' ? parseFloat(h.heightMeters) : h.heightMeters,
        isActive: h.isActive ?? true,
        isJumpOff: h.isJumpOff ?? false,
      })));
    } else if (open && heights.length === 0 && !isLoading) {
      setLocalHeights([]);
    }
  }, [heights, open, isLoading]);

  // Auto-scroll to bottom when new height is added
  useEffect(() => {
    if (shouldScrollToBottom && scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom, localHeights]);

  const handleAddHeight = () => {
    const meters = parseFloat(newHeightMeters);
    if (isNaN(meters) || meters <= 0) {
      toast({ title: "Invalid height", description: "Please enter a valid height in meters", variant: "destructive" });
      return;
    }
    
    const newHeight: LocalHeight = {
      tempKey: `new-${Date.now()}`,
      heightIndex: localHeights.length,
      heightMeters: meters,
      isActive: true,
      isJumpOff: false,
    };
    
    const updatedHeights = [...localHeights, newHeight].sort((a, b) => a.heightMeters - b.heightMeters);
    updatedHeights.forEach((h, idx) => { h.heightIndex = idx; });
    setLocalHeights(updatedHeights);
    setNewHeightMeters("");
    setShouldScrollToBottom(true);
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
    updated[index] = { ...updated[index], heightMeters: meters };
    updated.sort((a, b) => a.heightMeters - b.heightMeters);
    updated.forEach((h, idx) => { h.heightIndex = idx; });
    setLocalHeights(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const heightsToSave = localHeights.map((h, idx) => ({
        heightIndex: idx,
        heightMeters: h.heightMeters,
        isActive: h.isActive,
        isJumpOff: h.isJumpOff,
      }));
      
      const response = await apiRequest("PUT", `/api/field-sessions/${sessionId}/heights`, { heights: heightsToSave });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Server returned ${response.status}`);
      }
      
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "heights"] });
      toast({ title: "Heights saved successfully" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to save heights:", error);
      toast({ title: "Failed to save heights", description: error.message || "Unknown error", variant: "destructive" });
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
            Set the height progression. Heights are automatically sorted.
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
                data-testid="input-new-height-official"
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
              data-testid="button-add-height-official"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 max-h-[400px]">
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
                    key={height.tempKey}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      height.isActive ? "bg-card" : "bg-muted/50 opacity-60"
                    } ${height.isJumpOff ? "border-yellow-500" : ""}`}
                    data-testid={`height-row-official-${index}`}
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
                          data-testid={`input-height-official-${index}`}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {metersToFeetInches(height.heightMeters)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant={height.isActive ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleActive(index)}
                        className="text-xs px-2"
                        data-testid={`button-toggle-active-official-${index}`}
                      >
                        {height.isActive ? "Active" : "Skip"}
                      </Button>
                      
                      <Button
                        variant={height.isJumpOff ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleJumpOff(index)}
                        className={`text-xs px-2 ${height.isJumpOff ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}`}
                        data-testid={`button-toggle-jumpoff-official-${index}`}
                      >
                        J/O
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteHeight(index)}
                        data-testid={`button-delete-height-official-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div ref={scrollEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-heights-official">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-heights-official">
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
    <div className="h-screen max-h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
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
  onChangeStatus,
  onEditMark,
  onForceFinalist,
  isDns = false,
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
  onChangeStatus: (athleteId: number, checkInStatus: string, competitionStatus: string) => void;
  onEditMark: (mark: FieldEventMark) => void;
  onForceFinalist: (athleteId: number, isFinalist: boolean) => void;
  isDns?: boolean;
}) {
  const info = getAthleteDisplayInfo(athlete);
  const flightOptions = Array.from({ length: totalFlights + 1 }, (_, i) => i + 1);

  return (
    <div
      className={`flex items-center gap-3 p-4 md:p-5 border-b border-border ${
        isUp ? "bg-green-50 dark:bg-green-950/30" : ""
      }`}
      data-testid={`athlete-row-${athlete.id}`}
    >
      {/* Status indicator */}
      <div className="w-16 md:w-20 shrink-0 text-center">
        {isUp ? (
          <Badge className="bg-green-600 text-white font-bold px-3 py-1.5 text-sm md:text-base">UP</Badge>
        ) : (
          <span className="text-sm md:text-base text-muted-foreground">
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
          <span className="font-mono text-sm md:text-base text-muted-foreground">{info.bib}</span>
          <span className="font-semibold text-base md:text-lg truncate">{info.name}</span>
        </div>
        {info.team && (
          <p className="text-sm text-muted-foreground truncate">{info.team}</p>
        )}
      </div>

      {/* Attempt values - clickable to edit */}
      <div className="flex gap-1 md:gap-1.5 shrink-0">
        {Array.from({ length: totalAttempts }).map((_, i) => {
          const mark = marks[i];
          if (mark) {
            let content: string;
            let textColor: string;
            let bgColor: string;
            if (mark.markType === "mark" && mark.measurement) {
              content = mark.measurement.toFixed(2);
              textColor = "text-white";
              bgColor = "bg-green-600";
            } else if (mark.markType === "foul") {
              content = "X";
              textColor = "text-white";
              bgColor = "bg-red-600";
            } else {
              content = "P";
              textColor = "text-black";
              bgColor = "bg-yellow-400";
            }
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMark(mark);
                }}
                className={`min-w-[2.5rem] md:min-w-[3rem] px-1.5 py-0.5 rounded ${bgColor} ${textColor} font-mono text-xs md:text-sm font-semibold hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all flex flex-col items-center`}
                data-testid={`button-edit-mark-${mark.id}`}
              >
                <span>{content}</span>
                {mark.wind !== null && mark.wind !== undefined && (
                  <span className="text-[10px] opacity-80">{mark.wind > 0 ? '+' : ''}{mark.wind.toFixed(1)}</span>
                )}
              </button>
            );
          }
          return (
            <div 
              key={i} 
              className="min-w-[2.5rem] md:min-w-[3rem] px-1.5 py-1 rounded bg-muted text-muted-foreground font-mono text-xs md:text-sm text-center"
            >
              -
            </div>
          );
        })}
      </div>

      {/* Best mark */}
      <div className="w-16 md:w-20 text-right shrink-0">
        {bestMark !== null ? (
          <span className="font-mono font-semibold text-sm md:text-base">{bestMark.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground text-sm md:text-base">-</span>
        )}
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 md:h-12 md:w-12 shrink-0"
            data-testid={`button-athlete-menu-${athlete.id}`}
          >
            <MoreVertical className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isDns ? (
            <DropdownMenuItem
              onClick={() => onChangeStatus(athlete.id, "checked_in", "competing")}
              data-testid={`menu-check-in-${athlete.id}`}
            >
              <Check className="h-4 w-4 mr-2" />
              Check In
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onChangeStatus(athlete.id, "dns", "dns")}
              data-testid={`menu-mark-dns-${athlete.id}`}
            >
              <X className="h-4 w-4 mr-2" />
              Mark as No Show
            </DropdownMenuItem>
          )}
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
          <DropdownMenuItem
            onClick={() => onForceFinalist(athlete.id, !athlete.isFinalist)}
            data-testid={`menu-toggle-finalist-${athlete.id}`}
          >
            <Star className={`h-4 w-4 mr-2 ${athlete.isFinalist ? 'text-amber-500 fill-amber-500' : ''}`} />
            {athlete.isFinalist ? "Remove from Finals" : "Force to Finals"}
          </DropdownMenuItem>
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
  onDeleteLastMark,
  onClose,
  isPending,
  canDeleteLast,
  recordWind = false
}: {
  athlete: EnrichedAthlete;
  attemptNumber: number;
  totalAttempts: number;
  onRecordMark: (markType: "mark" | "foul" | "pass", measurement?: string, wind?: number) => void;
  onDeleteLastMark: () => void;
  onClose: () => void;
  isPending: boolean;
  canDeleteLast: boolean;
  recordWind?: boolean;
}) {
  const [meters, setMeters] = useState("");
  const [centimeters, setCentimeters] = useState("");
  const [windValue, setWindValue] = useState("");
  const [windSign, setWindSign] = useState<"+" | "-">("+");
  const cmInputRef = useRef<HTMLInputElement>(null);
  const info = getAthleteDisplayInfo(athlete);

  const getMeasurement = () => {
    const m = parseInt(meters) || 0;
    const cm = parseInt(centimeters) || 0;
    if (m === 0 && cm === 0) return "";
    return (m + cm / 100).toFixed(2);
  };

  const handleSubmit = (markType: "mark" | "foul" | "pass") => {
    const measurement = getMeasurement();
    let wind: number | undefined;
    if (windValue) {
      const absWind = Math.abs(parseFloat(windValue));
      wind = windSign === "-" ? -absWind : absWind;
    }
    onRecordMark(markType, markType === "mark" ? measurement : undefined, wind);
    setMeters("");
    setCentimeters("");
    setWindValue("");
    setWindSign("+");
  };

  const handleMetersChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setMeters(cleaned);
    if (cleaned.length >= 2) {
      cmInputRef.current?.focus();
    }
  };

  const handleCentimetersChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setCentimeters(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      
      {/* Sheet */}
      <div className="bg-card border-t-2 border-primary animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-sm md:text-base">{info.bib}</Badge>
              <span className="font-bold text-lg md:text-xl">{info.name}</span>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {info.team && `${info.team} • `}Attempt {attemptNumber} of {totalAttempts}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canDeleteLast && (
              <Button 
                variant="outline" 
                size="default" 
                onClick={onDeleteLastMark}
                disabled={isPending}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                data-testid="button-undo-last-mark"
              >
                <Delete className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                Undo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 md:h-12 md:w-12">
              <ChevronDown className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Input - Two boxes for meters.centimeters */}
        <div className="p-4 md:p-5 space-y-4">
          <div>
            <div className="flex items-center justify-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="M"
                value={meters}
                onChange={(e) => handleMetersChange(e.target.value)}
                className="h-16 md:h-20 w-24 md:w-32 text-2xl md:text-3xl text-center font-mono"
                autoFocus
                data-testid="input-meters"
              />
              <span className="text-3xl md:text-4xl font-bold text-muted-foreground">.</span>
              <Input
                ref={cmInputRef}
                type="text"
                inputMode="numeric"
                placeholder="CM"
                value={centimeters}
                onChange={(e) => handleCentimetersChange(e.target.value)}
                className="h-16 md:h-20 w-24 md:w-32 text-2xl md:text-3xl text-center font-mono"
                data-testid="input-centimeters"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">Meters . Centimeters</p>
          </div>
          
          {recordWind && (
            <div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg md:text-xl text-muted-foreground">Wind:</span>
                <Button
                  type="button"
                  variant={windSign === "+" ? "default" : "outline"}
                  size="icon"
                  className="h-12 w-12 md:h-14 md:w-14 text-2xl font-bold"
                  onClick={() => setWindSign(windSign === "+" ? "-" : "+")}
                  data-testid="button-wind-sign"
                >
                  {windSign}
                </Button>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={windValue}
                  onChange={(e) => setWindValue(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="h-12 md:h-14 w-20 md:w-24 text-xl md:text-2xl text-center font-mono"
                  data-testid="input-wind"
                />
                <span className="text-lg md:text-xl text-muted-foreground">m/s</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Action buttons - large touch targets for iPad */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 p-4 md:p-5 pt-0">
          <Button
            onClick={() => handleSubmit("mark")}
            disabled={(!meters && !centimeters) || isPending}
            className="h-16 md:h-20 text-lg md:text-xl bg-green-600 hover:bg-green-700"
            data-testid="button-record-mark"
          >
            <Check className="h-6 w-6 md:h-7 md:w-7 mr-2" />
            MARK
          </Button>
          <Button
            onClick={() => handleSubmit("foul")}
            disabled={isPending}
            className="h-16 md:h-20 text-lg md:text-xl bg-red-600 hover:bg-red-700"
            data-testid="button-record-foul"
          >
            <X className="h-6 w-6 md:h-7 md:w-7 mr-2" />
            FOUL
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit("pass")}
            disabled={isPending}
            className="h-16 md:h-20 text-lg md:text-xl"
            data-testid="button-record-pass"
          >
            PASS
          </Button>
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-4 md:h-6" />
      </div>
    </div>
  );
}

// ==================== EDIT MARK DIALOG ====================

function EditMarkDialog({
  mark,
  isOpen,
  onClose,
  sessionId,
  isVertical,
  heights,
}: {
  mark: FieldEventMark | null;
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  isVertical: boolean;
  heights?: FieldHeight[];
}) {
  const { toast } = useToast();
  const [markType, setMarkType] = useState<string>("");
  const [measurement, setMeasurement] = useState<string>("");
  const [windValue, setWindValue] = useState<string>("");
  const [windSign, setWindSign] = useState<"+" | "-">("+");

  useEffect(() => {
    if (mark) {
      setMarkType(mark.markType || "");
      setMeasurement(mark.measurement?.toString() || "");
      if (mark.wind !== null && mark.wind !== undefined) {
        setWindValue(Math.abs(mark.wind).toString());
        setWindSign(mark.wind < 0 ? "-" : "+");
      } else {
        setWindValue("");
        setWindSign("+");
      }
    }
  }, [mark]);

  const updateMarkMutation = useMutation({
    mutationFn: async (data: { markType: string; measurement?: number; wind?: number | null }) => {
      return apiRequest("PATCH", `/api/field-marks/${mark!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      toast({ title: "Mark updated" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update mark", variant: "destructive" });
    },
  });

  const deleteMarkMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/field-marks/${mark!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      toast({ title: "Mark deleted" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete mark", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!mark) return;
    const data: { markType: string; measurement?: number; wind?: number | null } = { markType };
    if (markType === "mark" && measurement) {
      data.measurement = parseFloat(measurement);
    }
    // Include wind value (can be cleared by setting to null)
    if (windValue.trim() !== "") {
      const absWind = Math.abs(parseFloat(windValue));
      data.wind = windSign === "-" ? -absWind : absWind;
    } else {
      data.wind = null;
    }
    updateMarkMutation.mutate(data);
  };

  const handleDelete = () => {
    if (!mark) return;
    deleteMarkMutation.mutate();
  };

  if (!mark) return null;

  const markOptions = isVertical 
    ? [
        { value: "cleared", label: "O (Cleared)" },
        { value: "missed", label: "X (Missed)" },
        { value: "pass", label: "Pass" },
      ]
    : [
        { value: "mark", label: "Mark (Distance)" },
        { value: "foul", label: "X (Foul)" },
        { value: "pass", label: "Pass" },
      ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Attempt #{mark.attemptNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Mark Type</Label>
            <Select value={markType} onValueChange={setMarkType}>
              <SelectTrigger data-testid="select-edit-mark-type">
                <SelectValue placeholder="Select mark type" />
              </SelectTrigger>
              <SelectContent>
                {markOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isVertical && markType === "mark" && (
            <div className="space-y-2">
              <Label>Measurement (m)</Label>
              <Input
                type="number"
                step="0.01"
                value={measurement}
                onChange={(e) => setMeasurement(e.target.value)}
                placeholder="Enter distance in meters"
                data-testid="input-edit-measurement"
              />
            </div>
          )}

          {!isVertical && (
            <div className="space-y-2">
              <Label>Wind (m/s)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={windSign === "+" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setWindSign(windSign === "+" ? "-" : "+")}
                  data-testid="button-edit-wind-sign"
                >
                  {windSign}
                </Button>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={windValue}
                  onChange={(e) => setWindValue(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.0"
                  className="flex-1"
                  data-testid="input-edit-wind"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMarkMutation.isPending}
            data-testid="button-delete-mark"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMarkMutation.isPending || !markType}
              data-testid="button-save-mark"
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm md:text-base">
        <thead>
          <tr className="border-b">
            <th className="text-center p-3 md:p-4 w-12 md:w-14">Pl</th>
            <th className="text-left p-3 md:p-4 sticky left-0 bg-background">Athlete</th>
            {Array.from({ length: totalAttempts }).map((_, i) => (
              <th key={i} className="text-center p-3 md:p-4 min-w-16 md:min-w-20">{i + 1}</th>
            ))}
            <th className="text-center p-3 md:p-4">Best</th>
          </tr>
        </thead>
        <tbody>
          {rankedAthletes.map((item, index) => {
            const info = getAthleteDisplayInfo(item.athlete);
            const place = item.best !== null ? index + 1 : null;

            return (
              <tr key={item.athlete.id} className="border-b">
                <td className="text-center p-3 md:p-4 font-bold text-lg md:text-xl">
                  {place !== null ? place : "-"}
                </td>
                <td className="p-3 md:p-4 sticky left-0 bg-background min-w-[140px] md:min-w-[200px]">
                  <div className="font-semibold text-base md:text-lg">{info.name}</div>
                  <div className="text-sm text-muted-foreground">{info.team || info.bib}</div>
                </td>
                {Array.from({ length: totalAttempts }).map((_, i) => {
                  const mark = item.marks.find(m => m.attemptNumber === i + 1);
                  let content: React.ReactNode = "-";
                  let className = "text-muted-foreground";
                  let isBest = false;
                  
                  if (mark) {
                    if (mark.markType === "mark" && mark.measurement) {
                      content = mark.measurement.toFixed(2);
                      className = "font-mono";
                      // Check if this is the best mark
                      if (item.best !== null && mark.measurement === item.best) {
                        isBest = true;
                      }
                    } else if (mark.markType === "foul") {
                      content = "X";
                      className = "text-red-500 font-bold";
                    } else if (mark.markType === "pass") {
                      content = "P";
                      className = "text-yellow-600 font-bold";
                    }
                  }
                  
                  return (
                    <td 
                      key={i} 
                      className={`text-center p-3 md:p-4 ${className} ${isBest ? 'bg-green-100 dark:bg-green-900/30 font-bold' : ''}`}
                    >
                      {content}
                    </td>
                  );
                })}
                <td className="text-center p-3 md:p-4 font-mono font-bold text-base md:text-lg">
                  {item.best !== null ? item.best.toFixed(2) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReviewMarksView({ 
  athletes, 
  marks, 
  totalAttempts,
  onEditMark,
}: { 
  athletes: EnrichedAthlete[]; 
  marks: FieldEventMark[];
  totalAttempts: number;
  onEditMark: (mark: FieldEventMark) => void;
}) {
  const getAthleteMarks = (athleteId: number) => {
    return marks.filter(m => m.athleteId === athleteId).sort((a, b) => a.attemptNumber - b.attemptNumber);
  };

  // Group athletes by flight
  const flights = new Map<number, EnrichedAthlete[]>();
  athletes.forEach(athlete => {
    const flight = athlete.flight || 1;
    if (!flights.has(flight)) {
      flights.set(flight, []);
    }
    flights.get(flight)!.push(athlete);
  });
  const sortedFlights = Array.from(flights.entries()).sort((a, b) => a[0] - b[0]);

  const renderAthleteRow = (athlete: EnrichedAthlete) => {
    const info = getAthleteDisplayInfo(athlete);
    const athleteMarks = getAthleteMarks(athlete.id);
    const validMarks = athleteMarks.filter(m => m.markType === "mark" && m.measurement);
    const best = validMarks.length > 0 ? Math.max(...validMarks.map(m => m.measurement as number)) : null;

    return (
      <tr key={athlete.id} className="border-b">
        <td className="p-3 md:p-4 sticky left-0 bg-background min-w-[140px] md:min-w-[200px]">
          <div className="font-semibold text-base md:text-lg">{info.name}</div>
          {info.team && <div className="text-sm text-muted-foreground">{info.team}</div>}
        </td>
        {Array.from({ length: totalAttempts }).map((_, i) => {
          const mark = athleteMarks.find(m => m.attemptNumber === i + 1);
          let content: React.ReactNode = "-";
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
            <td 
              key={i} 
              className={`text-center p-3 md:p-4 ${className} ${mark ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              onClick={() => mark && onEditMark(mark)}
              data-testid={mark ? `cell-mark-${athlete.id}-${i + 1}` : undefined}
            >
              <div className="flex items-center justify-center gap-1">
                {content}
                {mark && <Pencil className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground opacity-50" />}
              </div>
            </td>
          );
        })}
        <td className="text-center p-3 md:p-4 font-mono font-bold text-base md:text-lg">
          {best !== null ? best.toFixed(2) : "-"}
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm md:text-base">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 md:p-4 sticky left-0 bg-background">Athlete</th>
            {Array.from({ length: totalAttempts }).map((_, i) => (
              <th key={i} className="text-center p-3 md:p-4 min-w-16 md:min-w-20">{i + 1}</th>
            ))}
            <th className="text-center p-3 md:p-4">Best</th>
          </tr>
        </thead>
        <tbody>
          {sortedFlights.map(([flightNum, flightAthletes]) => (
            <>
              {/* Flight header row */}
              <tr key={`flight-${flightNum}`} className="bg-muted/50">
                <td 
                  colSpan={totalAttempts + 2} 
                  className="p-2 md:p-3 font-semibold text-sm md:text-base text-muted-foreground sticky left-0"
                >
                  Flight {flightNum}
                </td>
              </tr>
              {flightAthletes.map(renderAthleteRow)}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== VERTICAL EVENT HELPERS ====================

function formatHeightMark(meters: number): string {
  return `${meters.toFixed(2)}m`;
}

function getAthleteHeightAttempts(athleteId: number, heightIndex: number, marks: FieldEventMark[]): FieldEventMark[] {
  return marks
    .filter(m => m.athleteId === athleteId && m.heightIndex === heightIndex)
    .sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));
}

function getAthleteAttemptsAtHeight(athleteId: number, heightIndex: number, marks: FieldEventMark[]): string {
  const heightMarks = getAthleteHeightAttempts(athleteId, heightIndex, marks);
  let display = '';
  for (const mark of heightMarks) {
    if (mark.markType === 'cleared') {
      display += 'O';
      break;
    } else if (mark.markType === 'missed') {
      display += 'X';
    } else if (mark.markType === 'pass') {
      display += 'PASS';
    }
  }
  return display;
}

function isAthleteEliminated(athleteId: number, marks: FieldEventMark[], heights: FieldHeight[]): boolean {
  let consecutiveMisses = 0;
  const sortedMarks = [...marks]
    .filter(m => m.athleteId === athleteId)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
  
  for (const mark of sortedMarks) {
    if (mark.markType === 'missed') {
      consecutiveMisses++;
      if (consecutiveMisses >= 3) {
        return true;
      }
    } else if (mark.markType === 'cleared') {
      consecutiveMisses = 0;
    }
  }
  return false;
}

function getHighestClearedHeight(athleteId: number, marks: FieldEventMark[], heights: FieldHeight[]): FieldHeight | null {
  const clearedMarks = marks.filter(m => m.athleteId === athleteId && m.markType === 'cleared');
  if (clearedMarks.length === 0) return null;
  
  let maxHeightIndex = -1;
  for (const mark of clearedMarks) {
    if (mark.heightIndex !== null && mark.heightIndex !== undefined && mark.heightIndex > maxHeightIndex) {
      maxHeightIndex = mark.heightIndex;
    }
  }
  
  if (maxHeightIndex < 0) return null;
  return heights.find(h => h.heightIndex === maxHeightIndex) || null;
}

function countMissesAtHeight(athleteId: number, heightIndex: number, marks: FieldEventMark[]): number {
  return marks.filter(
    m => m.athleteId === athleteId && m.heightIndex === heightIndex && m.markType === 'missed'
  ).length;
}

function countTotalMisses(athleteId: number, marks: FieldEventMark[]): number {
  return marks.filter(m => m.athleteId === athleteId && m.markType === 'missed').length;
}

// ==================== VERTICAL EVENT COMPONENTS ====================

function VerticalAthleteListItem({
  athlete,
  isUp,
  marks,
  heights,
  currentHeightIndex,
  onClick,
  currentFlight,
  totalFlights,
  onMoveFlight,
  onChangeStatus,
  onEditMark,
  isDns = false,
}: {
  athlete: EnrichedAthlete;
  isUp: boolean;
  marks: FieldEventMark[];
  heights: FieldHeight[];
  currentHeightIndex: number;
  onClick: () => void;
  currentFlight: number;
  totalFlights: number;
  onMoveFlight: (athleteId: number, newFlight: number) => void;
  onChangeStatus: (athleteId: number, checkInStatus: string, competitionStatus: string) => void;
  onEditMark: (mark: FieldEventMark) => void;
  isDns?: boolean;
}) {
  const info = getAthleteDisplayInfo(athlete);
  const flightOptions = Array.from({ length: totalFlights + 1 }, (_, i) => i + 1);
  const eliminated = isAthleteEliminated(athlete.id, marks, heights);
  const highestCleared = getHighestClearedHeight(athlete.id, marks, heights);
  const currentHeightAttempts = getAthleteAttemptsAtHeight(athlete.id, currentHeightIndex, marks);
  const hasCleared = currentHeightAttempts.includes('O');
  
  return (
    <div
      className={`flex items-center gap-4 p-4 md:p-6 border-b border-border ${
        isUp ? "bg-green-50 dark:bg-green-950/30" : ""
      } ${eliminated ? "opacity-50" : ""}`}
      data-testid={`vertical-athlete-row-${athlete.id}`}
    >
      <div className="w-18 md:w-24 shrink-0 text-center">
        {eliminated ? (
          <Badge variant="outline" className="text-base md:text-lg px-3 py-1">OUT</Badge>
        ) : isUp ? (
          <Badge className="bg-green-600 text-white font-bold px-4 py-2 text-base md:text-lg">UP</Badge>
        ) : hasCleared ? (
          <Badge variant="secondary" className="text-base md:text-lg px-3 py-1">CLEAR</Badge>
        ) : (
          <span className="text-base md:text-lg text-muted-foreground">{currentHeightAttempts || "-"}</span>
        )}
      </div>

      <div 
        className="flex-1 min-w-0 cursor-pointer active:bg-muted/50" 
        onClick={eliminated || isDns ? undefined : onClick}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-base md:text-lg text-muted-foreground">{info.bib}</span>
          <span className={`font-semibold text-lg md:text-xl ${eliminated ? "line-through" : ""}`}>{info.name}</span>
          <Badge variant="outline" className="text-sm md:text-base">F{athlete.flightNumber || 1}</Badge>
        </div>
        {info.team && (
          <p className="text-base md:text-lg text-muted-foreground">{info.team}</p>
        )}
      </div>

      <div className="flex gap-2 md:gap-3 shrink-0 font-mono text-lg md:text-xl font-bold">
        {(() => {
          const heightMarks = marks
            .filter(m => m.athleteId === athlete.id && m.heightIndex === currentHeightIndex)
            .sort((a, b) => a.attemptNumber - b.attemptNumber);
          return heightMarks.map((m) => {
            const char = m.markType === 'cleared' ? 'O' : m.markType === 'missed' ? 'X' : '-';
            return (
              <button
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMark(m);
                }}
                className={`px-2 md:px-3 py-1 rounded hover:bg-muted/50 hover:ring-1 hover:ring-primary ${
                  char === 'O' ? 'text-green-600' : 
                  char === 'X' ? 'text-red-500' : 
                  'text-yellow-600'
                }`}
                data-testid={`button-edit-vertical-mark-${m.id}`}
              >
                {char}
              </button>
            );
          });
        })()}
        {!eliminated && !hasCleared && currentHeightAttempts.length < 3 && (
          <span className="text-muted-foreground">_</span>
        )}
      </div>

      <div className="w-20 md:w-24 text-right shrink-0">
        {highestCleared ? (
          <span className="font-mono font-semibold text-base md:text-lg">{formatHeightMark(highestCleared.heightMeters)}</span>
        ) : (
          <span className="text-muted-foreground text-base md:text-lg">-</span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 md:h-14 md:w-14 shrink-0"
            data-testid={`button-vertical-athlete-menu-${athlete.id}`}
          >
            <MoreVertical className="h-6 w-6 md:h-7 md:w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isDns ? (
            <DropdownMenuItem
              onClick={() => onChangeStatus(athlete.id, "checked_in", "competing")}
              data-testid={`menu-vertical-check-in-${athlete.id}`}
            >
              <Check className="h-4 w-4 mr-2" />
              Check In
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onChangeStatus(athlete.id, "dns", "dns")}
              data-testid={`menu-vertical-mark-dns-${athlete.id}`}
            >
              <X className="h-4 w-4 mr-2" />
              Mark as No Show
            </DropdownMenuItem>
          )}
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
                  data-testid={`menu-vertical-move-flight-${flight}`}
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

function VerticalAttemptSheet({
  athlete,
  heights,
  currentHeightIndex,
  marks,
  onRecordMark,
  onDeleteLastMark,
  onClose,
  isPending,
  canDeleteLast
}: {
  athlete: EnrichedAthlete;
  heights: FieldHeight[];
  currentHeightIndex: number;
  marks: FieldEventMark[];
  onRecordMark: (markType: "cleared" | "missed" | "pass") => void;
  onDeleteLastMark: () => void;
  onClose: () => void;
  isPending: boolean;
  canDeleteLast: boolean;
}) {
  const info = getAthleteDisplayInfo(athlete);
  const currentHeight = heights.find(h => h.heightIndex === currentHeightIndex);
  const currentAttempts = getAthleteAttemptsAtHeight(athlete.id, currentHeightIndex, marks);
  const attemptNumber = currentAttempts.length + 1;
  const hasCleared = currentAttempts.includes('O');

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      
      <div className="bg-card border-t-2 border-primary animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-5 md:p-6 border-b">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-base md:text-lg px-3 py-1">{info.bib}</Badge>
              <span className="font-bold text-xl md:text-2xl">{info.name}</span>
            </div>
            <p className="text-base md:text-lg text-muted-foreground mt-1.5">
              {info.team && `${info.team} • `}
              Height: {currentHeight ? formatHeightMark(currentHeight.heightMeters) : "-"} • 
              Attempt {attemptNumber} of 3
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canDeleteLast && (
              <Button 
                variant="outline" 
                size="lg" 
                onClick={onDeleteLastMark}
                disabled={isPending}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground text-base md:text-lg"
                data-testid="button-undo-last-vertical-mark"
              >
                <Delete className="h-5 w-5 md:h-6 md:w-6 mr-1.5" />
                Undo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-12 w-12 md:h-14 md:w-14">
              <ChevronDown className="h-7 w-7 md:h-8 md:w-8" />
            </Button>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="text-center mb-5">
            <span className="text-5xl md:text-6xl font-bold font-mono">
              {currentHeight ? formatHeightMark(currentHeight.heightMeters) : "-"}
            </span>
            <div className="flex justify-center gap-4 mt-4 font-mono text-3xl md:text-4xl">
              {currentAttempts.split('').map((char, i) => (
                <span 
                  key={i}
                  className={
                    char === 'O' ? 'text-green-600' : 
                    char === 'X' ? 'text-red-500' : 
                    'text-yellow-600'
                  }
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 md:gap-5 p-5 md:p-6 pt-0">
          <Button
            onClick={() => onRecordMark("cleared")}
            disabled={isPending || hasCleared || attemptNumber > 3}
            className="h-24 md:h-28 text-3xl md:text-4xl bg-green-600 hover:bg-green-700"
            data-testid="button-record-cleared"
          >
            <Check className="h-10 w-10 md:h-12 md:w-12 mr-2" />
            O
          </Button>
          <Button
            onClick={() => onRecordMark("missed")}
            disabled={isPending || hasCleared || attemptNumber > 3}
            className="h-24 md:h-28 text-3xl md:text-4xl bg-red-600 hover:bg-red-700"
            data-testid="button-record-missed"
          >
            <X className="h-10 w-10 md:h-12 md:w-12 mr-2" />
            X
          </Button>
          <Button
            variant="secondary"
            onClick={() => onRecordMark("pass")}
            disabled={isPending || hasCleared || attemptNumber > 3}
            className="h-24 md:h-28 text-2xl md:text-3xl"
            data-testid="button-record-pass"
          >
            PASS
          </Button>
        </div>

        <div className="h-6 md:h-8" />
      </div>
    </div>
  );
}

function VerticalStandingsView({
  athletes,
  marks,
  heights
}: {
  athletes: EnrichedAthlete[];
  marks: FieldEventMark[];
  heights: FieldHeight[];
}) {
  const standings = athletes
    .map(athlete => {
      const highestCleared = getHighestClearedHeight(athlete.id, marks, heights);
      const missesAtBest = highestCleared 
        ? countMissesAtHeight(athlete.id, highestCleared.heightIndex, marks) 
        : 0;
      const totalMisses = countTotalMisses(athlete.id, marks);
      const eliminated = isAthleteEliminated(athlete.id, marks, heights);
      
      return {
        athlete,
        highestCleared,
        missesAtBest,
        totalMisses,
        eliminated
      };
    })
    .sort((a, b) => {
      if (!a.highestCleared && !b.highestCleared) return 0;
      if (!a.highestCleared) return 1;
      if (!b.highestCleared) return -1;
      
      if (a.highestCleared.heightMeters !== b.highestCleared.heightMeters) {
        return b.highestCleared.heightMeters - a.highestCleared.heightMeters;
      }
      
      if (a.missesAtBest !== b.missesAtBest) {
        return a.missesAtBest - b.missesAtBest;
      }
      
      return a.totalMisses - b.totalMisses;
    });

  let currentPlace = 1;
  const rankedStandings = standings.map((item, index) => {
    if (index > 0) {
      const prev = standings[index - 1];
      const isTied = 
        item.highestCleared?.heightMeters === prev.highestCleared?.heightMeters &&
        item.missesAtBest === prev.missesAtBest &&
        item.totalMisses === prev.totalMisses;
      if (!isTied) {
        currentPlace = index + 1;
      }
    }
    return { ...item, place: item.highestCleared ? currentPlace : null };
  });

  return (
    <div className="divide-y">
      {rankedStandings.map((item) => {
        const info = getAthleteDisplayInfo(item.athlete);
        return (
          <div 
            key={item.athlete.id} 
            className={`flex items-center gap-4 p-5 md:p-6 ${item.eliminated ? 'opacity-50' : ''}`}
          >
            <div className="w-12 md:w-14 text-center font-bold text-xl md:text-2xl shrink-0">
              {item.place ?? "-"}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-lg md:text-xl ${item.eliminated ? 'line-through' : ''}`}>
                {info.name}
              </p>
              <p className="text-base md:text-lg text-muted-foreground">{info.team || info.bib}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-xl md:text-2xl">
                {item.highestCleared ? formatHeightMark(item.highestCleared.heightMeters) : "-"}
              </p>
              {item.highestCleared && (
                <p className="text-base md:text-lg text-muted-foreground">
                  {item.missesAtBest}x @ best, {item.totalMisses} total
                </p>
              )}
              {item.eliminated && (
                <Badge variant="outline" className="text-base md:text-lg mt-1">Eliminated</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerticalReviewMarksView({
  athletes,
  marks,
  heights,
  onEditMark,
}: {
  athletes: EnrichedAthlete[];
  marks: FieldEventMark[];
  heights: FieldHeight[];
  onEditMark: (mark: FieldEventMark) => void;
}) {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm md:text-base">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 md:p-4 sticky left-0 bg-background">Athlete</th>
            {sortedHeights.map((height) => (
              <th key={height.id} className="text-center p-3 md:p-4 min-w-16 md:min-w-20">
                {formatHeightMark(height.heightMeters)}
              </th>
            ))}
            <th className="text-center p-3 md:p-4">Best</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map(athlete => {
            const info = getAthleteDisplayInfo(athlete);
            const highestCleared = getHighestClearedHeight(athlete.id, marks, heights);
            const eliminated = isAthleteEliminated(athlete.id, marks, heights);

            return (
              <tr key={athlete.id} className={`border-b ${eliminated ? 'opacity-50' : ''}`}>
                <td className="p-3 md:p-4 sticky left-0 bg-background min-w-[140px] md:min-w-[200px]">
                  <div className={`font-semibold text-base md:text-lg ${eliminated ? 'line-through' : ''}`}>
                    {info.name}
                  </div>
                </td>
                {sortedHeights.map((height) => {
                  const heightMarks = getAthleteHeightAttempts(athlete.id, height.heightIndex, marks);
                  const attempts = getAthleteAttemptsAtHeight(athlete.id, height.heightIndex, marks);
                  let className = "text-muted-foreground";
                  
                  if (attempts.includes('O')) {
                    className = "text-green-600 font-bold";
                  } else if (attempts.includes('X')) {
                    className = "text-red-500";
                  } else if (attempts.includes('PASS')) {
                    className = "text-yellow-600";
                  }
                  
                  const hasMarks = heightMarks.length > 0;
                  
                  return (
                    <td 
                      key={height.id} 
                      className={`text-center p-3 md:p-4 font-mono text-base md:text-lg ${className} ${hasMarks ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                      data-testid={hasMarks ? `cell-vertical-${athlete.id}-${height.heightIndex}` : undefined}
                    >
                      {hasMarks ? (
                        <div className="space-y-1">
                          {heightMarks.map((m, idx) => {
                            let symbol = '-';
                            let symbolClass = 'text-muted-foreground';
                            if (m.markType === 'cleared') {
                              symbol = 'O';
                              symbolClass = 'text-green-600';
                            } else if (m.markType === 'missed') {
                              symbol = 'X';
                              symbolClass = 'text-red-500';
                            } else if (m.markType === 'pass') {
                              symbol = 'P';
                              symbolClass = 'text-yellow-600';
                            }
                            return (
                              <button
                                key={m.id}
                                onClick={() => onEditMark(m)}
                                className={`inline-flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 rounded hover:bg-muted ${symbolClass}`}
                                data-testid={`button-edit-mark-${m.id}`}
                              >
                                {symbol}
                                <Pencil className="h-3 w-3 md:h-4 md:w-4 opacity-50" />
                              </button>
                            );
                          })}
                        </div>
                      ) : "-"}
                    </td>
                  );
                })}
                <td className="text-center p-3 md:p-4 font-mono font-bold text-base md:text-lg">
                  {highestCleared ? formatHeightMark(highestCleared.heightMeters) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
      toast({ title: "Finals generated", description: `${count} athletes marked as finalists` });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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
              data-testid="input-finalist-count"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <div className="p-2 bg-muted text-sm font-medium sticky top-0">
              Athletes Advancing to Finals
            </div>
            {finalists.map((item, index) => {
              const info = getAthleteDisplayInfo(item.athlete);
              return (
                <div 
                  key={item.athlete.id} 
                  className="flex items-center gap-2 p-2 border-t"
                  data-testid={`finalist-preview-${item.athlete.id}`}
                >
                  <div className="w-6 text-center font-bold text-sm">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{info.name}</p>
                  </div>
                  <div className="text-sm font-mono">
                    {item.best !== null ? item.best.toFixed(2) : "-"}
                  </div>
                </div>
              );
            })}
          </div>
          
          {rankedAthletes.length > count && (
            <p className="text-xs text-muted-foreground">
              {rankedAthletes.length - count} athletes will not advance
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-finals">
            Cancel
          </Button>
          <Button 
            onClick={() => generateFinalsMutation.mutate()}
            disabled={generateFinalsMutation.isPending || finalists.length === 0}
            data-testid="button-confirm-finals"
          >
            {generateFinalsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Finals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  // Get meetId from props or sessionStorage (fallback for EVT-based sessions)
  const effectiveMeetId = meetId || sessionStorage.getItem("field_app_meet_id") || undefined;

  // Search for athletes in database
  const { data: searchResults = [] } = useQuery<any[]>({
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

  const selectAthlete = (athlete: any) => {
    setFirstName(athlete.firstName || athlete.first_name || "");
    setLastName(athlete.lastName || athlete.last_name || "");
    setBibNumber(athlete.bibNumber || athlete.bib_number || "");
    // Try multiple possible team field names
    setTeam(athlete.teamName || athlete.team_name || athlete.team || athlete.affiliation || athlete.school || "");
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(value.length >= 2);
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
      toast({ title: "Athlete added and checked in" });
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
    // Always add to end of list - get max order across all flights
    const maxOrder = athletes.reduce((max: number, a: any) => Math.max(max, a.orderInFlight || 0), 0);
    
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
          {/* Search input */}
          <div className="space-y-2 relative">
            <Label>Search Athlete</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search by name or bib..."
                className="pl-10"
                data-testid="input-search-athlete"
              />
            </div>
            {/* Search results dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.slice(0, 10).map((athlete: any) => (
                  <button
                    key={athlete.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                    onMouseDown={() => selectAthlete(athlete)}
                    data-testid={`search-result-${athlete.id}`}
                  >
                    <span className="font-medium">
                      {athlete.firstName} {athlete.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {athlete.bibNumber && `#${athlete.bibNumber}`} {athlete.teamName && `- ${athlete.teamName}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                No athletes found. Enter details manually below.
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">Or enter athlete details manually:</p>
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
  const [aliveGroupSize, setAliveGroupSize] = useState(session.aliveGroupSize || 5);
  const [stopAliveAtCount, setStopAliveAtCount] = useState(session.stopAliveAtCount || 3);

  useEffect(() => {
    if (isOpen) {
      setPrelimAttempts(session.prelimAttempts || 3);
      setFinalsAttempts(session.finalsAttempts || 3);
      setAthletesToFinals(session.athletesToFinals || 8);
      setMeasurementUnit(session.measurementUnit || 'metric');
      setRecordWind(session.recordWind || false);
      setAliveGroupSize(session.aliveGroupSize || 5);
      setStopAliveAtCount(session.stopAliveAtCount || 3);
    }
  }, [isOpen, session]);

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {
        measurementUnit,
        recordWind,
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
      toast({ title: "Settings saved" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to save settings", variant: "destructive" });
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
          {/* Measurement Unit */}
          <div>
            <Label>Measurement Unit</Label>
            <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
              <SelectTrigger data-testid="select-measurement-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (meters)</SelectItem>
                <SelectItem value="english">English (feet/inches)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isVertical ? (
            <>
              {/* Horizontal Event Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prelim-attempts">Prelim Attempts</Label>
                  <Input
                    id="prelim-attempts"
                    type="number"
                    min={1}
                    max={10}
                    value={prelimAttempts}
                    onChange={(e) => setPrelimAttempts(parseInt(e.target.value) || 3)}
                    className="mt-1"
                    data-testid="input-prelim-attempts"
                  />
                </div>
                <div>
                  <Label htmlFor="finals-attempts">Finals Attempts</Label>
                  <Input
                    id="finals-attempts"
                    type="number"
                    min={1}
                    max={10}
                    value={finalsAttempts}
                    onChange={(e) => setFinalsAttempts(parseInt(e.target.value) || 3)}
                    className="mt-1"
                    data-testid="input-finals-attempts"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="athletes-to-finals">Athletes to Finals</Label>
                <Input
                  id="athletes-to-finals"
                  type="number"
                  min={1}
                  max={20}
                  value={athletesToFinals}
                  onChange={(e) => setAthletesToFinals(parseInt(e.target.value) || 8)}
                  className="mt-1"
                  data-testid="input-athletes-to-finals"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="record-wind"
                  checked={recordWind}
                  onChange={(e) => setRecordWind(e.target.checked)}
                  className="h-4 w-4"
                  data-testid="checkbox-record-wind"
                />
                <Label htmlFor="record-wind">Record Wind</Label>
              </div>
            </>
          ) : (
            <>
              {/* Vertical Event Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alive-group-size">Alive Group Size</Label>
                  <Input
                    id="alive-group-size"
                    type="number"
                    min={1}
                    max={20}
                    value={aliveGroupSize}
                    onChange={(e) => setAliveGroupSize(parseInt(e.target.value) || 5)}
                    className="mt-1"
                    data-testid="input-alive-group-size"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Athletes jumping together</p>
                </div>
                <div>
                  <Label htmlFor="stop-alive-at">Stop Alive At</Label>
                  <Input
                    id="stop-alive-at"
                    type="number"
                    min={1}
                    max={10}
                    value={stopAliveAtCount}
                    onChange={(e) => setStopAliveAtCount(parseInt(e.target.value) || 3)}
                    className="mt-1"
                    data-testid="input-stop-alive-at"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Resume rotation when X remain</p>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button 
            onClick={() => updateSettingsMutation.mutate()}
            disabled={updateSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
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
  const [showGenerateFinals, setShowGenerateFinals] = useState(false);
  const [editingMark, setEditingMark] = useState<FieldEventMark | null>(null);
  const [showHeightsDialog, setShowHeightsDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  // Fetch heights for vertical events
  const { data: heights } = useQuery<FieldHeight[]>({
    queryKey: ["/api/field-sessions", sessionId, "heights"],
    refetchInterval: 5000,
    enabled: !!session,
  });

  // Detect if this is a vertical event (high jump / pole vault)
  const isVertical = session ? (
    isHeightEvent(session.event?.eventType || '') ||
    (session.evtEventName?.toLowerCase().includes('high jump')) ||
    (session.evtEventName?.toLowerCase().includes('pole vault'))
  ) : false;

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

  // Mutation for forcing/removing finalist status
  const forceFinalistMutation = useMutation({
    mutationFn: async ({ athleteId, isFinalist }: { athleteId: number; isFinalist: boolean }) => {
      return apiRequest("PATCH", `/api/field-athletes/${athleteId}`, { isFinalist });
    },
    onSuccess: (_, { isFinalist }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      toast({ title: isFinalist ? "Athlete added to finals" : "Athlete removed from finals" });
    },
    onError: () => {
      toast({ title: "Failed to update finalist status", variant: "destructive" });
    },
  });

  const handleForceFinalist = (athleteId: number, isFinalist: boolean) => {
    forceFinalistMutation.mutate({ athleteId, isFinalist });
  };

  // Mutation for changing athlete check-in status
  const changeStatusMutation = useMutation({
    mutationFn: async ({ athleteId, checkInStatus, competitionStatus }: { 
      athleteId: number; 
      checkInStatus: string; 
      competitionStatus: string;
    }) => {
      return apiRequest("PATCH", `/api/field-athletes/${athleteId}`, {
        checkInStatus,
        competitionStatus,
      });
    },
    onSuccess: (_, { competitionStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      if (competitionStatus === "dns") {
        toast({ title: "Athlete marked as no show" });
      } else {
        toast({ title: "Athlete checked in" });
      }
    },
    onError: () => {
      toast({ title: "Failed to update athlete status", variant: "destructive" });
    },
  });

  const handleChangeStatus = (athleteId: number, checkInStatus: string, competitionStatus: string) => {
    changeStatusMutation.mutate({ athleteId, checkInStatus, competitionStatus });
  };

  // Mutation for advancing to next/previous height
  const advanceHeightMutation = useMutation({
    mutationFn: async (direction: 1 | -1) => {
      return apiRequest("POST", `/api/field-sessions/${sessionId}/advance-height`, { direction });
    },
    onSuccess: (_, direction) => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId] });
      toast({ title: direction === 1 ? "Advanced to next height" : "Returned to previous height" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to change height", variant: "destructive" });
    },
  });

  const handleAdvanceHeight = (direction: 1 | -1) => {
    advanceHeightMutation.mutate(direction);
  };

  // Mutation to jump to a specific height
  const jumpToHeightMutation = useMutation({
    mutationFn: async (heightIndex: number) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { currentHeightIndex: heightIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to change height", variant: "destructive" });
    },
  });

  const handleJumpToHeight = (heightIndex: number) => {
    if (heightIndex !== currentHeightIndex) {
      jumpToHeightMutation.mutate(heightIndex);
    }
  };

  // Mutation to update alive group size
  const updateAliveGroupMutation = useMutation({
    mutationFn: async (size: number | null) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { aliveGroupSize: size });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId] });
      toast({ title: "Alive group updated" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update alive group", variant: "destructive" });
    },
  });

  const handleAliveGroupChange = (value: string) => {
    const size = value === "all" ? null : parseInt(value, 10);
    updateAliveGroupMutation.mutate(size);
  };

  // Mutation to switch current flight (for horizontal events)
  const switchFlightMutation = useMutation({
    mutationFn: async (flightNumber: number) => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { currentFlightNumber: flightNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
      toast({ title: "Switched flight" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to switch flight", variant: "destructive" });
    },
  });

  const handleSwitchFlight = (flightNumber: number) => {
    switchFlightMutation.mutate(flightNumber);
  };

  // Mutation to exit finals mode and switch to a flight
  const exitFinalsAndSwitchFlightMutation = useMutation({
    mutationFn: async (flightNumber: number) => {
      // First exit finals, then switch flight in one PATCH request
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { 
        isInFinals: false,
        currentFlightNumber: flightNumber 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
      toast({ title: "Switched to flight" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to switch flight", variant: "destructive" });
    },
  });

  // Mutation to enter finals mode
  const enterFinalsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/field-sessions/${sessionId}`, { isInFinals: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "full"] });
      toast({ title: "Switched to Finals" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to enter finals", variant: "destructive" });
    },
  });

  // Mutation to delete a mark (for undo functionality)
  const deleteMarkMutation = useMutation({
    mutationFn: async (markId: number) => {
      return apiRequest("DELETE", `/api/field-marks/${markId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      toast({ title: "Last mark deleted" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete mark", variant: "destructive" });
    },
  });

  const handleLeave = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    onLeave();
  };

  const activeAthletes = athletes?.filter(
    (a) => a.checkInStatus === "checked_in" && a.competitionStatus !== "completed" && a.competitionStatus !== "dns"
  ) || [];
  
  // DNS athletes that can be checked back in
  const dnsAthletes = athletes?.filter(
    (a) => a.checkInStatus === "dns" || a.competitionStatus === "dns"
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
  
  // For horizontal events in Officiate view: show only prelim or finals attempts based on mode
  const officiateAttempts = session?.isInFinals 
    ? (session?.finalsAttempts || 3) 
    : (session?.prelimAttempts || 3);
  
  const selectedAthleteMarks = selectedAthlete ? getAthleteMarks(selectedAthlete.id) : [];
  const nextAttemptNumber = selectedAthleteMarks.length + 1;

  // Find who should be "Up" (first athlete with fewest attempts)
  const getUpAthlete = () => {
    if (sortedAthletes.length === 0) return null;
    const minAttempts = Math.min(...sortedAthletes.map(a => getAthleteMarks(a.id).length));
    return sortedAthletes.find(a => getAthleteMarks(a.id).length === minAttempts);
  };
  const upAthlete = getUpAthlete();

  const recordMark = (markType: "mark" | "foul" | "pass", measurement?: string, wind?: number) => {
    if (!selectedAthlete) return;

    const markData: InsertFieldEventMark = {
      sessionId,
      athleteId: selectedAthlete.id,
      attemptNumber: nextAttemptNumber,
      markType,
      measurement: markType === "mark" && measurement 
        ? parseFloat(measurement) 
        : undefined,
      wind: wind,
    };

    submitMarkMutation.mutate(markData);
  };

  // Vertical event mark recording
  const currentHeightIndex = session?.currentHeightIndex ?? 0;
  const currentHeight = heights?.find(h => h.heightIndex === currentHeightIndex);
  
  const recordVerticalMark = (markType: "cleared" | "missed" | "pass") => {
    if (!selectedAthlete || !heights) return;

    const athleteMarks = (marks || []).filter(m => m.athleteId === selectedAthlete.id);
    const heightMarks = athleteMarks.filter(m => m.heightIndex === currentHeightIndex);
    const attemptAtHeight = heightMarks.length + 1;
    const totalAttempts = athleteMarks.length + 1;

    const markData: InsertFieldEventMark = {
      sessionId,
      athleteId: selectedAthlete.id,
      attemptNumber: totalAttempts,
      markType,
      heightIndex: currentHeightIndex,
      attemptAtHeight,
      measurement: currentHeight?.heightMeters,
    };

    submitMarkMutation.mutate(markData);
  };

  // Get last mark for selected athlete (for undo button)
  const getLastMarkForAthlete = (athleteId: number): FieldEventMark | null => {
    const athleteMarks = (marks || [])
      .filter(m => m.athleteId === athleteId)
      .sort((a, b) => b.id - a.id); // Sort by ID descending to get most recent
    return athleteMarks[0] || null;
  };

  // Get last mark at current height for vertical events
  const getLastVerticalMarkForAthlete = (athleteId: number): FieldEventMark | null => {
    const athleteMarks = (marks || [])
      .filter(m => m.athleteId === athleteId && m.heightIndex === currentHeightIndex)
      .sort((a, b) => b.id - a.id);
    return athleteMarks[0] || null;
  };

  const handleDeleteLastMark = () => {
    if (!selectedAthlete) return;
    const lastMark = getLastMarkForAthlete(selectedAthlete.id);
    if (lastMark) {
      deleteMarkMutation.mutate(lastMark.id);
    }
  };

  const handleDeleteLastVerticalMark = () => {
    if (!selectedAthlete) return;
    const lastMark = getLastVerticalMarkForAthlete(selectedAthlete.id);
    if (lastMark) {
      deleteMarkMutation.mutate(lastMark.id);
    }
  };

  // For vertical events, find the "Up" athlete with proper rotation
  // Athletes rotate through: after A attempts, B attempts, then C, then back to A if they still need attempts
  const getVerticalUpAthlete = () => {
    if (!heights || heights.length === 0) return null;
    
    // Get eligible athletes: not eliminated, not cleared current height, < 3 attempts at this height
    const eligibleAthletes = sortedAthletes.filter(athlete => {
      const eliminated = isAthleteEliminated(athlete.id, marks || [], heights);
      if (eliminated) return false;
      
      const heightAttempts = getAthleteAttemptsAtHeight(athlete.id, currentHeightIndex, marks || []);
      const hasCleared = heightAttempts.includes('O');
      if (hasCleared) return false;
      
      return heightAttempts.length < 3;
    });
    
    if (eligibleAthletes.length === 0) return null;
    
    // Apply alive group size limit if set
    const aliveGroupSize = session?.aliveGroupSize;
    const activeGroup = aliveGroupSize && aliveGroupSize > 0 
      ? eligibleAthletes.slice(0, aliveGroupSize) 
      : eligibleAthletes;
    
    if (activeGroup.length === 0) return null;
    if (activeGroup.length === 1) return activeGroup[0];
    
    // Find the last attempt at current height to determine rotation position
    const heightMarks = (marks || [])
      .filter(m => m.heightIndex === currentHeightIndex)
      .sort((a, b) => {
        // Sort by ID descending (higher ID = more recent)
        return b.id - a.id;
      });
    
    if (heightMarks.length === 0) {
      // No attempts at this height yet, first athlete in active group is up
      return activeGroup[0];
    }
    
    // Find the athlete who last attempted
    const lastAttemptAthleteId = heightMarks[0]?.athleteId;
    
    // Find their original position in the FULL sorted list (not just active group)
    const lastAthleteOriginalIndex = sortedAthletes.findIndex(a => a.id === lastAttemptAthleteId);
    
    if (lastAthleteOriginalIndex === -1) {
      // Should not happen, but fallback to first
      return activeGroup[0];
    }
    
    // Walk from the position AFTER the last athlete in sorted order to find the next eligible athlete in active group
    // This handles cases where last athlete cleared/eliminated - we continue from their position
    for (let offset = 1; offset <= sortedAthletes.length; offset++) {
      const nextIndex = (lastAthleteOriginalIndex + offset) % sortedAthletes.length;
      const candidate = sortedAthletes[nextIndex];
      
      // Check if this candidate is in the active group
      if (activeGroup.some(a => a.id === candidate.id)) {
        return candidate;
      }
    }
    
    // Fallback: shouldn't reach here if activeGroup is non-empty
    return activeGroup[0];
  };

  const verticalUpAthlete = isVertical ? getVerticalUpAthlete() : null;

  if (sessionLoading || athletesLoading) {
    return (
      <div className="h-screen max-h-screen flex items-center justify-center overflow-hidden">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="h-screen max-h-screen flex items-center justify-center p-4 overflow-hidden">
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

  const eventName = session.event?.name || session.evtEventName || "Field Event";
  const totalFlights = Math.max(...(athletes?.map(a => a.flightNumber || 1) || [1]));
  const currentFlight = session.currentFlightNumber || 1;

  return (
    <div className="h-screen max-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - optimized for iPad */}
      <header className="bg-primary text-primary-foreground p-4 md:p-6 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-xl md:text-2xl truncate" data-testid="text-event-name">
              {eventName}
            </h1>
            <p className="text-base md:text-lg opacity-80">
              {isVertical && currentHeight ? (
                <>Bar: {formatHeightMark(currentHeight.heightMeters)} • </>
              ) : null}
              {!isVertical && session.isInFinals ? (
                <>Finals • {sortedAthletes.filter(a => a.isFinalist).length} finalists</>
              ) : (
                <>Flight {currentFlight} of {totalFlights} • {sortedAthletes.filter(a => (a.flightNumber || 1) === currentFlight).length} athletes</>
              )}
            </p>
          </div>
          {isVertical && (
            <Button 
              variant="ghost" 
              size="default"
              onClick={() => setShowHeightsDialog(true)}
              className="shrink-0 text-primary-foreground hover:bg-primary-foreground/20 text-base md:text-lg"
              data-testid="button-add-edit-heights"
            >
              <Ruler className="h-5 w-5 md:h-6 md:w-6 mr-1.5" />
              <span className="hidden sm:inline">Add/Edit Heights</span>
              <span className="sm:hidden">Heights</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="default"
            onClick={() => setShowAddAthlete(true)}
            className="shrink-0 text-primary-foreground hover:bg-primary-foreground/20 text-base md:text-lg"
            data-testid="button-add-athlete"
          >
            <UserPlus className="h-5 w-5 md:h-6 md:w-6 mr-1.5" />
            <span className="hidden sm:inline">Add Athlete</span>
            <span className="sm:hidden">Add</span>
          </Button>
          {!isVertical && (
            <Button 
              variant="ghost" 
              size="default"
              onClick={() => setShowGenerateFinals(true)}
              className="shrink-0 text-primary-foreground hover:bg-primary-foreground/20 text-base md:text-lg"
              data-testid="button-generate-finals-header"
            >
              <Star className="h-5 w-5 md:h-6 md:w-6 mr-1.5" />
              <span className="hidden sm:inline">Generate Finals</span>
              <span className="sm:hidden">Finals</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowSettings(true)}
            className="shrink-0 h-11 w-11 md:h-14 md:w-14 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-settings"
          >
            <Settings className="h-6 w-6 md:h-7 md:w-7" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLeave}
            className="shrink-0 h-11 w-11 md:h-14 md:w-14 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-leave-session"
          >
            <LogOut className="h-6 w-6 md:h-7 md:w-7" />
          </Button>
        </div>
      </header>

      {/* Tabs - always show labels for iPad */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="w-full rounded-none border-b h-16 md:h-20 bg-background">
          <TabsTrigger value="officiate" className="flex-1 gap-2.5 text-base md:text-lg data-[state=active]:bg-muted">
            <Users className="h-5 w-5 md:h-6 md:w-6" />
            <span>Officiate</span>
          </TabsTrigger>
          <TabsTrigger value="standings" className="flex-1 gap-2.5 text-base md:text-lg data-[state=active]:bg-muted">
            <Trophy className="h-5 w-5 md:h-6 md:w-6" />
            <span>Standings</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="flex-1 gap-2.5 text-base md:text-lg data-[state=active]:bg-muted">
            <Grid3X3 className="h-5 w-5 md:h-6 md:w-6" />
            <span>Review</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="officiate" className="flex-1 m-0 min-h-0 overflow-auto">
          {isVertical ? (
            // Vertical Event UI
            <>
              {/* Current Height Bar - iPad optimized */}
              {heights && heights.length > 0 ? (
                <div className="bg-muted/50 border-b">
                  <div className="p-4 md:p-5 flex items-center justify-between gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handleAdvanceHeight(-1)}
                      disabled={currentHeightIndex <= 0 || advanceHeightMutation.isPending}
                      className="text-base md:text-lg"
                      data-testid="button-previous-height"
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 mr-1" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
                      <span className="text-base md:text-lg text-muted-foreground">Current Bar:</span>
                      <span className="font-mono font-bold text-2xl md:text-3xl">
                        {currentHeight ? formatHeightMark(currentHeight.heightMeters) : "-"}
                      </span>
                      <div className="flex gap-2 md:gap-2.5">
                        {heights.sort((a, b) => a.heightIndex - b.heightIndex).map((h) => (
                          <Badge 
                            key={h.id} 
                            variant={h.heightIndex === currentHeightIndex ? "default" : "outline"}
                            className={`text-sm md:text-base px-2.5 py-1 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
                              h.heightIndex === currentHeightIndex ? 'ring-2 ring-primary ring-offset-1' : ''
                            }`}
                            onClick={() => handleJumpToHeight(h.heightIndex)}
                            data-testid={`badge-height-${h.heightIndex}`}
                          >
                            {formatHeightMark(h.heightMeters)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      variant="default"
                      onClick={() => handleAdvanceHeight(1)}
                      disabled={currentHeightIndex >= Math.max(...heights.map(h => h.heightIndex)) || advanceHeightMutation.isPending}
                      className="text-base md:text-lg"
                      data-testid="button-next-height"
                    >
                      Next
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6 ml-1" />
                    </Button>
                  </div>
                  
                  {/* Alive Group Selector */}
                  <div className="px-4 md:px-5 pb-4 md:pb-5 flex items-center justify-center gap-3 md:gap-4">
                    <span className="text-base md:text-lg text-muted-foreground">Alive Group:</span>
                    <Select 
                      value={session?.aliveGroupSize?.toString() || "all"}
                      onValueChange={handleAliveGroupChange}
                    >
                      <SelectTrigger className="w-32 md:w-36 h-10 md:h-12 text-base md:text-lg" data-testid="select-alive-group">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-base md:text-lg">All</SelectItem>
                        <SelectItem value="3" className="text-base md:text-lg">3-Alive</SelectItem>
                        <SelectItem value="4" className="text-base md:text-lg">4-Alive</SelectItem>
                        <SelectItem value="5" className="text-base md:text-lg">5-Alive</SelectItem>
                        <SelectItem value="6" className="text-base md:text-lg">6-Alive</SelectItem>
                        <SelectItem value="8" className="text-base md:text-lg">8-Alive</SelectItem>
                        <SelectItem value="10" className="text-base md:text-lg">10-Alive</SelectItem>
                      </SelectContent>
                    </Select>
                    {session?.aliveGroupSize && (
                      <span className="text-base md:text-lg text-muted-foreground">
                        (next {session.aliveGroupSize} athletes rotate)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 p-6 md:p-8 border-b text-center">
                  <p className="text-muted-foreground mb-3 text-base md:text-lg">No heights configured</p>
                  <p className="text-sm text-muted-foreground mb-4">Use the "Add/Edit Heights" button in the header to configure bar heights</p>
                </div>
              )}
              
              {sortedAthletes.length > 0 ? (
                <div className="divide-y">
                  {sortedAthletes.map((athlete) => (
                    <VerticalAthleteListItem
                      key={athlete.id}
                      athlete={athlete}
                      isUp={verticalUpAthlete?.id === athlete.id}
                      marks={marks || []}
                      heights={heights || []}
                      currentHeightIndex={currentHeightIndex}
                      onClick={() => setSelectedAthleteId(athlete.id)}
                      currentFlight={currentFlight}
                      totalFlights={totalFlights}
                      onMoveFlight={handleMoveFlight}
                      onChangeStatus={handleChangeStatus}
                      onEditMark={setEditingMark}
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
                    data-testid="button-add-athlete-empty-vertical"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Athlete
                  </Button>
                </div>
              )}

              {/* DNS Athletes Section for Vertical */}
              {dnsAthletes.length > 0 && (
                <div className="mt-4 border-t">
                  <div className="bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">No Shows ({dnsAthletes.length})</span>
                  </div>
                  <div className="divide-y opacity-60">
                    {dnsAthletes.map((athlete) => (
                      <VerticalAthleteListItem
                        key={athlete.id}
                        athlete={athlete}
                        isUp={false}
                        marks={marks || []}
                        heights={heights || []}
                        currentHeightIndex={currentHeightIndex}
                        onClick={() => {}}
                        currentFlight={currentFlight}
                        totalFlights={totalFlights}
                        onMoveFlight={handleMoveFlight}
                        onChangeStatus={handleChangeStatus}
                        onEditMark={setEditingMark}
                        isDns={true}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Bottom padding for scroll visibility */}
              <div className="h-8 shrink-0" />
            </>
          ) : (
            // Horizontal Event UI with Flight Selector
            <>
              {/* Flight Selector Bar */}
              <div className="bg-muted/50 border-b">
                <div className="p-3 md:p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    <span className="text-base md:text-lg text-muted-foreground">Flight:</span>
                    {Array.from({ length: totalFlights }, (_, i) => i + 1).map((flightNum) => {
                      const athletesInFlight = sortedAthletes.filter(a => (a.flightNumber || 1) === flightNum);
                      const isSelected = !session.isInFinals && currentFlight === flightNum;
                      const isSwitching = switchFlightMutation.isPending || exitFinalsAndSwitchFlightMutation.isPending;
                      return (
                        <Badge
                          key={flightNum}
                          variant={isSelected ? "default" : "outline"}
                          className={`text-sm md:text-base px-3 py-1.5 transition-all ${
                            isSwitching ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:ring-2 hover:ring-primary/50'
                          } ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                          onClick={() => {
                            if (isSwitching) return;
                            if (session.isInFinals) {
                              exitFinalsAndSwitchFlightMutation.mutate(flightNum);
                            } else if (currentFlight !== flightNum) {
                              handleSwitchFlight(flightNum);
                            }
                          }}
                          data-testid={`badge-flight-${flightNum}`}
                        >
                          Flight {flightNum} ({athletesInFlight.length})
                        </Badge>
                      );
                    })}
                    {/* Finals tab - show if there are finalists */}
                    {sortedAthletes.some(a => a.isFinalist) && (
                      <Badge
                        variant={session.isInFinals ? "default" : "outline"}
                        className={`text-sm md:text-base px-3 py-1.5 transition-all ${
                          enterFinalsMutation.isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:ring-2 hover:ring-primary/50'
                        } ${
                          session.isInFinals ? 'ring-2 ring-primary ring-offset-1 bg-amber-500 border-amber-500 text-white hover:bg-amber-600' : 'border-amber-500 text-amber-600'
                        }`}
                        onClick={() => {
                          if (enterFinalsMutation.isPending) return;
                          if (!session.isInFinals) {
                            enterFinalsMutation.mutate();
                          }
                        }}
                        data-testid="badge-finals"
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Finals ({sortedAthletes.filter(a => a.isFinalist).length})
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm md:text-base text-muted-foreground">
                    {session.isInFinals 
                      ? `${session.finalsAttempts || 3} attempts per finalist`
                      : `${session.prelimAttempts || 3} prelim attempts`
                    }
                  </span>
                </div>
              </div>

              {(() => {
                // Filter athletes based on mode
                const displayAthletes = session.isInFinals
                  ? sortedAthletes.filter(a => a.isFinalist).sort((a, b) => (a.finalsOrder || 0) - (b.finalsOrder || 0))
                  : sortedAthletes.filter(a => (a.flightNumber || 1) === currentFlight);
                
                return displayAthletes.length > 0 ? (
                  <div className="divide-y">
                    {displayAthletes.map((athlete) => (
                      <AthleteListItem
                        key={athlete.id}
                        athlete={athlete}
                        isUp={upAthlete?.id === athlete.id}
                        marks={getAthleteMarks(athlete.id)}
                        totalAttempts={officiateAttempts}
                        bestMark={getAthleteBestMark(athlete.id)}
                        onClick={() => setSelectedAthleteId(athlete.id)}
                        currentFlight={currentFlight}
                        totalFlights={totalFlights}
                        onMoveFlight={handleMoveFlight}
                        onChangeStatus={handleChangeStatus}
                        onEditMark={setEditingMark}
                        onForceFinalist={handleForceFinalist}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground text-lg">
                      {session.isInFinals 
                        ? "No finalists yet" 
                        : `No athletes in Flight ${currentFlight}`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {session.isInFinals 
                        ? "Generate finals from the Standings tab"
                        : "Athletes will appear here once they check in"
                      }
                    </p>
                    {!session.isInFinals && (
                      <Button 
                        className="mt-4" 
                        onClick={() => setShowAddAthlete(true)}
                        data-testid="button-add-athlete-empty"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Athlete
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* DNS Athletes Section */}
              {dnsAthletes.length > 0 && (
                <div className="mt-4 border-t">
                  <div className="bg-muted/50 px-4 py-2 flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">No Shows ({dnsAthletes.length})</span>
                  </div>
                  <div className="divide-y opacity-60">
                    {dnsAthletes.map((athlete) => (
                      <AthleteListItem
                        key={athlete.id}
                        athlete={athlete}
                        isUp={false}
                        marks={getAthleteMarks(athlete.id)}
                        totalAttempts={officiateAttempts}
                        bestMark={getAthleteBestMark(athlete.id)}
                        onClick={() => {}}
                        currentFlight={currentFlight}
                        totalFlights={totalFlights}
                        onMoveFlight={handleMoveFlight}
                        onChangeStatus={handleChangeStatus}
                        onEditMark={setEditingMark}
                        onForceFinalist={handleForceFinalist}
                        isDns={true}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Bottom padding for scroll visibility */}
              <div className="h-8 shrink-0" />
            </>
          )}
        </TabsContent>

        <TabsContent value="standings" className="flex-1 m-0 min-h-0 overflow-auto">
          {isVertical ? (
            <VerticalStandingsView 
              athletes={sortedAthletes} 
              marks={marks || []} 
              heights={heights || []}
            />
          ) : (
            <StandingsView 
              athletes={sortedAthletes} 
              marks={marks || []} 
              totalAttempts={totalAttempts} 
            />
          )}
        </TabsContent>

        <TabsContent value="review" className="flex-1 m-0 min-h-0 overflow-auto">
          {isVertical ? (
            <VerticalReviewMarksView 
              athletes={sortedAthletes} 
              marks={marks || []} 
              heights={heights || []}
              onEditMark={setEditingMark}
            />
          ) : (
            <ReviewMarksView 
              athletes={sortedAthletes} 
              marks={marks || []} 
              totalAttempts={totalAttempts}
              onEditMark={setEditingMark}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Mark entry sheet - conditionally use vertical or horizontal */}
      {selectedAthlete && isVertical ? (
        <VerticalAttemptSheet
          athlete={selectedAthlete}
          heights={heights || []}
          currentHeightIndex={currentHeightIndex}
          marks={marks || []}
          onRecordMark={recordVerticalMark}
          onDeleteLastMark={handleDeleteLastVerticalMark}
          onClose={() => setSelectedAthleteId(null)}
          isPending={submitMarkMutation.isPending || deleteMarkMutation.isPending}
          canDeleteLast={!!getLastVerticalMarkForAthlete(selectedAthlete.id)}
        />
      ) : selectedAthlete ? (
        <MarkEntrySheet
          athlete={selectedAthlete}
          attemptNumber={nextAttemptNumber}
          totalAttempts={officiateAttempts}
          onRecordMark={recordMark}
          onDeleteLastMark={handleDeleteLastMark}
          onClose={() => setSelectedAthleteId(null)}
          isPending={submitMarkMutation.isPending || deleteMarkMutation.isPending}
          canDeleteLast={!!getLastMarkForAthlete(selectedAthlete.id)}
          recordWind={session?.recordWind || false}
        />
      ) : null}

      {/* Add Athlete Dialog */}
      <AddAthleteDialog
        isOpen={showAddAthlete}
        onClose={() => setShowAddAthlete(false)}
        sessionId={sessionId}
        totalFlights={totalFlights}
        meetId={session?.event?.meetId || undefined}
      />

      <GenerateFinalsDialog
        isOpen={showGenerateFinals}
        onClose={() => setShowGenerateFinals(false)}
        sessionId={sessionId}
        athletes={sortedAthletes}
        marks={marks || []}
        defaultCount={session?.athletesToFinals || 8}
      />

      {/* Edit Mark Dialog */}
      <EditMarkDialog
        mark={editingMark}
        isOpen={!!editingMark}
        onClose={() => setEditingMark(null)}
        sessionId={sessionId}
        isVertical={!!isVertical}
        heights={heights}
      />

      {/* Heights Configuration Dialog */}
      <HeightsDialog
        sessionId={sessionId}
        open={showHeightsDialog}
        onOpenChange={setShowHeightsDialog}
      />

      {/* Event Settings Dialog */}
      {session && (
        <EventSettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          session={session}
          isVertical={!!isVertical}
        />
      )}
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
