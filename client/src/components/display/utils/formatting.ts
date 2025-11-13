import { EntryWithDetails } from "@shared/schema";
import { getEventDescriptor } from "@shared/event-catalog";

export function getUnitSuffix(resultType: string | null | undefined): string {
  switch (resultType) {
    case 'time': return 's';
    case 'distance': return 'm';
    case 'height': return 'm';
    case 'points': return ' pts';
    default: return '';
  }
}

export function formatResult(entry: EntryWithDetails): string {
  const value = entry.finalMark;
  if (value === null || value === undefined) return '-';
  
  const descriptor = getEventDescriptor(entry.event?.eventType || '');
  const suffix = getUnitSuffix(entry.resultType);
  
  return `${value.toFixed(descriptor.precision)}${suffix}`;
}

export function formatAttemptHeaderLabel(key: string): string {
  const [round, num] = key.split('-');
  if (round === 'default') return `#${num}`;
  return `${round.charAt(0).toUpperCase() + round.slice(1)} #${num}`;
}

export function generateAttemptHeaders(entries: EntryWithDetails[]): string[] {
  const attemptKeys = new Set<string>();
  
  entries.forEach(entry => {
    entry.splits?.forEach(split => {
      const key = `${split.round || 'default'}-${split.splitNumber}`;
      attemptKeys.add(key);
    });
  });
  
  if (attemptKeys.size === 0) {
    const maxAttempts = Math.max(...entries.map(e => e.splits?.length || 0), 3);
    return Array.from({ length: maxAttempts }, (_, i) => `default-${i + 1}`);
  }
  
  const roundPriority: Record<string, number> = {
    'preliminary': 1,
    'qualifying': 2,
    'quarterfinal': 3,
    'semifinal': 4,
    'final': 5,
    'default': 99
  };
  
  return Array.from(attemptKeys).sort((a, b) => {
    const [roundA, numA] = a.split('-');
    const [roundB, numB] = b.split('-');
    const priorityA = roundPriority[roundA] || 99;
    const priorityB = roundPriority[roundB] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return parseInt(numA) - parseInt(numB);
  });
}
