#!/usr/bin/env node
/**
 * Edge Setup CLI
 * 
 * This tool helps stadium operators set up a local edge server by:
 * 1. Downloading meet data from the cloud
 * 2. Initializing the local SQLite database
 * 3. Configuring the local server
 * 
 * Usage:
 *   npx tsx tools/edge-setup.ts setup --cloud-url https://your-replit-app.replit.app --meet-code ABC123
 *   npx tsx tools/edge-setup.ts status
 *   npx tsx tools/edge-setup.ts clear
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DATA_DIR = './data';
const DB_PATH = path.join(DATA_DIR, 'scoreboard.db');
const CONFIG_PATH = path.join(DATA_DIR, 'edge-config.json');

interface EdgeConfig {
  cloudUrl: string;
  meetCodes: string[];
  lastSetup: string;
  edgeId: string;
}

function generateEdgeId(): string {
  return `edge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function loadConfig(): EdgeConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return null;
}

function saveConfig(config: EdgeConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function fetchMeetByCode(cloudUrl: string, meetCode: string): Promise<any> {
  const url = `${cloudUrl}/api/meets/code/${meetCode}`;
  console.log(`\nFetching meet from ${url}...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch meet: ${response.status} ${text}`);
  }
  
  return response.json();
}

async function fetchRelatedData(cloudUrl: string, meetId: string): Promise<{
  events: any[];
  athletes: any[];
  entries: any[];
  teams: any[];
  divisions: any[];
  layoutScenes: any[];
  sceneDisplayMappings: any[];
}> {
  console.log('Fetching related data...');
  
  const [eventsRes, athletesRes, entriesRes, teamsRes, divisionsRes, scenesRes, mappingsRes] = await Promise.all([
    fetch(`${cloudUrl}/api/events?meetId=${meetId}`),
    fetch(`${cloudUrl}/api/athletes?meetId=${meetId}`),
    fetch(`${cloudUrl}/api/entries?meetId=${meetId}`),
    fetch(`${cloudUrl}/api/teams?meetId=${meetId}`),
    fetch(`${cloudUrl}/api/divisions?meetId=${meetId}`),
    fetch(`${cloudUrl}/api/layout-scenes?meetId=${meetId}`),
    fetch(`${cloudUrl}/api/scene-template-mappings/${meetId}`),
  ]);

  return {
    events: eventsRes.ok ? await eventsRes.json() : [],
    athletes: athletesRes.ok ? await athletesRes.json() : [],
    entries: entriesRes.ok ? await entriesRes.json() : [],
    teams: teamsRes.ok ? await teamsRes.json() : [],
    divisions: divisionsRes.ok ? await divisionsRes.json() : [],
    layoutScenes: scenesRes.ok ? await scenesRes.json() : [],
    sceneDisplayMappings: mappingsRes.ok ? await mappingsRes.json() : [],
  };
}

async function downloadLogo(cloudUrl: string, logoUrl: string, subdir: string = 'logos'): Promise<string | null> {
  if (!logoUrl) return null;
  
  try {
    const fullUrl = logoUrl.startsWith('http') ? logoUrl : `${cloudUrl}${logoUrl}`;
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const logoDir = path.join(DATA_DIR, subdir);
    fs.mkdirSync(logoDir, { recursive: true });
    
    const filename = path.basename(logoUrl) || 'logo.png';
    const localPath = path.join(logoDir, filename);
    fs.writeFileSync(localPath, Buffer.from(buffer));
    
    return `/data/${subdir}/${filename}`;
  } catch (error) {
    return null;
  }
}

async function downloadTeamLogos(cloudUrl: string, teams: any[]): Promise<Map<number, string>> {
  const logoMap = new Map<number, string>();
  const teamsWithLogos = teams.filter(t => t.logoUrl);
  
  if (teamsWithLogos.length === 0) return logoMap;
  
  console.log(`Downloading ${teamsWithLogos.length} team logos...`);
  
  for (const team of teamsWithLogos) {
    const localUrl = await downloadLogo(cloudUrl, team.logoUrl, 'team-logos');
    if (localUrl) {
      logoMap.set(team.id, localUrl);
    }
  }
  
  console.log(`  Downloaded ${logoMap.size} team logos`);
  return logoMap;
}

async function initializeDatabase(meet: any, data: any): Promise<void> {
  console.log('\nInitializing local database...');
  
  // Import SQLiteStorage dynamically
  const { SQLiteStorage } = await import('../server/storage/sqlite-adapter');
  
  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });
  
  // Create storage instance
  const storage = new SQLiteStorage(DB_PATH);
  
  // Insert meet
  console.log(`  - Inserting meet: ${meet.name}`);
  await storage.createMeet({
    name: meet.name,
    location: meet.location,
    startDate: new Date(meet.startDate),
    meetCode: meet.meetCode,
    primaryColor: meet.primaryColor,
    secondaryColor: meet.secondaryColor,
    accentColor: meet.accentColor,
    textColor: meet.textColor,
    autoRefresh: meet.autoRefresh ?? false,
    refreshInterval: meet.refreshInterval ?? 15,
    seasonId: meet.seasonId,
  });
  
  // Insert teams
  console.log(`  - Inserting ${data.teams.length} teams`);
  for (const team of data.teams) {
    try {
      await storage.createTeam({
        name: team.name,
        abbreviation: team.abbreviation,
        meetId: meet.id,
      });
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  // Insert divisions
  console.log(`  - Inserting ${data.divisions.length} divisions`);
  for (const division of data.divisions) {
    try {
      await storage.createDivision({
        name: division.name,
        meetId: meet.id,
      });
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  // Insert athletes
  console.log(`  - Inserting ${data.athletes.length} athletes`);
  for (const athlete of data.athletes) {
    try {
      await storage.createAthlete({
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        teamId: athlete.teamId,
        meetId: meet.id,
        bibNumber: athlete.bibNumber,
        divisionId: athlete.divisionId,
      });
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  // Insert events
  console.log(`  - Inserting ${data.events.length} events`);
  for (const event of data.events) {
    try {
      await storage.createEvent({
        name: event.name,
        eventNumber: event.eventNumber,
        type: event.type,
        gender: event.gender,
        meetId: meet.id,
        scheduledDate: event.scheduledDate ? new Date(event.scheduledDate) : undefined,
        scheduledTime: event.scheduledTime,
        eventType: event.eventType,
      });
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  // Insert entries
  console.log(`  - Inserting ${data.entries.length} entries`);
  for (const entry of data.entries) {
    try {
      await storage.createEntry({
        athleteId: entry.athleteId,
        eventId: entry.eventId,
        lane: entry.lane,
        position: entry.position,
        seedMark: entry.seedMark,
        heat: entry.heat,
        flight: entry.flight,
      });
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  // Insert layout scenes and their objects
  console.log(`  - Inserting ${data.layoutScenes.length} layout scenes`);
  const sceneIdMap = new Map<number, number>(); // Map cloud scene IDs to local scene IDs
  for (const scene of data.layoutScenes) {
    try {
      const newScene = await storage.createLayoutScene({
        name: scene.name,
        meetId: meet.id,
        canvasWidth: scene.canvasWidth || scene.width || 1920,
        canvasHeight: scene.canvasHeight || scene.height || 1080,
        aspectRatio: scene.aspectRatio || '16:9',
        backgroundColor: scene.backgroundColor,
      });
      sceneIdMap.set(scene.id, newScene.id);
      
      // Insert objects for this scene
      const objects = scene.objects || [];
      for (const obj of objects) {
        try {
          await storage.createLayoutObject({
            sceneId: newScene.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation,
            zIndex: obj.zIndex,
            visible: obj.visible,
            locked: obj.locked,
            name: obj.name,
            fieldCode: obj.fieldCode,
            text: obj.text,
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle,
            textAlign: obj.textAlign,
            verticalAlign: obj.verticalAlign,
            color: obj.color,
            backgroundColor: obj.backgroundColor,
            borderColor: obj.borderColor,
            borderWidth: obj.borderWidth,
            borderRadius: obj.borderRadius,
            padding: obj.padding,
            imageUrl: obj.imageUrl,
            imageFit: obj.imageFit,
            opacity: obj.opacity,
          });
        } catch (e) {
          // Ignore duplicate errors
        }
      }
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  // Insert scene template mappings
  console.log(`  - Inserting ${data.sceneDisplayMappings.length} scene template mappings`);
  for (const mapping of data.sceneDisplayMappings) {
    try {
      const localSceneId = sceneIdMap.get(mapping.sceneId);
      if (localSceneId) {
        await storage.setSceneTemplateMapping({
          meetId: meet.id,
          displayType: mapping.displayType,
          displayMode: mapping.displayMode,
          sceneId: localSceneId,
        });
      }
    } catch (e) {
      // Ignore duplicate errors
    }
  }
  
  console.log('\nDatabase initialized successfully!');
}

async function setupCommand(args: string[]): Promise<void> {
  let cloudUrl = '';
  let meetCode = '';
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cloud-url' && args[i + 1]) {
      cloudUrl = args[i + 1];
      i++;
    } else if (args[i] === '--meet-code' && args[i + 1]) {
      meetCode = args[i + 1].toUpperCase();
      i++;
    }
  }
  
  // Prompt for missing values
  if (!cloudUrl) {
    cloudUrl = await prompt('Enter cloud server URL (e.g., https://your-app.replit.app): ');
  }
  if (!meetCode) {
    meetCode = (await prompt('Enter meet code (e.g., ABC123): ')).toUpperCase();
  }
  
  // Validate
  if (!cloudUrl || !meetCode) {
    console.error('Error: Both cloud URL and meet code are required');
    process.exit(1);
  }
  
  // Remove trailing slash
  cloudUrl = cloudUrl.replace(/\/$/, '');
  
  console.log('\n=== Track & Field Scoreboard - Edge Setup ===');
  console.log(`Cloud Server: ${cloudUrl}`);
  console.log(`Meet Code: ${meetCode}`);
  
  try {
    // Fetch meet data
    const meet = await fetchMeetByCode(cloudUrl, meetCode);
    console.log(`\nFound meet: ${meet.name}`);
    console.log(`  Location: ${meet.location}`);
    console.log(`  Date: ${new Date(meet.startDate).toLocaleDateString()}`);
    
    // Fetch related data
    const data = await fetchRelatedData(cloudUrl, meet.id);
    console.log(`  Events: ${data.events.length}`);
    console.log(`  Athletes: ${data.athletes.length}`);
    console.log(`  Teams: ${data.teams.length}`);
    console.log(`  Layout Scenes: ${data.layoutScenes.length}`);
    console.log(`  Scene Mappings: ${data.sceneDisplayMappings.length}`);
    
    // Download meet logo if present
    if (meet.logoUrl) {
      console.log('Downloading meet logo...');
      const localLogoUrl = await downloadLogo(cloudUrl, meet.logoUrl);
      if (localLogoUrl) {
        meet.logoUrl = localLogoUrl;
        console.log(`  Meet logo saved`);
      }
    }
    
    // Download team logos
    const teamLogoMap = await downloadTeamLogos(cloudUrl, data.teams);
    // Update team data with local logo URLs
    for (const team of data.teams) {
      if (teamLogoMap.has(team.id)) {
        team.logoUrl = teamLogoMap.get(team.id);
      }
    }
    
    // Confirm setup
    const confirm = await prompt('\nProceed with setup? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      return;
    }
    
    // Initialize database
    await initializeDatabase(meet, data);
    
    // Save config
    const existingConfig = loadConfig();
    const config: EdgeConfig = {
      cloudUrl,
      meetCodes: [...(existingConfig?.meetCodes || []).filter(c => c !== meetCode), meetCode],
      lastSetup: new Date().toISOString(),
      edgeId: existingConfig?.edgeId || generateEdgeId(),
    };
    saveConfig(config);
    
    console.log('\n=== Setup Complete! ===');
    console.log('\nTo start the edge server:');
    console.log('  EDGE_MODE=true npm run dev');
    console.log('\nOr use the Electron app for a GUI experience.');
    
  } catch (error: any) {
    console.error('\nSetup failed:', error.message);
    process.exit(1);
  }
}

async function statusCommand(): Promise<void> {
  console.log('\n=== Edge Server Status ===\n');
  
  const config = loadConfig();
  
  if (!config) {
    console.log('No edge configuration found.');
    console.log('Run "edge-setup setup" to configure.');
    return;
  }
  
  console.log(`Edge ID: ${config.edgeId}`);
  console.log(`Cloud URL: ${config.cloudUrl}`);
  console.log(`Configured meets: ${config.meetCodes.join(', ')}`);
  console.log(`Last setup: ${new Date(config.lastSetup).toLocaleString()}`);
  
  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    console.log(`\nDatabase: ${DB_PATH}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
  } else {
    console.log('\nDatabase: Not initialized');
  }
}

async function clearCommand(): Promise<void> {
  const confirm = await prompt('This will delete all local data. Are you sure? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }
  
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Database deleted.');
  }
  
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
    console.log('Configuration deleted.');
  }
  
  console.log('Edge data cleared.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'setup':
      await setupCommand(args.slice(1));
      break;
    case 'status':
      await statusCommand();
      break;
    case 'clear':
      await clearCommand();
      break;
    default:
      console.log(`
Track & Field Scoreboard - Edge Setup CLI

Usage:
  edge-setup setup [--cloud-url URL] [--meet-code CODE]
    Download meet data and initialize local database
    
  edge-setup status
    Show current edge configuration and status
    
  edge-setup clear
    Delete all local data and configuration

Examples:
  npx tsx tools/edge-setup.ts setup --cloud-url https://myapp.replit.app --meet-code ABC123
  npx tsx tools/edge-setup.ts status
`);
  }
}

main().catch(console.error);
