import chokidar, { type FSWatcher } from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { storage } from './storage';
import { ingestLIFResults } from './finishlynx-ingestion';
import { parseLFFFile, type NormalizedFieldResult } from './parsers/lff-parser';
import { importCompleteMDB } from './import-mdb-complete';
import type { MeetIngestionSettings } from '@shared/schema';

interface WatcherState {
  meetId: string;
  watcher: FSWatcher | null;
  mdbPollingInterval: NodeJS.Timeout | null;
}

class IngestionManager {
  private watchers: Map<string, WatcherState> = new Map();
  private isShuttingDown = false;

  async startWatchersForMeet(meetId: string): Promise<{ success: boolean; message: string }> {
    const settings = await storage.getIngestionSettings(meetId);
    
    if (!settings) {
      return { success: false, message: 'No ingestion settings found for this meet' };
    }

    await this.stopWatchersForMeet(meetId);

    const state: WatcherState = {
      meetId,
      watcher: null,
      mdbPollingInterval: null,
    };

    if (settings.lynxFilesEnabled && settings.lynxFilesDirectory) {
      try {
        const dirExists = fs.existsSync(settings.lynxFilesDirectory);
        if (!dirExists) {
          console.log(`[Ingestion] Lynx files directory does not exist: ${settings.lynxFilesDirectory}`);
        } else {
          state.watcher = this.createLynxFileWatcher(meetId, settings.lynxFilesDirectory);
          console.log(`[Ingestion] Started Lynx file watcher for meet ${meetId} on ${settings.lynxFilesDirectory}`);
          
          await this.processExistingFiles(meetId, settings.lynxFilesDirectory);
        }
      } catch (error) {
        console.error(`[Ingestion] Error starting Lynx file watcher:`, error);
      }
    }

    if (settings.hytekMdbEnabled && settings.hytekMdbPath) {
      try {
        const fileExists = fs.existsSync(settings.hytekMdbPath);
        if (!fileExists) {
          console.log(`[Ingestion] HyTek MDB file does not exist: ${settings.hytekMdbPath}`);
        } else {
          const pollInterval = (settings.hytekMdbPollIntervalSec || 60) * 1000;
          state.mdbPollingInterval = setInterval(
            () => this.checkAndImportMDB(meetId, settings.hytekMdbPath!),
            pollInterval
          );
          console.log(`[Ingestion] Started HyTek MDB polling for meet ${meetId} every ${pollInterval / 1000}s`);
          
          await this.checkAndImportMDB(meetId, settings.hytekMdbPath);
        }
      } catch (error) {
        console.error(`[Ingestion] Error starting HyTek MDB polling:`, error);
      }
    }

    this.watchers.set(meetId, state);
    return { success: true, message: 'Ingestion watchers started' };
  }

  async stopWatchersForMeet(meetId: string): Promise<void> {
    const state = this.watchers.get(meetId);
    if (!state) return;

    if (state.watcher) {
      await state.watcher.close();
      console.log(`[Ingestion] Stopped Lynx file watcher for meet ${meetId}`);
    }

    if (state.mdbPollingInterval) {
      clearInterval(state.mdbPollingInterval);
      console.log(`[Ingestion] Stopped HyTek MDB polling for meet ${meetId}`);
    }

    this.watchers.delete(meetId);
  }

  async stopAllWatchers(): Promise<void> {
    this.isShuttingDown = true;
    const meetIds = Array.from(this.watchers.keys());
    for (const meetId of meetIds) {
      await this.stopWatchersForMeet(meetId);
    }
  }

  private createLynxFileWatcher(meetId: string, directory: string): FSWatcher {
    const watcher = chokidar.watch(directory, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
      depth: 0,
    });

    watcher.on('add', async (filePath) => {
      if (this.isShuttingDown) return;
      await this.processLynxFile(meetId, filePath);
    });

    watcher.on('change', async (filePath) => {
      if (this.isShuttingDown) return;
      await this.processLynxFile(meetId, filePath);
    });

    watcher.on('error', (error) => {
      console.error(`[Ingestion] Watcher error for meet ${meetId}:`, error);
    });

    return watcher;
  }

  private async processExistingFiles(meetId: string, directory: string): Promise<void> {
    try {
      const files = fs.readdirSync(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.lif' || ext === '.lff') {
          await this.processLynxFile(meetId, filePath);
        }
      }
    } catch (error) {
      console.error(`[Ingestion] Error processing existing files:`, error);
    }
  }

  private async processLynxFile(meetId: string, filePath: string): Promise<void> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.lif' && ext !== '.lff') return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const fileHash = this.computeHash(content);

      const alreadyProcessed = await storage.isFileHashProcessed(meetId, filePath, fileHash);
      if (alreadyProcessed) {
        return;
      }

      console.log(`[Ingestion] Processing ${ext.toUpperCase()} file: ${filePath}`);

      let recordsProcessed = 0;

      if (ext === '.lif') {
        const result = await ingestLIFResults(content, meetId);
        recordsProcessed = result.processed;
        console.log(`[Ingestion] LIF file processed: ${result.processed} results, ${result.duplicates} duplicates, ${result.unmatched} unmatched`);
      } else if (ext === '.lff') {
        const result = await this.ingestLFFResults(filePath, meetId);
        recordsProcessed = result.processed;
        console.log(`[Ingestion] LFF file processed: ${result.processed} results, ${result.errors.length} errors`);
      }

      await storage.addProcessedFile({
        meetId,
        filePath,
        fileType: ext.slice(1),
        fileHash,
        recordsProcessed,
      });

      await storage.updateIngestionSettings(meetId, {
        lynxFilesProcessedCount: (await storage.getProcessedFiles(meetId)).length,
        lynxFilesLastScanAt: new Date(),
      } as any);

    } catch (error) {
      console.error(`[Ingestion] Error processing file ${filePath}:`, error);
    }
  }

  private async ingestLFFResults(filePath: string, meetId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    const { header, results } = await parseLFFFile(filePath);
    let processed = 0;
    const errors: string[] = [];

    for (const result of results) {
      try {
        const athletes = await storage.getAthletesByMeetId(meetId);
        const athlete = athletes.find(a => a.bibNumber === result.bibNumber.toString());

        if (!athlete) {
          errors.push(`Athlete with bib ${result.bibNumber} not found`);
          continue;
        }

        const events = await storage.getEventsByMeetId(meetId);
        const event = events.find(e => e.eventNumber === result.eventNumber);

        if (!event) {
          errors.push(`Event ${result.eventNumber} not found`);
          continue;
        }

        const eventWithEntries = await storage.getEventWithEntries(event.id);
        if (!eventWithEntries) {
          errors.push(`Event ${event.id} not found`);
          continue;
        }

        const existingEntry = eventWithEntries.entries.find(e => e.athleteId === athlete.id);
        let entryId: string;

        if (!existingEntry) {
          const newEntry = await storage.createEntry({
            eventId: event.id,
            athleteId: athlete.id,
            resultType: 'distance',
          });
          entryId = newEntry.id;
        } else {
          entryId = existingEntry.id;
        }

        await storage.updateEntry(entryId, {
          finalPlace: result.place !== null ? result.place : undefined,
          finalMark: result.bestMark !== null ? result.bestMark : undefined,
        });

        processed++;
      } catch (error) {
        errors.push(`Error processing result for bib ${result.bibNumber}: ${error}`);
      }
    }

    return { processed, errors };
  }

  private async checkAndImportMDB(meetId: string, mdbPath: string): Promise<void> {
    // Use copy-first approach to minimize lock time on original MDB file
    // HyTek uses file-level locking, so we copy quickly and read from the copy
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    const tempMdbPath = path.join(tempDir, `mdb_copy_${meetId}_${Date.now()}.mdb`);
    
    try {
      if (!fs.existsSync(mdbPath)) {
        console.log(`[Ingestion] MDB file not found: ${mdbPath}`);
        return;
      }

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Quick copy to temp location - minimizes lock time on original
      try {
        fs.copyFileSync(mdbPath, tempMdbPath);
      } catch (copyError: any) {
        // File might be locked by HyTek, skip this polling cycle
        if (copyError.code === 'EBUSY' || copyError.code === 'EACCES') {
          console.log(`[Ingestion] MDB file busy/locked, will retry next cycle: ${mdbPath}`);
          return;
        }
        throw copyError;
      }

      // Hash the copy (not the original)
      const content = fs.readFileSync(tempMdbPath);
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      const settings = await storage.getIngestionSettings(meetId);
      if (settings?.hytekMdbLastHash === fileHash) {
        // No changes, clean up temp file and return
        this.cleanupTempFile(tempMdbPath);
        return;
      }

      console.log(`[Ingestion] MDB file changed, importing from copy: ${tempMdbPath}`);
      
      // Clear existing import data before re-importing
      const clearStats = await storage.clearMeetImportData(meetId);
      console.log(`[Ingestion] 🧹 Pre-import clear: ${JSON.stringify(clearStats)}`);
      
      // Import from the copy, not the original
      const stats = await importCompleteMDB(tempMdbPath, meetId);
      console.log(`[Ingestion] MDB import complete:`, stats);

      await storage.updateIngestionSettings(meetId, {
        hytekMdbLastHash: fileHash,
        hytekMdbLastImportAt: new Date(),
      } as any);

    } catch (error) {
      console.error(`[Ingestion] Error importing MDB file:`, error);
    } finally {
      // Always clean up temp file
      this.cleanupTempFile(tempMdbPath);
    }
  }

  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`[Ingestion] Failed to clean up temp file: ${filePath}`, error);
    }
  }

  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async getStatus(meetId: string): Promise<{
    lynxFilesWatching: boolean;
    lynxFilesDirectory: string | null;
    hytekMdbPolling: boolean;
    hytekMdbPath: string | null;
    hytekMdbLastCheck: string | null;
    processedFilesCount: number;
    lastError: string | null;
  }> {
    const state = this.watchers.get(meetId);
    const settings = await storage.getIngestionSettings(meetId);
    const processedFiles = await storage.getProcessedFiles(meetId);

    return {
      lynxFilesWatching: !!state?.watcher,
      lynxFilesDirectory: settings?.lynxFilesDirectory || null,
      hytekMdbPolling: !!state?.mdbPollingInterval,
      hytekMdbPath: settings?.hytekMdbPath || null,
      hytekMdbLastCheck: settings?.hytekMdbLastImportAt?.toISOString() || null,
      processedFilesCount: processedFiles.length,
      lastError: null,
    };
  }

  async testLynxDirectory(directory: string): Promise<{
    valid: boolean;
    exists: boolean;
    readable: boolean;
    lifCount: number;
    lffCount: number;
    message: string;
  }> {
    try {
      if (!fs.existsSync(directory)) {
        return { valid: false, exists: false, readable: false, lifCount: 0, lffCount: 0, message: 'Directory does not exist' };
      }

      const stats = fs.statSync(directory);
      if (!stats.isDirectory()) {
        return { valid: false, exists: true, readable: false, lifCount: 0, lffCount: 0, message: 'Path is not a directory' };
      }

      const files = fs.readdirSync(directory);
      const lifCount = files.filter(f => f.toLowerCase().endsWith('.lif')).length;
      const lffCount = files.filter(f => f.toLowerCase().endsWith('.lff')).length;

      return {
        valid: true,
        exists: true,
        readable: true,
        lifCount,
        lffCount,
        message: `Found ${lifCount} LIF and ${lffCount} LFF files`,
      };
    } catch (error: any) {
      return { valid: false, exists: false, readable: false, lifCount: 0, lffCount: 0, message: error.message };
    }
  }

  async testMdbPath(mdbPath: string): Promise<{
    valid: boolean;
    exists: boolean;
    readable: boolean;
    message: string;
  }> {
    try {
      if (!fs.existsSync(mdbPath)) {
        return { valid: false, exists: false, readable: false, message: 'File does not exist' };
      }

      const stats = fs.statSync(mdbPath);
      if (!stats.isFile()) {
        return { valid: false, exists: true, readable: false, message: 'Path is not a file' };
      }

      if (!mdbPath.toLowerCase().endsWith('.mdb')) {
        return { valid: false, exists: true, readable: false, message: 'File is not an MDB file' };
      }

      fs.accessSync(mdbPath, fs.constants.R_OK);

      return {
        valid: true,
        exists: true,
        readable: true,
        message: 'MDB file is accessible and readable',
      };
    } catch (error: any) {
      return { valid: false, exists: false, readable: false, message: error.message };
    }
  }

  async autoStartForAllMeets(): Promise<void> {
    console.log(`[Ingestion] Auto-starting ingestion watchers for all configured meets...`);
    
    try {
      const meets = await storage.getMeets();
      
      for (const meet of meets) {
        const settings = await storage.getIngestionSettings(meet.id);
        
        if (settings && (settings.lynxFilesEnabled || settings.hytekMdbEnabled)) {
          await this.startWatchersForMeet(meet.id);
        }
      }
    } catch (error) {
      console.error(`[Ingestion] Error during auto-start:`, error);
    }
  }
}

export const ingestionManager = new IngestionManager();
