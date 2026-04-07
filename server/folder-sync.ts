import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
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
 * Recursively scan a folder for meet-package.json files at any depth.
 * Skips node_modules, .git, and other non-relevant directories.
 * Supports:
 *   1. folder/meet-package.json (root)
 *   2. folder/<meet-name>/meet-package.json (one level deep)
 *   3. folder/meets/<meet-name>/meet-package.json (two levels deep, e.g. TrackScore project copy)
 *   4. Any deeper nesting
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

  console.log(`[Folder Sync] Scanning folder: ${folderPath}`);

  // Directories to skip when scanning
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.cache', 'data']);
  const MAX_DEPTH = 5; // Don't recurse forever

  function scanDir(dir: string, depth: number): void {
    if (depth > MAX_DEPTH) return;

    // Check for meet-package.json in this directory
    const packagePath = path.join(dir, 'meet-package.json');
    if (fs.existsSync(packagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        if (data.meet && data.meet.meetCode) {
          const packageName = path.basename(dir);
          console.log(`[Folder Sync] Found meet package: ${packageName} (${data.meet.name || 'Unknown'})`);
          packages.push({
            packageDir: dir,
            packageName,
            data,
          });
        }
      } catch (e) {
        console.warn(`[Folder Sync] Error reading ${packagePath}:`, e);
      }
    }

    // Recurse into subdirectories
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SKIP_DIRS.has(entry.name)) continue;

        scanDir(path.join(dir, entry.name), depth + 1);
      }
    } catch (e) {
      // Permission errors, etc. — skip silently
    }
  }

  scanDir(folderPath, 0);

  console.log(`[Folder Sync] Scan complete: found ${packages.length} meet package(s)`);
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
 * Find a scoreboard.db file in the sync folder (checks root and data/ subfolder).
 * Returns the path if found, null otherwise.
 */
function findRemoteDb(syncPath: string): string | null {
  // Check data/scoreboard.db (if sync folder is a TrackScore project root)
  const dataDbPath = path.join(syncPath, 'data', 'scoreboard.db');
  if (fs.existsSync(dataDbPath)) {
    console.log(`[Folder Sync] Found remote database: ${dataDbPath}`);
    return dataDbPath;
  }
  // Check scoreboard.db in root
  const rootDbPath = path.join(syncPath, 'scoreboard.db');
  if (fs.existsSync(rootDbPath)) {
    console.log(`[Folder Sync] Found remote database: ${rootDbPath}`);
    return rootDbPath;
  }
  return null;
}

/**
 * Sync meets directly from a remote scoreboard.db file.
 * Opens the DB read-only and copies meet data (meets, events, athletes, entries,
 * teams, divisions, display themes) into the local database.
 * Returns a FolderSyncSummary if a DB was found and processed, null if no DB exists.
 */
async function syncMeetsFromRemoteDb(syncPath: string): Promise<FolderSyncSummary | null> {
  const remoteDbPath = findRemoteDb(syncPath);
  if (!remoteDbPath) {
    console.log('[Folder Sync] No scoreboard.db found in sync folder — will try meet packages');
    return null;
  }

  // Don't sync from ourselves
  const localDbPath = path.resolve('./data/scoreboard.db');
  if (path.resolve(remoteDbPath) === localDbPath) {
    console.log('[Folder Sync] Remote DB is the same as local DB — skipping DB sync');
    return null;
  }

  let remoteDb: ReturnType<typeof Database> | null = null;
  const results: FolderSyncResult[] = [];
  let imported = 0;
  let skippedExists = 0;
  let skippedError = 0;
  let totalMeetsFound = 0;

  try {
    // Open remote DB read-only
    remoteDb = new Database(remoteDbPath, { readonly: true, fileMustExist: true });
    console.log(`[Folder Sync] Opened remote database: ${remoteDbPath}`);

    // Get all meets from remote DB
    const remoteMeets = remoteDb.prepare('SELECT * FROM meets').all() as any[];
    totalMeetsFound = remoteMeets.length;
    console.log(`[Folder Sync] Found ${totalMeetsFound} meet(s) in remote database`);

    if (totalMeetsFound === 0) {
      remoteDb.close();
      return {
        success: true,
        syncFolderPath: syncPath,
        packagesFound: 0,
        imported: 0,
        skippedExists: 0,
        skippedError: 0,
        results: [],
      };
    }

    for (const remoteMeet of remoteMeets) {
      const meetCode = remoteMeet.meet_code;
      const meetName = remoteMeet.name || 'Unknown';

      // Check if this meet already exists locally
      const existingMeet = await storage.getMeetByCode(meetCode);
      if (existingMeet) {
        console.log(`[Folder Sync] Skipping "${meetName}" (code: ${meetCode}) — already exists`);
        results.push({
          packageName: meetName,
          meetName,
          meetCode,
          action: 'skipped_exists',
        });
        skippedExists++;
        continue;
      }

      // Import this meet and all its data
      console.log(`[Folder Sync] Importing "${meetName}" (code: ${meetCode}) from remote DB...`);
      try {
        const stats = await importMeetFromRemoteDb(remoteDb, remoteMeet);
        console.log(`[Folder Sync] Successfully imported "${meetName}": ${stats.events} events, ${stats.athletes} athletes, ${stats.entries} entries`);
        results.push({
          packageName: meetName,
          meetName,
          meetCode,
          action: 'imported',
          stats,
        });
        imported++;
      } catch (error: any) {
        console.error(`[Folder Sync] Error importing "${meetName}":`, error);
        results.push({
          packageName: meetName,
          meetName,
          meetCode,
          action: 'skipped_error',
          error: error.message || 'Unknown error',
        });
        skippedError++;
      }
    }
  } catch (error: any) {
    console.error('[Folder Sync] Error reading remote database:', error);
    // If the DB is locked or corrupt, fall back to meet packages
    if (remoteDb) {
      try { remoteDb.close(); } catch (_) {}
    }
    return null;
  } finally {
    if (remoteDb) {
      try { remoteDb.close(); } catch (_) {}
    }
  }

  saveSyncResults(results);

  return {
    success: true,
    syncFolderPath: syncPath,
    packagesFound: totalMeetsFound,
    imported,
    skippedExists,
    skippedError,
    results,
  };
}

/**
 * Import a single meet and all its related data from a remote DB into the local DB.
 */
async function importMeetFromRemoteDb(
  remoteDb: ReturnType<typeof Database>,
  remoteMeet: any
): Promise<{ events: number; athletes: number; teams: number; entries: number; scenes: number }> {
  const oldMeetId = remoteMeet.id;

  // Create the meet locally
  const newMeet = await storage.createMeet({
    name: remoteMeet.name,
    location: remoteMeet.location,
    startDate: remoteMeet.start_date ? new Date(remoteMeet.start_date) : new Date(),
    endDate: remoteMeet.end_date ? new Date(remoteMeet.end_date) : null,
    seasonId: null, // Don't carry over season references
    status: remoteMeet.status || 'upcoming',
    trackLength: remoteMeet.track_length || 400,
    logoUrl: remoteMeet.logo_url,
    meetCode: remoteMeet.meet_code,
    mdbPath: remoteMeet.mdb_path,
    autoRefresh: remoteMeet.auto_refresh ? true : false,
    refreshInterval: remoteMeet.refresh_interval || 30,
    primaryColor: remoteMeet.primary_color || '#0066CC',
    secondaryColor: remoteMeet.secondary_color || '#003366',
    accentColor: remoteMeet.accent_color || '#FFD700',
    textColor: remoteMeet.text_color || '#FFFFFF',
    logoEffect: remoteMeet.logo_effect || 'none',
  });
  const newMeetId = newMeet.id;

  // Build ID mappings (old remote ID -> new local ID) for foreign keys
  const teamIdMap = new Map<string, string>();
  const divisionIdMap = new Map<string, string>();
  const athleteIdMap = new Map<string, string>();
  const eventIdMap = new Map<string, string>();

  // Import teams
  const remoteTeams = remoteDb.prepare('SELECT * FROM teams WHERE meet_id = ?').all(oldMeetId) as any[];
  for (const rt of remoteTeams) {
    const newTeam = await storage.createTeam({
      meetId: newMeetId,
      teamNumber: rt.team_number,
      name: rt.name,
      shortName: rt.short_name,
      abbreviation: rt.abbreviation,
      menScoreOverride: rt.men_score_override,
      womenScoreOverride: rt.women_score_override,
    });
    teamIdMap.set(rt.id, newTeam.id);
  }

  // Import divisions
  let remoteDivisions: any[] = [];
  try {
    remoteDivisions = remoteDb.prepare('SELECT * FROM divisions WHERE meet_id = ?').all(oldMeetId) as any[];
  } catch (_) { /* table might not exist */ }
  for (const rd of remoteDivisions) {
    const newDiv = await storage.createDivision({
      meetId: newMeetId,
      divisionNumber: rd.division_number,
      name: rd.name,
      abbreviation: rd.abbreviation,
      lowAge: rd.low_age,
      highAge: rd.high_age,
    });
    divisionIdMap.set(rd.id, newDiv.id);
  }

  // Import athletes
  const remoteAthletes = remoteDb.prepare('SELECT * FROM athletes WHERE meet_id = ?').all(oldMeetId) as any[];
  for (const ra of remoteAthletes) {
    const newAthlete = await storage.createAthlete({
      meetId: newMeetId,
      athleteNumber: ra.athlete_number,
      firstName: ra.first_name,
      lastName: ra.last_name,
      teamId: ra.team_id ? (teamIdMap.get(ra.team_id) || null) : null,
      divisionId: ra.division_id ? (divisionIdMap.get(ra.division_id) || null) : null,
      bibNumber: ra.bib_number,
      gender: ra.gender,
    });
    athleteIdMap.set(ra.id, newAthlete.id);
  }

  // Import events
  const remoteEvents = remoteDb.prepare('SELECT * FROM events WHERE meet_id = ?').all(oldMeetId) as any[];
  for (const re of remoteEvents) {
    const newEvent = await storage.createEvent({
      meetId: newMeetId,
      eventNumber: re.event_number,
      name: re.name,
      eventType: re.event_type,
      gender: re.gender,
      distance: re.distance,
      status: re.status || 'scheduled',
      numRounds: re.num_rounds,
      numLanes: re.num_lanes,
      eventDate: re.event_date ? new Date(re.event_date) : null,
      eventTime: re.event_time,
      sessionName: re.session_name,
      hytekStatus: re.hytek_status,
      isScored: re.is_scored ? true : false,
    });
    eventIdMap.set(re.id, newEvent.id);
  }

  // Import entries
  let entriesImported = 0;
  const remoteEntries = remoteDb.prepare(
    `SELECT e.* FROM entries e 
     JOIN events ev ON e.event_id = ev.id 
     WHERE ev.meet_id = ?`
  ).all(oldMeetId) as any[];

  for (const entry of remoteEntries) {
    const newEventId = eventIdMap.get(entry.event_id);
    const newAthleteId = athleteIdMap.get(entry.athlete_id);
    if (!newEventId || !newAthleteId) continue;

    try {
      await storage.createEntry({
        eventId: newEventId,
        athleteId: newAthleteId,
        teamId: entry.team_id ? (teamIdMap.get(entry.team_id) || null) : null,
        divisionId: entry.division_id ? (divisionIdMap.get(entry.division_id) || null) : null,
        seedMark: entry.seed_mark,
        resultType: entry.result_type || 'time',
        preliminaryHeat: entry.preliminary_heat,
        preliminaryLane: entry.preliminary_lane,
        quarterfinalHeat: entry.quarterfinal_heat,
        quarterfinalLane: entry.quarterfinal_lane,
        semifinalHeat: entry.semifinal_heat,
        semifinalLane: entry.semifinal_lane,
        finalHeat: entry.final_heat,
        finalLane: entry.final_lane,
        preliminaryMark: entry.preliminary_mark,
        preliminaryPlace: entry.preliminary_place,
        preliminaryWind: entry.preliminary_wind,
        quarterfinalMark: entry.quarterfinal_mark,
        quarterfinalPlace: entry.quarterfinal_place,
        quarterfinalWind: entry.quarterfinal_wind,
        semifinalMark: entry.semifinal_mark,
        semifinalPlace: entry.semifinal_place,
        semifinalWind: entry.semifinal_wind,
        finalMark: entry.final_mark,
        finalPlace: entry.final_place,
        finalWind: entry.final_wind,
        isDisqualified: entry.is_disqualified ? true : false,
        isScratched: entry.is_scratched ? true : false,
        scoringStatus: entry.scoring_status || 'pending',
        scoredPoints: entry.scored_points,
        notes: entry.notes,
        checkInStatus: entry.check_in_status || 'pending',
        checkInTime: entry.check_in_time ? new Date(entry.check_in_time) : null,
        checkInOperator: entry.check_in_operator,
        checkInMethod: entry.check_in_method,
      });
      entriesImported++;
    } catch (e) {
      // Skip duplicate entries (unique constraint)
    }
  }

  // Import display themes
  let themesImported = 0;
  try {
    const remoteThemes = remoteDb.prepare('SELECT * FROM display_themes WHERE meet_id = ?').all(oldMeetId) as any[];
    for (const rt of remoteThemes) {
      await storage.createDisplayTheme({
        meetId: newMeetId,
        name: rt.name,
        isDefault: rt.is_default ? true : false,
        accentColor: rt.accent_color,
        bgColor: rt.bg_color,
        bgElevatedColor: rt.bg_elevated_color,
        bgBorderColor: rt.bg_border_color,
        fgColor: rt.fg_color,
        mutedColor: rt.muted_color,
        headingFont: rt.heading_font,
        bodyFont: rt.body_font,
        numbersFont: rt.numbers_font,
        logoUrl: rt.logo_url,
        sponsorLogos: rt.sponsor_logos,
        features: rt.features,
      });
      themesImported++;
    }
  } catch (_) { /* display_themes table might not exist */ }

  return {
    events: remoteEvents.length,
    athletes: remoteAthletes.length,
    teams: remoteTeams.length,
    entries: entriesImported,
    scenes: themesImported,
  };
}

/**
 * Main sync function: scan the configured folder and import new meet packages.
 * First tries to read from a scoreboard.db, then falls back to meet-package.json files.
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

  // Verify the folder exists
  if (!fs.existsSync(syncPath)) {
    console.error(`[Folder Sync] Sync folder does not exist: ${syncPath}`);
    return {
      success: false,
      syncFolderPath: syncPath,
      packagesFound: 0,
      imported: 0,
      skippedExists: 0,
      skippedError: 0,
      results: [],
      error: `Sync folder does not exist: ${syncPath}`,
    };
  }

  // Strategy 1: Try to sync from a scoreboard.db in the sync folder
  const dbSyncResult = await syncMeetsFromRemoteDb(syncPath);
  if (dbSyncResult) {
    return dbSyncResult;
  }

  // Strategy 2: Fall back to scanning for meet-package.json files
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
