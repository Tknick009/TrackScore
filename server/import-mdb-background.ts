/**
 * Background MDB import wrapper.
 *
 * Provides a mutex (one import at a time) and a queue so that when multiple
 * MDB watchers fire simultaneously, imports run sequentially instead of
 * being dropped.
 *
 * Note: Worker Threads are not used because tsx (TypeScript Execute) does not
 * reliably propagate its ESM loader to worker threads on Windows. The import
 * runs on the main thread using async/await, which yields to the event loop
 * between database operations so clock ticks and WebSocket broadcasts continue.
 *
 * Usage:
 *   import { importMDBInBackground } from './import-mdb-background';
 *   const stats = await importMDBInBackground(mdbPath, meetId);
 */
import { importCompleteMDB, type ImportStatistics } from './import-mdb-complete';

/** Track whether any import is currently running (only one at a time). */
let activeImport = false;

/** Queue of pending imports to run after the current one finishes. */
const importQueue: Array<{
  mdbPath: string;
  meetId: string;
  resolve: (stats: ImportStatistics) => void;
  reject: (err: Error) => void;
}> = [];

/** Process the next item in the queue, if any. */
async function processQueue() {
  if (activeImport || importQueue.length === 0) return;

  activeImport = true;
  const { mdbPath, meetId, resolve, reject } = importQueue.shift()!;

  try {
    console.log(`[MDB Import] Starting import: ${mdbPath} for meet ${meetId}`);
    const stats = await importCompleteMDB(mdbPath, meetId);
    resolve(stats);
  } catch (err: any) {
    reject(err instanceof Error ? err : new Error(String(err)));
  } finally {
    activeImport = false;
    // Process next queued import
    processQueue();
  }
}

/**
 * Run an MDB import. If another import is already running, this one is
 * queued and will execute as soon as the current import finishes.
 * Returns the same ImportStatistics that importCompleteMDB returns.
 */
export function importMDBInBackground(
  mdbPath: string,
  meetId: string,
): Promise<ImportStatistics> {
  return new Promise<ImportStatistics>((resolve, reject) => {
    importQueue.push({ mdbPath, meetId, resolve, reject });
    processQueue();
  });
}

/** Check if an import is currently running. */
export function isMDBImportRunning(): boolean {
  return activeImport;
}
