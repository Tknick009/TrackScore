export type FieldBindingType = 'text' | 'image';

export interface FieldBinding {
  key: string;
  label: string;
  type: FieldBindingType;
  description: string;
  format?: string;
  dataKey: string;
  category: 'event' | 'athlete' | 'result' | 'timing' | 'media';
}

export const FIELD_BINDINGS: Record<string, FieldBinding> = {
  'event-name': {
    key: 'event-name',
    label: 'Event Name',
    type: 'text',
    description: 'Name of the current event (e.g., "100m Dash")',
    dataKey: 'eventName',
    category: 'event',
  },
  'heat-number': {
    key: 'heat-number',
    label: 'Heat Number',
    type: 'text',
    description: 'Shows "Final" for single heat, or "Heat X of Y" for multiple heats',
    format: 'Final or Heat {heat} of {totalHeats}',
    dataKey: 'heat',
    category: 'event',
  },
  'round': {
    key: 'round',
    label: 'Round',
    type: 'text',
    description: 'Round name (e.g., "Prelims", "Finals")',
    dataKey: 'round',
    category: 'event',
  },
  'wind': {
    key: 'wind',
    label: 'Wind',
    type: 'text',
    description: 'Wind reading (e.g., "+1.2")',
    dataKey: 'wind',
    category: 'event',
  },
  'lane': {
    key: 'lane',
    label: 'Lane Number',
    type: 'text',
    description: 'Athlete lane assignment',
    dataKey: 'lane',
    category: 'athlete',
  },
  'place': {
    key: 'place',
    label: 'Place',
    type: 'text',
    description: 'Finishing position (1st, 2nd, etc.)',
    dataKey: 'place',
    category: 'result',
  },
  'name': {
    key: 'name',
    label: 'Athlete Name',
    type: 'text',
    description: 'Full name of the athlete',
    dataKey: 'name',
    category: 'athlete',
  },
  'first-name': {
    key: 'first-name',
    label: 'First Name',
    type: 'text',
    description: 'Athlete first name only',
    dataKey: 'firstName',
    category: 'athlete',
  },
  'last-name': {
    key: 'last-name',
    label: 'Last Name',
    type: 'text',
    description: 'Athlete last name only',
    dataKey: 'lastName',
    category: 'athlete',
  },
  'name-qualifier': {
    key: 'name-qualifier',
    label: 'Name + Qualifier',
    type: 'text',
    description: 'Full name with Q appended if qualified (e.g., "JOHNSON, Michael Q")',
    dataKey: 'nameQualifier',
    category: 'athlete',
  },
  'last-name-qualifier': {
    key: 'last-name-qualifier',
    label: 'Last Name + Qualifier',
    type: 'text',
    description: 'Last name with Q appended if qualified (e.g., "JOHNSON Q")',
    dataKey: 'lastNameQualifier',
    category: 'athlete',
  },
  'school': {
    key: 'school',
    label: 'School/Team',
    type: 'text',
    description: 'Team or school affiliation',
    dataKey: 'affiliation',
    category: 'athlete',
  },
  'time': {
    key: 'time',
    label: 'Time/Mark',
    type: 'text',
    description: 'Finish time or field mark',
    dataKey: 'time',
    category: 'result',
  },
  'last-split': {
    key: 'last-split',
    label: 'Last Split',
    type: 'text',
    description: 'Most recent split time',
    dataKey: 'lastSplit',
    category: 'timing',
  },
  'cumulative-split': {
    key: 'cumulative-split',
    label: 'Cumulative Split',
    type: 'text',
    description: 'Running total split time',
    dataKey: 'cumulativeSplit',
    category: 'timing',
  },
  'reaction-time': {
    key: 'reaction-time',
    label: 'Reaction Time',
    type: 'text',
    description: 'Start reaction time',
    dataKey: 'reactionTime',
    category: 'timing',
  },
  'running-time': {
    key: 'running-time',
    label: 'Running Time',
    type: 'text',
    description: 'Live race clock / running time',
    dataKey: 'runningTime',
    category: 'timing',
  },
  'bib': {
    key: 'bib',
    label: 'Bib Number',
    type: 'text',
    description: 'Athlete bib/hip number',
    dataKey: 'bib',
    category: 'athlete',
  },
  'athlete-photo': {
    key: 'athlete-photo',
    label: 'Athlete Photo',
    type: 'image',
    description: 'Athlete headshot image',
    dataKey: 'athletePhotoUrl',
    category: 'media',
  },
  'school-logo': {
    key: 'school-logo',
    label: 'School Logo',
    type: 'image',
    description: 'Team or school logo',
    dataKey: 'teamLogoUrl',
    category: 'media',
  },
  'meet-logo': {
    key: 'meet-logo',
    label: 'Meet Logo',
    type: 'image',
    description: 'Meet or event logo',
    dataKey: 'meetLogoUrl',
    category: 'media',
  },
  'static-text': {
    key: 'static-text',
    label: 'Static Text',
    type: 'text',
    description: 'Custom fixed text',
    dataKey: 'staticText',
    category: 'event',
  },
  'static-image': {
    key: 'static-image',
    label: 'Static Image',
    type: 'image',
    description: 'Custom uploaded image',
    dataKey: 'staticImageUrl',
    category: 'media',
  },
  'advancement-formula': {
    key: 'advancement-formula',
    label: 'Advancement Formula',
    type: 'text',
    description: 'Advancement rule (e.g., "3+2" meaning top 3 by place + 2 fastest times)',
    dataKey: 'advancementFormula',
    category: 'event',
  },
  'qualifier': {
    key: 'qualifier',
    label: 'Qualifier Status',
    type: 'text',
    description: 'Q = qualified by place, q = qualified by time',
    dataKey: 'qualifier',
    category: 'result',
  },
  'event-points': {
    key: 'event-points',
    label: 'Event Points',
    type: 'text',
    description: 'Points earned for this performance (multi-events only)',
    dataKey: 'eventPoints',
    category: 'result',
  },
  'total-points': {
    key: 'total-points',
    label: 'Total Points',
    type: 'text',
    description: 'Cumulative points in multi-event',
    dataKey: 'totalPoints',
    category: 'result',
  },
  'time-with-points': {
    key: 'time-with-points',
    label: 'Time/Mark + Points',
    type: 'text',
    description: 'Performance with points (e.g., "10.45 = 876 pts")',
    dataKey: 'timeWithPoints',
    category: 'result',
  },
};

export const TEXT_FIELD_BINDINGS = Object.values(FIELD_BINDINGS).filter(f => f.type === 'text');
export const IMAGE_FIELD_BINDINGS = Object.values(FIELD_BINDINGS).filter(f => f.type === 'image');

export const FIELD_BINDING_CATEGORIES = [
  { key: 'event', label: 'Event Info' },
  { key: 'athlete', label: 'Athlete Info' },
  { key: 'result', label: 'Results' },
  { key: 'timing', label: 'Timing' },
  { key: 'media', label: 'Images' },
] as const;

export const SCREEN_PRESETS = [
  { name: 'P10 Display', width: 192, height: 96, aspectRatio: '2:1' },
  { name: 'P6 Display', width: 288, height: 144, aspectRatio: '2:1' },
  { name: 'Big Board (1080p)', width: 1920, height: 1080, aspectRatio: '16:9' },
  { name: 'Big Board (720p)', width: 1280, height: 720, aspectRatio: '16:9' },
  { name: '4:3 Display', width: 1024, height: 768, aspectRatio: '4:3' },
  { name: 'Vertical Display', width: 1080, height: 1920, aspectRatio: '9:16' },
] as const;

// Central heat display formatter - use this everywhere for consistency
export function formatHeatDisplay(heat: number | undefined, totalHeats: number | undefined): string {
  if (!heat) return '';
  if (!totalHeats || totalHeats === 1) return 'Final';
  return `Heat ${heat} of ${totalHeats}`;
}

// Format advancement formula as "X+Y" (e.g., "3+2" means top 3 by place + 2 fastest)
export function formatAdvancementFormula(advanceByPlace: number | undefined, advanceByTime: number | undefined): string {
  if (!advanceByPlace && !advanceByTime) return '';
  const place = advanceByPlace || 0;
  const time = advanceByTime || 0;
  if (time > 0) {
    return `${place}+${time}`;
  }
  return `${place}`;
}

// Determine qualifier status: Q = qualified by place, q = qualified by time
export function getQualifierStatus(
  place: number | undefined,
  advanceByPlace: number | undefined,
  advanceByTime: number | undefined
): string {
  if (!place || place <= 0) return '';
  const placeLimit = advanceByPlace || 0;
  const timeLimit = advanceByTime || 0;
  
  // If no advancement formula, no qualifier
  if (placeLimit === 0 && timeLimit === 0) return '';
  
  // Qualified by place (big Q)
  if (placeLimit > 0 && place <= placeLimit) {
    return 'Q';
  }
  
  // Qualified by time (little q) - this is determined by comparing times across heats
  // For now, return 'q' as a placeholder - actual determination needs time comparison
  // The q will be set by the backend or manually when processing results
  return '';
}

export function resolveFieldValue(fieldKey: string, data: Record<string, any>): string {
  const binding = FIELD_BINDINGS[fieldKey];
  if (!binding) return '';
  
  if (fieldKey === 'heat-number') {
    return formatHeatDisplay(data.heat, data.totalHeats);
  }
  
  if (fieldKey === 'advancement-formula') {
    return formatAdvancementFormula(data.advanceByPlace, data.advanceByTime);
  }
  
  if (fieldKey === 'qualifier') {
    return getQualifierStatus(data.place, data.advanceByPlace, data.advanceByTime);
  }
  
  return data[binding.dataKey] ?? '';
}

export function resolveImageUrl(fieldKey: string, data: Record<string, any>): string | null {
  const binding = FIELD_BINDINGS[fieldKey];
  if (!binding || binding.type !== 'image') return null;
  
  return data[binding.dataKey] || null;
}
