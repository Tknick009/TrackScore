/**
 * World Athletics Combined Events Scoring Calculator
 * 
 * Implements the official WA/IAAF scoring tables for:
 * - Decathlon (Outdoor Men's 10-event)
 * - Heptathlon (Outdoor Women's 7-event)
 * - Indoor Heptathlon (Men's 7-event)
 * - Indoor Pentathlon (Women's 5-event)
 * - Outdoor Pentathlon (Throws - 5-event)
 * 
 * Formulas:
 * - Track events: Points = A × (B − T)^C where T is time in seconds
 * - Field events: Points = A × (M − B)^C where M is measurement
 */

// Event category types
export type CombinedEventType = 
  | 'decathlon'      // Men's outdoor 10-event
  | 'heptathlon'     // Women's outdoor 7-event
  | 'indoor_heptathlon'  // Men's indoor 7-event
  | 'indoor_pentathlon'  // Women's indoor 5-event
  | 'outdoor_pentathlon'; // Throws pentathlon

export type Gender = 'M' | 'F';

// Scoring coefficients for each event
interface ScoringCoefficients {
  A: number;
  B: number;
  C: number;
  isTrackEvent: boolean; // true = lower is better (time), false = higher is better (distance/height)
  measurementUnit: 'seconds' | 'meters' | 'centimeters';
}

// WA 2017 Scoring Tables
// Track events: Points = A × (B − T)^C
// Field events: Points = A × (M − B)^C

const SCORING_TABLES: Record<string, Record<Gender, ScoringCoefficients>> = {
  // TRACK EVENTS (time-based, lower is better)
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
  
  // FIELD EVENTS - JUMPS (height/distance in meters, higher is better)
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
  
  // FIELD EVENTS - THROWS (distance in meters, higher is better)
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

// Combined event definitions
export const COMBINED_EVENT_DEFINITIONS: Record<CombinedEventType, {
  name: string;
  gender: Gender;
  events: string[];
  indoor: boolean;
}> = {
  decathlon: {
    name: "Decathlon",
    gender: 'M',
    indoor: false,
    events: [
      '100m', 'long_jump', 'shot_put', 'high_jump', '400m',  // Day 1
      '110m_hurdles', 'discus', 'pole_vault', 'javelin', '1500m'  // Day 2
    ]
  },
  heptathlon: {
    name: "Heptathlon",
    gender: 'F',
    indoor: false,
    events: [
      '100m_hurdles', 'high_jump', 'shot_put', '200m',  // Day 1
      'long_jump', 'javelin', '800m'  // Day 2
    ]
  },
  indoor_heptathlon: {
    name: "Indoor Heptathlon",
    gender: 'M',
    indoor: true,
    events: [
      '60m', 'long_jump', 'shot_put', 'high_jump',  // Day 1
      '60m_hurdles', 'pole_vault', '1000m'  // Day 2
    ]
  },
  indoor_pentathlon: {
    name: "Indoor Pentathlon",
    gender: 'F',
    indoor: true,
    events: [
      '60m_hurdles', 'high_jump', 'shot_put', 'long_jump', '800m'
    ]
  },
  outdoor_pentathlon: {
    name: "Outdoor Pentathlon",
    gender: 'M',
    indoor: false,
    events: [
      'long_jump', 'javelin', '200m', 'discus', '1500m'
    ]
  }
};

/**
 * Parse a performance string to a numeric value
 * Handles formats like:
 * - "10.23" (seconds for track)
 * - "2:05.45" (mm:ss.ss for 800m+)
 * - "7.52" (meters for long jump)
 * - "2.01" (meters for high jump)
 */
export function parsePerformance(performance: string): number | null {
  if (!performance) return null;
  
  const trimmed = performance.trim().toUpperCase();
  
  // Handle DNS, DNF, DQ, NH, NM, FOUL, etc.
  if (['DNS', 'DNF', 'DQ', 'NH', 'NM', 'X', 'FOUL', 'F', 'PASS', 'P', '-'].includes(trimmed)) {
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
  
  // Handle plain numeric
  const value = parseFloat(trimmed);
  if (!isNaN(value) && value > 0) {
    return value;
  }
  
  return null;
}

/**
 * Convert performance to the required measurement unit
 */
function convertToUnit(value: number, eventType: string, gender: Gender): number {
  const coeffs = SCORING_TABLES[eventType]?.[gender];
  if (!coeffs) return value;
  
  switch (coeffs.measurementUnit) {
    case 'centimeters':
      // Assume input is in meters, convert to centimeters
      return value < 10 ? value * 100 : value;
    case 'meters':
      // Assume input is already in meters
      return value > 100 ? value / 100 : value;
    case 'seconds':
      return value;
    default:
      return value;
  }
}

/**
 * Calculate points for a single event
 * 
 * @param eventType The event type (e.g., '100m', 'long_jump')
 * @param performance The raw performance string
 * @param gender 'M' for male, 'F' for female
 * @returns Points earned (0 if invalid or below threshold)
 */
export function calculateEventPoints(
  eventType: string,
  performance: string,
  gender: Gender
): number {
  const coeffs = SCORING_TABLES[eventType]?.[gender];
  if (!coeffs) {
    console.warn(`No scoring coefficients found for ${eventType} (${gender})`);
    return 0;
  }
  
  const rawValue = parsePerformance(performance);
  if (rawValue === null) {
    return 0;
  }
  
  const value = convertToUnit(rawValue, eventType, gender);
  
  let points: number;
  
  if (coeffs.isTrackEvent) {
    // Track events: Points = A × (B − T)^C
    // Where T is time in seconds
    const diff = coeffs.B - value;
    if (diff <= 0) {
      return 0; // Time too slow
    }
    points = coeffs.A * Math.pow(diff, coeffs.C);
  } else {
    // Field events: Points = A × (M − B)^C
    // Where M is the measurement
    const diff = value - coeffs.B;
    if (diff <= 0) {
      return 0; // Mark too short
    }
    points = coeffs.A * Math.pow(diff, coeffs.C);
  }
  
  // Round to nearest integer (official scoring uses whole numbers)
  return Math.floor(points);
}

/**
 * Calculate total points for a combined event
 * 
 * @param eventType The combined event type
 * @param performances Array of performances in event order
 * @returns Total points and breakdown
 */
export function calculateCombinedEventTotal(
  eventType: CombinedEventType,
  performances: Array<{ eventType: string; performance: string }>
): {
  totalPoints: number;
  breakdown: Array<{ eventType: string; performance: string; points: number }>;
  eventsCompleted: number;
} {
  const definition = COMBINED_EVENT_DEFINITIONS[eventType];
  if (!definition) {
    return { totalPoints: 0, breakdown: [], eventsCompleted: 0 };
  }
  
  let totalPoints = 0;
  let eventsCompleted = 0;
  const breakdown: Array<{ eventType: string; performance: string; points: number }> = [];
  
  for (const { eventType: et, performance } of performances) {
    const points = calculateEventPoints(et, performance, definition.gender);
    breakdown.push({ eventType: et, performance, points });
    
    if (points > 0) {
      totalPoints += points;
      eventsCompleted++;
    }
  }
  
  return { totalPoints, breakdown, eventsCompleted };
}

/**
 * Get the event order for a combined event type
 */
export function getCombinedEventOrder(eventType: CombinedEventType): string[] {
  return COMBINED_EVENT_DEFINITIONS[eventType]?.events || [];
}

/**
 * Get day assignments for events (Day 1 or Day 2)
 */
export function getEventDays(eventType: CombinedEventType): Record<string, number> {
  const definition = COMBINED_EVENT_DEFINITIONS[eventType];
  if (!definition) return {};
  
  const days: Record<string, number> = {};
  const midpoint = eventType === 'decathlon' ? 5 : 
                   eventType === 'heptathlon' ? 4 :
                   eventType === 'indoor_heptathlon' ? 4 : 
                   definition.events.length; // Single day for pentathlon
  
  definition.events.forEach((event, index) => {
    days[event] = index < midpoint ? 1 : 2;
  });
  
  return days;
}

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
 * Check if an event type is part of a specific combined event
 */
export function isEventInCombinedEvent(eventType: string, combinedEventType: CombinedEventType): boolean {
  const normalized = normalizeEventType(eventType);
  return COMBINED_EVENT_DEFINITIONS[combinedEventType]?.events.includes(normalized) || false;
}

export default {
  calculateEventPoints,
  calculateCombinedEventTotal,
  getCombinedEventOrder,
  getEventDays,
  parsePerformance,
  normalizeEventType,
  isEventInCombinedEvent,
  COMBINED_EVENT_DEFINITIONS,
  SCORING_TABLES
};
