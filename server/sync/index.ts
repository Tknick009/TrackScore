import { SQLiteStorage, type SyncEvent } from '../storage/sqlite-adapter';
import {
  type SyncStatus,
  type SyncPushPayload,
  type SyncPushResponse,
  type SyncEventPayload,
  type MeetPullData,
  SYNC_CONFIG,
  MUTABLE_TABLES,
  LOG_LIKE_TABLES,
} from './types';
import { randomUUID } from 'crypto';

export class SyncManager {
  private cloudUrl: string | null;
  private storage: SQLiteStorage | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private connected: boolean = false;
  private lastSyncAt: Date | null = null;
  private currentError: string | null = null;
  private retryDelay: number = SYNC_CONFIG.INITIAL_RETRY_DELAY_MS;
  private edgeId: string;
  private mode: 'edge' | 'cloud';

  constructor(cloudUrl?: string) {
    this.cloudUrl = cloudUrl || process.env.CLOUD_SERVER_URL || null;
    this.edgeId = process.env.EDGE_ID || randomUUID();
    this.mode = this.cloudUrl ? 'edge' : 'cloud';
  }

  setStorage(storage: SQLiteStorage): void {
    this.storage = storage;
  }

  getStatus(): SyncStatus {
    const pendingChanges = this.storage?.getPendingSyncEvents().length ?? 0;
    
    return {
      mode: this.mode,
      cloudUrl: this.cloudUrl,
      connected: this.connected,
      lastSyncAt: this.lastSyncAt,
      pendingChanges,
      error: this.currentError,
    };
  }

  start(): void {
    if (this.isRunning) {
      console.log('[Sync] Already running');
      return;
    }

    if (!this.cloudUrl) {
      console.log('[Sync] Running in cloud mode - no outbound sync needed');
      this.mode = 'cloud';
      return;
    }

    console.log(`[Sync] Starting sync daemon - connecting to ${this.cloudUrl}`);
    this.isRunning = true;
    this.mode = 'edge';

    this.syncInterval = setInterval(() => {
      this.syncLoop();
    }, SYNC_CONFIG.SYNC_INTERVAL_MS);

    this.syncLoop();
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('[Sync] Already stopped');
      return;
    }

    console.log('[Sync] Stopping sync daemon');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async syncLoop(): Promise<void> {
    if (!this.isRunning || !this.storage) {
      return;
    }

    try {
      await this.pushPendingChanges();
      this.connected = true;
      this.currentError = null;
      this.retryDelay = SYNC_CONFIG.INITIAL_RETRY_DELAY_MS;
    } catch (error: any) {
      this.connected = false;
      this.currentError = error.message || 'Unknown sync error';
      console.error('[Sync] Sync loop error:', error.message);
      
      this.retryDelay = Math.min(
        this.retryDelay * SYNC_CONFIG.BACKOFF_MULTIPLIER,
        SYNC_CONFIG.MAX_RETRY_DELAY_MS
      );
    }
  }

  async pushPendingChanges(): Promise<void> {
    if (!this.storage || !this.cloudUrl) {
      return;
    }

    const pendingEvents = this.storage.getPendingSyncEvents();
    
    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`[Sync] Pushing ${pendingEvents.length} pending changes`);

    const batches = this.batchEvents(pendingEvents, SYNC_CONFIG.MAX_BATCH_SIZE);

    for (const batch of batches) {
      await this.pushBatch(batch);
    }

    this.lastSyncAt = new Date();
  }

  private batchEvents(events: SyncEvent[], batchSize: number): SyncEvent[][] {
    const batches: SyncEvent[][] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }

  private async pushBatch(events: SyncEvent[]): Promise<void> {
    if (!this.storage || !this.cloudUrl) {
      return;
    }

    const payload: SyncPushPayload = {
      events: events.map(this.mapSyncEventToPayload),
      edgeId: this.edgeId,
      timestamp: new Date().toISOString(),
    };

    let attempt = 0;
    let delay: number = SYNC_CONFIG.INITIAL_RETRY_DELAY_MS;

    while (attempt < 5) {
      try {
        const response = await this.sendPushRequest(payload);
        
        if (response.success && response.processedIds.length > 0) {
          this.storage.markSyncEventsCompleted(response.processedIds);
          console.log(`[Sync] Successfully pushed ${response.processedIds.length} events`);
        }

        if (response.errors && response.errors.length > 0) {
          console.warn('[Sync] Some events failed:', response.errors);
        }

        return;
      } catch (error: any) {
        attempt++;
        console.error(`[Sync] Push attempt ${attempt} failed:`, error.message);
        
        if (attempt < 5) {
          await this.sleep(delay);
          delay = Math.min(delay * SYNC_CONFIG.BACKOFF_MULTIPLIER, SYNC_CONFIG.MAX_RETRY_DELAY_MS);
        }
      }
    }

    throw new Error('Failed to push changes after maximum retries');
  }

  private mapSyncEventToPayload(event: SyncEvent): SyncEventPayload {
    let parsedPayload: Record<string, any>;
    try {
      parsedPayload = JSON.parse(event.payload);
    } catch {
      parsedPayload = {};
    }

    return {
      id: event.id,
      tableName: event.tableName,
      recordId: event.recordId,
      operation: event.operation,
      payload: parsedPayload,
      createdAt: event.createdAt,
    };
  }

  private async sendPushRequest(payload: SyncPushPayload): Promise<SyncPushResponse> {
    const url = `${this.cloudUrl}/api/sync/push`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Edge-ID': this.edgeId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json() as SyncPushResponse;
  }

  async pullMeet(meetCode: string): Promise<MeetPullData | null> {
    if (!this.cloudUrl) {
      console.warn('[Sync] No cloud URL configured for pull');
      return null;
    }

    console.log(`[Sync] Pulling meet data for code: ${meetCode}`);

    try {
      const meetResponse = await fetch(`${this.cloudUrl}/api/meets/code/${meetCode}`);
      
      if (!meetResponse.ok) {
        if (meetResponse.status === 404) {
          console.log(`[Sync] Meet not found: ${meetCode}`);
          return null;
        }
        throw new Error(`Failed to fetch meet: HTTP ${meetResponse.status}`);
      }

      const meet = await meetResponse.json();
      const meetId = meet.id;

      const [eventsRes, athletesRes, entriesRes, teamsRes, divisionsRes] = await Promise.all([
        fetch(`${this.cloudUrl}/api/events?meetId=${meetId}`),
        fetch(`${this.cloudUrl}/api/athletes?meetId=${meetId}`),
        fetch(`${this.cloudUrl}/api/entries?meetId=${meetId}`),
        fetch(`${this.cloudUrl}/api/teams?meetId=${meetId}`),
        fetch(`${this.cloudUrl}/api/divisions?meetId=${meetId}`),
      ]);

      const events = eventsRes.ok ? await eventsRes.json() : [];
      const athletes = athletesRes.ok ? await athletesRes.json() : [];
      const entries = entriesRes.ok ? await entriesRes.json() : [];
      const teams = teamsRes.ok ? await teamsRes.json() : [];
      const divisions = divisionsRes.ok ? await divisionsRes.json() : [];

      const pullData: MeetPullData = {
        meet,
        events,
        athletes,
        entries,
        teams,
        divisions,
      };

      if (this.storage) {
        await this.storePulledData(pullData);
      }

      console.log(`[Sync] Successfully pulled meet ${meetCode}: ${events.length} events, ${athletes.length} athletes`);
      
      return pullData;
    } catch (error: any) {
      console.error(`[Sync] Failed to pull meet ${meetCode}:`, error.message);
      throw error;
    }
  }

  private async storePulledData(data: MeetPullData): Promise<void> {
    if (!this.storage) {
      return;
    }

    const existingMeet = await this.storage.getMeetByCode(data.meet.meetCode);
    
    if (existingMeet) {
      if (this.shouldUpdateRecord(existingMeet, data.meet)) {
        await this.storage.updateMeet(existingMeet.id, data.meet);
        console.log(`[Sync] Updated existing meet: ${data.meet.name}`);
      }
    } else {
      await this.storage.createMeet(data.meet);
      console.log(`[Sync] Created new meet: ${data.meet.name}`);
    }

    for (const team of data.teams) {
      try {
        await this.storage.createTeam(team);
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE constraint')) {
          console.warn(`[Sync] Failed to store team: ${team.name}`, error.message);
        }
      }
    }

    for (const division of data.divisions) {
      try {
        await this.storage.createDivision(division);
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE constraint')) {
          console.warn(`[Sync] Failed to store division: ${division.name}`, error.message);
        }
      }
    }

    for (const athlete of data.athletes) {
      try {
        await this.storage.createAthlete(athlete);
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE constraint')) {
          console.warn(`[Sync] Failed to store athlete: ${athlete.firstName} ${athlete.lastName}`, error.message);
        }
      }
    }

    for (const event of data.events) {
      try {
        await this.storage.createEvent(event);
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE constraint')) {
          console.warn(`[Sync] Failed to store event: ${event.name}`, error.message);
        }
      }
    }

    for (const entry of data.entries) {
      try {
        await this.storage.createEntry(entry);
      } catch (error: any) {
        if (!error.message?.includes('UNIQUE constraint')) {
          console.warn(`[Sync] Failed to store entry`, error.message);
        }
      }
    }

    console.log(`[Sync] Stored pulled data for meet: ${data.meet.name}`);
  }

  private shouldUpdateRecord(local: any, remote: any): boolean {
    const localTime = local.lastImportAt || local.updatedAt || local.createdAt;
    const remoteTime = remote.lastImportAt || remote.updatedAt || remote.createdAt;

    if (!localTime) return true;
    if (!remoteTime) return false;

    return new Date(remoteTime) > new Date(localTime);
  }

  resolveConflict(
    tableName: string,
    localRecord: any,
    remoteRecord: any
  ): { winner: 'local' | 'remote'; record: any } {
    if (LOG_LIKE_TABLES.includes(tableName as any)) {
      return { winner: 'remote', record: remoteRecord };
    }

    const localTimestamp = this.getRecordTimestamp(localRecord);
    const remoteTimestamp = this.getRecordTimestamp(remoteRecord);

    if (remoteTimestamp > localTimestamp) {
      return { winner: 'remote', record: remoteRecord };
    }

    return { winner: 'local', record: localRecord };
  }

  private getRecordTimestamp(record: any): Date {
    const timestamp = record.updatedAt || record.lastResultAt || record.createdAt;
    return timestamp ? new Date(timestamp) : new Date(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadLogo(logoUrl: string, meetId: string): Promise<string | null> {
    if (!this.cloudUrl || !logoUrl) {
      return null;
    }

    try {
      const fullUrl = logoUrl.startsWith('http') ? logoUrl : `${this.cloudUrl}${logoUrl}`;
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        console.warn(`[Sync] Failed to download logo: HTTP ${response.status}`);
        return null;
      }

      const fs = await import('fs');
      const path = await import('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'meets', meetId);
      fs.mkdirSync(uploadsDir, { recursive: true });
      
      const ext = path.extname(logoUrl) || '.png';
      const localPath = path.join(uploadsDir, `logo${ext}`);
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(localPath, Buffer.from(buffer));
      
      return `/uploads/meets/${meetId}/logo${ext}`;
    } catch (error: any) {
      console.error('[Sync] Failed to download logo:', error.message);
      return null;
    }
  }

  isEdgeMode(): boolean {
    return this.mode === 'edge';
  }

  isCloudMode(): boolean {
    return this.mode === 'cloud';
  }

  getEdgeId(): string {
    return this.edgeId;
  }
}

let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}

export const syncManager = getSyncManager();
