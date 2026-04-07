import fs from 'fs';
import path from 'path';
import { storage } from './storage';
import { importMeetPackage, exportMeetPackage, listMeetPackages } from './meet-package';
import type { ImportResult } from './meet-package';

const DATA_DIR = './data';
const CONFIG_FILE = 'edge-config.json';
const LOCAL_PACKAGES_DIR = './meets';

export interface FolderSyncConfig {
  syncFolderPath: string;
  autoSyncOnBoot: boolean;
  lastSyncTime?: string;
  lastSyncResults?: FolderSyncResult[];
}

export interface FolderSyncResult {
  packageName: string;
  meetName: string;
  meetCode: string;
  action: 'imported' | 'skipped_exists' | 'skipped_error';
  error?: string;
  stats?: {
    events: number;
    athletes: number;
    teams: number;
    scenes: number;
  };
}

export interface FolderSyncSummary {
  success: boolean;
  syncFolderPath: string;
  packagesFound: number;
  imported: number;
  skippedExists: number;
  skippedError: number;
  results: FolderSyncResult[];
  error?: string;
}

/**
 * Get the current folder sync configuration from edge-config.json
 */
export function getFolderSyncConfig(): FolderSyncConfig | null {
  try {
    const configPath = path.join(DATA_DIR, CONFIG_FILE);
    if (!fs.existsSync(configPath)) return null;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config.syncFolderPath) return null;

    return {
      syncFolderPath: config.syncFolderPath,
      autoSyncOnBoot: config.autoSyncOnBoot ?? true,
      lastSyncTime: config.lastSyncTime,
      lastSyncResults: config.lastSyncResults,
    };
  } catch (error) {
    console.error('[Folder Sync] Error reading config:', error);
    return null;
  }
}

/**
 * Save folder sync configuration to edge-config.json
 */
export function saveFolderSyncConfig(syncFolderPath: string, autoSyncOnBoot: boolean = true): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const configPath = path.join(DATA_DIR, CONFIG_FILE);
    let config: Record<string, any> = {};

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    config.syncFolderPath = syncFolderPath;
    config.autoSyncOnBoot = autoSyncOnBoot;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[Folder Sync] Config saved: syncFolderPath=${syncFolderPath}, autoSyncOnBoot=${autoSyncOnBoot}`);
  } catch (error) {
    console.error('[Folder Sync] Error saving config:', error);
    throw error;
  }
}

/**
 * Save sync results to config for status display
 */
function saveSyncResults(results: FolderSyncResult[]): void {
  try {
    const configPath = path.join(DATA_DIR, CONFIG_FILE);
    if (!fs.existsSync(configPath)) return;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.lastSyncTime = new Date().toISOString();
    config.lastSyncResults = results;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('[Folder Sync] Error saving sync results:', error);
  }
}

/**
 * Scan a folder for meet-package.json files.
 * Supports two structures:
 *   1. folder/<meet-name>/meet-package.json  (same as ./meets/ structure)
 *   2. folder/meet-package.json (single package in root)
 */
function findMeetPackages(folderPath: string): { packageDir: string; packageName: string; data: any }[] {
  const packages: { packageDir: string; packageName: string; data: any }[] = [];

  if (!fs.existsSync(folderPath)) {
    console.warn(`[Folder Sync] Sync folder does not exist: ${folderPath}`);
    return packages;
  }

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    console.warn(`[Folder Sync] Sync path is not a directory: ${folderPath}`);
    return packages;
  }

  // Check for meet-package.json directly in the root folder
  const rootPackagePath = path.join(folderPath, 'meet-package.json');
  if (fs.existsSync(rootPackagePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(rootPackagePath, 'utf-8'));
      if (data.meet && data.meet.meetCode) {
        packages.push({
          packageDir: folderPath,
          packageName: path.basename(folderPath),
          data,
        });
      }
    } catch (e) {
      console.warn(`[Folder Sync] Error reading ${rootPackagePath}:`, e);
    }
  }

  // Check subdirectories for meet-package.json files
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subPackagePath = path.join(folderPath, entry.name, 'meet-package.json');
    if (fs.existsSync(subPackagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(subPackagePath, 'utf-8'));
        if (data.meet && data.meet.meetCode) {
          packages.push({
            packageDir: path.join(folderPath, entry.name),
            packageName: entry.name,
            data,
          });
        }
      } catch (e) {
        console.warn(`[Folder Sync] Error reading ${subPackagePath}:`, e);
      }
    }
  }

  return packages;
}

/**
 * Copy a meet package from the sync folder to the local ./meets/ directory,
 * then import it using the existing importMeetPackage function.
 */
async function copyAndImportPackage(
  sourceDir: string,
  packageName: string,
  data: any
): Promise<ImportResult> {
  // Ensure local packages directory exists
  if (!fs.existsSync(LOCAL_PACKAGES_DIR)) {
    fs.mkdirSync(LOCAL_PACKAGES_DIR, { recursive: true });
  }

  const destDir = path.join(LOCAL_PACKAGES_DIR, packageName);

  // Copy the entire package directory to ./meets/
  copyDirRecursive(sourceDir, destDir);

  // Now import using the existing function
  return importMeetPackage(packageName);
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main sync function: scan the configured folder and import new meet packages.
 * Skips meets that already exist in the database (by meetCode).
 */
export async function syncFromFolder(folderPath?: string): Promise<FolderSyncSummary> {
  // Use provided path or read from config
  const syncPath = folderPath || getFolderSyncConfig()?.syncFolderPath;

  if (!syncPath) {
    return {
      success: false,
      syncFolderPath: '',
      packagesFound: 0,
      imported: 0,
      skippedExists: 0,
      skippedError: 0,
      results: [],
      error: 'No sync folder configured. Set a sync folder path in Settings or via the SYNC_FOLDER environment variable.',
    };
  }

  console.log(`[Folder Sync] Starting sync from: ${syncPath}`);

  // Find all meet packages in the sync folder
  const packages = findMeetPackages(syncPath);
  console.log(`[Folder Sync] Found ${packages.length} meet package(s) in sync folder`);

  if (packages.length === 0) {
    const summary: FolderSyncSummary = {
      success: true,
      syncFolderPath: syncPath,
      packagesFound: 0,
      imported: 0,
      skippedExists: 0,
      skippedError: 0,
      results: [],
    };
    saveSyncResults([]);
    return summary;
  }

  const results: FolderSyncResult[] = [];
  let imported = 0;
  let skippedExists = 0;
  let skippedError = 0;

  for (const pkg of packages) {
    const meetCode = pkg.data.meet.meetCode;
    const meetName = pkg.data.meet.name || 'Unknown';

    // Check if this meet already exists in the database
    const existingMeet = await storage.getMeetByCode(meetCode);
    if (existingMeet) {
      console.log(`[Folder Sync] Skipping "${meetName}" (code: ${meetCode}) — already exists in database`);
      results.push({
        packageName: pkg.packageName,
        meetName,
        meetCode,
        action: 'skipped_exists',
      });
      skippedExists++;
      continue;
    }

    // Import the package
    console.log(`[Folder Sync] Importing "${meetName}" (code: ${meetCode})...`);
    try {
      const importResult = await copyAndImportPackage(pkg.packageDir, pkg.packageName, pkg.data);

      if (importResult.success) {
        console.log(`[Folder Sync] Successfully imported "${meetName}"`);
        results.push({
          packageName: pkg.packageName,
          meetName,
          meetCode,
          action: 'imported',
          stats: importResult.stats ? {
            events: importResult.stats.events,
            athletes: importResult.stats.athletes,
            teams: importResult.stats.teams,
            scenes: importResult.stats.scenes,
          } : undefined,
        });
        imported++;
      } else {
        console.error(`[Folder Sync] Failed to import "${meetName}": ${importResult.error}`);
        results.push({
          packageName: pkg.packageName,
          meetName,
          meetCode,
          action: 'skipped_error',
          error: importResult.error,
        });
        skippedError++;
      }
    } catch (error: any) {
      console.error(`[Folder Sync] Error importing "${meetName}":`, error);
      results.push({
        packageName: pkg.packageName,
        meetName,
        meetCode,
        action: 'skipped_error',
        error: error.message || 'Unknown error',
      });
      skippedError++;
    }
  }

  // Save results for status display
  saveSyncResults(results);

  const summary: FolderSyncSummary = {
    success: true,
    syncFolderPath: syncPath,
    packagesFound: packages.length,
    imported,
    skippedExists,
    skippedError,
    results,
  };

  console.log(`[Folder Sync] Complete: ${imported} imported, ${skippedExists} already existed, ${skippedError} errors`);
  return summary;
}

/**
 * Export a meet package to the sync folder so other machines can pick it up.
 * This copies the package from ./meets/ to the configured sync folder.
 */
export async function exportToSyncFolder(meetId: string): Promise<{ success: boolean; error?: string; packagePath?: string }> {
  const config = getFolderSyncConfig();
  if (!config?.syncFolderPath) {
    return { success: false, error: 'No sync folder configured' };
  }

  // First export the meet to the local packages dir
  const exportResult = await exportMeetPackage(meetId);
  if (!exportResult.success || !exportResult.packagePath) {
    return { success: false, error: exportResult.error || 'Export failed' };
  }

  // Copy the exported package to the sync folder
  const packageName = path.basename(exportResult.packagePath);
  const destDir = path.join(config.syncFolderPath, packageName);

  try {
    copyDirRecursive(exportResult.packagePath, destDir);
    console.log(`[Folder Sync] Exported meet to sync folder: ${destDir}`);
    return { success: true, packagePath: destDir };
  } catch (error: any) {
    return { success: false, error: `Failed to copy to sync folder: ${error.message}` };
  }
}

/**
 * Boot-time sync: called from server/index.ts on startup.
 * Checks if a sync folder is configured and auto-sync is enabled,
 * then imports any new meet packages.
 */
export async function bootSync(): Promise<void> {
  // Check for SYNC_FOLDER environment variable first
  const envSyncFolder = process.env.SYNC_FOLDER;
  if (envSyncFolder) {
    console.log(`[Folder Sync] SYNC_FOLDER env var detected: ${envSyncFolder}`);
    // Save it to config if not already set
    const currentConfig = getFolderSyncConfig();
    if (!currentConfig || currentConfig.syncFolderPath !== envSyncFolder) {
      saveFolderSyncConfig(envSyncFolder, true);
    }
  }

  const config = getFolderSyncConfig();
  if (!config) {
    console.log('[Folder Sync] No sync folder configured — skipping boot sync');
    return;
  }

  if (!config.autoSyncOnBoot) {
    console.log('[Folder Sync] Auto-sync on boot is disabled — skipping');
    return;
  }

  console.log(`[Folder Sync] Boot sync starting — checking ${config.syncFolderPath}...`);
  try {
    const result = await syncFromFolder(config.syncFolderPath);
    if (result.imported > 0) {
      console.log(`[Folder Sync] Boot sync imported ${result.imported} new meet(s)`);
    } else if (result.packagesFound > 0) {
      console.log(`[Folder Sync] Boot sync: all ${result.packagesFound} meet(s) already imported`);
    } else {
      console.log('[Folder Sync] Boot sync: no meet packages found in sync folder');
    }
  } catch (error) {
    console.error('[Folder Sync] Boot sync error:', error);
  }
}
