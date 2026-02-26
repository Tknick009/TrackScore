import type { ComponentType } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";

export type DisplayType = 'P10' | 'P6' | 'BigBoard' | 'Broadcast' | 'Custom';
export type LayoutKind = 'single' | 'multi';

export interface DisplayCapability {
  maxAthletes: number;
  resolution: { width: number; height: number };
  allowedLayoutKinds: LayoutKind[];
  description: string;
}

export const DISPLAY_CAPABILITIES: Record<DisplayType, DisplayCapability> = {
  P10: {
    maxAthletes: 1,
    resolution: { width: 192, height: 96 },
    allowedLayoutKinds: ['single'],
    description: 'Small LED matrix - one athlete only',
  },
  P6: {
    maxAthletes: 1,
    resolution: { width: 288, height: 144 },
    allowedLayoutKinds: ['single'],
    description: 'Medium LED matrix - one athlete only',
  },
  BigBoard: {
    maxAthletes: 8,
    resolution: { width: 1920, height: 1080 },
    allowedLayoutKinds: ['single', 'multi'],
    description: 'Full screen display - up to 8 athletes',
  },
  Broadcast: {
    maxAthletes: 20,
    resolution: { width: 1920, height: 1080 },
    allowedLayoutKinds: ['multi'],
    description: 'Broadcast overlay with ticker, clock, and logo',
  },
  Custom: {
    maxAthletes: 8,
    resolution: { width: 1920, height: 1080 },
    allowedLayoutKinds: ['single', 'multi'],
    description: 'Custom resolution display',
  },
};

export interface TemplateProps {
  event: EventWithEntries;
  meet?: Meet | null;
  showSplits?: boolean;
  liveTime?: string;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  layoutKind: LayoutKind;
  supportedDisplays: DisplayType[];
  maxAthletes: number;
  category: 'track' | 'field' | 'both';
}

export const TEMPLATE_REGISTRY: TemplateMetadata[] = [
  {
    id: 'SingleAthleteTrack',
    name: 'Single Athlete (Track)',
    description: 'One athlete with lane, time, and place - for P10/P6 displays',
    layoutKind: 'single',
    supportedDisplays: ['P10', 'P6'],
    maxAthletes: 1,
    category: 'track',
  },
  {
    id: 'SingleAthleteField',
    name: 'Single Athlete (Field)',
    description: 'One athlete with mark and attempts - for P10/P6 displays',
    layoutKind: 'single',
    supportedDisplays: ['P10', 'P6'],
    maxAthletes: 1,
    category: 'field',
  },
  {
    id: 'BigBoard',
    name: 'Big Board',
    description: '8-athlete results grid with spotlight rows',
    layoutKind: 'multi',
    supportedDisplays: ['BigBoard'],
    maxAthletes: 8,
    category: 'track',
  },
  {
    id: 'CompiledResults',
    name: 'Compiled Results',
    description: 'Final results with places and times',
    layoutKind: 'multi',
    supportedDisplays: ['BigBoard'],
    maxAthletes: 8,
    category: 'track',
  },
  {
    id: 'RunningTime',
    name: 'Running Time',
    description: 'Live timing display with running clock',
    layoutKind: 'multi',
    supportedDisplays: ['BigBoard'],
    maxAthletes: 8,
    category: 'track',
  },
  {
    id: 'RunningResults',
    name: 'Running Results',
    description: 'Results updating in real-time',
    layoutKind: 'multi',
    supportedDisplays: ['BigBoard'],
    maxAthletes: 8,
    category: 'track',
  },
  {
    id: 'FieldSideBySide',
    name: 'Field Side-by-Side',
    description: 'Two field events displayed together',
    layoutKind: 'multi',
    supportedDisplays: ['BigBoard'],
    maxAthletes: 8,
    category: 'field',
  },
  {
    id: 'BroadcastTicker',
    name: 'Broadcast Ticker',
    description: 'Scrolling results ticker with clock and logo for broadcast',
    layoutKind: 'multi',
    supportedDisplays: ['Broadcast'],
    maxAthletes: 20,
    category: 'both',
  },
  {
    id: 'ProScoreboard',
    name: 'Pro Scoreboard',
    description: 'Professional broadcast-quality scoreboard with clean typography and podium highlights',
    layoutKind: 'multi',
    supportedDisplays: ['BigBoard', 'Custom'],
    maxAthletes: 8,
    category: 'both',
  },
];

export function getTemplatesForDisplay(displayType: DisplayType): TemplateMetadata[] {
  const effectiveType = displayType === 'Custom' ? 'BigBoard' : displayType;
  return TEMPLATE_REGISTRY.filter(t => t.supportedDisplays.includes(effectiveType));
}

export function isTemplateCompatible(templateId: string, displayType: DisplayType): boolean {
  const template = TEMPLATE_REGISTRY.find(t => t.id === templateId);
  if (!template) return false;
  const effectiveType = displayType === 'Custom' ? 'BigBoard' : displayType;
  return template.supportedDisplays.includes(effectiveType);
}

export function getMaxAthletesForDisplay(displayType: DisplayType): number {
  return DISPLAY_CAPABILITIES[displayType].maxAthletes;
}

export function sliceEntriesForDisplay<T extends { entries?: any[] }>(
  event: T,
  displayType: DisplayType,
  focusIndex: number = 0
): T {
  const maxAthletes = getMaxAthletesForDisplay(displayType);
  if (!event.entries || event.entries.length <= maxAthletes) {
    return event;
  }
  
  const slicedEntries = event.entries.slice(focusIndex, focusIndex + maxAthletes);
  return { ...event, entries: slicedEntries };
}

export function getDefaultTemplate(displayType: DisplayType, category: 'track' | 'field'): string {
  const templates = getTemplatesForDisplay(displayType).filter(t => 
    t.category === category || t.category === 'both'
  );
  return templates[0]?.id || 'SingleAthleteTrack';
}
