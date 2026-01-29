/**
 * World Athletics Combined Events Scoring Calculator (Shared)
 * 
 * Client-side scoring calculation for displaying points on best marks
 * in combined events (decathlon, heptathlon, etc.)
 */

export type Gender = 'M' | 'F';

interface ScoringCoefficients {
  A: number;
  B: number;
  C: number;
  isTrackEvent: boolean;
  measurementUnit: 'seconds' | 'meters' | 'centimeters';
}

// WA 2017 Scoring Tables
const SCORING_TABLES: Record<string, Record<Gender, ScoringCoefficients>> = {
  // TRACK EVENTS
  '100m': {
    M: { A: 25.4347, B: 18.00, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 17.8570, B: 21.00, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '200m': {
    M: { A: 5.8425, B: 38.00, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 4.9900, B: 42.50, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '400m': {
    M: { A: 1.53775, B: 82.00, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 1.34285, B: 91.70, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '800m': {
    M: { A: 0.11193, B: 254.00, C: 1.88, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 0.11193, B: 254.00, C: 1.88, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '1000m': {
    M: { A: 0.08713, B: 305.50, C: 1.85, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 0.08713, B: 305.50, C: 1.85, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '1500m': {
    M: { A: 0.03768, B: 480.00, C: 1.85, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 0.03768, B: 480.00, C: 1.85, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '60m': {
    M: { A: 58.0150, B: 11.50, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 46.0849, B: 13.00, C: 1.81, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '60m_hurdles': {
    M: { A: 20.5173, B: 15.50, C: 1.92, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 20.0479, B: 17.00, C: 1.835, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '100m_hurdles': {
    M: { A: 5.74352, B: 28.50, C: 1.92, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 9.23076, B: 26.70, C: 1.835, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  '110m_hurdles': {
    M: { A: 5.74352, B: 28.50, C: 1.92, isTrackEvent: true, measurementUnit: 'seconds' },
    F: { A: 5.74352, B: 28.50, C: 1.92, isTrackEvent: true, measurementUnit: 'seconds' }
  },
  
  // FIELD EVENTS - JUMPS
  'high_jump': {
    M: { A: 0.8465, B: 75.00, C: 1.42, isTrackEvent: false, measurementUnit: 'centimeters' },
    F: { A: 1.84523, B: 75.00, C: 1.348, isTrackEvent: false, measurementUnit: 'centimeters' }
  },
  'pole_vault': {
    M: { A: 0.2797, B: 100.00, C: 1.35, isTrackEvent: false, measurementUnit: 'centimeters' },
    F: { A: 0.44125, B: 100.00, C: 1.35, isTrackEvent: false, measurementUnit: 'centimeters' }
  },
  'long_jump': {
    M: { A: 0.14354, B: 220.00, C: 1.40, isTrackEvent: false, measurementUnit: 'centimeters' },
    F: { A: 0.188807, B: 210.00, C: 1.41, isTrackEvent: false, measurementUnit: 'centimeters' }
  },
  'triple_jump': {
    M: { A: 0.06533, B: 640.00, C: 1.40, isTrackEvent: false, measurementUnit: 'centimeters' },
    F: { A: 0.06533, B: 640.00, C: 1.40, isTrackEvent: false, measurementUnit: 'centimeters' }
  },
  
  // FIELD EVENTS - THROWS
  'shot_put': {
    M: { A: 51.39, B: 1.50, C: 1.05, isTrackEvent: false, measurementUnit: 'meters' },
    F: { A: 56.0211, B: 1.50, C: 1.05, isTrackEvent: false, measurementUnit: 'meters' }
  },
  'discus': {
    M: { A: 12.91, B: 4.00, C: 1.10, isTrackEvent: false, measurementUnit: 'meters' },
    F: { A: 12.3311, B: 3.00, C: 1.10, isTrackEvent: false, measurementUnit: 'meters' }
  },
  'javelin': {
    M: { A: 10.14, B: 7.00, C: 1.08, isTrackEvent: false, measurementUnit: 'meters' },
    F: { A: 15.9803, B: 3.80, C: 1.04, isTrackEvent: false, measurementUnit: 'meters' }
  },
  'hammer': {
    M: { A: 13.0449, B: 1.50, C: 1.05, isTrackEvent: false, measurementUnit: 'meters' },
    F: { A: 17.5458, B: 1.50, C: 1.05, isTrackEvent: false, measurementUnit: 'meters' }
  }
};

/**
 * Normalize event type string to match scoring table keys
 */
export function normalizeEventType(eventType: string): string {
  return eventType
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/hurdle$/i, 'hurdles')
    .replace(/metres?/i, 'm')
    .replace(/^(\d+)m_hurdles$/, '$1m_hurdles');
}

/**
 * Check if an event type is a field event (not track)
 */
export function isFieldEvent(eventType: string): boolean {
  const normalized = normalizeEventType(eventType);
  const coeffs = SCORING_TABLES[normalized]?.M || SCORING_TABLES[normalized]?.F;
  return coeffs ? !coeffs.isTrackEvent : false;
}

/**
 * Convert measurement to the required unit for scoring
 */
function convertToUnit(value: number, eventType: string, gender: Gender): number {
  const normalized = normalizeEventType(eventType);
  const coeffs = SCORING_TABLES[normalized]?.[gender];
  if (!coeffs) return value;
  
  switch (coeffs.measurementUnit) {
    case 'centimeters':
      return value < 10 ? value * 100 : value;
    case 'meters':
      return value > 100 ? value / 100 : value;
    case 'seconds':
      return value;
    default:
      return value;
  }
}

/**
 * Calculate points for a field event mark (best mark only)
 * 
 * @param eventType The event type (e.g., 'long_jump', 'shot_put')
 * @param markInMeters The mark in meters
 * @param gender 'M' for male, 'F' for female
 * @returns Points earned (0 if invalid or below threshold)
 */
export function calculateFieldEventPoints(
  eventType: string,
  markInMeters: number,
  gender: Gender
): number {
  const normalized = normalizeEventType(eventType);
  const coeffs = SCORING_TABLES[normalized]?.[gender];
  
  if (!coeffs || coeffs.isTrackEvent) {
    return 0;
  }
  
  if (markInMeters <= 0) {
    return 0;
  }
  
  const value = convertToUnit(markInMeters, normalized, gender);
  
  // Field events: Points = A × (M − B)^C
  const diff = value - coeffs.B;
  if (diff <= 0) {
    return 0;
  }
  
  const points = coeffs.A * Math.pow(diff, coeffs.C);
  return Math.floor(points);
}

/**
 * Check if scoring is available for an event type
 */
export function hasScoring(eventType: string): boolean {
  const normalized = normalizeEventType(eventType);
  return !!SCORING_TABLES[normalized];
}

/**
 * Parse time string to seconds
 * Handles formats like "10.45", "2:05.23", etc.
 */
export function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  
  const trimmed = timeStr.trim().toUpperCase();
  
  // Handle DNS, DNF, DQ, etc.
  if (['DNS', 'DNF', 'DQ', 'NT', 'FOUL', 'F', 'PASS', 'P', '-', 'X'].includes(trimmed)) {
    return null;
  }
  
  // Handle mm:ss.ss format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return minutes * 60 + seconds;
      }
    }
  }
  
  // Handle plain seconds
  const value = parseFloat(trimmed);
  if (!isNaN(value) && value > 0) {
    return value;
  }
  
  return null;
}

/**
 * Calculate points for a track event time
 * 
 * @param eventType The event type (e.g., '100m', '400m')
 * @param timeStr The time as a string (e.g., '10.45', '2:05.23')
 * @param gender 'M' for male, 'F' for female
 * @returns Points earned (0 if invalid)
 */
export function calculateTrackEventPoints(
  eventType: string,
  timeStr: string,
  gender: Gender
): number {
  const normalized = normalizeEventType(eventType);
  const coeffs = SCORING_TABLES[normalized]?.[gender];
  
  if (!coeffs || !coeffs.isTrackEvent) {
    return 0;
  }
  
  const timeInSeconds = parseTimeToSeconds(timeStr);
  if (timeInSeconds === null || timeInSeconds <= 0) {
    return 0;
  }
  
  // Track events: Points = A × (B − T)^C
  const diff = coeffs.B - timeInSeconds;
  if (diff <= 0) {
    return 0; // Time too slow
  }
  
  const points = coeffs.A * Math.pow(diff, coeffs.C);
  return Math.floor(points);
}

/**
 * Calculate multi-event points for any performance (track or field)
 * 
 * @param eventType The event type
 * @param performance Time string for track, meters for field
 * @param gender 'M' or 'F'
 * @returns Points earned
 */
export function calculateMultiEventPoints(
  eventType: string,
  performance: string | number,
  gender: Gender
): number {
  const normalized = normalizeEventType(eventType);
  const coeffs = SCORING_TABLES[normalized]?.[gender];
  
  if (!coeffs) return 0;
  
  if (coeffs.isTrackEvent) {
    return calculateTrackEventPoints(eventType, String(performance), gender);
  } else {
    const mark = typeof performance === 'number' ? performance : parseFloat(String(performance));
    if (isNaN(mark) || mark <= 0) return 0;
    return calculateFieldEventPoints(eventType, mark, gender);
  }
}
