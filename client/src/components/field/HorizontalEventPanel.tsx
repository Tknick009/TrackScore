import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, X, ChevronUp, MoreVertical, ArrowRightLeft, Star, Pencil, Trash2, Delete, Users, Trophy, Grid3X3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FieldEventMark } from "@shared/schema";
import {
  type EnrichedAthlete,
  getAthleteDisplayInfo,
  type useFieldSession,
} from "@/hooks/useFieldSession";

type FieldSession = ReturnType<typeof useFieldSession>;

// ==================== INLINE MARK ENTRY ====================

function InlineMarkEntry({
  athlete,
  attemptNumber,
  totalAttempts,
  onRecordMark,
  onDeleteLastMark,
  onClose,
  isPending,
  canDeleteLast,
  recordWind = false,
  measurementUnit = 'metric',
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
  measurementUnit?: 'metric' | 'english';
}) {
  const [meters, setMeters] = useState("");
  const [centimeters, setCentimeters] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [windValue, setWindValue] = useState("");
  const [windSign, setWindSign] = useState<"+" | "-">("+");
  const cmInputRef = useRef<HTMLInputElement>(null);
  const inchesInputRef = useRef<HTMLInputElement>(null);
  const info = getAthleteDisplayInfo(athlete);
  const isEnglish = measurementUnit === 'english';

  const getMeasurement = () => {
    if (isEnglish) {
      const ft = parseInt(feet) || 0;
      const inch = parseFloat(inches) || 0;
      if (ft === 0 && inch === 0) return "";
      const totalInches = ft * 12 + inch;
      const metersValue = totalInches * 0.0254;
      return metersValue.toFixed(2);
    } else {
      const m = parseInt(meters) || 0;
      const cm = parseInt(centimeters) || 0;
      if (m === 0 && cm === 0) return "";
      return (m + cm / 100).toFixed(2);
    }
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
    setFeet("");
    setInches("");
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
    setCentimeters(value.replace(/\D/g, '').slice(0, 2));
  };

  const handleFeetChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setFeet(cleaned);
    if (cleaned.length >= 2) {
      inchesInputRef.current?.focus();
    }
  };

  const handleInchesChange = (value: string) => {
    setInches(value.replace(/[^0-9.]/g, '').slice(0, 5));
  };

  return (
    <div className="bg-muted/80 border-y-2 border-primary/30 animate-in slide-in-from-top duration-150">
      {/* Compact header */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs sm:text-sm">{info.bib}</Badge>
          <span className="font-semibold text-sm sm:text-base">{info.name}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Attempt {attemptNumber}/{totalAttempts}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canDeleteLast && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteLastMark}
              disabled={isPending}
              className="text-destructive h-8 px-2"
            >
              <Delete className="h-3.5 w-3.5 mr-1" />
              Undo
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Input row - all inline */}
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 flex-wrap">
        {/* Measurement input */}
        <div className="flex items-center gap-1.5">
          {isEnglish ? (
            <>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="FT"
                value={feet}
                onChange={(e) => handleFeetChange(e.target.value)}
                className="h-10 sm:h-12 w-16 sm:w-20 text-lg sm:text-xl text-center font-mono"
                autoFocus
              />
              <span className="text-xl font-bold text-muted-foreground">'</span>
              <Input
                ref={inchesInputRef}
                type="text"
                inputMode="decimal"
                placeholder="IN"
                value={inches}
                onChange={(e) => handleInchesChange(e.target.value)}
                className="h-10 sm:h-12 w-16 sm:w-20 text-lg sm:text-xl text-center font-mono"
              />
              <span className="text-xl font-bold text-muted-foreground">"</span>
            </>
          ) : (
            <>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="M"
                value={meters}
                onChange={(e) => handleMetersChange(e.target.value)}
                className="h-10 sm:h-12 w-14 sm:w-16 text-lg sm:text-xl text-center font-mono"
                autoFocus
              />
              <span className="text-xl font-bold text-muted-foreground">.</span>
              <Input
                ref={cmInputRef}
                type="text"
                inputMode="numeric"
                placeholder="CM"
                value={centimeters}
                onChange={(e) => handleCentimetersChange(e.target.value)}
                className="h-10 sm:h-12 w-14 sm:w-16 text-lg sm:text-xl text-center font-mono"
              />
            </>
          )}
        </div>

        {/* Wind input (if applicable) */}
        {recordWind && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">W:</span>
            <Button
              type="button"
              variant={windSign === "+" ? "default" : "outline"}
              size="sm"
              className="h-10 w-10 text-lg font-bold"
              onClick={() => setWindSign(windSign === "+" ? "-" : "+")}
            >
              {windSign}
            </Button>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={windValue}
              onChange={(e) => setWindValue(e.target.value.replace(/[^0-9.]/g, ''))}
              className="h-10 w-14 text-base text-center font-mono"
            />
          </div>
        )}

        {/* Action buttons - inline */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            onClick={() => handleSubmit("mark")}
            disabled={(isEnglish ? (!feet && !inches) : (!meters && !centimeters)) || isPending}
            className="h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
            MARK
          </Button>
          <Button
            onClick={() => handleSubmit("foul")}
            disabled={isPending}
            className="h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base bg-red-600 hover:bg-red-700"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
            FOUL
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit("pass")}
            disabled={isPending}
            className="h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base"
          >
            PASS
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== ATHLETE ROW ====================

function AthleteRow({
  athlete,
  isUp,
  isExpanded,
  roundMarks,
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
  showBibNumbers = true,
}: {
  athlete: EnrichedAthlete;
  isUp: boolean;
  isExpanded: boolean;
  roundMarks: FieldEventMark[];
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
  showBibNumbers?: boolean;
}) {
  const info = getAthleteDisplayInfo(athlete);
  const flightOptions = Array.from({ length: totalFlights + 1 }, (_, i) => i + 1);

  return (
    <div
      className={`border-b border-border transition-colors ${
        isExpanded ? "bg-blue-50 dark:bg-blue-950/20" : 
        isUp ? "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50" : 
        "hover:bg-muted/30 active:bg-muted/50"
      }`}
    >
      <div
        className="p-3 sm:p-4 cursor-pointer flex items-center gap-2 sm:gap-3"
        onClick={onClick}
      >
        {/* Status indicator */}
        <div className="w-12 sm:w-16 shrink-0 text-center">
          {isUp ? (
            <Badge className="bg-green-600 text-white font-bold px-2 sm:px-3 py-1 text-xs sm:text-sm">UP</Badge>
          ) : (
            <span className="text-xs sm:text-sm text-muted-foreground">
              {roundMarks.length}/{totalAttempts}
            </span>
          )}
        </div>

        {/* Athlete info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {showBibNumbers && (
              <span className="font-mono text-xs sm:text-sm text-muted-foreground">{info.bib}</span>
            )}
            <span className="font-semibold text-sm sm:text-base">{info.name}</span>
          </div>
          {info.team && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{info.team}</p>
          )}
        </div>

        {/* Attempt chips */}
        <div className="flex gap-1 shrink-0">
          {Array.from({ length: totalAttempts }).map((_, i) => {
            const mark = roundMarks[i];
            if (mark) {
              let content: string;
              let bgColor: string;
              let textColor: string;
              if (mark.markType === "mark" && mark.measurement) {
                content = mark.measurement.toFixed(2);
                bgColor = "bg-green-600";
                textColor = "text-white";
              } else if (mark.markType === "foul") {
                content = "X";
                bgColor = "bg-red-600";
                textColor = "text-white";
              } else {
                content = "P";
                bgColor = "bg-yellow-400";
                textColor = "text-black";
              }
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMark(mark);
                  }}
                  className={`min-w-[2.5rem] px-1 py-0.5 rounded ${bgColor} ${textColor} font-mono text-xs font-semibold hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all flex flex-col items-center`}
                >
                  <span>{content}</span>
                  {mark.wind !== null && mark.wind !== undefined && (
                    <span className="text-[9px] opacity-80">{mark.wind > 0 ? '+' : ''}{mark.wind.toFixed(1)}</span>
                  )}
                </button>
              );
            }
            return (
              <div key={i} className="min-w-[2.5rem] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs text-center">
                -
              </div>
            );
          })}
        </div>

        {/* Best mark */}
        <div className="w-14 sm:w-16 text-right shrink-0">
          {bestMark !== null ? (
            <span className="font-mono font-semibold text-sm sm:text-base">{bestMark.toFixed(2)}</span>
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
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isDns ? (
              <DropdownMenuItem onClick={() => onChangeStatus(athlete.id, "checked_in", "competing")}>
                <Check className="h-4 w-4 mr-2" />
                Check In
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onChangeStatus(athlete.id, "dns", "dns")}>
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
                  >
                    Flight {flight}
                    {flight === (athlete.flightNumber || 1) && " (current)"}
                    {flight === totalFlights + 1 && " (new)"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => onForceFinalist(athlete.id, !athlete.isFinalist)}>
              <Star className={`h-4 w-4 mr-2 ${athlete.isFinalist ? 'text-amber-500 fill-amber-500' : ''}`} />
              {athlete.isFinalist ? "Remove from Finals" : "Force to Finals"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ==================== STANDINGS VIEW ====================

function StandingsView({
  athletes,
  marks,
  totalAttempts,
}: {
  athletes: EnrichedAthlete[];
  marks: FieldEventMark[];
  totalAttempts: number;
}) {
  const getAthleteMarks = (athleteId: number) =>
    marks.filter(m => m.athleteId === athleteId).sort((a, b) => a.attemptNumber - b.attemptNumber);

  const getBestMark = (athleteId: number): number | null => {
    const valid = getAthleteMarks(athleteId)
      .filter(m => m.markType === "mark" && m.measurement)
      .map(m => m.measurement as number);
    return valid.length > 0 ? Math.max(...valid) : null;
  };

  const rankedAthletes = [...athletes]
    .map(a => ({ athlete: a, best: getBestMark(a.id) }))
    .sort((a, b) => {
      if (a.best === null && b.best === null) return 0;
      if (a.best === null) return 1;
      if (b.best === null) return -1;
      return b.best - a.best;
    });

  let currentPlace = 1;
  return (
    <div className="divide-y w-full">
      {rankedAthletes.map((item, index) => {
        if (index > 0 && item.best !== rankedAthletes[index - 1].best) {
          currentPlace = index + 1;
        }
        const info = getAthleteDisplayInfo(item.athlete);
        return (
          <div key={item.athlete.id} className="flex items-center gap-3 p-3 sm:p-4">
            <div className="w-10 text-center font-bold text-lg shrink-0">
              {item.best !== null ? currentPlace : "-"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base">{info.name}</p>
              <p className="text-sm text-muted-foreground">{info.team || info.bib}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-lg">
                {item.best !== null ? item.best.toFixed(2) : "-"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== REVIEW VIEW ====================

function ReviewView({
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
  const getAthleteMarks = (athleteId: number) =>
    marks.filter(m => m.athleteId === athleteId).sort((a, b) => a.attemptNumber - b.attemptNumber);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 sticky left-0 bg-background">Athlete</th>
            {Array.from({ length: totalAttempts }, (_, i) => (
              <th key={i} className="text-center p-3 min-w-16">#{i + 1}</th>
            ))}
            <th className="text-center p-3">Best</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map(athlete => {
            const info = getAthleteDisplayInfo(athlete);
            const athleteMarks = getAthleteMarks(athlete.id);
            const validMarks = athleteMarks.filter(m => m.markType === "mark" && m.measurement).map(m => m.measurement as number);
            const best = validMarks.length > 0 ? Math.max(...validMarks) : null;

            return (
              <tr key={athlete.id} className="border-b">
                <td className="p-3 sticky left-0 bg-background min-w-[120px]">
                  <div className="font-semibold">{info.name}</div>
                  {info.team && <div className="text-xs text-muted-foreground">{info.team}</div>}
                </td>
                {Array.from({ length: totalAttempts }, (_, i) => {
                  const mark = athleteMarks[i];
                  if (!mark) return <td key={i} className="text-center p-3 text-muted-foreground">-</td>;

                  let content: string;
                  let className = "font-mono";
                  if (mark.markType === "mark" && mark.measurement) {
                    content = mark.measurement.toFixed(2);
                    className += " text-green-600 font-bold";
                  } else if (mark.markType === "foul") {
                    content = "X";
                    className += " text-red-500";
                  } else {
                    content = "P";
                    className += " text-yellow-600";
                  }

                  return (
                    <td key={i} className="text-center p-3">
                      <button
                        onClick={() => onEditMark(mark)}
                        className={`${className} hover:underline cursor-pointer inline-flex items-center gap-0.5`}
                      >
                        {content}
                        <Pencil className="h-3 w-3 opacity-40" />
                      </button>
                    </td>
                  );
                })}
                <td className="text-center p-3 font-mono font-bold">
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

// ==================== MAIN HORIZONTAL PANEL ====================

export default function HorizontalEventPanel({ fs }: { fs: FieldSession }) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("officiate");
  const [editingMark, setEditingMark] = useState<FieldEventMark | null>(null);
  const [editMarkType, setEditMarkType] = useState<string>("");
  const [editMeasurement, setEditMeasurement] = useState<string>("");
  const [editWindValue, setEditWindValue] = useState<string>("");
  const [editWindSign, setEditWindSign] = useState<"+" | "-">("+");

  const {
    session, sortedAthletes, dnsAthletes, marks, showBibNumbers,
    totalFlights, currentFlight, officiateAttempts, totalAttempts,
    upAthlete, getAthleteRoundMarks, getAthleteBestMark,
    getLastMarkForAthlete, recordMark, handleDeleteLastMark,
    submitMarkMutation, deleteMarkMutation, moveFlightMutation,
    forceFinalistMutation, changeStatusMutation, switchFlightMutation,
    exitFinalsAndSwitchFlightMutation, enterFinalsMutation,
  } = fs;

  if (!session) return null;

  const selectedAthlete = sortedAthletes.find(a => a.id === selectedAthleteId);
  const selectedAthleteRoundMarks = selectedAthlete ? getAthleteRoundMarks(selectedAthlete.id) : [];
  const nextAttemptNumber = selectedAthleteRoundMarks.length + 1;

  const handleAthleteClick = (athleteId: number) => {
    setSelectedAthleteId(selectedAthleteId === athleteId ? null : athleteId);
  };

  // Filter athletes for current view
  const displayAthletes = session.isInFinals
    ? sortedAthletes.filter(a => a.isFinalist).sort((a, b) => (a.finalsOrder || 0) - (b.finalsOrder || 0))
    : sortedAthletes.filter(a => (a.flightNumber || 1) === currentFlight);

  // Edit mark handlers
  const openEditMark = (mark: FieldEventMark) => {
    setEditingMark(mark);
    setEditMarkType(mark.markType || "");
    setEditMeasurement(mark.measurement?.toString() || "");
    if (mark.wind !== null && mark.wind !== undefined) {
      setEditWindValue(Math.abs(mark.wind).toString());
      setEditWindSign(mark.wind < 0 ? "-" : "+");
    } else {
      setEditWindValue("");
      setEditWindSign("+");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMark) return;
    const data: { markType: string; measurement?: number; wind?: number | null } = { markType: editMarkType };
    if (editMarkType === "mark" && editMeasurement) {
      data.measurement = parseFloat(editMeasurement);
    }
    if (editWindValue.trim() !== "") {
      const absWind = Math.abs(parseFloat(editWindValue));
      data.wind = editWindSign === "-" ? -absWind : absWind;
    } else {
      data.wind = null;
    }
    try {
      await apiRequest("PATCH", `/api/field-marks/${editingMark.id}`, { ...data, deviceName: fs.deviceName });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", fs.sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", fs.sessionId, "athletes"] });
      setEditingMark(null);
    } catch {
      // error handled by mutation
    }
  };

  const handleDeleteEdit = async () => {
    if (!editingMark) return;
    try {
      await apiRequest("DELETE", `/api/field-marks/${editingMark.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", fs.sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", fs.sessionId, "athletes"] });
      setEditingMark(null);
    } catch {
      // error handled
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Flight Selector Bar */}
      <div className="bg-muted/50 border-b shrink-0">
        <div className="p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="w-full overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max sm:flex-wrap">
              <span className="text-sm text-muted-foreground shrink-0">Flight:</span>
              {Array.from({ length: totalFlights }, (_, i) => i + 1).map((flightNum) => {
                const athletesInFlight = sortedAthletes.filter(a => (a.flightNumber || 1) === flightNum);
                const isSelected = !session.isInFinals && currentFlight === flightNum;
                const isSwitching = switchFlightMutation.isPending || exitFinalsAndSwitchFlightMutation.isPending;
                return (
                  <Badge
                    key={flightNum}
                    variant={isSelected ? "default" : "outline"}
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 transition-all ${
                      isSwitching ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:ring-2 hover:ring-primary/50'
                    } ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    onClick={() => {
                      if (isSwitching) return;
                      if (session.isInFinals) {
                        exitFinalsAndSwitchFlightMutation.mutate(flightNum);
                      } else if (currentFlight !== flightNum) {
                        switchFlightMutation.mutate(flightNum);
                      }
                    }}
                  >
                    Flt {flightNum} ({athletesInFlight.length})
                  </Badge>
                );
              })}
              {sortedAthletes.some(a => a.isFinalist) && (
                <Badge
                  variant={session.isInFinals ? "default" : "outline"}
                  className={`text-xs sm:text-sm px-2 sm:px-3 py-1 transition-all ${
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
                >
                  <Star className="h-3.5 w-3.5 mr-1" />
                  Finals ({sortedAthletes.filter(a => a.isFinalist).length})
                </Badge>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {session.isInFinals
              ? `${session.finalsAttempts || 3} attempts per finalist`
              : `${session.prelimAttempts || 3} prelim attempts`
            }
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="w-full rounded-none border-b h-10 sm:h-12 bg-background shrink-0">
          <TabsTrigger value="officiate" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-muted">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Officiate
          </TabsTrigger>
          <TabsTrigger value="standings" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-muted">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="review" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-muted">
            <Grid3X3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="officiate" className="flex-1 m-0 min-h-0 overflow-auto">
          {/* Inline mark entry - shows when athlete is selected */}
          {selectedAthlete && (
            <InlineMarkEntry
              athlete={selectedAthlete}
              attemptNumber={nextAttemptNumber}
              totalAttempts={officiateAttempts}
              onRecordMark={(markType, measurement, wind) => {
                recordMark(selectedAthlete, markType, measurement, wind);
                // Don't auto-close - let user continue entering marks
              }}
              onDeleteLastMark={() => handleDeleteLastMark(selectedAthlete.id)}
              onClose={() => setSelectedAthleteId(null)}
              isPending={submitMarkMutation.isPending || deleteMarkMutation.isPending}
              canDeleteLast={!!getLastMarkForAthlete(selectedAthlete.id)}
              recordWind={session?.recordWind || false}
              measurementUnit={(session?.measurementUnit as 'metric' | 'english') || 'metric'}
            />
          )}

          {/* Athlete list */}
          {displayAthletes.length > 0 ? (
            <div className="divide-y w-full">
              {displayAthletes.map((athlete) => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  isUp={upAthlete?.id === athlete.id}
                  isExpanded={selectedAthleteId === athlete.id}
                  roundMarks={getAthleteRoundMarks(athlete.id)}
                  totalAttempts={officiateAttempts}
                  bestMark={getAthleteBestMark(athlete.id)}
                  onClick={() => handleAthleteClick(athlete.id)}
                  currentFlight={currentFlight}
                  totalFlights={totalFlights}
                  onMoveFlight={(id, f) => moveFlightMutation.mutate({ athleteId: id, newFlight: f })}
                  onChangeStatus={(id, c, s) => changeStatusMutation.mutate({ athleteId: id, checkInStatus: c, competitionStatus: s })}
                  onEditMark={openEditMark}
                  onForceFinalist={(id, f) => forceFinalistMutation.mutate({ athleteId: id, isFinalist: f })}
                  showBibNumbers={showBibNumbers}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {session.isInFinals ? "No finalists yet" : `No athletes in Flight ${currentFlight}`}
              </p>
            </div>
          )}

          {/* DNS Athletes */}
          {dnsAthletes.length > 0 && (
            <div className="border-t">
              <div className="bg-muted/50 px-3 py-1.5 flex items-center gap-2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-xs">No Shows ({dnsAthletes.length})</span>
              </div>
              <div className="divide-y opacity-60">
                {dnsAthletes.map((athlete) => (
                  <AthleteRow
                    key={athlete.id}
                    athlete={athlete}
                    isUp={false}
                    isExpanded={false}
                    roundMarks={getAthleteRoundMarks(athlete.id)}
                    totalAttempts={officiateAttempts}
                    bestMark={getAthleteBestMark(athlete.id)}
                    onClick={() => {}}
                    currentFlight={currentFlight}
                    totalFlights={totalFlights}
                    onMoveFlight={(id, f) => moveFlightMutation.mutate({ athleteId: id, newFlight: f })}
                    onChangeStatus={(id, c, s) => changeStatusMutation.mutate({ athleteId: id, checkInStatus: c, competitionStatus: s })}
                    onEditMark={openEditMark}
                    onForceFinalist={(id, f) => forceFinalistMutation.mutate({ athleteId: id, isFinalist: f })}
                    isDns={true}
                    showBibNumbers={showBibNumbers}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="standings" className="flex-1 m-0 min-h-0 overflow-auto">
          <StandingsView
            athletes={sortedAthletes}
            marks={marks}
            totalAttempts={totalAttempts}
          />
        </TabsContent>

        <TabsContent value="review" className="flex-1 m-0 min-h-0 overflow-auto">
          <ReviewView
            athletes={sortedAthletes}
            marks={marks}
            totalAttempts={totalAttempts}
            onEditMark={openEditMark}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Mark Dialog */}
      <Dialog open={!!editingMark} onOpenChange={(open) => !open && setEditingMark(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Attempt #{editingMark?.attemptNumber}</DialogTitle>
            <DialogDescription>Modify or delete this attempt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mark Type</Label>
              <Select value={editMarkType} onValueChange={setEditMarkType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mark type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark">Mark (Distance)</SelectItem>
                  <SelectItem value="foul">X (Foul)</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editMarkType === "mark" && (
              <div className="space-y-2">
                <Label>Measurement (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editMeasurement}
                  onChange={(e) => setEditMeasurement(e.target.value)}
                  placeholder="Enter distance in meters"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Wind (m/s)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={editWindSign === "+" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setEditWindSign(editWindSign === "+" ? "-" : "+")}
                >
                  {editWindSign}
                </Button>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editWindValue}
                  onChange={(e) => setEditWindValue(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.0"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-2">
            <Button variant="destructive" onClick={handleDeleteEdit}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingMark(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={!editMarkType}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
