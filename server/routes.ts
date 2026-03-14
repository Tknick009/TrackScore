import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { DEFAULT_SCENES_DATA } from "./default-scenes-data";
import { storage } from "./storage";
import { FileStorage } from "./file-storage";
import { getResulTVParser } from "./parsers/resultv-parser";
import type { TrackDisplayMode, FieldDisplayMode, Meet, FieldEventUpdatePayload } from "@shared/schema";
import {
  isHeightEvent,
  isTimeEvent,
  parsePerformanceToSeconds,
  type DisplayBoardState,
  type WSMessage,
  type EntryWithDetails,
} from "@shared/schema";
import { startWeatherPolling } from './weather-poller';
import {
  calculateHorizontalStandings,
  calculateVerticalStandings,
} from './field-standings';
import { exportSessionToLFF } from './lff-exporter';
import { externalScoreboardService, buildFieldScoreboardPayload } from './external-scoreboard-service';
import syncRouter from './sync/routes';
import * as fs from 'fs';
import type { ConnectedDisplayDevice, RouteContext } from './route-context';

// Import route modules
import { registerPublicRoutes } from './routes/public';
import { registerEventsRoutes } from './routes/events';
import { registerAthletesTeamsRoutes } from './routes/athletes-teams';
import { registerMeetsRoutes } from './routes/meets';
import { registerDisplaysRoutes } from './routes/displays';
import { registerLayoutsScenesRoutes } from './routes/layouts-scenes';
import { registerFieldEventsRoutes } from './routes/field-events';
import { registerIntegrationsRoutes } from './routes/integrations';

function abbreviateEventName(name: string): string {
  const n = name.trim();
  const tail = '(\\s+(Dash|Run|Race))?';

  if (/Shuttle\s+Hurdle\s+Relay/i.test(n)) return 'SHR';
  if (/Distance\s+Medley\s+Relay|^DMR$/i.test(n)) return 'DMR';
  if (/Sprint\s+Medley\s+Relay|^SMR$/i.test(n)) return 'SMR';

  if (/4\s*x\s*100/i.test(n)) return '4x1';
  if (/4\s*x\s*200/i.test(n)) return '4x2';
  if (/4\s*x\s*400/i.test(n)) return '4x4';
  if (/4\s*x\s*800/i.test(n)) return '4x8';

  if (new RegExp('^(2[,.]?000|2000)\\s*m?(eters?)?\\s+(Steeplechase|SC)', 'i').test(n)) return '2KSC';
  if (new RegExp('^(3[,.]?000|3000)\\s*m?(eters?)?\\s+(Steeplechase|SC)', 'i').test(n)) return '3KSC';

  if (new RegExp('^55\\s*m?(eters?)?\\s*H(urdles)?' + tail + '$', 'i').test(n)) return '55H';
  if (new RegExp('^60\\s*m?(eters?)?\\s*H(urdles)?' + tail + '$', 'i').test(n)) return '60H';
  if (new RegExp('^100\\s*m?(eters?)?\\s*H(urdles)?' + tail + '$', 'i').test(n)) return '100H';
  if (new RegExp('^110\\s*m?(eters?)?\\s*H(urdles)?' + tail + '$', 'i').test(n)) return '110H';
  if (new RegExp('^300\\s*m?(eters?)?\\s*H(urdles)?' + tail + '$', 'i').test(n)) return '300H';
  if (new RegExp('^400\\s*m?(eters?)?\\s*H(urdles)?' + tail + '$', 'i').test(n)) return '400H';

  if (new RegExp('^55\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '55';
  if (new RegExp('^60\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '60';
  if (new RegExp('^100\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '100';
  if (new RegExp('^200\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '200';
  if (new RegExp('^300\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '300';
  if (new RegExp('^400\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '400';
  if (new RegExp('^500\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '500';
  if (new RegExp('^600\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '600';
  if (new RegExp('^800\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '800';
  if (new RegExp('^(1[,.]?000|1000)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '1K';
  if (new RegExp('^(1[,.]?500|1500)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '1500';
  if (new RegExp('^(1[,.]?600|1600)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '1600';
  if (/^(1\s+)?Mile$/i.test(n)) return 'MILE';
  if (new RegExp('^(3[,.]?000|3000)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '3K';
  if (new RegExp('^(3[,.]?200|3200)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '3200';
  if (new RegExp('^(5[,.]?000|5000)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '5K';
  if (new RegExp('^(10[,.]?000|10000)\\s*(Meters?|m)?' + tail + '$', 'i').test(n)) return '10K';

  if (/High\s+Jump|^HJ$/i.test(n)) return 'HJ';
  if (/Pole\s+Vault|^PV$/i.test(n)) return 'PV';
  if (/Long\s+Jump|^LJ$/i.test(n)) return 'LJ';
  if (/Triple\s+Jump|^TJ$/i.test(n)) return 'TJ';
  if (/Shot\s+Put|^SP$/i.test(n)) return 'SP';
  if (/Discus/i.test(n)) return 'DIS';
  if (/Javelin/i.test(n)) return 'JAV';
  if (/Hammer/i.test(n)) return 'HT';
  if (/Weight\s+Throw|^WT$/i.test(n)) return 'WT';

  if (/\bDec(athlon)?\b/i.test(n)) return 'DEC';
  if (/\bHept(athlon)?\b/i.test(n)) return 'HEP';
  if (/\bPent(athlon)?\b/i.test(n)) return 'PEN';

  const rwMatch = n.match(/^(\d+[,.]?\d*)\s*(km|k|m)?\s*Race\s+Walk$/i);
  if (rwMatch) {
    const rawDist = rwMatch[1].replace(/[,.]/g, '');
    const unit = (rwMatch[2] || '').toLowerCase();
    const num = parseInt(rawDist, 10);
    if (unit === 'km' || unit === 'k') return num + 'KRW';
    if (num >= 1000) return Math.round(num / 1000) + 'KRW';
    return num + 'RW';
  }
  if (/Race\s+Walk/i.test(n)) return 'RW';

  return n.length > 8 ? n.substring(0, 8) : n;
}

// ===== WEBSOCKET STATE =====

const displayClients = new Set<WebSocket>();

const connectedDisplayDevices = new Map<string, ConnectedDisplayDevice>();

const fieldSessionSubscribers = new Map<number, Set<WebSocket>>();

// Map template names to display modes (for manual mode scene lookup)
function getDisplayModeFromTemplate(template: string): string | null {
  const templateLower = template.toLowerCase().replace(/-/g, '_');
  if (templateLower.includes('start_list')) return 'start_list';
  if (templateLower.includes('running_time')) return 'running_time';
  if (templateLower.includes('track_results') || (templateLower.includes('results') && !templateLower.includes('field'))) return 'track_results';
  if (templateLower.includes('field_results')) return 'field_results';
  if (templateLower.includes('field_standings')) return 'field_standings';
  if (templateLower.includes('team_scores')) return 'team_scores';
  if (templateLower.includes('meet_logo')) return 'meet_logo';
  return null;
}

// Pre-fetch scene data for instant display switching (eliminates HTTP round-trips)
async function prefetchSceneData(sceneId: number): Promise<{ scene: any; objects: any[] } | null> {
  try {
    const scene = await storage.getLayoutScene(sceneId);
    if (!scene) return null;
    const objects = await storage.getLayoutObjects(sceneId);
    return { scene, objects };
  } catch (err) {
    console.error(`[Prefetch] Error loading scene ${sceneId}:`, err);
    return null;
  }
}

// FinishLynx-specific message types that should NOT override non-lynx displays
const LYNX_ONLY_MESSAGE_TYPES = new Set([
  'track_mode_change', 'track_mode_change_big',
  'start_list', 'start_list_big',
  'clock_update',
  'layout_command', 'layout_command_big',
  'lynx_clock', 'lynx_wind', 'lynx_page',
  'layout-command',
  'board_update',
]);

// Broadcast function - Layout switching is now controlled by FinishLynx via layout-command events
// Devices in non-lynx contentMode (hytek, team_scores, field) will NOT receive FinishLynx track messages
function broadcastToDisplays(message: WSMessage) {
  const messageStr = JSON.stringify(message);
  const isLynxMessage = LYNX_ONLY_MESSAGE_TYPES.has(message.type);

  // Build set of WS connections that should skip this message (non-lynx devices)
  let skipWs: Set<WebSocket> | null = null;
  if (isLynxMessage) {
    skipWs = new Set();
    connectedDisplayDevices.forEach((device) => {
      if (device.contentMode !== 'lynx') {
        skipWs!.add(device.ws);
      }
    });
  }

  displayClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (skipWs && skipWs.has(client)) return; // Skip non-lynx devices for lynx messages
      client.send(messageStr);
    }
  });
}

// Send targeted message to a specific display device
function sendToDisplayDevice(deviceId: string, message: WSMessage) {
  const device = connectedDisplayDevices.get(deviceId);
  if (device && device.ws.readyState === WebSocket.OPEN) {
    device.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Get list of connected display devices for a meet
function getConnectedDevicesForMeet(meetId: string): string[] {
  const devices: string[] = [];
  connectedDisplayDevices.forEach((device, id) => {
    if (device.meetId === meetId) {
      devices.push(id);
    }
  });
  return devices;
}

// Get the active meet ID from connected displays (for Lynx heat count lookup)
// Returns the meetId that has the most connected displays, or null if none connected
function getActiveMeetIdFromDisplays(): string | null {
  const meetCounts = new Map<string, number>();
  connectedDisplayDevices.forEach((device) => {
    if (device.meetId) {
      meetCounts.set(device.meetId, (meetCounts.get(device.meetId) || 0) + 1);
    }
  });
  
  // Return the meet with the most connected displays
  let activeMeetId: string | null = null;
  let maxCount = 0;
  meetCounts.forEach((count, meetId) => {
    if (count > maxCount) {
      maxCount = count;
      activeMeetId = meetId;
    }
  });
  
  return activeMeetId;
}

// Cached active meet ID from database (for local/edge mode without connected displays)
let cachedDbActiveMeetId: string | null = null;
let cachedDbActiveMeetTimestamp = 0;

// Get the active meet ID, preferring connected displays, then falling back to database
async function getActiveMeetId(): Promise<string | null> {
  // First try connected displays
  const fromDisplays = getActiveMeetIdFromDisplays();
  if (fromDisplays) return fromDisplays;
  
  // Fallback: get most recent in_progress or upcoming meet from database
  // Cache for 10 seconds to avoid hitting DB on every Lynx message
  const now = Date.now();
  if (cachedDbActiveMeetId && (now - cachedDbActiveMeetTimestamp) < 10000) {
    return cachedDbActiveMeetId;
  }
  
  try {
    const meets = await storage.getMeets();
    const activeMeet = meets.find(m => m.status === 'in_progress') 
      || meets.find(m => m.status === 'upcoming')
      || (meets.length > 0 ? meets[meets.length - 1] : null);
    cachedDbActiveMeetId = activeMeet?.id || null;
    cachedDbActiveMeetTimestamp = now;
    return cachedDbActiveMeetId;
  } catch (error) {
    return null;
  }
}

// Compute PB/SB/MR/FR tags for each entry in an event
async function enrichEntriesWithRecordTags(eventType: string, gender: string, entries: EntryWithDetails[]): Promise<void> {
  try {
    // Fetch all record books for this event type and gender
    const matchingRecords = await storage.getRecordsByEvent(eventType, gender);
    // Build a map of record book scope -> { performance, allowMultiple }
    const recordsByScope: Map<string, { perf: number; allowMultiple: boolean }> = new Map();
    for (const record of matchingRecords) {
      const perf = parsePerformanceToSeconds(record.performance);
      if (perf === null) continue;
      // Get the record book to know its scope and allowMultiple setting
      const book = await storage.getRecordBook(record.recordBookId);
      if (!book) continue;
      const scope = book.scope;
      const allowMultiple = (book as any).allowMultiple ?? false;
      const existing = recordsByScope.get(scope);
      if (existing === undefined) {
        recordsByScope.set(scope, { perf, allowMultiple });
      } else {
        // Keep the best record (lowest for time, highest for distance/height)
        if (isTimeEvent(eventType)) {
          if (perf < existing.perf) recordsByScope.set(scope, { perf, allowMultiple });
        } else {
          if (perf > existing.perf) recordsByScope.set(scope, { perf, allowMultiple });
        }
      }
    }

    // Collect all athlete IDs that have a finalMark
    const athleteIds = entries
      .filter(e => e.finalMark !== null && e.finalMark !== undefined && e.athleteId)
      .map(e => e.athleteId);

    // Batch fetch athlete bests
    const bestsByAthlete: Map<string, { season: number | null; college: number | null }> = new Map();
    
    // Canonical event type key: maps various abbreviations to a single key
    // CSV uses short codes (800, 60H, pv, hj), DB uses full types (800m, 60m_hurdles, pole_vault, high_jump)
    const canonicalizeEventType = (et: string): string => {
      const lower = et.toLowerCase().replace(/[\s_-]+/g, '');
      // Alias map: common abbreviations → canonical form
      const aliases: Record<string, string> = {
        // Track events - strip trailing 'm' so "800m" and "800" both become the distance
        '60h': '60hurdles', '60mh': '60hurdles', '60hurdles': '60hurdles', '60mhurdles': '60hurdles',
        '100h': '100hurdles', '100mh': '100hurdles', '100hurdles': '100hurdles', '100mhurdles': '100hurdles',
        '110h': '110hurdles', '110mh': '110hurdles', '110hurdles': '110hurdles', '110mhurdles': '110hurdles',
        '400h': '400hurdles', '400mh': '400hurdles', '400hurdles': '400hurdles', '400mhurdles': '400hurdles',
        // Field events
        'hj': 'highjump', 'highjump': 'highjump',
        'pv': 'polevault', 'polevault': 'polevault',
        'lj': 'longjump', 'longjump': 'longjump',
        'tj': 'triplejump', 'triplejump': 'triplejump',
        'sp': 'shotput', 'shotput': 'shotput',
        'wt': 'weightthrow', 'weightthrow': 'weightthrow',
        'dt': 'discus', 'discus': 'discus', 'discusthrow': 'discus',
        'jt': 'javelin', 'javelin': 'javelin', 'javelinthrow': 'javelin',
        'ht': 'hammer', 'hammer': 'hammer', 'hammerthrow': 'hammer',
        // Distance aliases
        '1m': 'mile', '1mile': 'mile', 'mile': 'mile', 'onemile': 'mile',
        '3000sc': '3000steeplechase', 'steeplechase': '3000steeplechase', '3000steeple': '3000steeplechase', '3000msteeplechase': '3000steeplechase',
        // Multi-events
        'ipentathlon': 'pentathlon',
      };
      if (aliases[lower]) return aliases[lower];
      // Strip trailing 'm' for numeric distances: "800m" → "800", "800" → "800"
      const stripped = lower.replace(/m$/, '');
      if (/^\d+$/.test(stripped)) return stripped;
      return lower;
    };
    
    const canonicalEventType = canonicalizeEventType(eventType);
    
    for (const athleteId of athleteIds) {
      try {
        const bests = await storage.getAthleteBests(athleteId);
        // Match event type flexibly using canonical form
        const eventBests = bests.filter(b => 
          b.eventType === eventType || canonicalizeEventType(b.eventType) === canonicalEventType
        );
        let seasonBest: number | null = null;
        let collegeBest: number | null = null;
        for (const b of eventBests) {
          if (b.bestType === 'season' && b.mark !== null) {
            if (seasonBest === null) seasonBest = b.mark;
            else if (isTimeEvent(eventType) ? b.mark < seasonBest : b.mark > seasonBest) seasonBest = b.mark;
          }
          if (b.bestType === 'college' && b.mark !== null) {
            if (collegeBest === null) collegeBest = b.mark;
            else if (isTimeEvent(eventType) ? b.mark < collegeBest : b.mark > collegeBest) collegeBest = b.mark;
          }
        }
        bestsByAthlete.set(athleteId, { season: seasonBest, college: collegeBest });
      } catch {
        // Skip if bests can't be fetched
      }
    }

    const isTime = isTimeEvent(eventType);

    // First pass: compute all tags for each entry
    // Then enforce allowMultiple constraints (only best breaker gets tag when false)
    type EntryTagInfo = { entry: EntryWithDetails; mark: number; tags: string[] };
    const entryTagInfos: EntryTagInfo[] = [];

    for (const entry of entries) {
      const tags: string[] = [];
      // Skip entries with no valid mark: null, undefined, 0, NaN, empty strings, negative values.
      // This prevents record tags from appearing for athletes who haven't raced yet
      // (e.g., start list entries, DNS, scratches).
      const rawMark = entry.finalMark;
      if (rawMark === null || rawMark === undefined || rawMark === 0 ||
          (typeof rawMark === 'string' && rawMark.trim() === '') ||
          (typeof rawMark === 'number' && (isNaN(rawMark) || rawMark <= 0))) {
        (entry as any).recordTags = tags;
        continue;
      }

      // Convert finalMark to base units: finalMark is in ms for track, mm for field
      // athlete_bests.mark is in seconds for track, meters for field
      // records.performance is parsed by parsePerformanceToSeconds (returns seconds for track, meters for field)
      const numericMark = typeof rawMark === 'string' ? parseFloat(rawMark) : rawMark;
      if (isNaN(numericMark) || numericMark <= 0) {
        (entry as any).recordTags = tags;
        continue;
      }
      const markInBaseUnits = numericMark / 1000;

      // Check MR (Meet Record)
      const meetRecord = recordsByScope.get('meet');
      if (meetRecord !== undefined) {
        if (isTime ? markInBaseUnits < meetRecord.perf : markInBaseUnits > meetRecord.perf) {
          tags.push('MR');
        } else if (Math.abs(markInBaseUnits - meetRecord.perf) < 0.005) {
          tags.push('=MR');
        }
      }

      // Check FR (Facility Record)
      const facilityRecord = recordsByScope.get('facility');
      if (facilityRecord !== undefined) {
        if (isTime ? markInBaseUnits < facilityRecord.perf : markInBaseUnits > facilityRecord.perf) {
          tags.push('FR');
        } else if (Math.abs(markInBaseUnits - facilityRecord.perf) < 0.005) {
          tags.push('=FR');
        }
      }

      // Check PB (Personal Best / College Best) and SB (Season Best)
      // PB takes priority: if athlete beats their college best, show PB only (not SB)
      // If athlete only beats their season best, show SB
      const athleteBests = bestsByAthlete.get(entry.athleteId);
      if (athleteBests) {
        let isPB = false;
        if (athleteBests.college !== null) {
          if (isTime ? markInBaseUnits < athleteBests.college : markInBaseUnits > athleteBests.college) {
            tags.push('PB');
            isPB = true;
          }
        }
        // Only show SB if not already a PB
        if (!isPB && athleteBests.season !== null) {
          if (isTime ? markInBaseUnits < athleteBests.season : markInBaseUnits > athleteBests.season) {
            tags.push('SB');
          }
        }
      }

      entryTagInfos.push({ entry, mark: markInBaseUnits, tags });
    }

    // Second pass: enforce allowMultiple constraints
    // For scopes where allowMultiple=false, only the BEST breaker gets that tag
    const scopeTagMap: Record<string, string[]> = {
      'meet': ['MR', '=MR'],
      'facility': ['FR', '=FR'],
    };

    for (const [scope, info] of recordsByScope) {
      if (info.allowMultiple) continue; // all breakers keep their tag
      
      const tagsForScope = scopeTagMap[scope] || [];
      if (tagsForScope.length === 0) continue;
      
      // Find the best breaker among entries that have this scope's tag
      let bestBreaker: EntryTagInfo | null = null;
      for (const eti of entryTagInfos) {
        if (eti.tags.some(t => tagsForScope.includes(t))) {
          if (!bestBreaker || (isTime ? eti.mark < bestBreaker.mark : eti.mark > bestBreaker.mark)) {
            bestBreaker = eti;
          }
        }
      }
      
      // Remove the tag from everyone except the best breaker
      if (bestBreaker) {
        for (const eti of entryTagInfos) {
          if (eti !== bestBreaker) {
            eti.tags = eti.tags.filter(t => !tagsForScope.includes(t));
          }
        }
      }
    }

    // Assign final tags to entries
    for (const eti of entryTagInfos) {
      (eti.entry as any).recordTags = eti.tags;
    }
  } catch (error) {
    console.error('[RecordTags] Error enriching entries with record tags:', error);
    // Don't fail the broadcast if tag enrichment fails
    for (const entry of entries) {
      if (!(entry as any).recordTags) {
        (entry as any).recordTags = [];
      }
    }
  }
}

// Auto-update athlete PB/SB when live results beat stored bests.
// Called after enrichEntriesWithRecordTags so we already know who has PB/SB tags.
// Updates the athlete_bests table so subsequent rounds use the new marks.
async function autoUpdateAthleteBests(eventType: string, entries: EntryWithDetails[]): Promise<void> {
  try {
    let updated = 0;

    for (const entry of entries) {
      const tags: string[] = (entry as any).recordTags || [];
      if (!entry.athleteId || entry.finalMark === null || entry.finalMark === undefined) continue;

      // finalMark is in ms (track) or mm (field); athlete_bests.mark is in seconds / meters
      const markInBaseUnits = entry.finalMark / 1000;

      // If athlete got PB tag, update their college best
      if (tags.includes('PB')) {
        await storage.upsertAthleteBest({
          athleteId: entry.athleteId,
          eventType,
          bestType: 'college',
          mark: markInBaseUnits,
        });
        updated++;
        console.log(`[AutoPB] Updated college best for athlete ${entry.athleteId}: ${markInBaseUnits} (${eventType})`);
      }

      // If athlete got SB or PB tag, update their season best
      // (PB implies SB since a college best is also a season best)
      if (tags.includes('SB') || tags.includes('PB')) {
        await storage.upsertAthleteBest({
          athleteId: entry.athleteId,
          eventType,
          bestType: 'season',
          mark: markInBaseUnits,
        });
        if (!tags.includes('PB')) updated++; // avoid double counting
        console.log(`[AutoPB] Updated season best for athlete ${entry.athleteId}: ${markInBaseUnits} (${eventType})`);
      }
    }

    if (updated > 0) {
      console.log(`[AutoPB] Auto-updated ${updated} athlete bests for ${eventType}`);
    }
  } catch (error) {
    console.error('[AutoPB] Error auto-updating athlete bests:', error);
  }
}

// Helper to broadcast current event state
async function broadcastCurrentEvent() {
  const currentEvent = await storage.getCurrentEvent();
  
  // Get the meet associated with the current event, or fall back to most recent active meet
  let meet: Meet | undefined;
  if (currentEvent?.meetId) {
    meet = await storage.getMeet(currentEvent.meetId);
  }
  
  // If no meet found from current event, get the most recent in_progress or upcoming meet
  if (!meet) {
    const meets = await storage.getMeets();
    meet = meets.find(m => m.status === 'in_progress') 
        || meets.find(m => m.status === 'upcoming')
        || meets[0];
  }

  // Enrich entries with PB/SB/MR/FR tags before broadcasting
  if (currentEvent?.entries && currentEvent.entries.length > 0) {
    await enrichEntriesWithRecordTags(
      currentEvent.eventType,
      currentEvent.gender,
      currentEvent.entries
    );
  }

  const boardState: DisplayBoardState = {
    mode: "live",
    currentEvent,
    meet,
    timestamp: Date.now(),
  };

  broadcastToDisplays({
    type: "board_update",
    data: boardState,
  });
}

// Broadcast field event update to subscribers and all displays
// deviceName is optional - used for device-specific scoreboard routing
async function broadcastFieldEventUpdate(sessionId: number, deviceName?: string) {
  try {
    const session = await storage.getFieldEventSessionWithDetails(sessionId);
    if (!session) {
      console.log(`[Field Broadcast] Session ${sessionId} not found`);
      return;
    }

    const event = await storage.getEvent(session.eventId);
    if (!event) {
      console.log(`[Field Broadcast] Event ${session.eventId} not found`);
      return;
    }

    const isVertical = isHeightEvent(event.eventType);
    
    let standings: any[] = [];
    if (session.athletes && session.marks) {
      if (isVertical && session.heights) {
        standings = calculateVerticalStandings(
          session.athletes as any,
          session.marks,
          session.heights
        );
      } else {
        standings = calculateHorizontalStandings(
          session.athletes as any,
          session.marks
        );
      }
    }

    // Get actual athlete ID from the current index (null if no current athlete)
    let currentAthleteId: number | null = null;
    const currentAthleteIndex = session.currentAthleteIndex;
    if (currentAthleteIndex !== null && currentAthleteIndex !== undefined && 
        session.athletes && currentAthleteIndex >= 0 && currentAthleteIndex < session.athletes.length) {
      currentAthleteId = session.athletes[currentAthleteIndex]?.id ?? null;
    }

    const update: FieldEventUpdatePayload = {
      athletes: session.athletes || [],
      marks: session.marks || [],
      heights: session.heights,
      standings: standings,
      currentAthleteId: currentAthleteId,
      currentAttempt: session.currentAttemptNumber,
      currentHeight: isVertical ? session.currentHeightIndex : undefined,
      sessionStatus: session.status,
      eventType: isVertical ? 'vertical' : 'horizontal'
    };

    const message: WSMessage = {
      type: 'field_event_update',
      sessionId: sessionId,
      eventId: session.eventId,
      meetId: event.meetId,
      update
    };

    // Broadcast to session-specific subscribers
    const subscribers = fieldSessionSubscribers.get(sessionId);
    if (subscribers) {
      const messageStr = JSON.stringify(message);
      subscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
      console.log(`[Field Broadcast] Session ${sessionId}: sent to ${subscribers.size} subscribers`);
    }

    // Also broadcast to all display clients
    broadcastToDisplays(message);
    console.log(`[Field Broadcast] Session ${sessionId}: broadcast complete`);

    // Send to external scoreboards
    try {
      const lastMark = session.marks && session.marks.length > 0
        ? session.marks.sort((a, b) => 
            new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime()
          )[0]
        : null;

      const scoreboardPayload = buildFieldScoreboardPayload(session, currentAthleteId, lastMark);
      scoreboardPayload.deviceName = deviceName;
      await externalScoreboardService.sendToSession(sessionId, scoreboardPayload, deviceName);
      console.log(`[Field Broadcast] Session ${sessionId}: sent to external scoreboards (device: ${deviceName || 'all'})`);
    } catch (extError) {
      console.error(`[Field Broadcast] Error sending to external scoreboards:`, extError);
    }
  } catch (error) {
    console.error(`[Field Broadcast] Error broadcasting session ${sessionId}:`, error);
  }
}

// Auto-export LFF file after every mark change if export path is configured
async function autoExportLFF(sessionId: number) {
  try {
    const session = await storage.getFieldEventSessionWithDetails(sessionId);
    if (!session || !session.lffExportPath) {
      return; // No export path configured, skip auto-export
    }
    
    const measurementSystem = (session.measurementUnit === 'english' ? 'English' : 'Metric') as 'Metric' | 'English';
    
    const filePath = await exportSessionToLFF(session, {
      outputDir: session.lffExportPath,
      measurementSystem
    });
    
    console.log(`[LFF Auto-Export] Session ${sessionId}: exported to ${filePath}`);
  } catch (error) {
    console.error(`[LFF Auto-Export] Error exporting session ${sessionId}:`, error);
  }
}

// Load default scenes template from embedded data (baked into the code)
let defaultScenesTemplate: { scenes: any[]; sceneMappings?: any[] } | null = null;
function loadDefaultScenesTemplate(): { scenes: any[]; sceneMappings?: any[] } | null {
  if (defaultScenesTemplate !== null) {
    return defaultScenesTemplate;
  }
  
  // Use embedded data - no file reading required
  defaultScenesTemplate = { 
    scenes: DEFAULT_SCENES_DATA.scenes as any[] || [],
    sceneMappings: DEFAULT_SCENES_DATA.sceneMappings as any[] || [],
  };
  console.log(`✅ Loaded ${defaultScenesTemplate.scenes.length} default scene templates with ${defaultScenesTemplate.sceneMappings?.length || 0} mappings (embedded)`);
  return defaultScenesTemplate;
}

// Seed default scenes for a new meet
async function seedDefaultScenes(meetId: string): Promise<number> {
  const template = loadDefaultScenesTemplate();
  if (!template || template.scenes.length === 0) {
    return 0;
  }
  
  // Map to track scene name -> new scene ID for mapping creation
  const sceneNameToId: Record<string, number> = {};
  
  let seededCount = 0;
  for (const sceneData of template.scenes) {
    const { objects, id: _id, meetId: _meetId, createdAt: _createdAt, updatedAt: _updatedAt, ...sceneFields } = sceneData;
    
    const newScene = await storage.createLayoutScene({
      ...sceneFields,
      meetId: meetId,
    });
    
    // Track scene name to new ID mapping
    sceneNameToId[newScene.name] = newScene.id;
    
    // Create objects for this scene
    if (objects && Array.isArray(objects)) {
      for (const objData of objects) {
        const { id: _objId, sceneId: _sceneId, createdAt: _objCreated, ...objectFields } = objData;
        await storage.createLayoutObject({
          ...objectFields,
          sceneId: newScene.id,
        });
      }
    }
    seededCount++;
  }
  
  // Create scene template mappings
  if (template.sceneMappings && Array.isArray(template.sceneMappings)) {
    for (const mapping of template.sceneMappings) {
      const sceneId = sceneNameToId[mapping.sceneName];
      if (sceneId) {
        await storage.setSceneTemplateMapping({
          meetId: meetId,
          displayType: mapping.displayType,
          displayMode: mapping.displayMode,
          sceneId: sceneId,
        });
      }
    }
    console.log(`✅ Seeded ${template.sceneMappings.length} scene template mappings for meet ${meetId}`);
  }
  
  console.log(`✅ Seeded ${seededCount} default scenes for meet ${meetId}`);
  return seededCount;
}

// ===== MAIN ROUTE REGISTRATION =====

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    dest: "uploads/",
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
      }
    },
  });

  const fileStorage = new FileStorage();

  // Register sync routes
  app.use('/api/sync', syncRouter);

  // Build shared route context
  const ctx: RouteContext = {
    broadcastToDisplays,
    broadcastCurrentEvent,
    broadcastFieldEventUpdate,
    sendToDisplayDevice,
    getActiveMeetId,
    getConnectedDevicesForMeet,
    connectedDisplayDevices,
    displayClients,
    fieldSessionSubscribers,
    upload,
    imageUpload,
    fileStorage,
    seedDefaultScenes,
    autoExportLFF,
    abbreviateEventName,
    prefetchSceneData,
    getDisplayModeFromTemplate,
    enrichEntriesWithRecordTags,
    autoUpdateAthleteBests,
  };

  // Register all domain-specific route modules
  registerPublicRoutes(app, ctx);
  registerEventsRoutes(app, ctx);
  registerAthletesTeamsRoutes(app, ctx);
  registerMeetsRoutes(app, ctx);
  registerDisplaysRoutes(app, ctx);
  registerLayoutsScenesRoutes(app, ctx);
  registerFieldEventsRoutes(app, ctx);
  registerIntegrationsRoutes(app, ctx);

  const httpServer = createServer(app);

  // WebSocket Server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    let registeredDeviceId: string | null = null;

    // Handle incoming messages for client identification
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle client identification
        if (data.type === 'identify' && data.clientType === 'overlay') {
          console.log('Overlay client identified');
          displayClients.add(ws);
          
          // Send connection confirmation to overlay
          ws.send(
            JSON.stringify({
              type: "connection_status",
              connected: true,
            } as WSMessage)
          );
        }
        
        // Handle display device registration
        if (data.type === 'register_display_device') {
          const { meetId, deviceName, displayType, deviceId: clientDeviceId, displayWidth, displayHeight } = data;
          
          if (meetId && deviceName) {
            console.log(`Display device registering: ${deviceName} (${displayType}) for meet ${meetId}, clientDeviceId: ${clientDeviceId || 'new'}`);
            
            try {
              // If client provides a deviceId, try to find and update that device
              let device;
              if (clientDeviceId) {
                const existingDevice = await storage.getDisplayDevice(clientDeviceId);
                if (existingDevice && existingDevice.meetId === meetId) {
                  // Update existing device status
                  device = await storage.updateDisplayDeviceStatus(clientDeviceId, 'online');
                  
                  if (device && displayType && (displayType !== existingDevice.displayType || deviceName !== existingDevice.deviceName)) {
                    device = await storage.updateDisplayDeviceType(clientDeviceId, displayType, deviceName, displayWidth, displayHeight) || device;
                    console.log(`Updated device type: ${deviceName} (${displayType})`);
                  }
                  
                  console.log(`Reconnected existing device: ${device?.deviceName} (${clientDeviceId})`);
                }
              }
              
              // If no existing device found, create a new one
              if (!device) {
                device = await storage.createOrUpdateDisplayDevice({
                  meetId,
                  deviceName,
                  displayType: displayType || 'P10',
                  displayWidth: displayType === 'Custom' ? displayWidth : undefined,
                  displayHeight: displayType === 'Custom' ? displayHeight : undefined,
                } as any);
                console.log(`Created new device: ${device.deviceName} (${device.id})`);
              }
              
              registeredDeviceId = device.id;
              
              // Track this WebSocket connection with the device (including displayType)
              // Load persisted autoMode from database, default to true for track displays
              const deviceAutoMode = device.autoMode ?? (device.displayMode === 'track');
              // Load persisted contentMode from database, default to 'lynx'
              const deviceContentMode = (device as any).contentMode || 'lynx';
              connectedDisplayDevices.set(device.id, {
                ws,
                deviceId: device.id,
                deviceName: device.deviceName,
                meetId: device.meetId,
                displayType: displayType || 'P10',
                autoMode: deviceAutoMode,
                pagingSize: device.pagingSize ?? 8,
                pagingInterval: device.pagingInterval ?? 5,
                fieldPort: device.fieldPort ?? undefined,
                contentMode: deviceContentMode,
              });
              
              // Send registration confirmation with assigned event
              ws.send(JSON.stringify({
                type: 'device_registered',
                data: {
                  deviceId: device.id,
                  deviceName: device.deviceName,
                  meetId: device.meetId,
                  assignedEventId: device.assignedEventId,
                  status: device.status,
                  displayType: displayType || 'P10',
                  fieldPort: device.fieldPort,
                  isBigBoard: device.isBigBoard,
                  displayMode: device.displayMode,
                  autoMode: deviceAutoMode,
                  displayScale: device.displayScale ?? 100,
                  contentMode: deviceContentMode,
                }
              }));
              
              // Notify control panel that device list has changed
              broadcastToDisplays({
                type: 'devices_updated',
                data: { meetId: device.meetId }
              } as WSMessage);
              
              console.log(`Display device registered: ${device.deviceName} (${device.id})`);
            } catch (error) {
              console.error('Failed to register display device:', error);
              ws.send(JSON.stringify({
                type: 'device_registration_error',
                error: 'Failed to register device'
              }));
            }
          }
        }
        
        // Handle display device heartbeat via WebSocket
        if (data.type === 'device_heartbeat' && registeredDeviceId) {
          await storage.updateDisplayDeviceStatus(registeredDeviceId, 'online');
        }
        
        // Handle field session subscription
        if (data.type === 'subscribe_field_session') {
          const sessionId = parseInt(data.sessionId);
          if (!isNaN(sessionId)) {
            if (!fieldSessionSubscribers.has(sessionId)) {
              fieldSessionSubscribers.set(sessionId, new Set());
            }
            fieldSessionSubscribers.get(sessionId)!.add(ws);
            console.log(`[Field WS] Client subscribed to session ${sessionId}`);
            
            // Send current state immediately
            broadcastFieldEventUpdate(sessionId).catch(console.error);
          }
        }
        
        // Handle field session unsubscription
        if (data.type === 'unsubscribe_field_session') {
          const sessionId = parseInt(data.sessionId);
          if (!isNaN(sessionId) && fieldSessionSubscribers.has(sessionId)) {
            fieldSessionSubscribers.get(sessionId)!.delete(ws);
            console.log(`[Field WS] Client unsubscribed from session ${sessionId}`);
          }
        }
      } catch (error) {
        // Not a control message, could be other WebSocket traffic
      }
    });

    // Non-overlay clients are added immediately
    // They will receive all broadcasts but can filter on client side
    displayClients.add(ws);

    // Send current state immediately on connection
    broadcastCurrentEvent().catch(console.error);

    // Send connection status
    ws.send(
      JSON.stringify({
        type: "connection_status",
        connected: true,
      } as WSMessage)
    );

    ws.on("close", async () => {
      console.log("WebSocket client disconnected");
      displayClients.delete(ws);
      
      // Clean up field session subscriptions
      fieldSessionSubscribers.forEach((subscribers, sessionId) => {
        if (subscribers.has(ws)) {
          subscribers.delete(ws);
          console.log(`[Field WS] Client removed from session ${sessionId} on close`);
        }
      });
      
      // If this was a registered display device, update its status
      if (registeredDeviceId) {
        connectedDisplayDevices.delete(registeredDeviceId);
        try {
          const device = await storage.updateDisplayDeviceStatus(registeredDeviceId, 'offline');
          if (device) {
            // Notify control panel that device went offline
            broadcastToDisplays({
              type: 'devices_updated',
              data: { meetId: device.meetId }
            } as WSMessage);
            console.log(`Display device offline: ${device.deviceName}`);
          }
        } catch (error) {
          console.error('Failed to update device status:', error);
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      displayClients.delete(ws);
      
      // Clean up field session subscriptions
      fieldSessionSubscribers.forEach((subscribers, sessionId) => {
        if (subscribers.has(ws)) {
          subscribers.delete(ws);
        }
      });
      
      // Clean up device tracking on error
      if (registeredDeviceId) {
        connectedDisplayDevices.delete(registeredDeviceId);
      }
    });
  });
  // Initialize weather polling for all meets on server start
  setImmediate(async () => {
    try {
      const meets = await storage.getMeets();
      
      for (const meet of meets) {
        const config = await storage.getWeatherConfig(meet.id);
        if (config) {
          startWeatherPolling(meet.id, broadcastToDisplays);
          console.log(`✅ Resumed weather polling for meet: ${meet.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize weather polling:', error);
    }
  });

  // ===== RESULTV PARSER EVENT WIRING =====
  // Wire up the ResulTV parser to broadcast events via WebSocket
  const resultvParser = getResulTVParser();

  // Broadcast layout commands to displays (scene switching)
  resultvParser.on('layout-command', (layoutName: string, cmd: any) => {
    console.log(`[ResulTV] Broadcasting layout-command: ${layoutName}`);
    broadcastToDisplays({
      type: 'layout-command',
      data: { layout: layoutName, command: cmd }
    } as WSMessage);
  });

  // Broadcast clock updates
  resultvParser.on('clock', (time: string, isRunning: boolean) => {
    broadcastToDisplays({
      type: 'lynx_clock',
      data: { time, isRunning }
    } as WSMessage);
  });

  // Broadcast wind readings
  resultvParser.on('wind', (wind: string) => {
    broadcastToDisplays({
      type: 'lynx_wind',
      data: { wind }
    } as WSMessage);
  });

  // Broadcast complete page state (debounced, with all entries)
  resultvParser.on('page', (page: any) => {
    broadcastToDisplays({
      type: 'lynx_page',
      data: page
    } as WSMessage);
  });

  console.log('✅ ResulTV parser event handlers registered');


  return httpServer;
}
