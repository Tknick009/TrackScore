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
