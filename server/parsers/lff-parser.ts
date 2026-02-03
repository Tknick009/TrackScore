import { DataSource } from "@shared/schema";

export interface NormalizedFieldResult {
  // Identification
  eventNumber: number;
  roundNumber: number;
  heatNumber: number;
  bibNumber: number;
  
  // Result data
  place: number | null;
  lane: number | null;
  bestMark: number | null; // Best distance/height in meters
  
  // Athlete info
  lastName: string;
  firstName: string;
  team: string | null;
  
  // Attempts (up to 6)
  attempts: Array<{
    attemptNumber: number;
    mark: number | null; // null for F, X, O, P, DNS
    isFoul: boolean;
    isPassed: boolean;
    isCleared: boolean; // For jumps: O
    isMissed: boolean;  // For jumps: X
    wind: number | null; // Only for horizontal jumps
  }>;
  
  // Status flags
  isDNS: boolean;
  
  // Metadata
  source: DataSource;
  sourceTimestamp: Date;
  rawPayload: any;
}

export interface LFFEventHeader {
  eventNumber: number;
  roundNumber: number;
  heatNumber: number;
  eventName: string;
  units: string; // "metric" or "english"
  heights: number[]; // For jumps only
}

function convertToMeters(mark: string, units: string): number | null {
  if (units === 'english') {
    // Format: "58-04.25" (feet-inches)
    const match = mark.match(/^(\d+)-(\d+(?:\.\d+)?)$/);
    if (match) {
      const feet = parseInt(match[1]);
      const inches = parseFloat(match[2]);
      return (feet * 12 + inches) * 0.0254; // Convert to meters
    }
  }
  
  // Metric or fallback to simple parseFloat
  const result = parseFloat(mark);
  return isNaN(result) ? null : result;
}

function parseAttempt(attemptStr: string, windStr: string | null, units: string): {
  mark: number | null;
  isFoul: boolean;
  isPassed: boolean;
  isCleared: boolean;
  isMissed: boolean;
  wind: number | null;
} {
  const trimmed = attemptStr.trim().toUpperCase();
  
  // Empty string
  if (trimmed === '') {
    return { mark: null, isFoul: false, isPassed: false, isCleared: false, isMissed: false, wind: null };
  }
  
  // DNS
  if (trimmed === 'DNS') {
    return { mark: null, isFoul: false, isPassed: false, isCleared: false, isMissed: false, wind: null };
  }
  
  // Check for compound attempts (e.g., "XXO", "XO", "PPP")
  // If it contains 'O', it was eventually cleared
  if (trimmed.includes('O')) {
    return { mark: null, isFoul: false, isPassed: false, isCleared: true, isMissed: false, wind: null };
  }
  
  // If it contains only 'P' characters, it was passed
  if (/^P+$/.test(trimmed)) {
    return { mark: null, isFoul: false, isPassed: true, isCleared: false, isMissed: false, wind: null };
  }
  
  // If it contains only 'X' characters, it was missed
  if (/^X+$/.test(trimmed)) {
    return { mark: null, isFoul: false, isPassed: false, isCleared: false, isMissed: true, wind: null };
  }
  
  // Foul
  if (trimmed === 'F' || trimmed === 'FOUL') {
    return { mark: null, isFoul: true, isPassed: false, isCleared: false, isMissed: false, wind: null };
  }
  
  // Numeric mark - use convertToMeters
  const mark = convertToMeters(attemptStr, units);
  const wind = windStr ? parseFloat(windStr) : null;
  
  return {
    mark,
    isFoul: false,
    isPassed: false,
    isCleared: false,
    isMissed: false,
    wind: isNaN(wind || NaN) ? null : wind,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // Last field
  return result;
}

export async function parseLFFFile(filePath: string): Promise<{
  header: LFFEventHeader;
  results: NormalizedFieldResult[];
}> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('Empty LFF file');
  }
  
  // Parse header
  const headerParts = parseCSVLine(lines[0]);
  
  // Extract heights (for jumps) - filter out "SH" and "EH" markers
  const heightsRaw = headerParts.slice(5);
  const heights: number[] = [];
  for (const h of heightsRaw) {
    const trimmed = h.trim();
    if (trimmed && trimmed !== 'SH' && trimmed !== 'EH' && !isNaN(parseFloat(trimmed))) {
      heights.push(parseFloat(trimmed));
    }
  }
  
  const header: LFFEventHeader = {
    eventNumber: parseInt(headerParts[0]),
    roundNumber: parseInt(headerParts[1]),
    heatNumber: parseInt(headerParts[2]),
    eventName: headerParts[3],
    units: headerParts[4] || 'metric',
    heights,
  };
  
  // Parse results
  const results: NormalizedFieldResult[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    
    // Skip if no bib number
    if (!parts[1] || parts[1].trim() === '') continue;
    
    // Check for DNS
    const isDNS = parts[0].trim().toUpperCase() === 'DNS';
    
    const place = (!isDNS && parts[0] && parts[0].trim() !== '') ? parseInt(parts[0]) : null;
    const bibNumber = parseInt(parts[1]);
    const lane = parts[2] && parts[2].trim() !== '' ? parseInt(parts[2]) : null;
    // parts[3] is rank - skip it
    const lastName = parts[4] || '';
    const firstName = parts[5] || '';
    const team = parts[6] || null;
    
    // Parse attempts (starting at index 7)
    // For jumps: attempts are single letters (O, X, P, XXX)
    // For throws: attempts are distance, wind, distance, wind, ...
    const attempts: Array<{
      attemptNumber: number;
      mark: number | null;
      isFoul: boolean;
      isPassed: boolean;
      isCleared: boolean;
      isMissed: boolean;
      wind: number | null;
    }> = [];
    let bestMark: number | null = null;
    
    // Determine if this is a jump or throw event by checking if heights exist
    const isJumpEvent = heights.length > 0;
    
    if (isJumpEvent) {
      // For jumps: each attempt corresponds to a height
      // Format: O, XXO, P, XXX, etc. (one per height)
      for (let attemptNum = 0; attemptNum < heights.length && attemptNum < 20; attemptNum++) {
        const attemptIdx = 7 + attemptNum;
        
        if (attemptIdx >= parts.length || !parts[attemptIdx]) break;
        
        const attempt = parseAttempt(parts[attemptIdx], null, header.units);
        
        attempts.push({
          attemptNumber: attemptNum + 1,
          ...attempt,
        });
        
        // For jumps, best mark is the highest cleared height
        if (attempt.isCleared && (bestMark === null || heights[attemptNum] > bestMark)) {
          bestMark = heights[attemptNum];
        }
      }
    } else {
      // For throws: attempts are pairs (distance, wind)
      for (let attemptNum = 0; attemptNum < 6; attemptNum++) {
        const attemptIdx = 7 + (attemptNum * 2);
        const windIdx = attemptIdx + 1;
        
        if (attemptIdx >= parts.length || !parts[attemptIdx]) break;
        
        const attempt = parseAttempt(
          parts[attemptIdx],
          parts[windIdx] || null,
          header.units
        );
        
        attempts.push({
          attemptNumber: attemptNum + 1,
          ...attempt,
        });
        
        // Track best mark (for throws, highest distance)
        if (attempt.mark !== null && (bestMark === null || attempt.mark > bestMark)) {
          bestMark = attempt.mark;
        }
      }
    }
    
    results.push({
      eventNumber: header.eventNumber,
      roundNumber: header.roundNumber,
      heatNumber: header.heatNumber,
      bibNumber,
      place,
      lane,
      bestMark,
      lastName,
      firstName,
      team,
      attempts,
      isDNS,
      source: 'lff' as DataSource,
      sourceTimestamp: new Date(), // LFF files don't have timestamps, use current time
      rawPayload: {
        line: lines[i],
        header: lines[0],
      },
    });
  }
  
  return { header, results };
}

export interface MergedFieldStandings {
  eventNumber: number;
  roundNumber: number;
  eventName: string;
  units: string;
  flights: number[];
  athletes: Array<{
    overallPlace: number;
    bibNumber: number;
    firstName: string;
    lastName: string;
    team: string | null;
    bestMark: number | null;
    bestMarkFormatted: string;
    attempts: Array<{
      attemptNumber: number;
      mark: number | null;
      isFoul: boolean;
      isPassed: boolean;
      isCleared: boolean;
      isMissed: boolean;
      wind: number | null;
    }>;
    isDNS: boolean;
    flightNumber: number;
  }>;
  totalAthletes: number;
  isVerticalEvent: boolean;
  heights?: number[];
}

function formatMark(mark: number | null, units: string, isVertical: boolean): string {
  if (mark === null) return '';
  
  if (units === 'english') {
    const totalInches = mark / 0.0254;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}-${inches.toFixed(2).replace(/\.?0+$/, '')}`;
  }
  
  if (isVertical) {
    return mark.toFixed(2);
  }
  return mark.toFixed(2);
}

export async function findLFFFilesForEvent(
  directory: string,
  eventNumber: number,
  roundNumber?: number
): Promise<string[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    const files = await fs.readdir(directory);
    
    const eventPattern = roundNumber 
      ? new RegExp(`^0*${eventNumber}-0*${roundNumber}-\\d+`, 'i')
      : new RegExp(`^0*${eventNumber}-\\d+-\\d+`, 'i');
    
    const matchingFiles = files
      .filter(f => f.toLowerCase().endsWith('.lff') && eventPattern.test(f))
      .map(f => path.join(directory, f))
      .sort();
    
    return matchingFiles;
  } catch (error) {
    console.error(`Error reading LFF directory ${directory}:`, error);
    return [];
  }
}

export async function mergeFlightsForEvent(
  directory: string,
  eventNumber: number,
  roundNumber?: number
): Promise<MergedFieldStandings | null> {
  const lffFiles = await findLFFFilesForEvent(directory, eventNumber, roundNumber);
  
  if (lffFiles.length === 0) {
    return null;
  }
  
  let eventName = '';
  let units = 'metric';
  let isVerticalEvent = false;
  let heights: number[] = [];
  const flights: number[] = [];
  const allAthletes: Array<{
    bibNumber: number;
    firstName: string;
    lastName: string;
    team: string | null;
    bestMark: number | null;
    attempts: Array<{
      attemptNumber: number;
      mark: number | null;
      isFoul: boolean;
      isPassed: boolean;
      isCleared: boolean;
      isMissed: boolean;
      wind: number | null;
    }>;
    isDNS: boolean;
    flightNumber: number;
  }> = [];
  
  for (const filePath of lffFiles) {
    try {
      const { header, results } = await parseLFFFile(filePath);
      
      if (!eventName) {
        eventName = header.eventName;
        units = header.units;
        isVerticalEvent = header.heights.length > 0;
        heights = header.heights;
      }
      
      flights.push(header.heatNumber);
      
      for (const result of results) {
        allAthletes.push({
          bibNumber: result.bibNumber,
          firstName: result.firstName,
          lastName: result.lastName,
          team: result.team,
          bestMark: result.bestMark,
          attempts: result.attempts,
          isDNS: result.isDNS,
          flightNumber: header.heatNumber,
        });
      }
    } catch (error) {
      console.error(`Error parsing LFF file ${filePath}:`, error);
    }
  }
  
  if (allAthletes.length === 0) {
    return null;
  }
  
  const dnsAthletes = allAthletes.filter(a => a.isDNS);
  const competingAthletes = allAthletes.filter(a => !a.isDNS);
  
  competingAthletes.sort((a, b) => {
    if (a.bestMark === null && b.bestMark === null) return 0;
    if (a.bestMark === null) return 1;
    if (b.bestMark === null) return -1;
    return b.bestMark - a.bestMark;
  });
  
  const rankedAthletes = competingAthletes.map((athlete, index) => ({
    ...athlete,
    overallPlace: index + 1,
    bestMarkFormatted: formatMark(athlete.bestMark, units, isVerticalEvent),
  }));
  
  const dnsRanked = dnsAthletes.map(athlete => ({
    ...athlete,
    overallPlace: 0,
    bestMarkFormatted: 'DNS',
  }));
  
  return {
    eventNumber,
    roundNumber: roundNumber || 1,
    eventName,
    units,
    flights: flights.sort((a, b) => a - b),
    athletes: [...rankedAthletes, ...dnsRanked],
    totalAthletes: allAthletes.length,
    isVerticalEvent,
    heights: isVerticalEvent ? heights : undefined,
  };
}
