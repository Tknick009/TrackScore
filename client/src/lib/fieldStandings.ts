/**
 * Client-side Field Event Standings Calculation Engine
 * 
 * Port of server/field-standings.ts for client-side use.
 * Implements official IAAF/World Athletics tie-breaking rules for field events.
 */

import type {
  FieldEventAthlete,
  FieldEventMark,
  FieldHeight,
} from "@shared/schema";
import { isHeightEvent, isDistanceEvent } from "@shared/schema";
// Re-export formatting utilities from shared module (canonical source)
export {
  feetInchesToMeters,
  metersToFeetInches,
  formatDistanceMark,
  formatHeightMark,
} from "@shared/formatting";
import { metersToFeetInches, formatDistanceMark, formatHeightMark } from "@shared/formatting";

export interface HorizontalStanding {
  athleteId: number;
  place: number;
  bestMark: number | null;
  bestMarkDisplay: string | null;
  attempts: FieldEventMark[];
  legalMarks: number[];
  isTied: boolean;
}

export interface VerticalStanding {
  athleteId: number;
  place: number;
  highestCleared: number | null;
  highestClearedDisplay: string | null;
  missesAtWinningHeight: number;
  totalMisses: number;
  attemptSequence: string;
  isTied: boolean;
  isEliminated: boolean;
}

export function getVerticalAttemptSequence(
  marks: FieldEventMark[],
  heights: FieldHeight[]
): string {
  if (!marks.length || !heights.length) {
    return '';
  }

  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  const marksByHeight = new Map<number, FieldEventMark[]>();
  
  for (const mark of marks) {
    if (mark.heightIndex === null || mark.heightIndex === undefined) continue;
    const existing = marksByHeight.get(mark.heightIndex) || [];
    existing.push(mark);
    marksByHeight.set(mark.heightIndex, existing);
  }

  const heightSequences: string[] = [];
  
  for (const height of sortedHeights) {
    const heightMarks = marksByHeight.get(height.heightIndex) || [];
    if (heightMarks.length === 0) continue;
    
    heightMarks.sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));
    
    const symbols = heightMarks.map(mark => {
      switch (mark.markType) {
        case 'cleared': return 'O';
        case 'missed': return 'X';
        case 'pass': return 'P';
        default: return '-';
      }
    });
    
    heightSequences.push(symbols.join(''));
  }
  
  return heightSequences.join('|');
}

export function isEliminatedVertical(
  marks: FieldEventMark[],
  heights: FieldHeight[]
): boolean {
  if (!marks.length) return false;

  // Per IAAF/World Athletics rules, elimination occurs after 3 consecutive
  // misses tracked ACROSS heights, not just within a single height.
  // Example: 2 misses at 1.90m then 1 miss at 1.95m = eliminated.
  // A clear resets the counter; passes are neutral.
  const sortedMarks = [...marks]
    .filter(m => m.heightIndex !== null && m.heightIndex !== undefined)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);

  let consecutiveMisses = 0;
  
  for (const mark of sortedMarks) {
    if (mark.markType === 'missed') {
      consecutiveMisses++;
      if (consecutiveMisses >= 3) {
        return true;
      }
    } else if (mark.markType === 'cleared') {
      consecutiveMisses = 0;
    }
    // Passes don't affect the miss count (neutral)
  }
  
  return false;
}

function countMissesAtHeight(marks: FieldEventMark[], heightIndex: number): number {
  return marks.filter(m => 
    m.heightIndex === heightIndex && m.markType === 'missed'
  ).length;
}

function countTotalMisses(marks: FieldEventMark[]): number {
  return marks.filter(m => m.markType === 'missed').length;
}

function getHighestCleared(marks: FieldEventMark[], heights: FieldHeight[]): FieldHeight | null {
  const clearedMarks = marks.filter(m => m.markType === 'cleared');
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

export function calculateHorizontalStandings(
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
  if (marksA.length !== marksB.length) {
    const maxLength = Math.max(marksA.length, marksB.length);
    for (let i = 0; i < maxLength; i++) {
      const a = marksA[i] ?? -Infinity;
      const b = marksB[i] ?? -Infinity;
      if (Math.abs(a - b) > 0.001) return false;
    }
    return true;
  }
  
  for (let i = 0; i < marksA.length; i++) {
    if (Math.abs(marksA[i] - marksB[i]) > 0.001) return false;
  }
  return true;
}

export function calculateVerticalStandings(
  athletes: FieldEventAthlete[],
  marks: FieldEventMark[],
  heights: FieldHeight[]
): VerticalStanding[] {
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  const standings: VerticalStanding[] = athletes.map(athlete => {
    const athleteMarks = marks.filter(m => m.athleteId === athlete.id);
    
    const highestClearedHeight = getHighestCleared(athleteMarks, sortedHeights);
    const highestCleared = highestClearedHeight?.heightMeters ?? null;
    
    const missesAtWinningHeight = highestClearedHeight 
      ? countMissesAtHeight(athleteMarks, highestClearedHeight.heightIndex)
      : 0;
    
    const totalMisses = countTotalMisses(athleteMarks);
    const attemptSequence = getVerticalAttemptSequence(athleteMarks, sortedHeights);
    const isEliminated = isEliminatedVertical(athleteMarks, sortedHeights);

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
      
      const isTied = areVerticalStandingsTied(prev, curr);
      
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

function areVerticalStandingsTied(a: VerticalStanding, b: VerticalStanding): boolean {
  if (a.highestCleared === null && b.highestCleared === null) return true;
  if (a.highestCleared === null || b.highestCleared === null) return false;
  
  return (
    Math.abs(a.highestCleared - b.highestCleared) < 0.001 &&
    a.missesAtWinningHeight === b.missesAtWinningHeight &&
    a.totalMisses === b.totalMisses
  );
}

export function getVerticalAthleteStatus(
  marks: FieldEventMark[],
  heights: FieldHeight[],
  competitionStatus?: string
): 'competing' | 'completed' | 'retired' {
  if (competitionStatus === 'retired') {
    return 'retired';
  }
  
  if (isEliminatedVertical(marks, heights)) {
    return 'completed';
  }
  
  if (competitionStatus === 'completed' || competitionStatus === 'checked_out') {
    return 'completed';
  }
  
  return 'competing';
}

export { isHeightEvent, isDistanceEvent };
