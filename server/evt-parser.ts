import * as fs from 'fs';
import * as path from 'path';

export interface EVTEvent {
  eventNumber: number;
  round: number;
  heat: number;
  eventName: string;
  distance: number;
  athletes: EVTAthlete[];
}

export interface EVTAthlete {
  bibNumber: string;
  order: number;
  lastName: string;
  firstName: string;
  team: string;
}

export interface EVTEventSummary {
  eventNumber: number;
  eventName: string;
  athleteCount: number;
  round: number;
  heat: number;
}

export function parseEVTFile(filePath: string): EVTEvent[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseEVTContent(content);
}

export function parseEVTContent(content: string): EVTEvent[] {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const events: EVTEvent[] = [];
  let currentEvent: EVTEvent | null = null;

  for (const line of lines) {
    const parts = line.split(',');
    
    if (parts[0] && parts[0] !== '') {
      if (currentEvent) {
        events.push(currentEvent);
      }
      
      const eventNumber = parseInt(parts[0]) || 0;
      const round = parseInt(parts[1]) || 1;
      const heat = parseInt(parts[2]) || 1;
      const eventName = parts[3] || '';
      const distance = parseInt(parts[9]) || 0;
      
      currentEvent = {
        eventNumber,
        round,
        heat,
        eventName,
        distance,
        athletes: []
      };
    } else if (currentEvent && parts[0] === '') {
      const bibNumber = parts[1] || '';
      const order = parseInt(parts[2]) || 0;
      const lastName = parts[3] || '';
      const firstName = parts[4] || '';
      const team = parts[5] || '';
      
      if (bibNumber || lastName) {
        currentEvent.athletes.push({
          bibNumber,
          order,
          lastName,
          firstName,
          team
        });
      }
    }
  }
  
  if (currentEvent) {
    events.push(currentEvent);
  }
  
  return events;
}

export function findEventInEVT(events: EVTEvent[], eventName: string): EVTEvent | null {
  const normalizedSearch = eventName.toLowerCase().trim();
  
  for (const event of events) {
    const normalizedEvent = event.eventName.toLowerCase().trim();
    if (normalizedEvent.includes(normalizedSearch) || normalizedSearch.includes(normalizedEvent)) {
      return event;
    }
  }
  
  return null;
}

export function getAllAthletesForEvent(events: EVTEvent[], eventNumber: number): EVTAthlete[] {
  const allAthletes: EVTAthlete[] = [];
  const seenBibs = new Set<string>();
  
  for (const event of events) {
    if (event.eventNumber === eventNumber) {
      for (const athlete of event.athletes) {
        if (athlete.bibNumber && !seenBibs.has(athlete.bibNumber)) {
          seenBibs.add(athlete.bibNumber);
          allAthletes.push(athlete);
        } else if (!athlete.bibNumber) {
          allAthletes.push(athlete);
        }
      }
    }
  }
  
  return allAthletes;
}

export function parseEVTDirectory(dirPath: string): { events: EVTEvent[]; summaries: EVTEventSummary[] } {
  const allEvents: EVTEvent[] = [];
  const summaryMap = new Map<string, EVTEventSummary>();
  
  if (!fs.existsSync(dirPath)) {
    return { events: [], summaries: [] };
  }
  
  const files = fs.readdirSync(dirPath);
  const evtFiles = files.filter(f => f.toLowerCase().endsWith('.evt'));
  
  for (const file of evtFiles) {
    const filePath = path.join(dirPath, file);
    try {
      const events = parseEVTFile(filePath);
      allEvents.push(...events);
      
      for (const evt of events) {
        const key = `${evt.eventNumber}-${evt.round}-${evt.heat}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            eventNumber: evt.eventNumber,
            eventName: evt.eventName,
            athleteCount: evt.athletes.length,
            round: evt.round,
            heat: evt.heat,
          });
        } else {
          const existing = summaryMap.get(key)!;
          existing.athleteCount += evt.athletes.length;
        }
      }
    } catch (err) {
      console.error(`[EVT Parser] Error parsing ${file}:`, err);
    }
  }
  
  const summaries = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.eventNumber !== b.eventNumber) return a.eventNumber - b.eventNumber;
    if (a.round !== b.round) return a.round - b.round;
    return a.heat - b.heat;
  });
  
  return { events: allEvents, summaries };
}

export function getAthletesFromDirectory(dirPath: string, eventNumber: number, round?: number, heat?: number): EVTAthlete[] {
  const { events } = parseEVTDirectory(dirPath);
  const allAthletes: EVTAthlete[] = [];
  const seenBibs = new Set<string>();
  
  for (const event of events) {
    if (event.eventNumber !== eventNumber) continue;
    if (round !== undefined && event.round !== round) continue;
    if (heat !== undefined && event.heat !== heat) continue;
    
    for (const athlete of event.athletes) {
      if (athlete.bibNumber && !seenBibs.has(athlete.bibNumber)) {
        seenBibs.add(athlete.bibNumber);
        allAthletes.push(athlete);
      } else if (!athlete.bibNumber) {
        allAthletes.push(athlete);
      }
    }
  }
  
  return allAthletes;
}
