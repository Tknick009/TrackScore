import { storage } from './storage';
import { parseLIFFileContent, generateResultSignature, type NormalizedResult } from './parsers/lif-parser';

export async function ingestLIFResults(fileContent: string, meetId: string): Promise<{
  processed: number;
  duplicates: number;
  unmatched: number;
  errors: string[];
}> {
  const { header, results } = parseLIFFileContent(fileContent);
  
  let processed = 0;
  let duplicates = 0;
  let unmatched = 0;
  const errors: string[] = [];
  
  for (const result of results) {
    try {
      // Generate signature for deduplication
      const signature = generateResultSignature(result);
      
      // Check if we've already processed this result
      if (await storage.hasResultSignature(signature)) {
        duplicates++;
        continue; // Skip duplicate
      }
      
      // Find athlete by bib number
      const athletes = await storage.getAthletesByMeetId(meetId);
      const athlete = athletes.find(a => a.bibNumber === result.bibNumber.toString());
      
      if (!athlete) {
        unmatched++;
        errors.push(`Athlete with bib ${result.bibNumber} not found`);
        continue;
      }
      
      // Find event by event number
      const events = await storage.getEventsByMeetId(meetId);
      const event = events.find(e => e.eventNumber === result.eventNumber);
      
      if (!event) {
        unmatched++;
        errors.push(`Event ${result.eventNumber} not found`);
        continue;
      }
      
      // Find or create entry
      const eventWithEntries = await storage.getEventWithEntries(event.id);
      if (!eventWithEntries) {
        unmatched++;
        errors.push(`Event ${event.id} not found`);
        continue;
      }
      
      let entry = eventWithEntries.entries.find(e => e.athleteId === athlete.id);
      
      if (!entry) {
        // Create entry
        const newEntry = await storage.createEntry({
          eventId: event.id,
          athleteId: athlete.id,
          resultType: 'time'
        });
        
        // Update the newly created entry with results
        await storage.updateEntry(newEntry.id, {
          finalPlace: result.place || undefined,
          finalMark: result.mark || undefined,
          finalLane: result.lane || undefined
        });
      } else {
        // Update existing entry with result
        await storage.updateEntry(entry.id, {
          finalPlace: result.place || undefined,
          finalMark: result.mark || undefined,
          finalLane: result.lane || undefined
        });
      }
      
      // Mark signature as processed
      await storage.addResultSignature(signature);
      processed++;
      
    } catch (error) {
      errors.push(`Error processing result for bib ${result.bibNumber}: ${error}`);
    }
  }
  
  return { processed, duplicates, unmatched, errors };
}
