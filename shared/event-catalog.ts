export type Discipline = 'track' | 'field';
export type ResultUnit = 'seconds' | 'meters' | 'feet' | 'points';

export interface EventDescriptor {
  discipline: Discipline;
  resultUnit: ResultUnit;
  precision: number;
}

export function getEventDescriptor(eventType: string): EventDescriptor {
  const lowerType = eventType.toLowerCase();
  
  if (lowerType.includes('m ') || lowerType.includes('relay') || 
      lowerType.includes('hurdle') || lowerType.includes('steeplechase') ||
      lowerType.includes('run') || lowerType.includes('dash')) {
    return {
      discipline: 'track',
      resultUnit: 'seconds',
      precision: 3
    };
  }
  
  if (lowerType.includes('jump') || lowerType.includes('vault') ||
      lowerType.includes('throw') || lowerType.includes('put') ||
      lowerType.includes('discus') || lowerType.includes('javelin') ||
      lowerType.includes('hammer')) {
    return {
      discipline: 'field',
      resultUnit: 'meters',
      precision: 2
    };
  }
  
  if (lowerType.includes('athlon')) {
    return {
      discipline: 'track',
      resultUnit: 'points',
      precision: 0
    };
  }
  
  return {
    discipline: 'track',
    resultUnit: 'seconds',
    precision: 3
  };
}

export function isTrackEvent(eventType: string): boolean {
  return getEventDescriptor(eventType).discipline === 'track';
}

export function isFieldEvent(eventType: string): boolean {
  return getEventDescriptor(eventType).discipline === 'field';
}

// Wind-affected event types per IAAF/World Athletics rules
export const WIND_AFFECTED_EVENT_TYPES = [
  "100m",
  "200m", 
  "100m_hurdles",
  "110m_hurdles",
  "long_jump",
  "triple_jump",
] as const;

export type WindAffectedEventType = typeof WIND_AFFECTED_EVENT_TYPES[number];

export function isWindAffectedEvent(eventType: string): boolean {
  return WIND_AFFECTED_EVENT_TYPES.includes(eventType as WindAffectedEventType);
}

// Wind legality classification per IAAF rules
export enum WindLegality {
  LEGAL = "legal",
  MARGINAL = "marginal",
  ILLEGAL = "illegal"
}

export function classifyWindLegality(windSpeed: number): WindLegality {
  if (windSpeed <= 2.0) return WindLegality.LEGAL;
  if (windSpeed <= 2.5) return WindLegality.MARGINAL;
  return WindLegality.ILLEGAL;
}

export function formatWindSpeed(windSpeed: number | null): string {
  if (windSpeed === null) return "—";
  const sign = windSpeed >= 0 ? "+" : "";
  return `${sign}${windSpeed.toFixed(1)} m/s`;
}
