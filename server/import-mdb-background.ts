/**
 * Background MDB import using child_process.fork().
 *
 * Keeps a persistent worker process alive between imports to avoid the
 * overhead of re-spawning Node.js + tsx on every file change (~2-5s saved).
 * Falls back to spawning a new worker if the persistent one dies.
 *
 * Includes a queue so when multiple MDB watchers fire simultaneously,
 * imports run sequentially instead of being dropped.
 *
 * Usage:
 *   import { importMDBInBackground } from './import-mdb-background';
 *   const stats = await importMDBInBackground(mdbPath, meetId);
 */
import { fork, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import type { ImportStatistics } from './import-mdb-complete';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Track whether any import is currently running (only one at a time). */
let activeImport = false;

/** Persistent worker process — stays alive between imports. */
let persistentWorker: ChildProcess | null = null;

/** Queue of pending imports to run after the current one finishes. */
const importQueue: Array<{
  mdbPath: string;
  meetId: string;
  resolve: (stats: ImportStatistics) => void;
  reject: (err: Error) => void;
}> = [];

/** Get or create the persistent worker process. */
function getWorker(): ChildProcess {
  if (persistentWorker && persistentWorker.connected) {
    return persistentWorker;
  }

  const workerPath = path.resolve(__dirname, 'import-mdb-worker.ts');
  persistentWorker = fork(workerPath, [], {
    execArgv: ['--import', 'tsx'],
    env: { ...process.env },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });

  persistentWorker.on('exit', (code) => {
    console.log(`[MDB Background] Worker exited with code ${code}, will respawn on next import`);
    persistentWorker = null;
  });

  persistentWorker.on('error', (err) => {
    console.error(`[MDB Background] Worker error:`, err);
    persistentWorker = null;
  });

  return persistentWorker;
}

/** Process the next item in the queue, if any. */
function processQueue() {
  if (activeImport || importQueue.length === 0) return;

  activeImport = true;
  const { mdbPath, meetId, resolve, reject } = importQueue.shift()!;

  const child = getWorker();
  let settled = false;

  const onMessage = (msg: { type: string; stats?: ImportStatistics; error?: string }) => {
    if (settled) return;
    settled = true;
    child.removeListener('message', onMessage);
    child.removeListener('exit', onExit);

    activeImport = false;

    if (msg.type === 'complete') {
      resolve(msg.stats!);
    } else if (msg.type === 'error') {
      reject(new Error(msg.error || 'Unknown worker error'));
    }

    // Process next in queue
    processQueue();
  };

  const onExit = (code: number | null) => {
    if (settled) return;
    settled = true;
    child.removeListener('message', onMessage);
    child.removeListener('exit', onExit);

    activeImport = false;
    persistentWorker = null;

    reject(new Error(`MDB import process exited unexpectedly with code ${code}`));
    processQueue();
  };

  child.on('message', onMessage);
  child.once('exit', onExit);

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
