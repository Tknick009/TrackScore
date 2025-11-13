import { DataSource } from "@shared/schema";

export interface NormalizedResult {
  // Identification
  eventNumber: number;
  roundNumber: number;
  heatNumber: number;
  bibNumber: number;
  
  // Result data
  place: number | null;
  lane: number | null;
  mark: number | null; // Time in seconds
  wind: number | null;
  
  // Athlete info (for matching)
  lastName: string;
  firstName: string;
  team: string | null;
  
  // Splits (parsed from splits string)
  splits: Array<{
    splitNumber: number;
    splitTime: number;
    cumulativeTime: number;
  }>;
  
  // Status flags
  isDNS: boolean;
  isDNF: boolean;
  isDQ: boolean;
  
  // Metadata
  source: DataSource;
  sourceTimestamp: Date;
  rawPayload: any;
}

export interface LIFEventHeader {
  eventNumber: number;
  roundNumber: number;
  heatNumber: number;
  eventName: string;
  wind: number | null;
  distance: number | null;
  timestamp: Date;
}

function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr || timeStr.trim() === '' || timeStr.trim().toUpperCase() === 'NT') {
    return null;
  }
  
  // Handle formats: "45.543", "2:10.952", "11:16.323"
  const parts = timeStr.split(':');
  let result: number;
  
  if (parts.length === 1) {
    result = parseFloat(parts[0]);
  } else if (parts.length === 2) {
    result = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  } else if (parts.length === 3) {
    result = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  } else {
    return null;
  }
  
  return isNaN(result) ? null : result;
}

function parseSplits(splitsString: string): Array<{ splitNumber: number, splitTime: number, cumulativeTime: number }> {
  if (!splitsString || splitsString.trim() === '') return [];
  
  // Format: "45.543 (45.543),2:10.952 (1:25.410),3:39.163 (1:28.211),..."
  // Extract cumulative times (the times before the parentheses)
  const cumulativeMatches = splitsString.match(/(\d+:)?(\d+\.\d+)\s*\(/g);
  if (!cumulativeMatches) return [];
  
  const result: Array<{ splitNumber: number, cumulativeTime: number, splitTime: number }> = [];
  cumulativeMatches.forEach((match, index) => {
    const timeStr = match.replace(/\s*\($/, '').trim();
    const cumulative = parseTimeToSeconds(timeStr);
    
    // Skip invalid splits
    if (cumulative === null) return;
    
    const previous = index > 0 ? result[index - 1].cumulativeTime : 0;
    const splitTime = cumulative - previous;
    
    result.push({
      splitNumber: index + 1,
      cumulativeTime: cumulative,
      splitTime: splitTime,
    });
  });
  
  return result;
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
  
  result.push(current);
  return result;
}

export async function parseLIFFile(filePath: string): Promise<{
  header: LIFEventHeader;
  results: NormalizedResult[];
}> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('Empty LIF file');
  }
  
  // Parse header (first line)
  const headerParts = parseCSVLine(lines[0]);
  const header: LIFEventHeader = {
    eventNumber: parseInt(headerParts[0]),
    roundNumber: parseInt(headerParts[1]),
    heatNumber: parseInt(headerParts[2]),
    eventName: headerParts[3],
    wind: headerParts[4] ? parseFloat(headerParts[4]) : null,
    distance: headerParts[7] ? parseInt(headerParts[7]) : null,
    timestamp: new Date(headerParts[8]),
  };
  
  // Parse result lines
  const results: NormalizedResult[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    
    // Check for status codes
    const placeStr = parts[0];
    const isDNS = placeStr === 'DNS';
    const isDNF = placeStr === 'DNF';
    const isDQ = placeStr === 'DQ';
    
    const place = (!isDNS && !isDNF && !isDQ && parts[0]) ? parseInt(parts[0]) : null;
    const bibNumber = parseInt(parts[1]);
    const lane = parts[2] ? parseInt(parts[2]) : null;
    const lastName = parts[3] || '';
    const firstName = parts[4] || '';
    const team = parts[5] || null;
    const resultTime = parseTimeToSeconds(parts[6]); // Now returns null for invalid times
    const splitsString = parts[10] || '';
    
    // Parse timestamp with fallback to current time
    let timestamp: Date;
    const timestampStr = parts[11];
    if (timestampStr) {
      timestamp = new Date(timestampStr);
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date(); // Fallback to current time
      }
    } else {
      timestamp = new Date();
    }
    
    results.push({
      eventNumber: header.eventNumber,
      roundNumber: header.roundNumber,
      heatNumber: header.heatNumber,
      bibNumber,
      place,
      lane,
      mark: resultTime,
      wind: header.wind,
      lastName,
      firstName,
      team,
      splits: parseSplits(splitsString),
      isDNS,
      isDNF,
      isDQ,
      source: 'lif' as DataSource,
      sourceTimestamp: timestamp,
      rawPayload: {
        line: lines[i],
        header: lines[0],
      },
    });
  }
  
  return { header, results };
}
