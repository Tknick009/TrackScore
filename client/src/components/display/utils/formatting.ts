import { EntryWithDetails, Event } from "@shared/schema";
import { getEventDescriptor } from "@shared/event-catalog";

export interface RoundInfo {
  roundLabel?: string;
  heat?: number;
}

export function deriveRoundInfo(entry: EntryWithDetails, event?: Event): RoundInfo {
  if (entry.finalMark !== null || entry.finalPlace !== null || entry.finalHeat !== null) {
    return {
      roundLabel: "Final",
      heat: entry.finalHeat ?? undefined
    };
  }
  
  if (entry.semifinalMark !== null || entry.semifinalPlace !== null || entry.semifinalHeat !== null) {
    return {
      roundLabel: "Semifinal",
      heat: entry.semifinalHeat ?? undefined
    };
  }
  
  if (entry.quarterfinalMark !== null || entry.quarterfinalPlace !== null || entry.quarterfinalHeat !== null) {
    return {
      roundLabel: "Quarterfinal",
      heat: entry.quarterfinalHeat ?? undefined
    };
  }
  
  if (entry.preliminaryMark !== null || entry.preliminaryPlace !== null || entry.preliminaryHeat !== null) {
    return {
      roundLabel: "Preliminary",
      heat: entry.preliminaryHeat ?? undefined
    };
  }
  
  if (event && event.numRounds !== null && event.numRounds <= 1) {
    return {
      roundLabel: "Final",
      heat: undefined
    };
  }
  
  return {};
}

export function getUnitSuffix(resultType: string | null | undefined): string {
  switch (resultType) {
    case 'distance': return 'm';
    case 'height': return 'm';
    case 'points': return ' pts';
    default: return '';
  }
}

function roundToPrecision(val: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(val * factor) / factor;
}

export function formatTimeValue(seconds: number, precision: number = 2): string {
  const rounded = roundToPrecision(seconds, precision);
  if (rounded >= 3600) {
    const hours = Math.floor(rounded / 3600);
    const mins = Math.floor((rounded % 3600) / 60);
    const secs = roundToPrecision(rounded % 60, precision).toFixed(precision);
    return `${hours}:${String(mins).padStart(2, '0')}:${secs.padStart(precision + 3, '0')}`;
  }
  if (rounded >= 60) {
    const mins = Math.floor(rounded / 60);
    const secs = roundToPrecision(rounded % 60, precision).toFixed(precision);
    return `${mins}:${secs.padStart(precision + 3, '0')}`;
  }
  return rounded.toFixed(precision);
}

export function formatResult(entry: EntryWithDetails): string {
  // Runtime: finalMark can be a string from hytek-results (e.g., "DQ", "DNF", "11:13.01")
  // even though the TypeScript type says number | null
  const raw = entry.finalMark as unknown;
  if (raw === null || raw === undefined) return '-';
  
  // If the mark is a string (from hytek-results enriched entries via mapLiveEntries),
  // handle status codes and numeric strings
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return '-';
    // Status codes like "DQ", "DNF", "SCR", "FS", "NT", "FOUL", "FAIL", "NH", "ND" — return as-is
    if (/^[A-Za-z]/.test(trimmed)) return trimmed;
    // If the string already contains a colon (M:SS.hh format), it's pre-formatted — return as-is
    if (trimmed.includes(':')) return trimmed;
    // Numeric string — try to parse and format
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) return trimmed;
    const descriptor = getEventDescriptor(entry.event?.eventType || '');
    if (entry.resultType === 'time') {
      return formatTimeValue(parsed, descriptor.precision);
    }
    const suffix = getUnitSuffix(entry.resultType);
    return `${parsed.toFixed(descriptor.precision)}${suffix}`;
  }
  
  const value = raw as number;
  const descriptor = getEventDescriptor(entry.event?.eventType || '');
  
  if (entry.resultType === 'time') {
    return formatTimeValue(value, descriptor.precision);
  }
  
  const suffix = getUnitSuffix(entry.resultType);
  return `${value.toFixed(descriptor.precision)}${suffix}`;
}

export function formatAttemptHeaderLabel(key: string): string {
  const [round, num] = key.split('-');
  if (round === 'default') return `#${num}`;
  return `${round.charAt(0).toUpperCase() + round.slice(1)} #${num}`;
}

export function generateAttemptHeaders(entries: EntryWithDetails[]): string[] {
  const attemptIndices = new Set<number>();
  
  entries.forEach(entry => {
    entry.splits?.forEach(split => {
      attemptIndices.add(split.splitIndex);
    });
  });
  
  if (attemptIndices.size === 0) {
    const maxAttempts = Math.max(...entries.map(e => e.splits?.length || 0), 3);
    return Array.from({ length: maxAttempts }, (_, i) => `default-${i + 1}`);
  }
  
  return Array.from(attemptIndices)
    .sort((a, b) => a - b)
    .map(idx => `default-${idx}`);
}

export function formatSplitTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '–';
  
  const roundH = (v: number) => Math.round(v * 100) / 100;
  const rounded = roundH(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = roundH(rounded % 60).toFixed(2);
  
  if (mins > 0) {
    return `${mins}:${secs.padStart(5, '0')}`;
  }
  return `${secs}s`;
}

/**
 * Extract the race distance in meters from an event name or event type string.
 * Returns the distance in meters, or null if it can't be determined.
 * For relays like "4x100", returns the leg distance (100), not the total.
 * Wind is only relevant for sprints (200m and under), so callers use this
 * to decide whether to show wind readings.
 */
export function extractDistanceMeters(eventName: string | null | undefined, eventType?: string | null): number | null {
  const str = (eventName || eventType || '').toLowerCase();
  // Relay: "4x100" or "4 x 200" — extract leg distance
  const relayMatch = str.match(/(\d+)\s*x\s*(\d+)/);
  if (relayMatch) return parseInt(relayMatch[2]);
  // Direct distance: "100m", "200 meters", "110m hurdles", "100 meter dash"
  const distMatch = str.match(/(\d+)\s*m(?:eter)?/);
  if (distMatch) return parseInt(distMatch[1]);
  // Just a number at the start or after a space: "100 Dash", "200 Hurdles"
  const numMatch = str.match(/\b(\d+)\b/);
  if (numMatch) return parseInt(numMatch[1]);
  return null;
}

/**
 * Returns true if wind should be displayed for this event.
 * Wind is only shown for events 200m and under (per IAAF/NCAA rules).
 */
export function shouldShowWind(eventName: string | null | undefined, eventType?: string | null, distance?: number | null): boolean {
  // If we have a direct distance value, use it
  if (distance !== null && distance !== undefined && distance > 0) {
    return distance <= 200;
  }
  // Otherwise try to extract from the name/type
  const extracted = extractDistanceMeters(eventName, eventType);
  if (extracted !== null) {
    return extracted <= 200;
  }
  // If we can't determine distance, show wind by default (safer to show than hide)
  return true;
}

export function calculatePaceDelta(time: number, leaderTime: number): string {
  const delta = time - leaderTime;
  if (Math.abs(delta) < 0.01) return '—';
  
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}s`;
}
