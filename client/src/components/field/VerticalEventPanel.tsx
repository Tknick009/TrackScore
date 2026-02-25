import { useState } from "react";
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
import { Check, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, ArrowRightLeft, Pencil, Trash2, Delete, Ruler, Users, Trophy, Grid3X3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FieldEventMark, FieldHeight } from "@shared/schema";
import {
  type EnrichedAthlete,
  getAthleteDisplayInfo,
  formatHeightMark,
  getAthleteAttemptsAtHeight,
  getAthleteHeightAttempts,
  isAthleteEliminated,
  getHighestClearedHeight,
  countMissesAtHeight,
  countTotalMisses,
  type useFieldSession,
} from "@/hooks/useFieldSession";

type FieldSession = ReturnType<typeof useFieldSession>;

// ==================== INLINE VERTICAL ENTRY ====================

function InlineVerticalEntry({
  athlete,
  heights,
  currentHeightIndex,
  marks,
  onRecordMark,
  onDeleteLastMark,
  onClose,
  isPending,
  canDeleteLast,
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
    <div className="bg-muted/80 border-y-2 border-primary/30 animate-in slide-in-from-top duration-150">
      {/* Compact header */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs sm:text-sm">{info.bib}</Badge>
          <span className="font-semibold text-sm sm:text-base">{info.name}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            @ {currentHeight ? formatHeightMark(currentHeight.heightMeters) : "-"} - Attempt {attemptNumber}/3
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

      {/* Current attempts display + action buttons */}
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
        {/* Current attempts at this height */}
        <div className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-bold">
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
          {!hasCleared && attemptNumber <= 3 && (
            <span className="text-muted-foreground/30">_</span>
          )}
        </div>

        {/* O/X/P buttons - inline, large, touch-friendly */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            onClick={() => onRecordMark("cleared")}
            disabled={isPending || hasCleared || attemptNumber > 3}
            className="h-12 sm:h-14 w-16 sm:w-20 text-xl sm:text-2xl bg-green-600 hover:bg-green-700 font-bold"
          >
            O
          </Button>
          <Button
            onClick={() => onRecordMark("missed")}
            disabled={isPending || hasCleared || attemptNumber > 3}
            className="h-12 sm:h-14 w-16 sm:w-20 text-xl sm:text-2xl bg-red-600 hover:bg-red-700 font-bold"
          >
            X
          </Button>
          <Button
            variant="secondary"
            onClick={() => onRecordMark("pass")}
            disabled={isPending || hasCleared || attemptNumber > 3}
            className="h-12 sm:h-14 w-16 sm:w-20 text-xl sm:text-2xl font-bold"
          >
            P
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== VERTICAL ATHLETE ROW ====================

function VerticalAthleteRow({
  athlete,
  isUp,
  isExpanded,
  marks,
  heights,
  currentHeightIndex,
  onClick,
  currentFlight,
  totalFlights,
  onMoveFlight,
  onChangeStatus,
  onEditMark,
  onSetOpeningHeight,
  isDns = false,
  showBibNumbers = true,
}: {
  athlete: EnrichedAthlete;
  isUp: boolean;
  isExpanded: boolean;
  marks: FieldEventMark[];
  heights: FieldHeight[];
  currentHeightIndex: number;
  onClick: () => void;
  currentFlight: number;
  totalFlights: number;
  onMoveFlight: (athleteId: number, newFlight: number) => void;
  onChangeStatus: (athleteId: number, checkInStatus: string, competitionStatus: string) => void;
  onEditMark: (mark: FieldEventMark) => void;
  onSetOpeningHeight: (athleteId: number, heightIndex: number) => void;
  isDns?: boolean;
  showBibNumbers?: boolean;
}) {
  const info = getAthleteDisplayInfo(athlete);
  const flightOptions = Array.from({ length: totalFlights + 1 }, (_, i) => i + 1);
  const eliminated = isAthleteEliminated(athlete.id, marks, heights);
  const highestCleared = getHighestClearedHeight(athlete.id, marks, heights);
  const currentHeightAttempts = getAthleteAttemptsAtHeight(athlete.id, currentHeightIndex, marks);
  const hasCleared = currentHeightAttempts.includes('O');
  const allPasses = currentHeightAttempts.length > 0 && !currentHeightAttempts.includes('O') && !currentHeightAttempts.includes('X');
  const heightMarks = marks
    .filter(m => m.athleteId === athlete.id && m.heightIndex === currentHeightIndex)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);

  return (
    <div
      className={`border-b border-border transition-colors ${
        isExpanded ? "bg-blue-50 dark:bg-blue-950/20" :
        isUp ? "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50" :
        "hover:bg-muted/30 active:bg-muted/50"
      } ${eliminated ? "opacity-50" : ""} ${allPasses ? "opacity-60" : ""}`}
    >
      <div
        className={`p-3 sm:p-4 flex items-center gap-2 sm:gap-3 ${
          !eliminated && !isDns ? "cursor-pointer" : ""
        }`}
        onClick={!eliminated && !isDns ? onClick : undefined}
      >
        {/* Status indicator */}
        <div className="w-12 sm:w-16 shrink-0 text-center">
          {eliminated ? (
            <Badge variant="outline" className="text-xs sm:text-sm px-2 py-0.5">OUT</Badge>
          ) : isUp ? (
            <Badge className="bg-green-600 text-white font-bold px-2 sm:px-3 py-1 text-xs sm:text-sm">UP</Badge>
          ) : hasCleared ? (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">CLR</Badge>
          ) : (
            <span className="text-xs sm:text-sm text-muted-foreground font-mono">{currentHeightAttempts || "-"}</span>
          )}
        </div>

        {/* Athlete info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {showBibNumbers && (
              <span className="font-mono text-xs sm:text-sm text-muted-foreground">{info.bib}</span>
            )}
            <span className={`font-semibold text-sm sm:text-base ${eliminated ? "line-through" : ""}`}>{info.name}</span>
            {!isDns && !eliminated && (athlete.startingHeightIndex === null || athlete.startingHeightIndex === undefined) && heights.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 border-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  // Default to first height
                  if (heights.length > 0) {
                    const sorted = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
                    onSetOpeningHeight(athlete.id, sorted[0].heightIndex);
                  }
                }}
              >
                Set Height
              </Button>
            )}
          </div>
          {info.team && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{info.team}</p>
          )}
        </div>

        {/* Attempt chips at current height */}
        <div className="flex gap-1 shrink-0">
          {heightMarks.map((m) => {
            const char = m.markType === 'cleared' ? 'O' : m.markType === 'missed' ? 'X' : 'P';
            const bgColor = char === 'O' ? 'bg-green-600' : char === 'X' ? 'bg-red-600' : 'bg-yellow-400';
            const textColor = char === 'P' ? 'text-black' : 'text-white';
            return (
              <button
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditMark(m);
                }}
                className={`min-w-[2rem] h-7 rounded ${bgColor} ${textColor} font-mono text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all`}
              >
                {char}
              </button>
            );
          })}
          {!eliminated && !hasCleared && heightMarks.length < 3 && heightMarks.length > 0 && (
            <div className="min-w-[2rem] h-7 rounded bg-muted text-muted-foreground font-mono text-xs flex items-center justify-center">
              _
            </div>
          )}
        </div>

        {/* Best height */}
        <div className="w-14 sm:w-16 text-right shrink-0">
          {highestCleared ? (
            <span className="font-mono font-semibold text-sm sm:text-base">{formatHeightMark(highestCleared.heightMeters)}</span>
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
            {!isDns && !eliminated && heights.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Ruler className="h-4 w-4 mr-2" />
                  Set Opening Height
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {[...heights].sort((a, b) => a.heightIndex - b.heightIndex).map((h) => (
                    <DropdownMenuItem
                      key={h.id}
                      onClick={() => onSetOpeningHeight(athlete.id, h.heightIndex)}
                    >
                      {formatHeightMark(h.heightMeters)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ==================== VERTICAL STANDINGS ====================

function VerticalStandingsView({
  athletes,
  marks,
  heights,
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

      return { athlete, highestCleared, missesAtBest, totalMisses, eliminated };
    })
    .sort((a, b) => {
      if (!a.highestCleared && !b.highestCleared) return 0;
      if (!a.highestCleared) return 1;
      if (!b.highestCleared) return -1;
      if (a.highestCleared.heightMeters !== b.highestCleared.heightMeters) {
        return b.highestCleared.heightMeters - a.highestCleared.heightMeters;
      }
      if (a.missesAtBest !== b.missesAtBest) return a.missesAtBest - b.missesAtBest;
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
      if (!isTied) currentPlace = index + 1;
    }
    return { ...item, place: item.highestCleared ? currentPlace : null };
  });

  return (
    <div className="divide-y w-full">
      {rankedStandings.map((item) => {
        const info = getAthleteDisplayInfo(item.athlete);
        return (
          <div
            key={item.athlete.id}
            className={`flex items-center gap-3 p-3 sm:p-4 ${item.eliminated ? 'opacity-50' : ''}`}
          >
            <div className="w-10 text-center font-bold text-lg shrink-0">
              {item.place ?? "-"}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-base ${item.eliminated ? 'line-through' : ''}`}>{info.name}</p>
              <p className="text-sm text-muted-foreground">{info.team || info.bib}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-lg">
                {item.highestCleared ? formatHeightMark(item.highestCleared.heightMeters) : "-"}
              </p>
              {item.highestCleared && (
                <p className="text-xs text-muted-foreground">
                  {item.missesAtBest}x @ best, {item.totalMisses} total
                </p>
              )}
              {item.eliminated && (
                <Badge variant="outline" className="text-xs mt-0.5">Eliminated</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== VERTICAL REVIEW ====================

function VerticalReviewView({
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 sticky left-0 bg-background">Athlete</th>
            {sortedHeights.map((height) => (
              <th key={height.id} className="text-center p-3 min-w-16">
                {formatHeightMark(height.heightMeters)}
              </th>
            ))}
            <th className="text-center p-3">Best</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map(athlete => {
            const info = getAthleteDisplayInfo(athlete);
            const highestCleared = getHighestClearedHeight(athlete.id, marks, heights);
            const eliminated = isAthleteEliminated(athlete.id, marks, heights);

            return (
              <tr key={athlete.id} className={`border-b ${eliminated ? 'opacity-50' : ''}`}>
                <td className="p-3 sticky left-0 bg-background min-w-[120px]">
                  <div className={`font-semibold text-sm ${eliminated ? 'line-through' : ''}`}>{info.name}</div>
                </td>
                {sortedHeights.map((height) => {
                  const heightMarks = getAthleteHeightAttempts(athlete.id, height.heightIndex, marks);
                  const attempts = getAthleteAttemptsAtHeight(athlete.id, height.heightIndex, marks);

                  let className = "text-muted-foreground";
                  if (attempts.includes('O')) className = "text-green-600 font-bold";
                  else if (attempts.includes('X')) className = "text-red-500";
                  else if (attempts.includes('P')) className = "text-yellow-600";

                  return (
                    <td key={height.id} className={`text-center p-3 font-mono ${className}`}>
                      {heightMarks.length > 0 ? (
                        <div className="space-y-0.5">
                          {heightMarks.map((m) => {
                            const symbol = m.markType === 'cleared' ? 'O' : m.markType === 'missed' ? 'X' : 'P';
                            const symbolClass = m.markType === 'cleared' ? 'text-green-600' :
                              m.markType === 'missed' ? 'text-red-500' : 'text-yellow-600';
                            return (
                              <button
                                key={m.id}
                                onClick={() => onEditMark(m)}
                                className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted ${symbolClass}`}
                              >
                                {symbol}
                                <Pencil className="h-2.5 w-2.5 opacity-40" />
                              </button>
                            );
                          })}
                        </div>
                      ) : "-"}
                    </td>
                  );
                })}
                <td className="text-center p-3 font-mono font-bold">
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

// ==================== MAIN VERTICAL PANEL ====================

export default function VerticalEventPanel({ fs }: { fs: FieldSession }) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("officiate");
  const [editingMark, setEditingMark] = useState<FieldEventMark | null>(null);
  const [editMarkType, setEditMarkType] = useState<string>("");

  const {
    session, sortedAthletes, dnsAthletes, marks, heights, showBibNumbers,
    totalFlights, currentFlight, currentHeightIndex, currentHeight,
    verticalUpAthlete, getLastVerticalMarkForAthlete,
    recordVerticalMark, handleDeleteLastVerticalMark,
    submitMarkMutation, deleteMarkMutation, moveFlightMutation,
    changeStatusMutation, advanceHeightMutation, jumpToHeightMutation,
    setOpeningHeightMutation, sessionId, deviceName,
  } = fs;

  if (!session) return null;

  const selectedAthlete = sortedAthletes.find(a => a.id === selectedAthleteId);
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);

  const handleAthleteClick = (athleteId: number) => {
    setSelectedAthleteId(selectedAthleteId === athleteId ? null : athleteId);
  };

  // Edit mark handlers
  const openEditMark = (mark: FieldEventMark) => {
    setEditingMark(mark);
    setEditMarkType(mark.markType || "");
  };

  const handleSaveEdit = async () => {
    if (!editingMark) return;
    try {
      await apiRequest("PATCH", `/api/field-marks/${editingMark.id}`, { markType: editMarkType, deviceName });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      setEditingMark(null);
    } catch {
      // error handled
    }
  };

  const handleDeleteEdit = async () => {
    if (!editingMark) return;
    try {
      await apiRequest("DELETE", `/api/field-marks/${editingMark.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      setEditingMark(null);
    } catch {
      // error handled
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Height Selector Bar */}
      <div className="bg-muted/50 border-b shrink-0">
        <div className="p-2 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => advanceHeightMutation.mutate(-1)}
              disabled={advanceHeightMutation.isPending || currentHeightIndex <= 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {sortedHeights.map((h) => {
                const isActive = h.heightIndex === currentHeightIndex;
                return (
                  <Badge
                    key={h.id}
                    variant={isActive ? "default" : "outline"}
                    className={`text-xs sm:text-sm px-2 sm:px-3 py-1 cursor-pointer transition-all whitespace-nowrap ${
                      isActive ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-2 hover:ring-primary/50'
                    }`}
                    onClick={() => {
                      if (h.heightIndex !== currentHeightIndex) {
                        jumpToHeightMutation.mutate(h.heightIndex);
                      }
                    }}
                  >
                    {formatHeightMark(h.heightMeters)}
                  </Badge>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => advanceHeightMutation.mutate(1)}
              disabled={advanceHeightMutation.isPending || (sortedHeights.length > 0 && currentHeightIndex >= sortedHeights[sortedHeights.length - 1]?.heightIndex)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-xs sm:text-sm font-mono font-semibold shrink-0">
            {currentHeight ? formatHeightMark(currentHeight.heightMeters) : "No heights"}
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
          {/* Inline vertical entry - shows when athlete is selected */}
          {selectedAthlete && (
            <InlineVerticalEntry
              athlete={selectedAthlete}
              heights={heights}
              currentHeightIndex={currentHeightIndex}
              marks={marks}
              onRecordMark={(markType) => {
                recordVerticalMark(selectedAthlete, markType);
              }}
              onDeleteLastMark={() => handleDeleteLastVerticalMark(selectedAthlete.id)}
              onClose={() => setSelectedAthleteId(null)}
              isPending={submitMarkMutation.isPending || deleteMarkMutation.isPending}
              canDeleteLast={!!getLastVerticalMarkForAthlete(selectedAthlete.id)}
            />
          )}

          {/* Athlete list */}
          {sortedAthletes.length > 0 ? (
            <div className="divide-y w-full">
              {sortedAthletes.map((athlete) => (
                <VerticalAthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  isUp={verticalUpAthlete?.id === athlete.id}
                  isExpanded={selectedAthleteId === athlete.id}
                  marks={marks}
                  heights={heights}
                  currentHeightIndex={currentHeightIndex}
                  onClick={() => handleAthleteClick(athlete.id)}
                  currentFlight={currentFlight}
                  totalFlights={totalFlights}
                  onMoveFlight={(id, f) => moveFlightMutation.mutate({ athleteId: id, newFlight: f })}
                  onChangeStatus={(id, c, s) => changeStatusMutation.mutate({ athleteId: id, checkInStatus: c, competitionStatus: s })}
                  onEditMark={openEditMark}
                  onSetOpeningHeight={(id, h) => setOpeningHeightMutation.mutate({ athleteId: id, heightIndex: h })}
                  showBibNumbers={showBibNumbers}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No athletes checked in</p>
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
                  <VerticalAthleteRow
                    key={athlete.id}
                    athlete={athlete}
                    isUp={false}
                    isExpanded={false}
                    marks={marks}
                    heights={heights}
                    currentHeightIndex={currentHeightIndex}
                    onClick={() => {}}
                    currentFlight={currentFlight}
                    totalFlights={totalFlights}
                    onMoveFlight={(id, f) => moveFlightMutation.mutate({ athleteId: id, newFlight: f })}
                    onChangeStatus={(id, c, s) => changeStatusMutation.mutate({ athleteId: id, checkInStatus: c, competitionStatus: s })}
                    onEditMark={openEditMark}
                    onSetOpeningHeight={(id, h) => setOpeningHeightMutation.mutate({ athleteId: id, heightIndex: h })}
                    isDns={true}
                    showBibNumbers={showBibNumbers}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="standings" className="flex-1 m-0 min-h-0 overflow-auto">
          <VerticalStandingsView
            athletes={sortedAthletes}
            marks={marks}
            heights={heights}
          />
        </TabsContent>

        <TabsContent value="review" className="flex-1 m-0 min-h-0 overflow-auto">
          <VerticalReviewView
            athletes={sortedAthletes}
            marks={marks}
            heights={heights}
            onEditMark={openEditMark}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Mark Dialog */}
      <Dialog open={!!editingMark} onOpenChange={(open) => !open && setEditingMark(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Mark</DialogTitle>
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
                  <SelectItem value="cleared">O (Cleared)</SelectItem>
                  <SelectItem value="missed">X (Missed)</SelectItem>
                  <SelectItem value="pass">P (Pass)</SelectItem>
                </SelectContent>
              </Select>
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
