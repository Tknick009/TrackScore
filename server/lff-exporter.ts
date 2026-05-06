import { FieldEventSessionWithDetails, FieldEventAthlete, FieldEventMark, FieldHeight } from "@shared/schema";
import { calculateHorizontalStandings, calculateVerticalStandings, HorizontalStanding, VerticalStanding } from "./field-standings";
import * as fs from "fs/promises";
import * as path from "path";

interface LFFExportOptions {
  outputDir: string;
  measurementSystem: "Metric" | "English";
}

type AthleteWithDetails = FieldEventAthlete & { entry?: any; athlete?: any };

// ==================== FORMATTING ====================

function metersToEnglish(meters: number): string {
  const totalInches = meters / 0.0254;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const formattedInches = inches.toFixed(2).replace(/\.?0+$/, '');
  return `${feet}-${formattedInches.padStart(2, '0')}`;
}

function formatMark(meters: number | null, system: "Metric" | "English"): string {
  if (meters === null) return "";
  if (system === "English") {
    return metersToEnglish(meters);
  }
  return meters.toFixed(2);
}

function formatWind(wind: number | null | undefined): string {
  if (wind === null || wind === undefined) return "";
  const sign = wind >= 0 ? "+" : "-";
  return `${sign}${Math.abs(wind).toFixed(1)}`;
}

function getAthleteInfo(athlete: AthleteWithDetails) {
  return {
    bib: athlete.athlete?.bibNumber || athlete.entry?.athleteBibNumber || athlete.evtBibNumber || "",
    lastName: athlete.athlete?.lastName || athlete.evtLastName || "",
    firstName: athlete.athlete?.firstName || athlete.evtFirstName || "",
    affiliation: athlete.athlete?.school || athlete.athlete?.team || athlete.evtTeam || "",
    flightNumber: athlete.flightNumber || 1,
    orderInFlight: athlete.orderInFlight || 0,
  };
}

function padEventNumber(eventNum: number | string): string {
  const num = String(eventNum);
  return num.padStart(3, '0');
}

// ==================== HORIZONTAL LFF (per-flight) ====================

function generateHorizontalFlightLFF(
  session: FieldEventSessionWithDetails,
  flightAthletes: AthleteWithDetails[],
  allMarks: FieldEventMark[],
  flightNumber: number,
  overallStandings: HorizontalStanding[],
  options: LFFExportOptions
): string {
  const lines: string[] = [];

  const eventNumber = session.evtEventNumber || session.eventId || session.id || "1";
  const eventName = session.evtEventName || session.event?.name || "Field Event";
  const measurementSystem = options.measurementSystem.toLowerCase();

  // Header: eventNum,round,flight,eventName,measurementSystem, (trailing comma)
  lines.push(`${eventNumber},1,${flightNumber},${eventName},${measurementSystem},`);

  // Calculate standings within this flight only
  const flightAthleteIds = new Set(flightAthletes.map(a => a.id));
  const flightMarks = allMarks.filter(m => flightAthleteIds.has(m.athleteId));
  const flightStandings = calculateHorizontalStandings(flightAthletes, flightMarks);

  // Compute local competePosition within this flight (1-based)
  const flightOrders = flightAthletes.map(a => (a.orderInFlight || 0));
  const minOrder = flightOrders.length > 0 ? Math.min(...flightOrders) : 0;

  for (const standing of flightStandings) {
    const athlete = flightAthletes.find(a => a.id === standing.athleteId);
    if (!athlete) continue;

    const info = getAthleteInfo(athlete);

    // CompetePosition = local position within this flight (1-based)
    const localCompetePos = (info.orderInFlight - minOrder) + 1;

    // Get all marks for this athlete (including finals), sorted by attempt number
    const athleteMarks = allMarks
      .filter(m => m.athleteId === standing.athleteId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);

    if (athleteMarks.length === 0) continue;

    // Determine if athlete has any valid marks (non-foul)
    const hasValidMark = standing.bestMark !== null && standing.bestMark > 0;

    // Check if this athlete is a finalist (has more marks than prelim attempts)
    const isFinalist = athlete.isFinalist === true;

    // Within-flight place from flight standings
    const withinFlightPlace = hasValidMark ? (standing.place || "") : "";

    // Overall event place from the full standings
    const overallStanding = overallStandings.find(s => s.athleteId === standing.athleteId);
    const overallPlace = (hasValidMark && overallStanding) ? (overallStanding.place || "") : "";

    // Column 1 (place): finalists get overall event place, non-finalists get within-flight place
    // Column 4 (eventPlace): same as column 1 (matches FieldLynx behavior)
    const place = isFinalist ? overallPlace : withinFlightPlace;
    const eventPlace = place;

    // Build attempt parts - only include attempts that exist
    const attemptParts: string[] = [];
    const maxAttempt = Math.max(...athleteMarks.map(m => m.attemptNumber));

    for (let i = 1; i <= maxAttempt; i++) {
      const mark = athleteMarks.find(m => m.attemptNumber === i);
      if (mark) {
        if (mark.markType === 'foul') {
          attemptParts.push("F");
          attemptParts.push(formatWind(mark.wind));
        } else if (mark.markType === 'pass') {
          attemptParts.push("P");
          attemptParts.push(formatWind(mark.wind));
        } else if (mark.markType === 'scratch') {
          attemptParts.push("DNS");
          attemptParts.push("");
        } else {
          attemptParts.push(formatMark(mark.measurement, options.measurementSystem));
          attemptParts.push(formatWind(mark.wind));
        }
      } else {
        attemptParts.push("");
        attemptParts.push("");
      }
    }

    const line = [
      place,
      info.bib,
      localCompetePos,
      eventPlace,
      info.lastName,
      info.firstName,
      `"${info.affiliation}"`,
      ...attemptParts
    ].join(",");

    lines.push(line);
  }

  return lines.join("\r\n") + "\r\n";
}

// ==================== VERTICAL LFF (per-flight) ====================

function generateVerticalFlightLFF(
  session: FieldEventSessionWithDetails,
  flightAthletes: AthleteWithDetails[],
  allMarks: FieldEventMark[],
  heights: FieldHeight[],
  flightNumber: number,
  overallStandings: VerticalStanding[],
  options: LFFExportOptions
): string {
  const lines: string[] = [];

  const eventNumber = session.evtEventNumber || session.eventId || session.id || "1";
  const eventName = session.evtEventName || session.event?.name || "Field Event";
  const measurementSystem = options.measurementSystem.toLowerCase();

  const sortedHeights = [...heights].sort((a, b) => a.heightMeters - b.heightMeters);
  const heightValues = sortedHeights.map(h => formatMark(h.heightMeters, options.measurementSystem));

  // Header with height progression
  const headerParts = [
    eventNumber, 1, flightNumber, eventName, measurementSystem,
    "SH", ...heightValues, "EH",
  ];
  lines.push(headerParts.join(","));

  // Calculate standings within this flight
  const flightAthleteIds = new Set(flightAthletes.map(a => a.id));
  const flightMarks = allMarks.filter(m => flightAthleteIds.has(m.athleteId));
  const flightStandings = calculateVerticalStandings(flightAthletes, flightMarks, heights);

  // Compute local competePosition within this flight (1-based)
  const flightOrders = flightAthletes.map(a => (a.orderInFlight || 0));
  const minOrder = flightOrders.length > 0 ? Math.min(...flightOrders) : 0;

  for (const standing of flightStandings) {
    const athlete = flightAthletes.find(a => a.id === standing.athleteId);
    if (!athlete) continue;

    const info = getAthleteInfo(athlete);
    const localCompetePos = (info.orderInFlight - minOrder) + 1;
    const athleteMarks = allMarks.filter(m => m.athleteId === standing.athleteId);

    if (athleteMarks.length === 0) continue;

    const hasCleared = standing.highestCleared !== null && standing.highestCleared !== undefined;
    const isFinalist = athlete.isFinalist === true;

    const withinFlightPlace = hasCleared ? (standing.place || "") : "";
    const overallStanding = overallStandings.find(s => s.athleteId === standing.athleteId);
    const overallPlace = (hasCleared && overallStanding) ? (overallStanding.place || "") : "";

    const place = isFinalist ? overallPlace : withinFlightPlace;
    const eventPlace = place;

    // Find the last height index where athlete has marks
    const athleteHeightIndices = athleteMarks.map(m => m.heightIndex ?? -1).filter(h => h >= 0);
    const lastHeightIndex = athleteHeightIndices.length > 0 ? Math.max(...athleteHeightIndices) : -1;

    const attemptParts: string[] = [];
    for (const height of sortedHeights) {
      const heightIndex = height.heightIndex;

      if (lastHeightIndex >= 0 && heightIndex > lastHeightIndex) break;

      const heightMarks = athleteMarks
        .filter(m => m.heightIndex === heightIndex)
        .sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));

      if (heightMarks.length === 0) {
        attemptParts.push("PPP");
        continue;
      }

      let result = "";
      for (const mark of heightMarks) {
        if (mark.markType === 'pass') result += "P";
        else if (mark.markType === 'missed' || mark.markType === 'foul') result += "X";
        else if (mark.markType === 'cleared' || mark.markType === 'mark') result += "O";
      }

      if (result && result.split('').every(c => c === 'P')) {
        result = "PPP";
      }

      attemptParts.push(result);
    }

    const line = [
      place, info.bib, localCompetePos, eventPlace,
      info.lastName, info.firstName, `"${info.affiliation}"`,
      ...attemptParts
    ].join(",");

    lines.push(line);
  }

  return lines.join("\r\n") + "\r\n";
}

// ==================== PUBLIC API ====================

/**
 * Legacy single-content generator (used by generateLFFContent for API responses).
 * Generates LFF content for all athletes regardless of flight.
 */
export function generateHorizontalLFF(
  session: FieldEventSessionWithDetails,
  athletes: AthleteWithDetails[],
  marks: FieldEventMark[],
  standings: HorizontalStanding[],
  options: LFFExportOptions
): string {
  return generateHorizontalFlightLFF(session, athletes, marks, 1, standings, options);
}

export function generateVerticalLFF(
  session: FieldEventSessionWithDetails,
  athletes: AthleteWithDetails[],
  marks: FieldEventMark[],
  heights: FieldHeight[],
  standings: VerticalStanding[],
  options: LFFExportOptions
): string {
  return generateVerticalFlightLFF(session, athletes, marks, heights, 1, standings, options);
}

/**
 * Export session to per-flight LFF files.
 * Each flight gets its own file: {eventNum}-1-{flightNum}.lff
 * Athletes are ranked within their flight, with overall event place also included.
 */
export async function exportSessionToLFF(
  session: FieldEventSessionWithDetails,
  options: LFFExportOptions
): Promise<string> {
  await fs.mkdir(options.outputDir, { recursive: true });

  const athletes = (session.athletes || []) as AthleteWithDetails[];
  const marks = session.marks || [];
  const heights = session.heights || [];

  const eventName = (session.evtEventName || session.event?.name || '').toLowerCase();
  const eventType = session.event?.eventType || '';
  const isVertical = heights.length > 0 ||
    eventType === 'high_jump' || eventType === 'pole_vault' ||
    eventName.includes('high jump') || eventName.includes('pole vault') ||
    eventName.includes('hj') || eventName.includes('pv');

  // Group athletes by flight
  const flightMap = new Map<number, AthleteWithDetails[]>();
  for (const athlete of athletes) {
    const flt = athlete.flightNumber || 1;
    const existing = flightMap.get(flt) || [];
    existing.push(athlete);
    flightMap.set(flt, existing);
  }

  // Sort flight numbers
  const flightNumbers = [...flightMap.keys()].sort((a, b) => a - b);

  // Calculate overall standings (across all flights)
  let overallHStandings: HorizontalStanding[] = [];
  let overallVStandings: VerticalStanding[] = [];
  if (isVertical) {
    overallVStandings = calculateVerticalStandings(athletes, marks, heights);
  } else {
    overallHStandings = calculateHorizontalStandings(athletes, marks);
  }

  const eventNum = session.evtEventNumber || session.eventId || session.id;
  const paddedEventNum = padEventNumber(eventNum || 1);
  const writtenFiles: string[] = [];

  for (const flightNum of flightNumbers) {
    const flightAthletes = flightMap.get(flightNum) || [];
    if (flightAthletes.length === 0) continue;

    let content: string;
    if (isVertical) {
      content = generateVerticalFlightLFF(
        session, flightAthletes, marks, heights,
        flightNum, overallVStandings, options
      );
    } else {
      content = generateHorizontalFlightLFF(
        session, flightAthletes, marks,
        flightNum, overallHStandings, options
      );
    }

    const paddedFlight = String(flightNum).padStart(2, '0');
    const filename = `${paddedEventNum}-1-${paddedFlight}.lff`;
    const filePath = path.join(options.outputDir, filename);

    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[LFF Export] Wrote ${filePath}`);
    writtenFiles.push(filePath);
  }

  return writtenFiles.join(', ');
}

/**
 * Generate LFF content string (for API preview, not file export).
 * Returns all athletes in a single content block.
 */
export function generateLFFContent(
  session: FieldEventSessionWithDetails,
  measurementSystem: "Metric" | "English" = "Metric"
): string {
  const athletes = (session.athletes || []) as AthleteWithDetails[];
  const marks = session.marks || [];
  const heights = session.heights || [];

  const evtName = (session.evtEventName || session.event?.name || '').toLowerCase();
  const eventType = session.event?.eventType || '';
  const isVertical = heights.length > 0 ||
    eventType === 'high_jump' || eventType === 'pole_vault' ||
    evtName.includes('high jump') || evtName.includes('pole vault') ||
    evtName.includes('hj') || evtName.includes('pv');

  const options: LFFExportOptions = {
    outputDir: '',
    measurementSystem
  };

  if (isVertical) {
    const standings = calculateVerticalStandings(athletes, marks, heights);
    return generateVerticalLFF(session, athletes, marks, heights, standings, options);
  } else {
    const standings = calculateHorizontalStandings(athletes, marks);
    return generateHorizontalLFF(session, athletes, marks, standings, options);
  }
}
