import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { FSWatcher } from 'chokidar';
import { parseEVTFile, getAllAthletesForEvent, EVTAthlete } from './evt-parser';
import { storage } from './storage';

interface EVTWatcherState {
  sessionId: number;
  watcher: FSWatcher | null;
  lastHash: string | null;
}

const watchers = new Map<number, EVTWatcherState>();

function computeFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export async function syncAthletesFromEVT(sessionId: number): Promise<{ added: number; updated: number; errors: string[] }> {
  const result = { added: 0, updated: 0, errors: [] as string[] };
  
  try {
    const session = await storage.getFieldEventSession(sessionId);
    if (!session) {
      result.errors.push('Session not found');
      return result;
    }
    
    if (!session.evtFilePath) {
      result.errors.push('No EVT file path configured');
      return result;
    }
    
    if (!fs.existsSync(session.evtFilePath)) {
      result.errors.push(`EVT file not found: ${session.evtFilePath}`);
      return result;
    }
    
    const events = parseEVTFile(session.evtFilePath);
    if (events.length === 0) {
      result.errors.push('No events found in EVT file');
      return result;
    }
    
    let athletes: EVTAthlete[] = [];
    
    if (session.evtEventNumber) {
      athletes = getAllAthletesForEvent(events, session.evtEventNumber);
    } else {
      for (const evt of events) {
        athletes.push(...evt.athletes);
      }
    }
    
    if (athletes.length === 0) {
      result.errors.push('No athletes found for the specified event');
      return result;
    }
    
    const existingAthletes = await storage.getFieldEventAthletes(sessionId);
    const existingByBib = new Map<string, any>();
    for (const a of existingAthletes) {
      const bib = a.evtBibNumber || '';
      if (bib) existingByBib.set(bib, a);
    }
    
    let orderInFlight = existingAthletes.length + 1;
    
    for (const evtAthlete of athletes) {
      try {
        if (!evtAthlete.bibNumber) continue;
        
        const existing = existingByBib.get(evtAthlete.bibNumber);
        
        if (!existing) {
          await storage.createFieldEventAthlete({
            sessionId,
            flightNumber: 1,
            orderInFlight: orderInFlight++,
            checkInStatus: "pending",
            competitionStatus: "waiting",
            evtBibNumber: evtAthlete.bibNumber,
            evtFirstName: evtAthlete.firstName,
            evtLastName: evtAthlete.lastName,
            evtTeam: evtAthlete.team
          });
          result.added++;
        }
      } catch (err: any) {
        result.errors.push(`Error adding athlete ${evtAthlete.bibNumber}: ${err.message}`);
      }
    }
    
    console.log(`[EVT Sync] Session ${sessionId}: added ${result.added} athletes`);
    return result;
    
  } catch (error: any) {
    result.errors.push(error.message);
    return result;
  }
}

export function startEVTWatcher(sessionId: number, evtFilePath: string): void {
  stopEVTWatcher(sessionId);
  
  if (!evtFilePath || !fs.existsSync(evtFilePath)) {
    console.log(`[EVT Watcher] File not found: ${evtFilePath}`);
    return;
  }
  
  const dir = path.dirname(evtFilePath);
  const filename = path.basename(evtFilePath);
  
  const watcher = chokidar.watch(evtFilePath, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });
  
  const state: EVTWatcherState = {
    sessionId,
    watcher,
    lastHash: null,
  };
  
  watcher.on('add', async (filePath) => {
    console.log(`[EVT Watcher] File detected: ${filePath}`);
    await handleEVTChange(state, filePath);
  });
  
  watcher.on('change', async (filePath) => {
    console.log(`[EVT Watcher] File changed: ${filePath}`);
    await handleEVTChange(state, filePath);
  });
  
  watcher.on('error', (error) => {
    console.error(`[EVT Watcher] Error for session ${sessionId}:`, error);
  });
  
  watchers.set(sessionId, state);
  console.log(`[EVT Watcher] Started watching: ${evtFilePath} for session ${sessionId}`);
}

async function handleEVTChange(state: EVTWatcherState, filePath: string): Promise<void> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = computeFileHash(content);
    
    if (hash === state.lastHash) {
      return;
    }
    
    state.lastHash = hash;
    
    const result = await syncAthletesFromEVT(state.sessionId);
    if (result.errors.length > 0) {
      console.error(`[EVT Watcher] Sync errors:`, result.errors);
    }
  } catch (error) {
    console.error(`[EVT Watcher] Error processing file change:`, error);
  }
}

export function stopEVTWatcher(sessionId: number): void {
  const state = watchers.get(sessionId);
  if (state?.watcher) {
    state.watcher.close();
    console.log(`[EVT Watcher] Stopped watching for session ${sessionId}`);
  }
  watchers.delete(sessionId);
}

export function stopAllEVTWatchers(): void {
  watchers.forEach((state, sessionId) => {
    if (state.watcher) {
      state.watcher.close();
    }
  });
  watchers.clear();
  console.log('[EVT Watcher] All watchers stopped');
}

export async function initEVTWatchers(): Promise<void> {
  try {
    const allSessions = await storage.getAllFieldEventSessions();
    for (const session of allSessions) {
      if (session.evtFilePath && session.status !== 'completed') {
        startEVTWatcher(session.id, session.evtFilePath);
      }
    }
    console.log(`[EVT Watcher] Initialized ${watchers.size} watchers`);
  } catch (error) {
    console.error('[EVT Watcher] Error initializing watchers:', error);
  }
}
