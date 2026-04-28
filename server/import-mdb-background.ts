/**
 * Background MDB import using Worker Threads.
 * 
 * Wraps importCompleteMDB so it runs in a separate thread, keeping the main
 * event loop free for clock ticks, FinishLynx data, and WebSocket broadcasts.
 * 
 * Usage:
 *   import { importMDBInBackground } from './import-mdb-background';
 *   const stats = await importMDBInBackground(mdbPath, meetId);
 */
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import type { ImportStatistics } from './import-mdb-complete.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Track whether any import is currently running (only one at a time). */
let activeImport = false;

/**
 * Run an MDB import in a Worker Thread so the main thread stays responsive.
 * Returns the same ImportStatistics that importCompleteMDB returns.
 * Only one import can run at a time — concurrent calls are rejected.
 */
export function importMDBInBackground(
  mdbPath: string,
  meetId: string,
): Promise<ImportStatistics> {
  if (activeImport) {
    return Promise.reject(new Error('An MDB import is already in progress'));
  }

  activeImport = true;

  return new Promise<ImportStatistics>((resolve, reject) => {
    // Resolve the worker script path relative to this file.
    // At runtime under tsx the .ts extension is loaded directly.
    const workerPath = path.resolve(__dirname, 'import-mdb-worker.ts');

    const worker = new Worker(workerPath, {
      workerData: { mdbPath, meetId },
      // Inherit environment so EDGE_MODE, SQLITE_DB_PATH, etc. are available
      env: { ...process.env },
    });

    worker.on('message', (msg: { type: string; stats?: ImportStatistics; error?: string; message?: string }) => {
      if (msg.type === 'complete') {
        activeImport = false;
        resolve(msg.stats!);
      } else if (msg.type === 'error') {
        activeImport = false;
        reject(new Error(msg.error || 'Unknown worker error'));
      } else if (msg.type === 'log') {
        console.log(msg.message);
      }
    });

    worker.on('error', (err) => {
      activeImport = false;
      reject(err);
    });

    worker.on('exit', (code) => {
      activeImport = false;
      if (code !== 0) {
        reject(new Error(`MDB import worker exited with code ${code}`));
      }
    });
  });
}

/** Check if an import is currently running in the background. */
export function isMDBImportRunning(): boolean {
  return activeImport;
}
