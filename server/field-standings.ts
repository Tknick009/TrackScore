/**
 * Field Event Standings Calculation Engine
 * 
 * Implements official IAAF/World Athletics tie-breaking rules for field events.
 * 
 * Horizontal Events (Long Jump, Triple Jump, Shot Put, Discus, Javelin, Hammer):
 * - Ranked by best legal mark (highest distance)
 * - Tie-breaker: Compare second-best marks, then third-best, etc.
 * - If still tied after all marks compared: same place
 * 
 * Vertical Events (High Jump, Pole Vault):
 * - Ranked by highest height cleared
 * - Tie-breaker 1: Fewest misses at the winning height
 * - Tie-breaker 2: Fewest total misses throughout competition
 * - If still tied: Jump-off or shared place
 */

import type {
  FieldEventAthlete,
  FieldEventMark,
  FieldHeight,
} from "@shared/schema";
import { isHeightEvent, isDistanceEvent } from "@shared/schema";

// ====================
// TYPES
// ====================

/**
 * Standing result for horizontal field events (throws and jumps)
 */
export interface HorizontalStanding {
  athleteId: number;
  place: number;
  bestMark: number | null;
  bestMarkDisplay: string | null;
  attempts: FieldEventMark[];
  legalMarks: number[]; // Sorted descending for tie-breaking
  isTied: boolean;
}

/**
 * Standing result for vertical field events (high jump, pole vault)
 */
export interface VerticalStanding {
  athleteId: number;
  place: number;
  highestCleared: number | null; // Height in meters
  highestClearedDisplay: string | null;
  missesAtWinningHeight: number;
  totalMisses: number;
  attemptSequence: string; // e.g., "O|XXO|XO|XXX"
  isTied: boolean;
  isEliminated: boolean;
}

// ====================
// UNIT CONVERSION UTILITIES
// ====================

const METERS_PER_FOOT = 0.3048;
const INCHES_PER_FOOT = 12;

/**
 * Convert feet and inches to meters
 * @param feet - Number of feet
 * @param inches - Number of inches (can include decimals)
 * @returns Distance in meters
 */
export function feetInchesToMeters(feet: number, inches: number): number {
  const totalInches = feet * INCHES_PER_FOOT + inches;
  const totalFeet = totalInches / INCHES_PER_FOOT;
  return totalFeet * METERS_PER_FOOT;
}

/**
 * Convert meters to feet and inches
 * @param meters - Distance in meters
 * @returns Object with feet (whole number) and inches (with decimals)
 */
export function metersToFeetInches(meters: number): { feet: number; inches: number } {
  const totalFeet = meters / METERS_PER_FOOT;
  const feet = Math.floor(totalFeet);
  const inches = (totalFeet - feet) * INCHES_PER_FOOT;
  return { feet, inches };
}

// ====================
// FORMATTING UTILITIES
// ====================

/**
 * Format a distance measurement for display
 * @param meters - Distance in meters
 * @param unit - 'metric' for meters (e.g., "17.52m") or 'english' for feet-inches (e.g., "57-06.25")
 * @returns Formatted string
 */
export function formatDistanceMark(meters: number, unit: 'metric' | 'english'): string {
  if (unit === 'metric') {
    return `${meters.toFixed(2)}m`;
  }
  
  const { feet, inches } = metersToFeetInches(meters);
  const inchesWhole = Math.floor(inches);
  const inchesFrac = inches - inchesWhole;
  
  if (inchesFrac > 0.001) {
    // Include fractional inches (to 2 decimal places)
    const inchesFormatted = inches.toFixed(2).padStart(5, '0');
    return `${feet}-${inchesFormatted}`;
  }
  
  // Whole inches only
  return `${feet}-${inchesWhole.toString().padStart(2, '0')}`;
}

/**
 * Format a height measurement for display
 * @param meters - Height in meters
 * @param unit - 'metric' for meters (e.g., "2.15m") or 'english' for feet-inches (e.g., "7-00.50")
 * @returns Formatted string
 */
export function formatHeightMark(meters: number, unit: 'metric' | 'english'): string {
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

// ====================
// VERTICAL EVENT UTILITIES
// ====================

/**
 * Get the attempt sequence string for a vertical event athlete
 * Format: "O|XXO|XO|XXX" where | separates heights
 * O = cleared, X = missed, P = pass
 * 
 * @param marks - All marks for the athlete
 * @param heights - Height progression for the event
 * @returns Formatted attempt sequence string
 */
export function getVerticalAttemptSequence(
  marks: FieldEventMark[],
  heights: FieldHeight[]
): string {
  if (!marks.length || !heights.length) {
    return '';
  }

  // Sort heights by heightIndex
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  // Group marks by heightIndex
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
    
    // Sort by attemptAtHeight
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

/**
 * Determine if an athlete is eliminated from a vertical event
 * Elimination occurs after 3 consecutive misses at the same height
 * 
 * @param marks - All marks for the athlete
 * @param heights - Height progression for the event
 * @returns true if athlete is eliminated
 */
export function isEliminatedVertical(
  marks: FieldEventMark[],
  heights: FieldHeight[]
): boolean {
  if (!marks.length) return false;

  // Group marks by heightIndex
  const marksByHeight = new Map<number, FieldEventMark[]>();
  for (const mark of marks) {
    if (mark.heightIndex === null || mark.heightIndex === undefined) continue;
    
    const existing = marksByHeight.get(mark.heightIndex) || [];
    existing.push(mark);
    marksByHeight.set(mark.heightIndex, existing);
  }

  // Check each height for 3 consecutive misses
  const entries = Array.from(marksByHeight.entries());
  for (let i = 0; i < entries.length; i++) {
    const heightMarks = entries[i][1];
    // Count consecutive misses at this height
    let consecutiveMisses = 0;
    
    for (const mark of heightMarks) {
      if (mark.markType === 'missed') {
        consecutiveMisses++;
        if (consecutiveMisses >= 3) {
          return true;
        }
      } else if (mark.markType === 'cleared') {
        // Cleared resets the miss count for this height
        consecutiveMisses = 0;
      }
      // Passes don't affect the miss count
    }
  }
  
  return false;
}

/**
 * Count misses at a specific height
 */
function countMissesAtHeight(marks: FieldEventMark[], heightIndex: number): number {
  return marks.filter(m => 
    m.heightIndex === heightIndex && m.markType === 'missed'
  ).length;
}

/**
 * Count total misses across all heights
 */
function countTotalMisses(marks: FieldEventMark[]): number {
  return marks.filter(m => m.markType === 'missed').length;
}

/**
 * Get the highest height cleared by an athlete
 */
function getHighestCleared(marks: FieldEventMark[], heights: FieldHeight[]): FieldHeight | null {
  const clearedMarks = marks.filter(m => m.markType === 'cleared');
  if (clearedMarks.length === 0) return null;
  
  // Find the highest heightIndex that was cleared
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

// ====================
// HORIZONTAL STANDINGS CALCULATION
// ====================

/**
 * Calculate standings for horizontal field events (throws and jumps)
 * 
 * Ranking rules:
 * 1. Athletes ranked by best legal mark (highest distance)
 * 2. Tie-breakers: Compare second-best marks, then third-best, etc.
 * 3. If still tied after all marks compared: same place
 * 
 * @param athletes - Athletes in the event
 * @param marks - All marks/attempts for the event
 * @returns Sorted array of standings
 */
export function calculateHorizontalStandings(
  athletes: FieldEventAthlete[],
  marks: FieldEventMark[]
): HorizontalStanding[] {
  // Build standings for each athlete
  const standings: HorizontalStanding[] = athletes.map(athlete => {
    const athleteMarks = marks.filter(m => m.athleteId === athlete.id);
    
    // Extract legal marks (valid measurements, not fouls/passes/scratches)
    const legalMarks = athleteMarks
      .filter(m => 
        m.markType === 'mark' && 
        m.measurement !== null && 
        m.measurement !== undefined
      )
      .map(m => m.measurement!)
      .sort((a, b) => b - a); // Sort descending
    
    const bestMark = legalMarks.length > 0 ? legalMarks[0] : null;
    
    return {
      athleteId: athlete.id,
      place: 0, // Will be calculated after sorting
      bestMark,
      bestMarkDisplay: bestMark !== null ? formatDistanceMark(bestMark, 'metric') : null,
      attempts: athleteMarks.sort((a, b) => a.attemptNumber - b.attemptNumber),
      legalMarks,
      isTied: false,
    };
  });

  // Sort athletes by best mark (descending), with tie-breaking
  standings.sort((a, b) => {
    // Handle no marks
    if (a.legalMarks.length === 0 && b.legalMarks.length === 0) return 0;
    if (a.legalMarks.length === 0) return 1;
    if (b.legalMarks.length === 0) return -1;

    // Compare marks position by position for tie-breaking
    const maxLength = Math.max(a.legalMarks.length, b.legalMarks.length);
    for (let i = 0; i < maxLength; i++) {
      const markA = a.legalMarks[i] ?? -Infinity;
      const markB = b.legalMarks[i] ?? -Infinity;
      
      if (markA !== markB) {
        return markB - markA; // Descending order
      }
    }
    
    // Completely tied
    return 0;
  });

  // Assign places and detect ties
  let currentPlace = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i === 0) {
      standings[i].place = currentPlace;
    } else {
      // Check if tied with previous athlete
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

/**
 * Check if two athletes have identical legal marks (complete tie)
 */
function areLegalMarksTied(marksA: number[], marksB: number[]): boolean {
  if (marksA.length !== marksB.length) {
    // If different number of marks, compare all available
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

// ====================
// VERTICAL STANDINGS CALCULATION
// ====================

/**
 * Calculate standings for vertical field events (high jump, pole vault)
 * 
 * Ranking rules:
 * 1. Athletes ranked by highest height cleared
 * 2. Tie-breaker 1: Fewest misses at the winning height
 * 3. Tie-breaker 2: Fewest total misses throughout competition
 * 4. If still tied: same place (jump-off can be handled separately)
 * 
 * @param athletes - Athletes in the event
 * @param marks - All marks/attempts for the event
 * @param heights - Height progression for the event
 * @returns Sorted array of standings
 */
export function calculateVerticalStandings(
  athletes: FieldEventAthlete[],
  marks: FieldEventMark[],
  heights: FieldHeight[]
): VerticalStanding[] {
  // Sort heights for consistent ordering
  const sortedHeights = [...heights].sort((a, b) => a.heightIndex - b.heightIndex);
  
  // Build standings for each athlete
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

  // Sort by: highest cleared (desc), misses at winning height (asc), total misses (asc)
  standings.sort((a, b) => {
    // Handle no height cleared
    if (a.highestCleared === null && b.highestCleared === null) return 0;
    if (a.highestCleared === null) return 1;
    if (b.highestCleared === null) return -1;

    // Primary: Highest height cleared (descending)
    if (Math.abs(a.highestCleared - b.highestCleared) > 0.001) {
      return b.highestCleared - a.highestCleared;
    }

    // Tie-breaker 1: Fewest misses at winning height (ascending)
    if (a.missesAtWinningHeight !== b.missesAtWinningHeight) {
      return a.missesAtWinningHeight - b.missesAtWinningHeight;
    }

    // Tie-breaker 2: Fewest total misses (ascending)
    if (a.totalMisses !== b.totalMisses) {
      return a.totalMisses - b.totalMisses;
    }

    // Completely tied
    return 0;
  });

  // Assign places and detect ties
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

/**
 * Check if two athletes are tied in vertical event standings
 * (same height, same misses at winning height, same total misses)
 */
function areVerticalStandingsTied(a: VerticalStanding, b: VerticalStanding): boolean {
  if (a.highestCleared === null && b.highestCleared === null) return true;
  if (a.highestCleared === null || b.highestCleared === null) return false;
  
  return (
    Math.abs(a.highestCleared - b.highestCleared) < 0.001 &&
    a.missesAtWinningHeight === b.missesAtWinningHeight &&
    a.totalMisses === b.totalMisses
  );
}

// ====================
// COMBINED UTILITY EXPORTS
// ====================

/**
 * Determine the competition status of a vertical event athlete
 */
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

/**
 * Parse a feet-inches string (e.g., "57-06.25") to meters
 */
export function parseFeetInchesString(feetInchesStr: string): number | null {
  const match = feetInchesStr.match(/^(\d+)-(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  
  const feet = parseInt(match[1], 10);
  const inches = parseFloat(match[2]);
  
  if (isNaN(feet) || isNaN(inches)) return null;
  
  return feetInchesToMeters(feet, inches);
}

/**
 * Check if a mark type represents a legal/valid mark for horizontal events
 */
export function isLegalHorizontalMark(markType: string): boolean {
  return markType === 'mark';
}

/**
 * Check if a mark type represents a successful clear for vertical events
 */
export function isSuccessfulVerticalMark(markType: string): boolean {
  return markType === 'cleared';
}

// Re-export the event type checkers for convenience
export { isHeightEvent, isDistanceEvent };
