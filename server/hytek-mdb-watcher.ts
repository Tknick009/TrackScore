import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { FSWatcher } from 'chokidar';
import { importCompleteMDB } from './import-mdb-complete';

interface HytekMdbWatcherState {
  meetId: string;
  watcher: FSWatcher | null;
  lastHash: string | null;
  mdbFilePath: string;
  lastImportAt: Date | null;
  importing: boolean;
}

interface HytekMdbConfig {
  meetId: string;
  mdbDirectory: string;
}

const HYTEK_MDB_CONFIG_FILE = './hytek-mdb-config.json';
const watchers = new Map<string, HytekMdbWatcherState>();

let importCallback: ((meetId: string) => void) | null = null;

export function setHytekImportCallback(callback: (meetId: string) => void): void {
  importCallback = callback;
}

function computeFileHash(buffer: Buffer): string {
  let hash = 0;
  for (let i = 0; i < buffer.length; i++) {
    hash = ((hash << 5) - hash) + buffer[i];
    hash = hash & hash;
  }
  return hash.toString(16);
}

function findMdbFile(directory: string): string | null {
  try {
    const files = fs.readdirSync(directory);
    const mdbFile = files.find(f => f.toLowerCase().endsWith('.mdb'));
    if (mdbFile) {
      return path.join(directory, mdbFile);
    }
  } catch (err) {
    console.error(`[HyTek MDB Watcher] Error reading directory ${directory}:`, err);
  }
  return null;
}

async function handleMdbChange(state: HytekMdbWatcherState, filePath: string): Promise<void> {
  if (!filePath.toLowerCase().endsWith('.mdb')) return;
  if (state.importing) {
    console.log(`[HyTek MDB Watcher] Import already in progress for meet ${state.meetId}, skipping`);
    return;
  }

  const tempDir = path.join('data', 'temp');
  const tempFile = path.join(tempDir, `hytek_${Date.now()}_${path.basename(filePath)}`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.copyFileSync(filePath, tempFile);
    console.log(`[HyTek MDB Watcher] Copied MDB to temp: ${tempFile}`);

    const buffer = fs.readFileSync(tempFile);
    const hash = computeFileHash(buffer);

    if (hash === state.lastHash) {
      return;
    }

    state.lastHash = hash;
    state.importing = true;

    console.log(`[HyTek MDB Watcher] MDB file changed: ${filePath}, importing for meet ${state.meetId}`);
    const stats = await importCompleteMDB(tempFile, state.meetId);
    state.lastImportAt = new Date();

    console.log(`[HyTek MDB Watcher] Import complete for meet ${state.meetId}: ${stats.events} events, ${stats.athletes} athletes, ${stats.entries} entries`);

    if (importCallback) {
      importCallback(state.meetId);
    }
  } catch (error) {
    console.error(`[HyTek MDB Watcher] Error importing MDB for meet ${state.meetId}:`, error);
  } finally {
    state.importing = false;
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {}
  }
}

export function startHytekMdbWatcher(meetId: string, mdbPath: string): { success: boolean; error?: string } {
  stopHytekMdbWatcher(meetId);

  if (!mdbPath) {
    return { success: false, error: 'No MDB path provided' };
  }

  if (!fs.existsSync(mdbPath)) {
    return { success: false, error: `Path not found: ${mdbPath}` };
  }

  const stat = fs.statSync(mdbPath);
  let resolvedMdbFile: string;

  if (stat.isFile() && mdbPath.toLowerCase().endsWith('.mdb')) {
    resolvedMdbFile = mdbPath;
  } else if (stat.isDirectory()) {
    const found = findMdbFile(mdbPath);
    if (!found) {
      return { success: false, error: `No .mdb file found in directory: ${mdbPath}` };
    }
    resolvedMdbFile = found;
  } else {
    return { success: false, error: `Path is not a .mdb file or directory: ${mdbPath}` };
  }

  const watchDir = path.dirname(resolvedMdbFile);
  const targetBasename = path.basename(resolvedMdbFile).toLowerCase();

  const watcher = chokidar.watch(watchDir, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
    ignored: (filePath: string) => {
      const basename = path.basename(filePath);
      if (basename === path.basename(watchDir)) return false;
      return basename.toLowerCase() !== targetBasename;
    },
  });

  const state: HytekMdbWatcherState = {
    meetId,
    watcher,
    lastHash: null,
    mdbFilePath: resolvedMdbFile,
    lastImportAt: null,
    importing: false,
  };

  watcher.on('add', async (filePath) => {
    console.log(`[HyTek MDB Watcher] File detected: ${filePath}`);
    await handleMdbChange(state, filePath);
  });

  watcher.on('change', async (filePath) => {
    console.log(`[HyTek MDB Watcher] File changed: ${filePath}`);
    await handleMdbChange(state, filePath);
  });

  watcher.on('error', (error) => {
    console.error(`[HyTek MDB Watcher] Error for meet ${meetId}:`, error);
  });

  watchers.set(meetId, state);
  console.log(`[HyTek MDB Watcher] Started watching file: ${resolvedMdbFile} for meet ${meetId}`);

  return { success: true };
}

export function stopHytekMdbWatcher(meetId: string): void {
  const state = watchers.get(meetId);
  if (state?.watcher) {
    state.watcher.close();
    console.log(`[HyTek MDB Watcher] Stopped watching for meet ${meetId}`);
  }
  watchers.delete(meetId);
}

export function stopAllHytekMdbWatchers(): void {
  watchers.forEach((state) => {
    if (state.watcher) {
      state.watcher.close();
    }
  });
  watchers.clear();
  console.log('[HyTek MDB Watcher] All watchers stopped');
}

export function getActiveHytekMdbWatchers(): { meetId: string; mdbDirectory: string; mdbFileName: string | null; mdbFilePath: string | null; lastImportAt: string | null }[] {
  const result: { meetId: string; mdbDirectory: string; mdbFileName: string | null; mdbFilePath: string | null; lastImportAt: string | null }[] = [];
  watchers.forEach((state, meetId) => {
    result.push({
      meetId,
      mdbDirectory: path.dirname(state.mdbFilePath),
      mdbFileName: path.basename(state.mdbFilePath),
      mdbFilePath: state.mdbFilePath,
      lastImportAt: state.lastImportAt?.toISOString() || null,
    });
  });
  return result;
}

export function loadHytekMdbConfigs(): HytekMdbConfig[] {
  try {
    if (fs.existsSync(HYTEK_MDB_CONFIG_FILE)) {
      const content = fs.readFileSync(HYTEK_MDB_CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[HyTek MDB Config] Error loading config:', err);
  }
  return [];
}

export function saveHytekMdbConfigs(configs: HytekMdbConfig[]): void {
  fs.writeFileSync(HYTEK_MDB_CONFIG_FILE, JSON.stringify(configs, null, 2));
}

export async function triggerManualImport(meetId: string): Promise<{ success: boolean; error?: string; stats?: any }> {
  const state = watchers.get(meetId);
  if (!state) {
    return { success: false, error: 'No active watcher for this meet' };
  }

  const mdbFile = state.mdbFilePath;
  if (!mdbFile || !fs.existsSync(mdbFile)) {
    return { success: false, error: `MDB file not found: ${mdbFile}` };
  }

  if (state.importing) {
    return { success: false, error: 'Import already in progress' };
  }

  try {
    state.importing = true;
    state.lastHash = null;
    const stats = await importCompleteMDB(mdbFile, meetId);
    state.lastImportAt = new Date();
    return { success: true, stats };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    state.importing = false;
  }
}
