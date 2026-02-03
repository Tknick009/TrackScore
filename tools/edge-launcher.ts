#!/usr/bin/env npx tsx
/**
 * Edge Mode Launcher with Code Sync
 * 
 * This tool syncs code from a source directory (network share, Dropbox, etc.)
 * to the local installation before launching the Edge Mode server.
 * 
 * Usage:
 *   npx tsx tools/edge-launcher.ts --source /path/to/source --launch
 *   npx tsx tools/edge-launcher.ts --source /path/to/source --sync-only
 *   npx tsx tools/edge-launcher.ts --status
 * 
 * Configuration is saved to data/edge-launcher-config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn, execSync } from 'child_process';

const CONFIG_PATH = './data/edge-launcher-config.json';
const SYNC_LOG_PATH = './data/sync-log.json';

interface LauncherConfig {
  sourceDirectory: string;
  lastSyncAt: string | null;
  autoSync: boolean;
  excludePatterns: string[];
}

interface SyncLogEntry {
  file: string;
  action: 'added' | 'updated' | 'deleted';
  timestamp: string;
}

interface SyncLog {
  lastSync: string;
  entries: SyncLogEntry[];
}

// Default configuration
const DEFAULT_CONFIG: LauncherConfig = {
  sourceDirectory: '',
  lastSyncAt: null,
  autoSync: true,
  excludePatterns: [
    'node_modules',
    '.git',
    'data',
    '.replit',
    'replit.nix',
    '.cache',
    'dist',
    '.env',
    '*.db',
    '*.log',
    'attached_assets',
  ],
};

// Files/directories to sync (relative to project root)
const SYNC_PATHS = [
  // Code
  'client',
  'server',
  'shared',
  'tools',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'drizzle.config.ts',
  'index.html',
  // Assets - logos and photos
  'uploads',           // Athlete photos, meet logos, team logos (uploaded)
  'logos',             // NCAA logos and other static logos
  'public/logos',      // Public logos directory
];

function loadConfig(): LauncherConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: LauncherConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function saveSyncLog(log: SyncLog): void {
  const dir = path.dirname(SYNC_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(log, null, 2));
}

function getFileHash(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

function shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Simple glob matching
    if (pattern.startsWith('*')) {
      const ext = pattern.slice(1);
      if (relativePath.endsWith(ext)) return true;
    } else if (relativePath.includes(pattern)) {
      return true;
    }
  }
  return false;
}

function getAllFiles(dir: string, baseDir: string, excludePatterns: string[]): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldExclude(relativePath, excludePatterns)) continue;
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir, excludePatterns));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  
  return files;
}

function syncFiles(sourceDir: string, targetDir: string, config: LauncherConfig): SyncLog {
  const log: SyncLog = {
    lastSync: new Date().toISOString(),
    entries: [],
  };
  
  console.log('\n📂 Syncing files from:', sourceDir);
  console.log('📂 Target directory:', targetDir);
  console.log('');
  
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  
  for (const syncPath of SYNC_PATHS) {
    const sourcePath = path.join(sourceDir, syncPath);
    const targetPath = path.join(targetDir, syncPath);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`⏭️  Skipping (not in source): ${syncPath}`);
      continue;
    }
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      // Sync entire directory
      const files = getAllFiles(sourcePath, sourceDir, config.excludePatterns);
      
      for (const file of files) {
        const srcFile = path.join(sourceDir, file);
        const tgtFile = path.join(targetDir, file);
        
        const srcHash = getFileHash(srcFile);
        const tgtHash = getFileHash(tgtFile);
        
        if (srcHash === tgtHash) {
          unchanged++;
          continue;
        }
        
        // Create directory if needed
        const tgtDir = path.dirname(tgtFile);
        if (!fs.existsSync(tgtDir)) {
          fs.mkdirSync(tgtDir, { recursive: true });
        }
        
        // Copy file
        fs.copyFileSync(srcFile, tgtFile);
        
        const action = tgtHash === null ? 'added' : 'updated';
        if (action === 'added') {
          added++;
          console.log(`➕ Added: ${file}`);
        } else {
          updated++;
          console.log(`🔄 Updated: ${file}`);
        }
        
        log.entries.push({
          file,
          action,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Sync single file
      const srcHash = getFileHash(sourcePath);
      const tgtHash = getFileHash(targetPath);
      
      if (srcHash === tgtHash) {
        unchanged++;
        continue;
      }
      
      fs.copyFileSync(sourcePath, targetPath);
      
      const action = tgtHash === null ? 'added' : 'updated';
      if (action === 'added') {
        added++;
        console.log(`➕ Added: ${syncPath}`);
      } else {
        updated++;
        console.log(`🔄 Updated: ${syncPath}`);
      }
      
      log.entries.push({
        file: syncPath,
        action,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  console.log('');
  console.log(`✅ Sync complete: ${added} added, ${updated} updated, ${unchanged} unchanged`);
  
  return log;
}

function checkDependencies(targetDir: string, syncLog: SyncLog): boolean {
  // Check if package.json was updated
  const packageJsonUpdated = syncLog.entries.some(e => e.file === 'package.json');
  
  if (packageJsonUpdated) {
    console.log('\n📦 package.json was updated, running npm install...');
    try {
      execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
      console.log('✅ Dependencies installed');
      return true;
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      return false;
    }
  }
  
  return true;
}

function launchServer(targetDir: string): void {
  console.log('\n🚀 Launching Edge Mode server...\n');
  
  const env = {
    ...process.env,
    EDGE_MODE: 'true',
    NODE_ENV: 'production',
  };
  
  const server = spawn('npm', ['run', 'dev'], {
    cwd: targetDir,
    env,
    stdio: 'inherit',
    shell: true,
  });
  
  server.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
  });
}

function printStatus(): void {
  const config = loadConfig();
  
  console.log('\n=== Edge Launcher Status ===\n');
  console.log('Source Directory:', config.sourceDirectory || '(not configured)');
  console.log('Last Sync:', config.lastSyncAt || 'Never');
  console.log('Auto Sync:', config.autoSync ? 'Enabled' : 'Disabled');
  console.log('');
  console.log('Exclude Patterns:');
  config.excludePatterns.forEach(p => console.log(`  - ${p}`));
  console.log('');
  console.log('Sync Paths:');
  SYNC_PATHS.forEach(p => console.log(`  - ${p}`));
  
  // Check if source exists
  if (config.sourceDirectory) {
    if (fs.existsSync(config.sourceDirectory)) {
      console.log('\n✅ Source directory exists and is accessible');
    } else {
      console.log('\n❌ Source directory not found or not accessible');
    }
  }
  
  // Show recent sync log
  if (fs.existsSync(SYNC_LOG_PATH)) {
    try {
      const log: SyncLog = JSON.parse(fs.readFileSync(SYNC_LOG_PATH, 'utf-8'));
      console.log('\n--- Last Sync Log ---');
      console.log('Time:', log.lastSync);
      console.log('Files changed:', log.entries.length);
      if (log.entries.length > 0) {
        console.log('Recent changes:');
        log.entries.slice(-10).forEach(e => {
          const icon = e.action === 'added' ? '➕' : e.action === 'updated' ? '🔄' : '❌';
          console.log(`  ${icon} ${e.file}`);
        });
      }
    } catch {}
  }
}

function printHelp(): void {
  console.log(`
Edge Mode Launcher with Code Sync

This tool syncs code from a source directory before launching the Edge Mode server.
Perfect for stadium deployments where you want to update code from a network share
or cloud-synced folder.

Usage:
  npx tsx tools/edge-launcher.ts [options]

Options:
  --source <path>   Set the source directory for code sync
  --launch          Sync files and launch the server
  --sync-only       Sync files without launching
  --status          Show current configuration and status
  --help            Show this help message

Examples:
  # Configure and launch
  npx tsx tools/edge-launcher.ts --source /mnt/network/scoreboard --launch

  # Just sync files (useful for testing)
  npx tsx tools/edge-launcher.ts --source ~/Dropbox/scoreboard --sync-only

  # Check status
  npx tsx tools/edge-launcher.ts --status

  # Launch with previously configured source
  npx tsx tools/edge-launcher.ts --launch

Configuration:
  Config is saved to: ${CONFIG_PATH}
  Sync log saved to: ${SYNC_LOG_PATH}

Synced Paths:
  ${SYNC_PATHS.join('\n  ')}

Excluded by default:
  ${DEFAULT_CONFIG.excludePatterns.join(', ')}
`);
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    return;
  }
  
  if (args.includes('--status')) {
    printStatus();
    return;
  }
  
  const config = loadConfig();
  const targetDir = process.cwd();
  
  // Check for source directory argument
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    config.sourceDirectory = path.resolve(args[sourceIndex + 1]);
  }
  
  const shouldLaunch = args.includes('--launch');
  const syncOnly = args.includes('--sync-only');
  
  if (!config.sourceDirectory) {
    console.error('❌ No source directory configured.');
    console.error('   Use: --source /path/to/source');
    process.exit(1);
  }
  
  if (!fs.existsSync(config.sourceDirectory)) {
    console.error(`❌ Source directory not found: ${config.sourceDirectory}`);
    console.error('   Make sure the network share is mounted or folder exists.');
    process.exit(1);
  }
  
  console.log('=== Edge Mode Launcher ===');
  console.log('');
  
  // Sync files
  const syncLog = syncFiles(config.sourceDirectory, targetDir, config);
  
  // Save config and log
  config.lastSyncAt = syncLog.lastSync;
  saveConfig(config);
  saveSyncLog(syncLog);
  
  // Check dependencies if needed
  if (syncLog.entries.length > 0) {
    if (!checkDependencies(targetDir, syncLog)) {
      process.exit(1);
    }
  }
  
  if (syncOnly) {
    console.log('\n✅ Sync complete. Use --launch to start the server.');
    return;
  }
  
  if (shouldLaunch) {
    launchServer(targetDir);
  } else {
    console.log('\n💡 Use --launch to start the Edge Mode server.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
