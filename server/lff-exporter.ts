import { FieldEventSessionWithDetails, FieldEventAthlete, FieldEventMark, FieldHeight } from "@shared/schema";
import { calculateHorizontalStandings, calculateVerticalStandings, HorizontalStanding, VerticalStanding } from "./field-standings";
import * as fs from "fs/promises";
import * as path from "path";

interface LFFExportOptions {
  outputDir: string;
  measurementSystem: "Metric" | "English";
}

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
  if (wind === null || wind === undefined) return "-0.0";
  if (wind === 0) return "-0.0";
  const sign = wind >= 0 ? "" : "-";
  return `${sign}${Math.abs(wind).toFixed(1)}`;
}

type AthleteWithDetails = FieldEventAthlete & { entry?: any; athlete?: any };

export function generateHorizontalLFF(
  session: FieldEventSessionWithDetails,
  athletes: AthleteWithDetails[],
  marks: FieldEventMark[],
  standings: HorizontalStanding[],
  options: LFFExportOptions
): string {
  const lines: string[] = [];
  
  const eventNumber = session.eventId || "1";
  const roundNumber = 1;
  const flightNumber = 1;
  const eventName = session.event?.name || "Field Event";
  
  lines.push(`${eventNumber},${roundNumber},${flightNumber},${eventName},${options.measurementSystem}`);
  
  for (const standing of standings) {
    const athlete = athletes.find(a => a.id === standing.athleteId);
    if (!athlete) continue;
    
    const athleteMarks = marks
      .filter(m => m.athleteId === standing.athleteId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
    
    const place = standing.place || "";
    const bibNumber = athlete.athlete?.bibNumber || athlete.entry?.athleteBibNumber || athlete.evtBibNumber || "";
    const competePosition = athlete.orderInFlight || "";
    const eventPlace = standing.place || "";
    const lastName = athlete.athlete?.lastName || athlete.evtLastName || "";
    const firstName = athlete.athlete?.firstName || athlete.evtFirstName || "";
    const affiliation = athlete.athlete?.school || athlete.athlete?.team || athlete.evtTeam || "";
    
    const attemptParts: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const mark = athleteMarks.find(m => m.attemptNumber === i);
      if (mark) {
        if (mark.markType === 'foul') {
          attemptParts.push("F");
          attemptParts.push(formatWind(mark.wind));
        } else if (mark.markType === 'pass') {
          attemptParts.push("PASS");
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
      bibNumber,
      competePosition,
      eventPlace,
      lastName,
      firstName,
      `"${affiliation}"`,
      ...attemptParts
    ].join(",");
    
    lines.push(line);
  }
  
  return lines.join("\r\n") + "\r\n";
}

export function generateVerticalLFF(
  session: FieldEventSessionWithDetails,
  athletes: AthleteWithDetails[],
  marks: FieldEventMark[],
  heights: FieldHeight[],
  standings: VerticalStanding[],
  options: LFFExportOptions
): string {
  const lines: string[] = [];
  
  const eventNumber = session.eventId || "1";
  const roundNumber = 1;
  const flightNumber = 1;
  const eventName = session.event?.name || "Field Event";
  
  const sortedHeights = [...heights].sort((a, b) => a.heightMeters - b.heightMeters);
  const heightValues = sortedHeights.map(h => formatMark(h.heightMeters, options.measurementSystem));
  
  const headerParts = [
    eventNumber,
    roundNumber,
    flightNumber,
    eventName,
    options.measurementSystem,
    "SH",
    ...heightValues,
    "EH"
  ];
  lines.push(headerParts.join(","));
  
  for (const standing of standings) {
    const athlete = athletes.find(a => a.id === standing.athleteId);
    if (!athlete) continue;
    
    const athleteMarks = marks.filter(m => m.athleteId === standing.athleteId);
    
    const place = standing.place || "";
    const bibNumber = athlete.athlete?.bibNumber || athlete.entry?.athleteBibNumber || athlete.evtBibNumber || "";
    const competePosition = athlete.orderInFlight || "";
    const eventPlace = standing.place || "";
    const lastName = athlete.athlete?.lastName || athlete.evtLastName || "";
    const firstName = athlete.athlete?.firstName || athlete.evtFirstName || "";
    const affiliation = athlete.athlete?.school || athlete.athlete?.team || athlete.evtTeam || "";
    
    const attemptParts: string[] = [];
    for (const height of sortedHeights) {
      const heightMarks = athleteMarks
        .filter(m => m.heightIndex === height.heightIndex)
        .sort((a, b) => (a.attemptAtHeight || 0) - (b.attemptAtHeight || 0));
      
      if (heightMarks.length === 0) {
        attemptParts.push("");
        continue;
      }
      
      let result = "";
      for (const mark of heightMarks) {
        if (mark.markType === 'pass') {
          result += "P";
        } else if (mark.markType === 'missed' || mark.markType === 'foul') {
          result += "X";
        } else if (mark.markType === 'cleared' || mark.markType === 'mark') {
          result += "O";
        }
      }
      
      attemptParts.push(result);
    }
    
    const line = [
      place,
      bibNumber,
      competePosition,
      eventPlace,
      lastName,
      firstName,
      `"${affiliation}"`,
      ...attemptParts
    ].join(",");
    
    lines.push(line);
  }
  
  return lines.join("\r\n") + "\r\n";
}

export async function exportSessionToLFF(
  session: FieldEventSessionWithDetails,
  options: LFFExportOptions
): Promise<string> {
  await fs.mkdir(options.outputDir, { recursive: true });
  
  const athletes = session.athletes || [];
  const marks = session.marks || [];
  const heights = session.heights || [];
  
  const eventType = session.event?.eventType || 'horizontal';
  const isVertical = eventType === 'high_jump' || eventType === 'pole_vault' || 
                     eventType.includes('high') || eventType.includes('pole');
  
  let content: string;
  if (isVertical) {
    const standings = calculateVerticalStandings(athletes, marks, heights);
    content = generateVerticalLFF(session, athletes, marks, heights, standings, options);
  } else {
    const standings = calculateHorizontalStandings(athletes, marks);
    content = generateHorizontalLFF(session, athletes, marks, standings, options);
  }
  
  // Use evtEventNumber for EVT-imported sessions, fall back to eventId or session id
  const eventNum = session.evtEventNumber || session.eventId || session.id;
  const filename = `${eventNum}-1-1.lff`;
  const filePath = path.join(options.outputDir, filename);
  
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`[LFF Export] Wrote ${filePath}`);
  
  return filePath;
}

export function generateLFFContent(
  session: FieldEventSessionWithDetails,
  measurementSystem: "Metric" | "English" = "Metric"
): string {
  const athletes = session.athletes || [];
  const marks = session.marks || [];
  const heights = session.heights || [];
  
  const eventType = session.event?.eventType || 'horizontal';
  const isVertical = eventType === 'high_jump' || eventType === 'pole_vault' || 
                     eventType.includes('high') || eventType.includes('pole');
  
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
