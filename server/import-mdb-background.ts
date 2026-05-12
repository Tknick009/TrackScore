/**
 * Background MDB import using child_process.fork().
 *
 * Spawns a separate Node.js process with tsx for each import, so the main
 * event loop (clock ticks, FinishLynx data, WebSocket broadcasts) is never
 * blocked by MDB parsing or SQLite writes.
 *
 * Includes a queue so when multiple MDB watchers fire simultaneously,
 * imports run sequentially instead of being dropped.
 *
 * Usage:
 *   import { importMDBInBackground } from './import-mdb-background';
 *   const stats = await importMDBInBackground(mdbPath, meetId);
 */
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import type { ImportStatistics } from './import-mdb-complete';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
function processQueue() {
  if (activeImport || importQueue.length === 0) return;

  activeImport = true;
  const { mdbPath, meetId, resolve, reject } = importQueue.shift()!;

  const workerPath = path.resolve(__dirname, 'import-mdb-worker.ts');

  // fork() spawns a new Node.js process. We pass --import tsx so the child
  // process can load TypeScript files directly, just like the main process.
  const child = fork(workerPath, [], {
    execArgv: ['--import', 'tsx'],
    env: { ...process.env },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });

  let settled = false;

  child.on('message', (msg: { type: string; stats?: ImportStatistics; error?: string }) => {
    if (settled) return;
    settled = true;

    if (msg.type === 'complete') {
      resolve(msg.stats!);
    } else if (msg.type === 'error') {
      reject(new Error(msg.error || 'Unknown worker error'));
    }
  });

  child.on('error', (err) => {
    if (settled) return;
    settled = true;
    reject(err);
  });

  child.on('exit', (code) => {
    if (!settled) {
      settled = true;
      if (code !== 0) {
        reject(new Error(`MDB import process exited with code ${code}`));
      }
    }
    activeImport = false;
    processQueue();
  });

  // Send the import parameters to the child process
  child.send({ mdbPath, meetId });
}

/**
 * Run an MDB import in a separate process. If another import is already
 * running, this one is queued and will execute when the current one finishes.
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

/** Check if an import is currently running in the background. */
export function isMDBImportRunning(): boolean {
  return activeImport;
}
