import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Check, X, Minus, Loader2, User, Plus, ChevronUp } from "lucide-react";
import type { 
  FieldEventSession, 
  FieldEventAthlete, 
  FieldEventMark,
  FieldHeight,
  EntryWithDetails 
} from "@shared/schema";

interface VerticalEventEntryProps {
  sessionId: number;
  session: FieldEventSession;
  athletes: FieldEventAthlete[];
  marks: FieldEventMark[];
  heights: FieldHeight[];
  currentAthlete: FieldEventAthlete | null;
  entries: EntryWithDetails[];
  onMarkSubmit: (mark: { 
    athleteId: number; 
    attemptNumber: number; 
    heightIndex: number; 
    attemptAtHeight: number; 
    markType: string 
  }) => Promise<void>;
  onHeightAdd?: (height: { 
    sessionId: number; 
    heightIndex: number; 
    heightMeters: number 
  }) => Promise<void>;
}

interface VerticalStanding {
  athleteId: number;
  place: number;
  highestCleared: number | null;
  highestClearedDisplay: string | null;
  missesAtWinningHeight: number;
  totalMisses: number;
  attemptSequence: string;
  isTied: boolean;
  isEliminated: boolean;
  isCompeting: boolean;
}

interface AthleteHeightData {
  athleteId: number;
  heightIndex: number;
  attempts: FieldEventMark[];
  displayString: string;
  isCleared: boolean;
  isEliminated: boolean;
  isPassed: boolean;
  missCount: number;
  currentAttempt: number;
}

const METERS_PER_FOOT = 0.3048;
const INCHES_PER_FOOT = 12;

function metersToFeetInches(meters: number): { feet: number; inches: number } {
  const totalFeet = meters / METERS_PER_FOOT;
  const feet = Math.floor(totalFeet);
  const inches = (totalFeet - feet) * INCHES_PER_FOOT;
  return { feet, inches };
}

function feetInchesToMeters(feet: number, inches: number): number {
  const totalInches = feet * INCHES_PER_FOOT + inches;
  const totalFeet = totalInches / INCHES_PER_FOOT;
  return totalFeet * METERS_PER_FOOT;
}

function formatHeightMark(meters: number, unit: 'metric' | 'english'): string {
  if (unit === 'metric') {
    return `${meters.toFixed(2)}m`;
  }
  
  const { feet, inches } = metersToFeetInches(meters);
  const inchesWhole = Math.floor(inches);
  const inchesFrac = inches - inchesWhole;
  
  if (inchesFrac > 0.001) {
    const inchesFormatted = inches.toFixed(2).padStart(5, '0');
    return `${feet}-${inchesFormatted}`;
  }
  
  return `${feet}-${inchesWhole.toString().padStart(2, '0')}`;
}

function getAthleteHeightData(
  athleteId: number,
  heightIndex: number,
  marks: FieldEventMark[]
): AthleteHeightData {
  const heightMarks = marks.filter(
    m => m.athleteId === athleteId && m.heightIndex === heightIndex
  ).sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));
  
  let displayString = '';
  let isCleared = false;
  let isEliminated = false;
  let isPassed = false;
  let missCount = 0;
  
  for (const mark of heightMarks) {
    if (mark.markType === 'cleared') {
      displayString += 'O';
      isCleared = true;
      break;
    } else if (mark.markType === 'missed') {
      displayString += 'X';
      missCount++;
      if (missCount >= 3) {
        isEliminated = true;
      }
    } else if (mark.markType === 'pass') {
      displayString += '-';
      isPassed = true;
    }
  }
  
  return {
    athleteId,
    heightIndex,
    attempts: heightMarks,
    displayString,
    isCleared,
    isEliminated,
    isPassed,
    missCount,
    currentAttempt: heightMarks.length + 1
  };
}

function isAthleteEliminated(athleteId: number, marks: FieldEventMark[], heights: FieldHeight[]): boolean {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  for (const height of sortedHeights) {
    const heightMarks = marks.filter(
      m => m.athleteId === athleteId && m.heightIndex === height.heightIndex
    );
    
    let consecutiveMisses = 0;
    for (const mark of heightMarks) {
      if (mark.markType === 'missed') {
        consecutiveMisses++;
        if (consecutiveMisses >= 3) {
          return true;
        }
      } else if (mark.markType === 'cleared') {
        consecutiveMisses = 0;
      }
    }
  }
  
  return false;
}

function getHighestCleared(athleteId: number, marks: FieldEventMark[], heights: FieldHeight[]): FieldHeight | null {
  const clearedMarks = marks.filter(
    m => m.athleteId === athleteId && m.markType === 'cleared'
  );
  
  if (clearedMarks.length === 0) return null;
  
  let maxHeightIndex = -1;
  for (const mark of clearedMarks) {
    if (mark.heightIndex !== null && mark.heightIndex !== undefined) {
      if (mark.heightIndex > maxHeightIndex) {
        maxHeightIndex = mark.heightIndex;
      }
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

function getAttemptSequence(athleteId: number, marks: FieldEventMark[], heights: FieldHeight[]): string {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  const sequences: string[] = [];
  
  for (const height of sortedHeights) {
    const heightMarks = marks
      .filter(m => m.athleteId === athleteId && m.heightIndex === height.heightIndex)
      .sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));
    
    if (heightMarks.length === 0) continue;
    
    const symbols = heightMarks.map(mark => {
      switch (mark.markType) {
        case 'cleared': return 'O';
        case 'missed': return 'X';
        case 'pass': return '-';
        default: return '-';
      }
    });
    
    sequences.push(symbols.join(''));
  }
  
  return sequences.join('|');
}

function calculateVerticalStandings(
  athletes: FieldEventAthlete[],
  marks: FieldEventMark[],
  heights: FieldHeight[]
): VerticalStanding[] {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  const standings: VerticalStanding[] = athletes.map(athlete => {
    const highestClearedHeight = getHighestCleared(athlete.id, marks, sortedHeights);
    const highestCleared = highestClearedHeight?.heightMeters ?? null;
    
    const missesAtWinningHeight = highestClearedHeight 
      ? countMissesAtHeight(athlete.id, highestClearedHeight.heightIndex, marks)
      : 0;
    
    const totalMisses = countTotalMisses(athlete.id, marks);
    const attemptSequence = getAttemptSequence(athlete.id, marks, sortedHeights);
    const isEliminated = isAthleteEliminated(athlete.id, marks, sortedHeights);

    return {
      athleteId: athlete.id,
      place: 0,
      highestCleared,
      highestClearedDisplay: highestCleared !== null 
        ? formatHeightMark(highestCleared, 'metric') 
        : null,
      missesAtWinningHeight,
      totalMisses,
      attemptSequence,
      isTied: false,
      isEliminated,
      isCompeting: !isEliminated
    };
  });

  standings.sort((a, b) => {
    if (a.highestCleared === null && b.highestCleared === null) return 0;
    if (a.highestCleared === null) return 1;
    if (b.highestCleared === null) return -1;

    if (Math.abs(a.highestCleared - b.highestCleared) > 0.001) {
      return b.highestCleared - a.highestCleared;
    }

    if (a.missesAtWinningHeight !== b.missesAtWinningHeight) {
      return a.missesAtWinningHeight - b.missesAtWinningHeight;
    }

    if (a.totalMisses !== b.totalMisses) {
      return a.totalMisses - b.totalMisses;
    }

    return 0;
  });

  let currentPlace = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i === 0) {
      standings[i].place = currentPlace;
    } else {
      const prev = standings[i - 1];
      const curr = standings[i];
      
      const isTied = areStandingsTied(prev, curr);
      
      if (isTied) {
        standings[i].place = prev.place;
        standings[i].isTied = true;
        standings[i - 1].isTied = true;
      } else {
        currentPlace = i + 1;
        standings[i].place = currentPlace;
      }
    }
  }

  return standings;
}

function areStandingsTied(a: VerticalStanding, b: VerticalStanding): boolean {
  if (a.highestCleared === null && b.highestCleared === null) return true;
  if (a.highestCleared === null || b.highestCleared === null) return false;
  
  return (
    Math.abs(a.highestCleared - b.highestCleared) < 0.001 &&
    a.missesAtWinningHeight === b.missesAtWinningHeight &&
    a.totalMisses === b.totalMisses
  );
}

function HeightBar({ 
  heights, 
  currentHeightIndex,
  unit,
  onAddHeight
}: { 
  heights: FieldHeight[]; 
  currentHeightIndex: number;
  unit: 'metric' | 'english';
  onAddHeight?: () => void;
}) {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="height-bar">
      {sortedHeights.map((height) => {
        const isCurrent = height.heightIndex === currentHeightIndex;
        return (
          <Badge
            key={height.id}
            variant={isCurrent ? "default" : "outline"}
            className={`text-sm px-3 py-1 ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            data-testid={`height-badge-${height.heightIndex}`}
          >
            {formatHeightMark(height.heightMeters, unit)}
            {isCurrent && '*'}
          </Badge>
        );
      })}
      {onAddHeight && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddHeight}
          data-testid="button-add-height"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      )}
    </div>
  );
}

function AttemptGrid({ 
  athletes, 
  marks, 
  heights, 
  currentAthleteId,
  currentHeightIndex,
  entries,
  unit
}: { 
  athletes: FieldEventAthlete[];
  marks: FieldEventMark[];
  heights: FieldHeight[];
  currentAthleteId: number | null;
  currentHeightIndex: number;
  entries: EntryWithDetails[];
  unit: 'metric' | 'english';
}) {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  const getAthleteName = (athleteId: number) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return 'Unknown';
    
    const entry = entries.find(e => e.id === athlete.entryId);
    if (!entry?.athlete) return `Athlete ${athleteId}`;
    return `${entry.athlete.lastName}`;
  };

  const sortedAthletes = [...athletes].sort((a, b) => {
    if (a.flightNumber !== b.flightNumber) {
      return (a.flightNumber || 1) - (b.flightNumber || 1);
    }
    return a.orderInFlight - b.orderInFlight;
  });

  return (
    <ScrollArea className="w-full" data-testid="attempt-grid">
      <div className="min-w-max">
        <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${sortedHeights.length}, 80px)` }}>
          <div className="font-medium text-sm text-muted-foreground p-2">Athlete</div>
          {sortedHeights.map(height => (
            <div 
              key={height.id} 
              className={`text-center text-sm font-medium p-2 rounded-t ${
                height.heightIndex === currentHeightIndex 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              {formatHeightMark(height.heightMeters, unit)}
            </div>
          ))}
          
          {sortedAthletes.map(athlete => {
            const isEliminated = isAthleteEliminated(athlete.id, marks, heights);
            const isCurrent = athlete.id === currentAthleteId;
            
            return (
              <div key={athlete.id} className="contents" data-testid={`athlete-row-${athlete.id}`}>
                <div 
                  className={`p-2 text-sm font-medium truncate flex items-center gap-2 rounded-l ${
                    isCurrent 
                      ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                      : isEliminated 
                        ? 'bg-muted/50 text-muted-foreground line-through' 
                        : ''
                  }`}
                >
                  {getAthleteName(athlete.id)}
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">UP</Badge>
                  )}
                  {isEliminated && (
                    <Badge variant="outline" className="text-xs">OUT</Badge>
                  )}
                </div>
                
                {sortedHeights.map(height => {
                  const data = getAthleteHeightData(athlete.id, height.heightIndex, marks);
                  const isCurrentHeight = height.heightIndex === currentHeightIndex;
                  const isActiveCell = isCurrent && isCurrentHeight;
                  
                  let bgClass = '';
                  let textClass = 'text-muted-foreground';
                  
                  if (data.isCleared) {
                    bgClass = 'bg-green-500/20 dark:bg-green-500/30';
                    textClass = 'text-green-700 dark:text-green-300';
                  } else if (data.isEliminated) {
                    bgClass = 'bg-red-500/20 dark:bg-red-500/30';
                    textClass = 'text-red-700 dark:text-red-300';
                  } else if (data.isPassed) {
                    bgClass = 'bg-gray-500/20 dark:bg-gray-500/30';
                    textClass = 'text-gray-600 dark:text-gray-400';
                  } else if (data.missCount > 0) {
                    bgClass = 'bg-yellow-500/20 dark:bg-yellow-500/30';
                    textClass = 'text-yellow-700 dark:text-yellow-300';
                  }
                  
                  if (isActiveCell) {
                    bgClass = 'bg-primary/20 ring-2 ring-primary ring-offset-1';
                  }
                  
                  let displayValue = data.displayString || '';
                  if (isActiveCell && !data.isCleared && !data.isEliminated && !data.isPassed) {
                    displayValue += '_';
                  }
                  
                  return (
                    <div 
                      key={`${athlete.id}-${height.id}`}
                      className={`text-center p-2 text-sm font-mono font-semibold rounded ${bgClass}`}
                      data-testid={`cell-${athlete.id}-${height.heightIndex}`}
                    >
                      <span className={textClass}>
                        {displayValue || (height.heightIndex <= currentHeightIndex ? '' : '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function StandingsTable({ 
  standings, 
  currentAthleteId,
  entries,
  athletes,
  unit
}: { 
  standings: VerticalStanding[];
  currentAthleteId: number | null;
  entries: EntryWithDetails[];
  athletes: FieldEventAthlete[];
  unit: 'metric' | 'english';
}) {
  const getAthleteName = (athleteId: number) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return 'Unknown';
    
    const entry = entries.find(e => e.id === athlete.entryId);
    if (!entry?.athlete) return `Athlete ${athleteId}`;
    return `${entry.athlete.firstName} ${entry.athlete.lastName}`;
  };

  return (
    <div className="space-y-2" data-testid="standings-table">
      {standings.map((standing) => {
        const isCurrent = standing.athleteId === currentAthleteId;
        
        return (
          <div 
            key={standing.athleteId}
            className={`flex items-center gap-3 p-3 rounded-md ${
              isCurrent 
                ? 'bg-primary/10 border border-primary' 
                : standing.isEliminated 
                  ? 'bg-muted/30 opacity-70' 
                  : 'bg-muted/50'
            }`}
            data-testid={`standing-row-${standing.athleteId}`}
          >
            <Badge 
              variant={standing.place <= 3 ? 'default' : 'secondary'}
              className="w-8 h-8 flex items-center justify-center text-sm font-bold"
            >
              {standing.isTied ? `T${standing.place}` : standing.place}
            </Badge>
            
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${
                isCurrent ? 'text-primary' : standing.isEliminated ? 'line-through text-muted-foreground' : ''
              }`}>
                {getAthleteName(standing.athleteId)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground font-mono">
                  ({standing.attemptSequence || '-'})
                </span>
                {standing.isEliminated && (
                  <Badge variant="outline" className="text-xs">Eliminated</Badge>
                )}
                {!standing.isEliminated && standing.highestCleared && (
                  <Badge variant="secondary" className="text-xs">Competing</Badge>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-mono font-bold text-lg">
                {standing.highestClearedDisplay || '-'}
              </p>
              {standing.highestCleared && (
                <p className="text-xs text-muted-foreground">
                  {standing.missesAtWinningHeight}x @ best, {standing.totalMisses} total
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddHeightDialog({
  isOpen,
  onClose,
  onAdd,
  suggestedHeight,
  unit
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (heightMeters: number) => void;
  suggestedHeight: number;
  unit: 'metric' | 'english';
}) {
  const [heightValue, setHeightValue] = useState(suggestedHeight.toFixed(2));
  const [feetValue, setFeetValue] = useState("");
  const [inchesValue, setInchesValue] = useState("");
  
  useEffect(() => {
    if (unit === 'metric') {
      setHeightValue(suggestedHeight.toFixed(2));
    } else {
      const { feet, inches } = metersToFeetInches(suggestedHeight);
      setFeetValue(feet.toString());
      setInchesValue(Math.round(inches).toString());
    }
  }, [suggestedHeight, unit]);

  const handleSubmit = () => {
    let meters: number;
    if (unit === 'metric') {
      meters = parseFloat(heightValue);
    } else {
      const feet = parseFloat(feetValue) || 0;
      const inches = parseFloat(inchesValue) || 0;
      meters = feetInchesToMeters(feet, inches);
    }
    
    if (!isNaN(meters) && meters > 0) {
      onAdd(meters);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="add-height-dialog">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChevronUp className="h-5 w-5" />
            Add New Height
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unit === 'metric' ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={heightValue}
                onChange={(e) => setHeightValue(e.target.value)}
                className="h-12 text-xl text-center font-mono flex-1"
                data-testid="input-new-height-metric"
              />
              <span className="text-lg font-medium">m</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={feetValue}
                onChange={(e) => setFeetValue(e.target.value)}
                className="h-12 text-xl text-center font-mono w-20"
                data-testid="input-new-height-feet"
              />
              <span className="text-lg font-medium">ft</span>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="11.99"
                placeholder="0"
                value={inchesValue}
                onChange={(e) => setInchesValue(e.target.value)}
                className="h-12 text-xl text-center font-mono w-24"
                data-testid="input-new-height-inches"
              />
              <span className="text-lg font-medium">in</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-height"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              data-testid="button-confirm-height"
            >
              Add Height
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function VerticalEventEntry({
  sessionId,
  session,
  athletes,
  marks,
  heights,
  currentAthlete,
  entries,
  onMarkSubmit,
  onHeightAdd
}: VerticalEventEntryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddHeight, setShowAddHeight] = useState(false);

  const unit = (session.measurementUnit as 'metric' | 'english') || 'metric';
  const currentHeightIndex = session.currentHeightIndex || 0;
  
  const sortedHeights = useMemo(() => {
    return [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  }, [heights]);
  
  const currentHeight = sortedHeights.find(h => h.heightIndex === currentHeightIndex);
  
  const currentAthleteData = useMemo(() => {
    if (!currentAthlete || !currentHeight) return null;
    return getAthleteHeightData(currentAthlete.id, currentHeightIndex, marks);
  }, [currentAthlete, currentHeight, currentHeightIndex, marks]);
  
  const isCurrentAthleteEliminated = useMemo(() => {
    if (!currentAthlete) return false;
    return isAthleteEliminated(currentAthlete.id, marks, heights);
  }, [currentAthlete, marks, heights]);
  
  const totalAttemptNumber = useMemo(() => {
    if (!currentAthlete) return 1;
    return marks.filter(m => m.athleteId === currentAthlete.id).length + 1;
  }, [currentAthlete, marks]);
  
  const standings = useMemo(() => {
    return calculateVerticalStandings(athletes, marks, heights);
  }, [athletes, marks, heights]);

  const getAthleteName = useCallback((athleteId: number) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) return 'Unknown Athlete';
    
    const entry = entries.find(e => e.id === athlete.entryId);
    if (!entry?.athlete) return `Athlete ${athleteId}`;
    return `${entry.athlete.firstName} ${entry.athlete.lastName}`;
  }, [athletes, entries]);

  const handleSubmit = useCallback(async (markType: 'cleared' | 'missed' | 'pass') => {
    if (!currentAthlete || isSubmitting || isCurrentAthleteEliminated) return;
    if (!currentAthleteData) return;

    const attemptAtHeight = currentAthleteData.currentAttempt;
    
    if (attemptAtHeight > 3 && markType !== 'pass') {
      return;
    }

    setIsSubmitting(true);
    try {
      await onMarkSubmit({
        athleteId: currentAthlete.id,
        attemptNumber: totalAttemptNumber,
        heightIndex: currentHeightIndex,
        attemptAtHeight,
        markType
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentAthlete, isSubmitting, isCurrentAthleteEliminated, currentAthleteData, currentHeightIndex, totalAttemptNumber, onMarkSubmit]);

  const handleAddHeight = useCallback(async (heightMeters: number) => {
    if (!onHeightAdd) return;
    
    const newIndex = sortedHeights.length > 0 
      ? Math.max(...sortedHeights.map(h => h.heightIndex)) + 1 
      : 0;
    
    await onHeightAdd({
      sessionId,
      heightIndex: newIndex,
      heightMeters
    });
  }, [onHeightAdd, sortedHeights, sessionId]);

  const suggestedNextHeight = useMemo(() => {
    if (sortedHeights.length === 0) return 1.50;
    const lastHeight = sortedHeights[sortedHeights.length - 1];
    return lastHeight.heightMeters + 0.03;
  }, [sortedHeights]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleSubmit('cleared');
      } else if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleSubmit('missed');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleSubmit('pass');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  const eventName = entries[0]?.event?.name || (entries[0]?.event?.eventType === 'high_jump' ? 'HIGH JUMP' : 'POLE VAULT');

  if (!currentAthlete) {
    return (
      <Card data-testid="no-athlete-card">
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No athlete currently up</p>
          <p className="text-sm text-muted-foreground mt-2">
            Waiting for an athlete to be queued...
          </p>
        </CardContent>
      </Card>
    );
  }

  const athleteName = getAthleteName(currentAthlete.id);

  return (
    <div className="space-y-4" data-testid="vertical-event-entry">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg" data-testid="text-event-header">
                {eventName} - Current Height: {currentHeight ? formatHeightMark(currentHeight.heightMeters, unit) : '-'}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Flight {currentAthlete.flightNumber || 1}
            </Badge>
          </div>
          <div className="mt-3">
            <HeightBar 
              heights={sortedHeights} 
              currentHeightIndex={currentHeightIndex}
              unit={unit}
              onAddHeight={onHeightAdd ? () => setShowAddHeight(true) : undefined}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl" data-testid="text-current-athlete">
                <span className="text-primary font-bold">CURRENT:</span>{" "}
                {athleteName}
              </CardTitle>
              <p className="text-muted-foreground mt-1" data-testid="text-attempt-info">
                Attempt {currentAthleteData?.currentAttempt || 1} at {currentHeight ? formatHeightMark(currentHeight.heightMeters, unit) : '-'}
                {isCurrentAthleteEliminated && (
                  <Badge variant="destructive" className="ml-2">Eliminated</Badge>
                )}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <AttemptGrid 
            athletes={athletes}
            marks={marks}
            heights={sortedHeights}
            currentAthleteId={currentAthlete.id}
            currentHeightIndex={currentHeightIndex}
            entries={entries}
            unit={unit}
          />

          {isCurrentAthleteEliminated ? (
            <div className="text-center py-4 bg-destructive/10 rounded-md border border-destructive/20">
              <p className="font-medium text-destructive">Athlete Eliminated</p>
              <p className="text-sm text-muted-foreground">
                Three consecutive misses - move to next athlete
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => handleSubmit('cleared')}
                  disabled={isSubmitting}
                  className="h-14 text-lg bg-green-600 hover:bg-green-700"
                  data-testid="button-submit-cleared"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      CLEARED O
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleSubmit('missed')}
                  disabled={isSubmitting}
                  className="h-14 text-lg"
                  data-testid="button-submit-missed"
                >
                  <X className="h-5 w-5 mr-2" />
                  MISSED X
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit('pass')}
                  disabled={isSubmitting}
                  className="h-14 text-lg"
                  data-testid="button-submit-pass"
                >
                  <Minus className="h-5 w-5 mr-2" />
                  PASS -
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Keyboard shortcuts: O = Cleared, X = Missed, P = Pass
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Current Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <StandingsTable 
            standings={standings}
            currentAthleteId={currentAthlete?.id || null}
            entries={entries}
            athletes={athletes}
            unit={unit}
          />
        </CardContent>
      </Card>

      <AddHeightDialog
        isOpen={showAddHeight}
        onClose={() => setShowAddHeight(false)}
        onAdd={handleAddHeight}
        suggestedHeight={suggestedNextHeight}
        unit={unit}
      />
    </div>
  );
}

export default VerticalEventEntry;
