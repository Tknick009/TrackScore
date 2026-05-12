/**
 * Worker Thread script for HyTek MDB imports.
 * Runs importCompleteMDB in a separate thread so the main event loop
 * (clock ticks, FinishLynx data, WebSocket broadcasts) stays responsive.
 *
 * Receives { mdbPath, meetId } via workerData, posts back { type, stats | error }.
 */
import { workerData, parentPort } from 'worker_threads';
import { importCompleteMDB } from './import-mdb-complete.ts';

interface WorkerInput {
  mdbPath: string;
  meetId: string;
}

async function run() {
  const { mdbPath, meetId } = workerData as WorkerInput;

  try {
    parentPort?.postMessage({ type: 'log', message: `[MDB Worker] Starting import: ${mdbPath} for meet ${meetId}` });
    const stats = await importCompleteMDB(mdbPath, meetId);
    parentPort?.postMessage({ type: 'complete', stats });
  } catch (err: any) {
    parentPort?.postMessage({ type: 'error', error: err.message || String(err) });
  }
}

run();
