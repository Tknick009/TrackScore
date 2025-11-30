import type { SyncEvent } from '../storage/sqlite-adapter';

export interface SyncStatus {
  mode: 'edge' | 'cloud';
  cloudUrl: string | null;
  connected: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  error: string | null;
}

export interface SyncPushPayload {
  events: SyncEventPayload[];
  edgeId: string;
  timestamp: string;
}

export interface SyncEventPayload {
  id: number;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  createdAt: string;
}

export interface SyncPushResponse {
  success: boolean;
  processedIds: number[];
  errors?: Array<{
    id: number;
    error: string;
  }>;
  timestamp: string;
}

export interface MeetPullData {
  meet: any;
  events: any[];
  athletes: any[];
  entries: any[];
  teams: any[];
  divisions: any[];
}

export interface ConflictResolution {
  strategy: 'last-writer-wins' | 'idempotent-insert';
  localTimestamp?: string;
  remoteTimestamp?: string;
  winner?: 'local' | 'remote';
}

export const SYNC_CONFIG = {
  SYNC_INTERVAL_MS: 5000,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
  MAX_BATCH_SIZE: 100,
} as const;

export type SyncOperationType = 'insert' | 'update' | 'delete';

export const MUTABLE_TABLES = [
  'meets',
  'events',
  'athletes',
  'entries',
  'teams',
  'divisions',
] as const;

export const LOG_LIKE_TABLES = [
  'live_event_data',
  'field_attempts',
  'entry_splits',
  'wind_readings',
] as const;

export type MutableTable = typeof MUTABLE_TABLES[number];
export type LogLikeTable = typeof LOG_LIKE_TABLES[number];
