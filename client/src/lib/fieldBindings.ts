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
    description: 'Current heat (e.g., "Heat 2 of 4")',
    format: 'Heat {heat} of {totalHeats}',
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

export function resolveFieldValue(fieldKey: string, data: Record<string, any>): string {
  const binding = FIELD_BINDINGS[fieldKey];
  if (!binding) return '';
  
  if (fieldKey === 'heat-number' && data.heat && data.totalHeats) {
    return `Heat ${data.heat} of ${data.totalHeats}`;
  }
  
  return data[binding.dataKey] ?? '';
}

export function resolveImageUrl(fieldKey: string, data: Record<string, any>): string | null {
  const binding = FIELD_BINDINGS[fieldKey];
  if (!binding || binding.type !== 'image') return null;
  
  return data[binding.dataKey] || null;
}
