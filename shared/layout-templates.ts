// Layout Templates for P10 (192x96) and P6 (288x144) LED Displays
// These are predefined zone configurations optimized for each display resolution

import type { InsertLayoutZone } from './schema';

export type DisplayType = 'P10' | 'P6';

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  displayType: DisplayType;
  resolution: { width: number; height: number };
  aspectRatio: string;
  category: 'track' | 'field' | 'general';
  zones: Omit<InsertLayoutZone, 'layoutId'>[];
}

// P10 Display Templates (192x96 pixels - 2:1 aspect ratio)
const P10_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'p10-start-list',
    name: 'P10 Start List',
    description: 'Shows athlete lineup for upcoming event on P10 display',
    displayType: 'P10',
    resolution: { width: 192, height: 96 },
    aspectRatio: '2:1',
    category: 'track',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 18,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'medium' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 18,
        widthPercent: 100,
        heightPercent: 82,
        boardType: 'lane-visualization',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'lane-visualization', size: 'compact', totalLanes: 8, showProgress: false, showTimes: false },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p10-running-time',
    name: 'P10 Running Time',
    description: 'Live race timer display for P10',
    displayType: 'P10',
    resolution: { width: 192, height: 96 },
    aspectRatio: '2:1',
    category: 'track',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 25,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'medium' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 25,
        widthPercent: 100,
        heightPercent: 75,
        boardType: 'live-timer',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'live-timer', mode: 'stopwatch', size: 'large', showMillis: true },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p10-results',
    name: 'P10 Track Results',
    description: 'Final results display for track events on P10',
    displayType: 'P10',
    resolution: { width: 192, height: 96 },
    aspectRatio: '2:1',
    category: 'track',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 15,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'small' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 15,
        widthPercent: 100,
        heightPercent: 85,
        boardType: 'standings-table',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'standings-table', maxRows: 8, showPhotos: false },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p10-field-results',
    name: 'P10 Field Results',
    description: 'Field event results with attempt tracker on P10',
    displayType: 'P10',
    resolution: { width: 192, height: 96 },
    aspectRatio: '2:1',
    category: 'field',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 18,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'medium' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 18,
        widthPercent: 100,
        heightPercent: 82,
        boardType: 'attempt-tracker',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'attempt-tracker', size: 'medium', showMarks: true },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p10-field-standings',
    name: 'P10 Field Standings',
    description: 'Field event standings/leaderboard on P10',
    displayType: 'P10',
    resolution: { width: 192, height: 96 },
    aspectRatio: '2:1',
    category: 'field',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 15,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'small' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 15,
        widthPercent: 100,
        heightPercent: 85,
        boardType: 'standings-table',
        dataBinding: { type: 'standings' },
        boardConfig: { boardType: 'standings-table', maxRows: 6, showPhotos: false },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p10-meet-logo',
    name: 'P10 Meet Logo',
    description: 'Meet branding/logo display for P10',
    displayType: 'P10',
    resolution: { width: 192, height: 96 },
    aspectRatio: '2:1',
    category: 'general',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        boardType: 'logo-banner',
        dataBinding: { type: 'static', content: 'meet-logo' },
        boardConfig: { boardType: 'logo-banner', height: 96 },
        stylePreset: 'none',
      },
    ],
  },
];

// P6 Display Templates (288x144 pixels - 2:1 aspect ratio)
const P6_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'p6-start-list',
    name: 'P6 Start List',
    description: 'Shows athlete lineup for upcoming event on P6 display',
    displayType: 'P6',
    resolution: { width: 288, height: 144 },
    aspectRatio: '2:1',
    category: 'track',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 15,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'large' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 15,
        widthPercent: 100,
        heightPercent: 85,
        boardType: 'lane-visualization',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'lane-visualization', size: 'standard', totalLanes: 8, showProgress: false, showTimes: false },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p6-running-time',
    name: 'P6 Running Time',
    description: 'Live race timer display for P6',
    displayType: 'P6',
    resolution: { width: 288, height: 144 },
    aspectRatio: '2:1',
    category: 'track',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 20,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'large' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 20,
        widthPercent: 100,
        heightPercent: 80,
        boardType: 'live-timer',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'live-timer', mode: 'stopwatch', size: 'large', showMillis: true },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p6-results',
    name: 'P6 Track Results',
    description: 'Final results display for track events on P6',
    displayType: 'P6',
    resolution: { width: 288, height: 144 },
    aspectRatio: '2:1',
    category: 'track',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 12,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'medium' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 12,
        widthPercent: 100,
        heightPercent: 88,
        boardType: 'standings-table',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'standings-table', maxRows: 10, showPhotos: false },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p6-field-results',
    name: 'P6 Field Results',
    description: 'Field event results with attempt tracker on P6',
    displayType: 'P6',
    resolution: { width: 288, height: 144 },
    aspectRatio: '2:1',
    category: 'field',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 15,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'large' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 15,
        widthPercent: 100,
        heightPercent: 85,
        boardType: 'attempt-tracker',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'attempt-tracker', size: 'large', showMarks: true },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p6-field-standings',
    name: 'P6 Field Standings',
    description: 'Field event standings/leaderboard on P6',
    displayType: 'P6',
    resolution: { width: 288, height: 144 },
    aspectRatio: '2:1',
    category: 'field',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 12,
        boardType: 'event-info',
        dataBinding: { type: 'current-event' },
        boardConfig: { boardType: 'event-info', fontSize: 'medium' },
        stylePreset: 'none',
      },
      {
        order: 1,
        xPercent: 0,
        yPercent: 12,
        widthPercent: 100,
        heightPercent: 88,
        boardType: 'standings-table',
        dataBinding: { type: 'standings' },
        boardConfig: { boardType: 'standings-table', maxRows: 8, showPhotos: false },
        stylePreset: 'none',
      },
    ],
  },
  {
    id: 'p6-meet-logo',
    name: 'P6 Meet Logo',
    description: 'Meet branding/logo display for P6',
    displayType: 'P6',
    resolution: { width: 288, height: 144 },
    aspectRatio: '2:1',
    category: 'general',
    zones: [
      {
        order: 0,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        boardType: 'logo-banner',
        dataBinding: { type: 'static', content: 'meet-logo' },
        boardConfig: { boardType: 'logo-banner', height: 144 },
        stylePreset: 'none',
      },
    ],
  },
];

// All templates combined
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [...P10_TEMPLATES, ...P6_TEMPLATES];

// Helper functions
export function getTemplatesByDisplayType(displayType: DisplayType): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter(t => t.displayType === displayType);
}

export function getTemplatesByCategory(category: 'track' | 'field' | 'general'): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES.find(t => t.id === id);
}

// Display type definitions for UI
export const DISPLAY_TYPES = [
  { id: 'P10', name: 'P10 Display', resolution: '192x96', pixelPitch: '10mm' },
  { id: 'P6', name: 'P6 Display', resolution: '288x144', pixelPitch: '6mm' },
] as const;
