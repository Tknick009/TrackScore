import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { syncManager } from './index';
import type {
  SyncPushPayload,
  SyncPushResponse,
  SyncEventPayload,
} from './types';
import { MUTABLE_TABLES, LOG_LIKE_TABLES } from './types';

const router = Router();

const syncPushSchema = z.object({
  events: z.array(z.object({
    id: z.number(),
    tableName: z.string(),
    recordId: z.string(),
    operation: z.enum(['insert', 'update', 'delete']),
    payload: z.record(z.any()),
    createdAt: z.string(),
  })),
  edgeId: z.string(),
  timestamp: z.string(),
});

router.post('/push', async (req: Request, res: Response) => {
  try {
    const validation = syncPushSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        processedIds: [],
        errors: [{ id: 0, error: 'Invalid payload format' }],
        timestamp: new Date().toISOString(),
      });
    }

    const { events, edgeId, timestamp } = validation.data as SyncPushPayload;
    
    console.log(`[Sync] Received push from edge ${edgeId}: ${events.length} events`);

    const processedIds: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    for (const event of events) {
      try {
        await processIncomingEvent(event);
        processedIds.push(event.id);
      } catch (error: any) {
        console.error(`[Sync] Failed to process event ${event.id}:`, error.message);
        errors.push({ id: event.id, error: error.message });
      }
    }

    const response: SyncPushResponse = {
      success: errors.length === 0,
      processedIds,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('[Sync] Push endpoint error:', error.message);
    res.status(500).json({
      success: false,
      processedIds: [],
      errors: [{ id: 0, error: error.message }],
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = syncManager.getStatus();
    res.json({
      ...status,
      lastSyncAt: status.lastSyncAt ? status.lastSyncAt.toISOString() : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pull/:meetCode', async (req: Request, res: Response) => {
  try {
    const { meetCode } = req.params;
    
    if (!meetCode || meetCode.length < 4) {
      return res.status(400).json({ error: 'Invalid meet code' });
    }

    const meetData = await syncManager.pullMeet(meetCode);
    
    if (!meetData) {
      return res.status(404).json({ error: 'Meet not found' });
    }

    res.json({
      success: true,
      meet: meetData.meet,
      counts: {
        events: meetData.events.length,
        athletes: meetData.athletes.length,
        entries: meetData.entries.length,
        teams: meetData.teams.length,
        divisions: meetData.divisions.length,
      },
    });
  } catch (error: any) {
    console.error('[Sync] Pull endpoint error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/start', async (req: Request, res: Response) => {
  try {
    syncManager.start();
    res.json({ success: true, status: syncManager.getStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stop', async (req: Request, res: Response) => {
  try {
    syncManager.stop();
    res.json({ success: true, status: syncManager.getStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function processIncomingEvent(event: SyncEventPayload): Promise<void> {
  const { tableName, recordId, operation, payload, createdAt } = event;

  console.log(`[Sync] Processing ${operation} on ${tableName}:${recordId}`);

  switch (tableName) {
    case 'meets':
      await processMeetEvent(recordId, operation, payload);
      break;
    case 'events':
      await processEventEvent(recordId, operation, payload);
      break;
    case 'athletes':
      await processAthleteEvent(recordId, operation, payload);
      break;
    case 'entries':
      await processEntryEvent(recordId, operation, payload);
      break;
    case 'teams':
      await processTeamEvent(recordId, operation, payload);
      break;
    case 'divisions':
      await processDivisionEvent(recordId, operation, payload);
      break;
    case 'field_attempts':
      await processFieldAttemptEvent(recordId, operation, payload);
      break;
    case 'live_event_data':
      await processLiveEventDataEvent(recordId, operation, payload);
      break;
    case 'entry_splits':
      await processEntrySplitEvent(recordId, operation, payload);
      break;
    case 'wind_readings':
      await processWindReadingEvent(recordId, operation, payload);
      break;
    default:
      console.warn(`[Sync] Unknown table: ${tableName}`);
  }
}

async function processMeetEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  const existingMeet = await storage.getMeet(recordId);

  if (operation === 'insert') {
    if (!existingMeet) {
      await storage.createMeet(payload as any);
    }
  } else if (operation === 'update') {
    if (existingMeet) {
      const shouldUpdate = shouldApplyUpdate(existingMeet, payload);
      if (shouldUpdate) {
        await storage.updateMeet(recordId, payload);
      }
    } else {
      await storage.createMeet({ ...payload, id: recordId } as any);
    }
  } else if (operation === 'delete') {
    if (existingMeet) {
      await storage.deleteMeet(recordId);
    }
  }
}

async function processEventEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  const existingEvent = await storage.getEvent(recordId);

  if (operation === 'insert') {
    if (!existingEvent) {
      await storage.createEvent(payload as any);
    }
  } else if (operation === 'update') {
    if (existingEvent && payload.status) {
      await storage.updateEventStatus(recordId, payload.status);
    }
  }
}

async function processAthleteEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  const existingAthlete = await storage.getAthlete(recordId);

  if (operation === 'insert') {
    if (!existingAthlete) {
      await storage.createAthlete(payload as any);
    }
  }
}

async function processEntryEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  const existingEntry = await storage.getEntry(recordId);

  if (operation === 'insert') {
    if (!existingEntry) {
      await storage.createEntry(payload as any);
    }
  } else if (operation === 'update') {
    if (existingEntry) {
      const shouldUpdate = shouldApplyUpdate(existingEntry, payload);
      if (shouldUpdate) {
        await storage.updateEntry(recordId, payload);
      }
    }
  }
}

async function processTeamEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  const existingTeam = await storage.getTeam(recordId);

  if (operation === 'insert') {
    if (!existingTeam) {
      await storage.createTeam(payload as any);
    }
  }
}

async function processDivisionEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  const existingDivision = await storage.getDivision(recordId);

  if (operation === 'insert') {
    if (!existingDivision) {
      await storage.createDivision(payload as any);
    }
  }
}

async function processFieldAttemptEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  if (operation === 'insert') {
    try {
      await storage.createFieldAttempt(payload as any);
    } catch (error: any) {
      if (!error.message?.includes('UNIQUE constraint')) {
        throw error;
      }
    }
  } else if (operation === 'update') {
    await storage.updateFieldAttempt(recordId, payload);
  }
}

async function processLiveEventDataEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  if (operation === 'insert' || operation === 'update') {
    try {
      await storage.upsertLiveEventData(payload as any);
    } catch (error: any) {
      console.warn('[Sync] Failed to upsert live event data:', error.message);
    }
  }
}

async function processEntrySplitEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  if (operation === 'insert') {
    try {
      await storage.createEntrySplit(payload as any);
    } catch (error: any) {
      if (!error.message?.includes('UNIQUE constraint')) {
        throw error;
      }
    }
  }
}

async function processWindReadingEvent(
  recordId: string,
  operation: string,
  payload: Record<string, any>
): Promise<void> {
  if (operation === 'insert') {
    try {
      await storage.createWindReading(payload as any);
    } catch (error: any) {
      if (!error.message?.includes('UNIQUE constraint')) {
        throw error;
      }
    }
  }
}

function shouldApplyUpdate(
  localRecord: any,
  remotePayload: Record<string, any>
): boolean {
  const localTimestamp = getRecordTimestamp(localRecord);
  const remoteTimestamp = getRecordTimestamp(remotePayload);

  return remoteTimestamp >= localTimestamp;
}

function getRecordTimestamp(record: any): Date {
  const timestamp =
    record.updatedAt ||
    record.lastResultAt ||
    record.lastImportAt ||
    record.createdAt ||
    record.recordedAt;
  return timestamp ? new Date(timestamp) : new Date(0);
}

export default router;
