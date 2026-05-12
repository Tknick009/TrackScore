/**
 * Child process script for HyTek MDB imports.
 * Spawned via child_process.fork() so the main event loop
 * (clock ticks, FinishLynx data, WebSocket broadcasts) stays responsive.
 *
 * Receives { mdbPath, meetId } via IPC message, sends back { type, stats | error }.
 */
import { importCompleteMDB } from './import-mdb-complete';

process.on('message', async (msg: { mdbPath: string; meetId: string }) => {
  const { mdbPath, meetId } = msg;

  try {
    console.log(`[MDB Worker] Starting import: ${mdbPath} for meet ${meetId}`);
    const stats = await importCompleteMDB(mdbPath, meetId);
    process.send?.({ type: 'complete', stats });
  } catch (err: any) {
    process.send?.({ type: 'error', error: err.message || String(err) });
  }

  // Exit cleanly after the import finishes
  process.exit(0);
});
