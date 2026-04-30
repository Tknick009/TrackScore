/**
 * Meet Monitor — Records operational telemetry during a live meet.
 * 
 * Captures events like:
 * - MDB imports (success/failure, event counts, duration)
 * - Display transitions (content mode changes, record board sends)
 * - Event status transitions (unseeded → seeded → done → scored)
 * - Timing data ingestion (LIF/LFF files processed)
 * - Errors and warnings
 * - Operator actions (manual overrides, manual result entry)
 * 
 * Data is stored in-memory during the meet and can be exported as JSON
 * for post-meet analysis. The log is persisted to a JSON file on disk
 * so it survives server restarts.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MonitorEvent {
  timestamp: string;
  meetId: string;
  category: 'import' | 'display' | 'timing' | 'status' | 'error' | 'action' | 'system';
  type: string;
  details: Record<string, unknown>;
  duration?: number; // milliseconds
}

interface MeetMonitorState {
  meetId: string;
  meetName: string;
  startedAt: string;
  events: MonitorEvent[];
  stats: {
    totalImports: number;
    totalErrors: number;
    totalDisplayUpdates: number;
    totalTimingEvents: number;
    totalStatusChanges: number;
    importDurations: number[];
    eventStatusHistory: Record<number, Array<{ status: string; timestamp: string }>>;
  };
}

// In-memory storage keyed by meetId
const monitorStates = new Map<string, MeetMonitorState>();

// Directory for persisted log files
const LOG_DIR = path.join(process.cwd(), 'meet-logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getState(meetId: string): MeetMonitorState {
  let state = monitorStates.get(meetId);
  if (!state) {
    state = {
      meetId,
      meetName: '',
      startedAt: new Date().toISOString(),
      events: [],
      stats: {
        totalImports: 0,
        totalErrors: 0,
        totalDisplayUpdates: 0,
        totalTimingEvents: 0,
        totalStatusChanges: 0,
        importDurations: [],
        eventStatusHistory: {},
      },
    };
    monitorStates.set(meetId, state);
  }
  return state;
}

function persistState(meetId: string) {
  const state = monitorStates.get(meetId);
  if (!state) return;
  
  try {
    ensureLogDir();
    const filename = `meet-${meetId.substring(0, 8)}-${state.startedAt.split('T')[0]}.json`;
    const filepath = path.join(LOG_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(state, null, 2));
  } catch (err) {
    // Don't let persistence failures break the app
    console.error('[MeetMonitor] Failed to persist log:', err);
  }
}

// Auto-persist every 60 seconds for active monitors
setInterval(() => {
  for (const [meetId] of monitorStates) {
    persistState(meetId);
  }
}, 60_000);

// ==================
// PUBLIC API
// ==================

export function logMonitorEvent(
  meetId: string,
  category: MonitorEvent['category'],
  type: string,
  details: Record<string, unknown> = {},
  duration?: number,
) {
  const state = getState(meetId);
  const event: MonitorEvent = {
    timestamp: new Date().toISOString(),
    meetId,
    category,
    type,
    details,
    duration,
  };
  
  state.events.push(event);
  
  // Update stats
  switch (category) {
    case 'import':
      state.stats.totalImports++;
      if (duration) state.stats.importDurations.push(duration);
      break;
    case 'error':
      state.stats.totalErrors++;
      break;
    case 'display':
      state.stats.totalDisplayUpdates++;
      break;
    case 'timing':
      state.stats.totalTimingEvents++;
      break;
    case 'status':
      state.stats.totalStatusChanges++;
      // Track per-event status history
      const eventNum = details.eventNumber as number | undefined;
      if (eventNum != null) {
        if (!state.stats.eventStatusHistory[eventNum]) {
          state.stats.eventStatusHistory[eventNum] = [];
        }
        state.stats.eventStatusHistory[eventNum].push({
          status: (details.newStatus as string) || (details.status as string) || 'unknown',
          timestamp: event.timestamp,
        });
      }
      break;
  }
  
  // Keep events bounded (max 10,000 per meet to avoid memory issues)
  if (state.events.length > 10_000) {
    // Persist before trimming
    persistState(meetId);
    state.events = state.events.slice(-5000);
  }
}

export function setMeetMonitorName(meetId: string, meetName: string) {
  const state = getState(meetId);
  state.meetName = meetName;
}

export function getMonitorLog(meetId: string): MeetMonitorState | null {
  return monitorStates.get(meetId) || null;
}

export function getMonitorSummary(meetId: string): Record<string, unknown> | null {
  const state = monitorStates.get(meetId);
  if (!state) return null;
  
  const avgImportDuration = state.stats.importDurations.length > 0
    ? Math.round(state.stats.importDurations.reduce((a, b) => a + b, 0) / state.stats.importDurations.length)
    : 0;
  
  const maxImportDuration = state.stats.importDurations.length > 0
    ? Math.max(...state.stats.importDurations)
    : 0;
  
  // Count events by category
  const eventsByCategory: Record<string, number> = {};
  for (const evt of state.events) {
    eventsByCategory[evt.category] = (eventsByCategory[evt.category] || 0) + 1;
  }
  
  // Recent errors (last 10)
  const recentErrors = state.events
    .filter(e => e.category === 'error')
    .slice(-10)
    .map(e => ({ timestamp: e.timestamp, type: e.type, details: e.details }));
  
  // Event status distribution
  const statusCounts: Record<string, number> = {};
  for (const [, history] of Object.entries(state.stats.eventStatusHistory)) {
    const latest = history[history.length - 1];
    if (latest) {
      statusCounts[latest.status] = (statusCounts[latest.status] || 0) + 1;
    }
  }
  
  return {
    meetId: state.meetId,
    meetName: state.meetName,
    monitorStarted: state.startedAt,
    totalEvents: state.events.length,
    stats: {
      ...state.stats,
      importDurations: undefined, // Exclude raw array
      avgImportDurationMs: avgImportDuration,
      maxImportDurationMs: maxImportDuration,
    },
    eventsByCategory,
    recentErrors,
    currentEventStatusDistribution: statusCounts,
  };
}

export function exportMonitorLog(meetId: string): string | null {
  const state = monitorStates.get(meetId);
  if (!state) return null;
  
  // Persist latest state
  persistState(meetId);
  
  return JSON.stringify(state, null, 2);
}

export function listMonitorLogs(): Array<{ meetId: string; meetName: string; startedAt: string; eventCount: number }> {
  const logs: Array<{ meetId: string; meetName: string; startedAt: string; eventCount: number }> = [];
  
  // In-memory active monitors
  for (const [meetId, state] of monitorStates) {
    logs.push({
      meetId,
      meetName: state.meetName,
      startedAt: state.startedAt,
      eventCount: state.events.length,
    });
  }
  
  // Also check persisted logs on disk
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf-8');
        const data = JSON.parse(content) as MeetMonitorState;
        // Skip if already in active monitors
        if (!monitorStates.has(data.meetId)) {
          logs.push({
            meetId: data.meetId,
            meetName: data.meetName,
            startedAt: data.startedAt,
            eventCount: data.events.length,
          });
        }
      } catch {
        // Skip corrupt files
      }
    }
  } catch {
    // Log dir might not exist yet
  }
  
  return logs;
}

export function loadMonitorLog(meetId: string): MeetMonitorState | null {
  // Check in-memory first
  const active = monitorStates.get(meetId);
  if (active) return active;
  
  // Check disk
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith(`meet-${meetId.substring(0, 8)}`));
    if (files.length > 0) {
      // Use the most recent file
      const latestFile = files.sort().reverse()[0];
      const content = fs.readFileSync(path.join(LOG_DIR, latestFile), 'utf-8');
      return JSON.parse(content) as MeetMonitorState;
    }
  } catch {
    // Disk read failed
  }
  
  return null;
}
