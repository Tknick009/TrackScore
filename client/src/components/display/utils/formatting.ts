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

// Round UP to nearest hundredth (track & field rule: 8.315 → 8.32)
function ceilToPrecision(val: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.ceil(val * factor - 1e-9) / factor;
}

export function formatTimeValue(seconds: number, precision: number = 2): string {
  const rounded = ceilToPrecision(seconds, precision);
  if (rounded >= 3600) {
    const hours = Math.floor(rounded / 3600);
    const mins = Math.floor((rounded % 3600) / 60);
    const secs = ceilToPrecision(rounded % 60, precision).toFixed(precision);
    return `${hours}:${String(mins).padStart(2, '0')}:${secs.padStart(precision + 3, '0')}`;
  }
  if (rounded >= 60) {
    const mins = Math.floor(rounded / 60);
    const secs = ceilToPrecision(rounded % 60, precision).toFixed(precision);
    return `${mins}:${secs.padStart(precision + 3, '0')}`;
  }
  return rounded.toFixed(precision);
}

export function formatResult(entry: EntryWithDetails): string {
  const value = entry.finalMark;
  if (value === null || value === undefined) return '-';
  
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
  
  const ceilH = (v: number) => Math.ceil(v * 100 - 1e-9) / 100;
  const mins = Math.floor(seconds / 60);
  const secs = ceilH(seconds % 60).toFixed(2);
  
  if (mins > 0) {
    return `${mins}:${secs.padStart(5, '0')}`;
  }
  return `${secs}s`;
}

export function calculatePaceDelta(time: number, leaderTime: number): string {
  const delta = time - leaderTime;
  if (Math.abs(delta) < 0.01) return '—';
  
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}s`;
}
