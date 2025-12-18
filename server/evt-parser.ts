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
