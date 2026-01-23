import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { FSWatcher } from 'chokidar';
import { parseEVTFile, getHeatCountsFromEvents, EVTEvent } from './evt-parser';

interface TrackHeatWatcherState {
  meetId: string;
  watcher: FSWatcher | null;
  lastHash: string | null;
  evtFilePath: string;
}

export interface HeatCountData {
  eventNumber: number;
  round: number;
  totalHeats: number;
}

const watchers = new Map<string, TrackHeatWatcherState>();
const heatCountCache = new Map<string, Map<string, number>>();

let broadcastCallback: ((meetId: string, data: HeatCountData[]) => void) | null = null;

export function setHeatCountBroadcastCallback(callback: (meetId: string, data: HeatCountData[]) => void): void {
  broadcastCallback = callback;
}

function computeFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function makeKey(eventNumber: number, round: number): string {
  return `${eventNumber}-${round}`;
}

export function getTotalHeatsFromCache(meetId: string, eventNumber: number, round: number = 1): number | null {
  const meetCache = heatCountCache.get(meetId);
  if (!meetCache) return null;
  
  const key = makeKey(eventNumber, round);
  return meetCache.get(key) ?? null;
}

// Search ALL watchers for heat count (useful when no database event match)
export function getTotalHeatsFromAnyWatcher(eventNumber: number, round: number = 1): number | null {
  const key = makeKey(eventNumber, round);
  
  // Search through all meet caches
  for (const [meetId, meetCache] of heatCountCache.entries()) {
    const heats = meetCache.get(key);
    if (heats !== undefined) {
      console.log(`[Track Heat Watcher] Found heat count for event ${eventNumber} round ${round} in meet ${meetId}: ${heats}`);
      return heats;
    }
  }
  
  return null;
}

export function getAllHeatCountsForMeet(meetId: string): HeatCountData[] {
  const meetCache = heatCountCache.get(meetId);
  if (!meetCache) return [];
  
  const results: HeatCountData[] = [];
  meetCache.forEach((totalHeats, key) => {
    const [eventNum, roundNum] = key.split('-').map(Number);
    results.push({ eventNumber: eventNum, round: roundNum, totalHeats });
  });
  
  return results.sort((a, b) => a.eventNumber - b.eventNumber || a.round - b.round);
}

export function startTrackHeatWatcher(meetId: string, evtFilePath: string): { success: boolean; error?: string } {
  stopTrackHeatWatcher(meetId);
  
  if (!evtFilePath) {
    return { success: false, error: 'No EVT file path provided' };
  }
  
  if (!fs.existsSync(evtFilePath)) {
    return { success: false, error: `EVT file not found: ${evtFilePath}` };
  }
  
  const watcher = chokidar.watch(evtFilePath, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });
  
  const state: TrackHeatWatcherState = {
    meetId,
    watcher,
    lastHash: null,
    evtFilePath,
  };
  
  watcher.on('add', async (filePath) => {
    console.log(`[Track Heat Watcher] File detected: ${filePath}`);
    await handleEVTChange(state, filePath);
  });
  
  watcher.on('change', async (filePath) => {
    console.log(`[Track Heat Watcher] File changed: ${filePath}`);
    await handleEVTChange(state, filePath);
  });
  
  watcher.on('error', (error) => {
    console.error(`[Track Heat Watcher] Error for meet ${meetId}:`, error);
  });
  
  watchers.set(meetId, state);
  console.log(`[Track Heat Watcher] Started watching: ${evtFilePath} for meet ${meetId}`);
  
  return { success: true };
}

async function handleEVTChange(state: TrackHeatWatcherState, filePath: string): Promise<void> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = computeFileHash(content);
    
    if (hash === state.lastHash) {
      return;
    }
    
    state.lastHash = hash;
    
    const events = parseEVTFile(filePath);
    const heatCounts = getHeatCountsFromEvents(events);
    
    if (!heatCountCache.has(state.meetId)) {
      heatCountCache.set(state.meetId, new Map());
    }
    const meetCache = heatCountCache.get(state.meetId)!;
    
    const updates: HeatCountData[] = [];
    
    heatCounts.forEach((roundMap, eventNumber) => {
      roundMap.forEach((totalHeats, round) => {
        const key = makeKey(eventNumber, round);
        const oldValue = meetCache.get(key);
        
        if (oldValue !== totalHeats) {
          meetCache.set(key, totalHeats);
          updates.push({ eventNumber, round, totalHeats });
          console.log(`[Track Heat Watcher] Event ${eventNumber} Round ${round}: ${totalHeats} heats`);
        }
      });
    });
    
    if (updates.length > 0 && broadcastCallback) {
      broadcastCallback(state.meetId, updates);
    }
    
    console.log(`[Track Heat Watcher] Processed ${events.length} event entries, ${heatCounts.size} unique events`);
    
  } catch (error) {
    console.error(`[Track Heat Watcher] Error processing file change:`, error);
  }
}

export function stopTrackHeatWatcher(meetId: string): void {
  const state = watchers.get(meetId);
  if (state?.watcher) {
    state.watcher.close();
    console.log(`[Track Heat Watcher] Stopped watching for meet ${meetId}`);
  }
  watchers.delete(meetId);
}

export function stopAllTrackHeatWatchers(): void {
  watchers.forEach((state, meetId) => {
    if (state.watcher) {
      state.watcher.close();
    }
  });
  watchers.clear();
  console.log('[Track Heat Watcher] All watchers stopped');
}

export function getActiveTrackHeatWatchers(): { meetId: string; evtFilePath: string }[] {
  const result: { meetId: string; evtFilePath: string }[] = [];
  watchers.forEach((state, meetId) => {
    result.push({ meetId, evtFilePath: state.evtFilePath });
  });
  return result;
}

export function clearHeatCountCache(meetId?: string): void {
  if (meetId) {
    heatCountCache.delete(meetId);
    console.log(`[Track Heat Watcher] Cleared cache for meet ${meetId}`);
  } else {
    heatCountCache.clear();
    console.log('[Track Heat Watcher] Cleared all cache');
  }
}
