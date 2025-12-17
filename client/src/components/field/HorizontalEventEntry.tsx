import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Loader2, Star, User } from "lucide-react";
import type { 
  FieldEventSession, 
  FieldEventAthlete, 
  FieldEventMark,
  EntryWithDetails 
} from "@shared/schema";

interface HorizontalEventEntryProps {
  sessionId: number;
  session: FieldEventSession;
  athletes: FieldEventAthlete[];
  marks: FieldEventMark[];
  currentAthlete: FieldEventAthlete | null;
  entries: EntryWithDetails[];
  onMarkSubmit: (mark: { 
    athleteId: number; 
    attemptNumber: number; 
    markType: string; 
    measurement?: number; 
    wind?: number 
  }) => Promise<void>;
}

interface HorizontalStanding {
  athleteId: number;
  place: number;
  bestMark: number | null;
  bestMarkDisplay: string | null;
  attempts: FieldEventMark[];
  legalMarks: number[];
  isTied: boolean;
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

function formatDistanceMark(meters: number, unit: 'metric' | 'english'): string {
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

function calculateHorizontalStandings(
  athletes: FieldEventAthlete[],
  marks: FieldEventMark[]
): HorizontalStanding[] {
  const standings: HorizontalStanding[] = athletes.map(athlete => {
    const athleteMarks = marks.filter(m => m.athleteId === athlete.id);
    
    const legalMarks = athleteMarks
      .filter(m => 
        m.markType === 'mark' && 
        m.measurement !== null && 
        m.measurement !== undefined
      )
      .map(m => m.measurement!)
      .sort((a, b) => b - a);
    
    const bestMark = legalMarks.length > 0 ? legalMarks[0] : null;
    
    return {
      athleteId: athlete.id,
      place: 0,
      bestMark,
      bestMarkDisplay: bestMark !== null ? formatDistanceMark(bestMark, 'metric') : null,
      attempts: athleteMarks.sort((a, b) => a.attemptNumber - b.attemptNumber),
      legalMarks,
      isTied: false,
    };
  });

  standings.sort((a, b) => {
    if (a.legalMarks.length === 0 && b.legalMarks.length === 0) return 0;
    if (a.legalMarks.length === 0) return 1;
    if (b.legalMarks.length === 0) return -1;

    const maxLength = Math.max(a.legalMarks.length, b.legalMarks.length);
    for (let i = 0; i < maxLength; i++) {
      const markA = a.legalMarks[i] ?? -Infinity;
      const markB = b.legalMarks[i] ?? -Infinity;
      
      if (markA !== markB) {
        return markB - markA;
      }
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
      
      const isTied = areLegalMarksTied(prev.legalMarks, curr.legalMarks);
      
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

function areLegalMarksTied(marksA: number[], marksB: number[]): boolean {
  if (marksA.length === 0 && marksB.length === 0) return true;
  if (marksA.length === 0 || marksB.length === 0) return false;
  
  const maxLength = Math.max(marksA.length, marksB.length);
  for (let i = 0; i < maxLength; i++) {
    const a = marksA[i] ?? -Infinity;
    const b = marksB[i] ?? -Infinity;
    if (Math.abs(a - b) > 0.001) return false;
  }
  return true;
}

function isWindAffectedEvent(eventType: string): boolean {
  return eventType === 'long_jump' || eventType === 'triple_jump';
}

function AttemptGrid({ 
  marks, 
  totalAttempts, 
  currentAttempt,
  unit 
}: { 
  marks: FieldEventMark[]; 
  totalAttempts: number; 
  currentAttempt: number;
  unit: 'metric' | 'english';
}) {
  const attempts = Array.from({ length: totalAttempts }, (_, i) => {
    const mark = marks.find(m => m.attemptNumber === i + 1);
    return { number: i + 1, mark };
  });

  const bestMark = marks
    .filter(m => m.markType === 'mark' && m.measurement)
    .reduce((best, m) => (m.measurement! > (best?.measurement || 0) ? m : best), null as FieldEventMark | null);

  return (
    <div className="grid grid-cols-6 gap-2" data-testid="attempt-grid">
      {attempts.map(({ number, mark }) => {
        const isCurrent = number === currentAttempt;
        const isBest = mark && bestMark && mark.id === bestMark.id;
        
        let bgClass = "bg-muted";
        let textClass = "text-muted-foreground";
        let borderClass = "";
        
        if (mark) {
          if (mark.markType === 'mark') {
            bgClass = "bg-green-500/20 dark:bg-green-500/30";
            textClass = "text-green-700 dark:text-green-300";
          } else if (mark.markType === 'foul') {
            bgClass = "bg-red-500/20 dark:bg-red-500/30";
            textClass = "text-red-700 dark:text-red-300";
          } else if (mark.markType === 'pass') {
            bgClass = "bg-gray-500/20 dark:bg-gray-500/30";
            textClass = "text-gray-600 dark:text-gray-400";
          }
        }
        
        if (isCurrent) {
          borderClass = "ring-2 ring-primary ring-offset-2";
        }

        const displayValue = mark 
          ? mark.markType === 'mark' && mark.measurement 
            ? formatDistanceMark(mark.measurement, unit)
            : mark.markType.toUpperCase()
          : '-';

        return (
          <div 
            key={number}
            className={`relative flex flex-col items-center justify-center p-3 rounded-md ${bgClass} ${borderClass}`}
            data-testid={`attempt-cell-${number}`}
          >
            <span className="text-xs text-muted-foreground mb-1">{number}</span>
            <span className={`font-mono font-semibold text-sm ${textClass}`}>
              {displayValue}
            </span>
            {isBest && (
              <Star className="absolute top-1 right-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
            )}
            {mark?.wind !== null && mark?.wind !== undefined && (
              <span className="text-xs text-muted-foreground mt-1">
                {mark.wind > 0 ? '+' : ''}{mark.wind.toFixed(1)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StandingsTable({ 
  standings, 
  currentAthleteId,
  entries,
  unit
}: { 
  standings: HorizontalStanding[];
  currentAthleteId: number | null;
  entries: EntryWithDetails[];
  unit: 'metric' | 'english';
}) {
  const getAthleteName = (athleteId: number) => {
    const entry = entries.find(e => String(e.athleteId) === String(athleteId) || e.id === String(athleteId));
    if (!entry?.athlete) {
      return `Athlete ${athleteId}`;
    }
    return `${entry.athlete.firstName} ${entry.athlete.lastName}`;
  };

  const getBackupMarks = (standing: HorizontalStanding): string => {
    if (standing.legalMarks.length <= 1) return '';
    return standing.legalMarks.slice(0, 3).map(m => formatDistanceMark(m, unit)).join(', ');
  };

  return (
    <div className="space-y-2" data-testid="standings-table">
      {standings.map((standing) => {
        const isCurrent = standing.athleteId === currentAthleteId;
        
        return (
          <div 
            key={standing.athleteId}
            className={`flex items-center gap-3 p-3 rounded-md ${
              isCurrent ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
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
              <p className={`font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>
                {getAthleteName(standing.athleteId)}
              </p>
              {standing.legalMarks.length > 1 && (
                <p className="text-xs text-muted-foreground truncate">
                  ({getBackupMarks(standing)})
                </p>
              )}
            </div>
            
            <div className="text-right">
              <p className="font-mono font-bold text-lg">
                {standing.bestMarkDisplay || '-'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HorizontalEventEntry({
  sessionId,
  session,
  athletes,
  marks,
  currentAthlete,
  entries,
  onMarkSubmit
}: HorizontalEventEntryProps) {
  const [measurement, setMeasurement] = useState("");
  const [feetValue, setFeetValue] = useState("");
  const [inchesValue, setInchesValue] = useState("");
  const [wind, setWind] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unit = (session.measurementUnit as 'metric' | 'english') || 'metric';
  const eventType = entries[0]?.event?.eventType || '';
  const showWind = session.recordWind || isWindAffectedEvent(eventType);
  
  const totalAttempts = useMemo(() => {
    if (session.hasFinals) {
      return session.isInFinals 
        ? (session.prelimAttempts || 3) + (session.finalsAttempts || 3)
        : (session.prelimAttempts || 3);
    }
    return session.totalAttempts || 6;
  }, [session]);

  const currentAthleteMarks = useMemo(() => {
    if (!currentAthlete) return [];
    return marks.filter(m => m.athleteId === currentAthlete.id)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }, [marks, currentAthlete]);

  const currentAttemptNumber = currentAthleteMarks.length + 1;
  const hasCompletedAllAttempts = currentAttemptNumber > totalAttempts;

  const standings = useMemo(() => {
    return calculateHorizontalStandings(athletes, marks);
  }, [athletes, marks]);

  const getAthleteName = useCallback((athleteId: number) => {
    const fieldAthlete = athletes.find(a => a.id === athleteId);
    if (!fieldAthlete) return 'Unknown Athlete';
    
    const entry = entries.find(e => e.id === fieldAthlete.entryId);
    if (!entry?.athlete) return `Athlete ${athleteId}`;
    return `${entry.athlete.firstName} ${entry.athlete.lastName}`;
  }, [athletes, entries]);

  const getMeasurementInMeters = useCallback((): number | undefined => {
    if (unit === 'metric') {
      const val = parseFloat(measurement);
      return isNaN(val) ? undefined : val;
    } else {
      const feet = parseFloat(feetValue) || 0;
      const inches = parseFloat(inchesValue) || 0;
      if (feet === 0 && inches === 0) return undefined;
      return feetInchesToMeters(feet, inches);
    }
  }, [unit, measurement, feetValue, inchesValue]);

  const handleSubmit = useCallback(async (markType: 'mark' | 'foul' | 'pass') => {
    if (!currentAthlete || isSubmitting || hasCompletedAllAttempts) return;

    const measurementValue = markType === 'mark' ? getMeasurementInMeters() : undefined;
    
    if (markType === 'mark' && !measurementValue) {
      return;
    }

    const windValue = showWind && wind ? parseFloat(wind) : undefined;

    setIsSubmitting(true);
    try {
      await onMarkSubmit({
        athleteId: currentAthlete.id,
        attemptNumber: currentAttemptNumber,
        markType,
        measurement: measurementValue,
        wind: windValue
      });
      
      setMeasurement("");
      setFeetValue("");
      setInchesValue("");
      setWind("");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentAthlete, isSubmitting, hasCompletedAllAttempts, getMeasurementInMeters, showWind, wind, currentAttemptNumber, onMarkSubmit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit('mark');
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleSubmit('foul');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleSubmit('pass');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

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
    <div className="space-y-4" data-testid="horizontal-event-entry">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl" data-testid="text-current-athlete">
                <span className="text-primary font-bold">CURRENT ATHLETE:</span>{" "}
                {athleteName}
              </CardTitle>
              <p className="text-muted-foreground mt-1" data-testid="text-attempt-info">
                Attempt {Math.min(currentAttemptNumber, totalAttempts)}/{totalAttempts}
                {session.hasFinals && session.isInFinals && (
                  <Badge variant="secondary" className="ml-2">Finals</Badge>
                )}
                {session.hasFinals && !session.isInFinals && (
                  <Badge variant="outline" className="ml-2">Prelims</Badge>
                )}
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Flight {currentAthlete.flightNumber || 1}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Previous Attempts</p>
            <AttemptGrid 
              marks={currentAthleteMarks} 
              totalAttempts={totalAttempts}
              currentAttempt={currentAttemptNumber}
              unit={unit}
            />
          </div>

          {hasCompletedAllAttempts ? (
            <div className="text-center py-4 bg-muted rounded-md">
              <p className="font-medium">All attempts completed</p>
              <p className="text-sm text-muted-foreground">
                Move to next athlete
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Enter Mark</label>
                  {unit === 'metric' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={measurement}
                        onChange={(e) => setMeasurement(e.target.value)}
                        className="h-14 text-2xl text-center font-mono flex-1"
                        data-testid="input-measurement-metric"
                      />
                      <span className="text-xl font-medium">m</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={feetValue}
                        onChange={(e) => setFeetValue(e.target.value)}
                        className="h-14 text-2xl text-center font-mono w-24"
                        data-testid="input-measurement-feet"
                      />
                      <span className="text-xl font-medium">ft</span>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        max="11.99"
                        placeholder="0.00"
                        value={inchesValue}
                        onChange={(e) => setInchesValue(e.target.value)}
                        className="h-14 text-2xl text-center font-mono w-28"
                        data-testid="input-measurement-inches"
                      />
                      <span className="text-xl font-medium">in</span>
                    </div>
                  )}
                </div>

                {showWind && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Wind (m/s)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="-20"
                        max="20"
                        placeholder="0.0"
                        value={wind}
                        onChange={(e) => setWind(e.target.value)}
                        className="h-12 text-xl text-center font-mono w-32"
                        data-testid="input-wind"
                      />
                      <span className="text-muted-foreground">m/s</span>
                      <p className="text-xs text-muted-foreground ml-2">
                        Use negative for headwind
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => handleSubmit('mark')}
                  disabled={
                    isSubmitting || 
                    (unit === 'metric' && !measurement) ||
                    (unit === 'english' && !feetValue && !inchesValue)
                  }
                  className="h-14 text-lg bg-green-600 hover:bg-green-700"
                  data-testid="button-submit-mark"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      MARK
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleSubmit('foul')}
                  disabled={isSubmitting}
                  className="h-14 text-lg"
                  data-testid="button-submit-foul"
                >
                  <X className="h-5 w-5 mr-2" />
                  FOUL
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit('pass')}
                  disabled={isSubmitting}
                  className="h-14 text-lg"
                  data-testid="button-submit-pass"
                >
                  <Minus className="h-5 w-5 mr-2" />
                  PASS
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Keyboard shortcuts: Enter = Mark, F = Foul, P = Pass
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
            unit={unit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default HorizontalEventEntry;
