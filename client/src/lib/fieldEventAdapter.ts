/**
 * Field Event Data Adapter
 * 
 * Converts new FieldEventSessionWithDetails format to EventWithEntries format
 * for backward compatibility with existing display templates.
 */

import type {
  EventWithEntries,
  Event,
  FieldEventSessionWithDetails,
  FieldEventAthlete,
  FieldEventMark,
  FieldHeight,
  EntryWithDetails,
  Athlete,
  Entry,
} from "@shared/schema";
import type { HorizontalStanding, VerticalStanding } from "./fieldStandings";
import { formatDistanceMark, formatHeightMark } from "./fieldStandings";

export interface FieldAttempt {
  attemptNumber: number;
  mark: number | null;
  markDisplay: string | null;
  status: 'mark' | 'foul' | 'pass' | 'scratch' | 'cleared' | 'missed' | 'pending';
  wind?: number | null;
  heightIndex?: number | null;
  attemptAtHeight?: number | null;
}

/**
 * Convert FieldEventMark[] to attempt array format used by templates
 */
export function marksToAttempts(marks: FieldEventMark[], isVertical: boolean = false): FieldAttempt[] {
  return marks
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
    .map(mark => ({
      attemptNumber: mark.attemptNumber,
      mark: mark.measurement,
      markDisplay: mark.measurement !== null 
        ? (isVertical ? formatHeightMark(mark.measurement) : formatDistanceMark(mark.measurement))
        : null,
      status: mark.markType as FieldAttempt['status'],
      wind: mark.wind,
      heightIndex: mark.heightIndex,
      attemptAtHeight: mark.attemptAtHeight,
    }));
}

/**
 * Create an EntryWithDetails from FieldEventAthlete and standings data
 */
function athleteToEntry(
  fieldAthlete: FieldEventAthlete & { entry?: Entry; athlete?: Athlete },
  athleteMarks: FieldEventMark[],
  standing: HorizontalStanding | VerticalStanding | undefined,
  isVertical: boolean
): EntryWithDetails {
  const bestMark = 'bestMark' in (standing || {}) 
    ? (standing as HorizontalStanding).bestMark 
    : (standing as VerticalStanding)?.highestCleared ?? null;

  const athleteData: Athlete = fieldAthlete.athlete || {
    id: String(fieldAthlete.id),
    meetId: '',
    firstName: '',
    lastName: '',
    teamId: null,
    gender: null,
    athleteNumber: 0,
    divisionId: null,
    bibNumber: null,
  };

  const fallbackEntry: Partial<Entry> = {
    id: String(fieldAthlete.id),
    eventId: String(fieldAthlete.sessionId),
    athleteId: athleteData.id,
    teamId: athleteData.teamId || null,
    resultType: 'distance',
    finalMark: bestMark !== null ? Math.round(bestMark * 1000) : null,
    finalPlace: standing?.place || null,
    checkInStatus: 'checked_in',
  };

  const entryData: Entry = fieldAthlete.entry || (fallbackEntry as Entry);

  const attempts = marksToAttempts(athleteMarks, isVertical);

  return {
    ...entryData,
    athlete: athleteData,
    team: undefined,
    event: {} as Event,
    attempts,
  } as EntryWithDetails;
}

/**
 * Convert FieldEventSessionWithDetails to EventWithEntries format
 * This allows new field event data to work with existing display templates.
 */
export function fieldSessionToEventWithEntries(
  session: FieldEventSessionWithDetails,
  event: Event,
  standings: HorizontalStanding[] | VerticalStanding[]
): EventWithEntries {
  const athletes = session.athletes || [];
  const marks = session.marks || [];
  const heights = session.heights || [];
  const isVertical = heights.length > 0;

  const standingsMap = new Map<number, HorizontalStanding | VerticalStanding>();
  for (const s of standings) {
    standingsMap.set(s.athleteId, s);
  }

  const entries: EntryWithDetails[] = athletes.map(athlete => {
    const athleteMarks = marks.filter(m => m.athleteId === athlete.id);
    const standing = standingsMap.get(athlete.id);
    return athleteToEntry(athlete, athleteMarks, standing, isVertical);
  });

  entries.sort((a, b) => {
    const aPlace = a.finalPlace ?? 999;
    const bPlace = b.finalPlace ?? 999;
    return aPlace - bPlace;
  });

  return {
    ...event,
    entries,
  };
}

export interface LiveFieldEventData {
  athletes: (FieldEventAthlete & { entry?: Entry; athlete?: Athlete })[];
  marks: FieldEventMark[];
  heights?: FieldHeight[];
  standings: HorizontalStanding[] | VerticalStanding[];
  currentAthleteId: number | null;
  sessionStatus: string;
  eventType: 'horizontal' | 'vertical';
}

/**
 * Convert live WebSocket field event data to entries format
 */
export function liveDataToEntries(
  data: LiveFieldEventData
): EntryWithDetails[] {
  const { athletes, marks, standings, eventType } = data;
  const isVertical = eventType === 'vertical';

  const standingsMap = new Map<number, HorizontalStanding | VerticalStanding>();
  for (const s of standings) {
    standingsMap.set(s.athleteId, s);
  }

  const entries: EntryWithDetails[] = athletes.map(athlete => {
    const athleteMarks = marks.filter(m => m.athleteId === athlete.id);
    const standing = standingsMap.get(athlete.id);
    return athleteToEntry(athlete, athleteMarks, standing, isVertical);
  });

  entries.sort((a, b) => {
    const aPlace = a.finalPlace ?? 999;
    const bPlace = b.finalPlace ?? 999;
    return aPlace - bPlace;
  });

  return entries;
}

/**
 * Get formatted best mark display string
 */
export function formatBestMark(
  standing: HorizontalStanding | VerticalStanding | undefined,
  isVertical: boolean
): string {
  if (!standing) return '--';
  
  if (isVertical) {
    const vs = standing as VerticalStanding;
    return vs.highestClearedDisplay || '--';
  } else {
    const hs = standing as HorizontalStanding;
    return hs.bestMarkDisplay || '--';
  }
}
