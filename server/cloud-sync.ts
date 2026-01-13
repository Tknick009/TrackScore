import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { storage } from './storage';

const DATA_DIR = './data';

// Validation schemas
export const cloudSyncPreviewSchema = z.object({
  cloudUrl: z.string().url('Invalid URL format').refine(
    (url) => url.toLowerCase().startsWith('https://'),
    'Cloud URL must use HTTPS protocol'
  ),
  meetCode: z.string()
    .length(6, 'Meet code must be exactly 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Meet code must contain only uppercase letters and numbers')
});

export const cloudSyncDownloadSchema = z.object({
  cloudUrl: z.string().url('Invalid URL format').refine(
    (url) => url.toLowerCase().startsWith('https://'),
    'Cloud URL must use HTTPS protocol'
  ),
  meetCode: z.string()
    .length(6, 'Meet code must be exactly 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Meet code must contain only uppercase letters and numbers')
});

// Custom error class for API errors
export class CloudSyncError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CloudSyncError';
  }
}

export interface SyncProgress {
  stage: string;
  message: string;
  progress?: number;
  total?: number;
}

export interface SyncResult {
  success: boolean;
  meetName?: string;
  meetId?: string;
  stats?: {
    events: number;
    athletes: number;
    teams: number;
    layoutScenes: number;
    sceneMappings: number;
  };
  error?: string;
}

async function fetchMeetByCode(cloudUrl: string, meetCode: string): Promise<any> {
  const url = `${cloudUrl}/api/meets/code/${meetCode}`;
  
  try {
    const response = await fetch(url);
    
    if (response.status === 404) {
      throw new CloudSyncError(
        `Meet with code "${meetCode}" not found on cloud server`,
        404
      );
    }
    
    if (!response.ok) {
      throw new CloudSyncError(
        `Failed to fetch meet from cloud server (HTTP ${response.status})`,
        response.status >= 500 ? 500 : 400
      );
    }
    
    return response.json();
  } catch (error: any) {
    // If it's already a CloudSyncError, rethrow it
    if (error instanceof CloudSyncError) {
      throw error;
    }
    
    // Handle connection/network errors
    if (error instanceof TypeError) {
      throw new CloudSyncError(
        `Failed to connect to cloud server: ${error.message}`,
        500,
        { originalError: error.message }
      );
    }
    
    throw new CloudSyncError(
      `Error fetching meet from cloud server: ${error.message}`,
      500
    );
  }
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

// Sanitize filename to prevent directory traversal and remove special characters
function sanitizeFilename(filename: string): string {
  // Get only the basename (remove any path components)
  let basename = path.basename(filename);
  
  // Remove any leading/trailing dots and slashes
  basename = basename.replace(/^[\/.]+|[\/.]+$/g, '');
  
  // Replace special characters with underscores, keeping only alphanumeric, dots, and hyphens
  basename = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Remove multiple consecutive underscores
  basename = basename.replace(/_+/g, '_');
  
  // Ensure we have a filename
  if (!basename || basename === '' || basename === '.' || basename === '..') {
    basename = 'logo.png';
  }
  
  return basename;
}

async function downloadLogo(cloudUrl: string, logoUrl: string, subdir: string = 'logos'): Promise<string | null> {
  if (!logoUrl) return null;
  
  try {
    const fullUrl = logoUrl.startsWith('http') ? logoUrl : `${cloudUrl}${logoUrl}`;
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.warn(`Failed to download logo from ${fullUrl}: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const logoDir = path.join(DATA_DIR, subdir);
    fs.mkdirSync(logoDir, { recursive: true });
    
    // Sanitize filename to prevent directory traversal and special characters
    const filename = sanitizeFilename(logoUrl) || 'logo.png';
    const localPath = path.join(logoDir, filename);
    fs.writeFileSync(localPath, Buffer.from(buffer));
    
    return `/data/${subdir}/${filename}`;
  } catch (error) {
    console.warn(`Error downloading logo from ${logoUrl}:`, error);
    return null;
  }
}

async function downloadTeamLogos(cloudUrl: string, teams: any[]): Promise<Map<number, string>> {
  const logoMap = new Map<number, string>();
  const teamsWithLogos = teams.filter(t => t.logoUrl);
  
  for (const team of teamsWithLogos) {
    const localUrl = await downloadLogo(cloudUrl, team.logoUrl, 'team-logos');
    if (localUrl) {
      logoMap.set(team.id, localUrl);
    }
  }
  
  return logoMap;
}

export async function previewCloudMeet(cloudUrl: string, meetCode: string): Promise<{
  meet: any;
  stats: {
    events: number;
    athletes: number;
    teams: number;
    divisions: number;
    layoutScenes: number;
    sceneMappings: number;
  };
}> {
  const normalizedUrl = cloudUrl.replace(/\/$/, '');
  
  try {
    const meet = await fetchMeetByCode(normalizedUrl, meetCode.toUpperCase());
    const data = await fetchRelatedData(normalizedUrl, meet.id);
    
    return {
      meet,
      stats: {
        events: data.events.length,
        athletes: data.athletes.length,
        teams: data.teams.length,
        divisions: data.divisions.length,
        layoutScenes: data.layoutScenes.length,
        sceneMappings: data.sceneDisplayMappings.length,
      },
    };
  } catch (error: any) {
    // If it's a CloudSyncError, rethrow it as-is
    if (error instanceof CloudSyncError) {
      throw error;
    }
    
    // Wrap any other error as a CloudSyncError
    throw new CloudSyncError(
      `Failed to preview meet: ${error.message}`,
      500
    );
  }
}

export async function syncFromCloud(
  cloudUrl: string, 
  meetCode: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const normalizedUrl = cloudUrl.replace(/\/$/, '');
  
  try {
    onProgress?.({ stage: 'fetch', message: 'Connecting to cloud server...' });
    
    let meet: any;
    try {
      meet = await fetchMeetByCode(normalizedUrl, meetCode.toUpperCase());
    } catch (error: any) {
      if (error instanceof CloudSyncError) {
        return {
          success: false,
          error: error.message,
        };
      }
      throw error;
    }
    
    onProgress?.({ stage: 'fetch', message: `Found meet: ${meet.name}` });
    
    const data = await fetchRelatedData(normalizedUrl, meet.id);
    onProgress?.({ 
      stage: 'fetch', 
      message: `Fetched ${data.events.length} events, ${data.athletes.length} athletes, ${data.teams.length} teams` 
    });
    
    if (meet.logoUrl) {
      onProgress?.({ stage: 'logos', message: 'Downloading meet logo...' });
      const localLogoUrl = await downloadLogo(normalizedUrl, meet.logoUrl);
      if (localLogoUrl) {
        meet.logoUrl = localLogoUrl;
      }
    }
    
    if (data.teams.some((t: any) => t.logoUrl)) {
      onProgress?.({ stage: 'logos', message: 'Downloading team logos...' });
      const teamLogoMap = await downloadTeamLogos(normalizedUrl, data.teams);
      for (const team of data.teams) {
        if (teamLogoMap.has(team.id)) {
          team.logoUrl = teamLogoMap.get(team.id);
        }
      }
    }
    
    onProgress?.({ stage: 'database', message: 'Creating meet in database...' });
    const newMeet = await storage.createMeet({
      name: meet.name,
      location: meet.location,
      startDate: new Date(meet.startDate),
      meetCode: meet.meetCode,
      primaryColor: meet.primaryColor,
      secondaryColor: meet.secondaryColor,
      accentColor: meet.accentColor,
      textColor: meet.textColor,
      logoUrl: meet.logoUrl,
      autoRefresh: meet.autoRefresh ?? false,
      refreshInterval: meet.refreshInterval ?? 15,
      seasonId: meet.seasonId,
    });
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.teams.length} teams...`, progress: 0, total: data.teams.length });
    const teamIdMap = new Map<string, string>();
    for (let i = 0; i < data.teams.length; i++) {
      const team = data.teams[i];
      try {
        const newTeam = await storage.createTeam({
          name: team.name,
          abbreviation: team.abbreviation,
          shortName: team.shortName,
          teamNumber: team.teamNumber || i + 1,
          meetId: newMeet.id,
        });
        teamIdMap.set(team.id, newTeam.id);
      } catch (e) {}
      onProgress?.({ stage: 'database', message: `Inserting teams...`, progress: i + 1, total: data.teams.length });
    }
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.divisions.length} divisions...` });
    const divisionIdMap = new Map<string, string>();
    for (let i = 0; i < data.divisions.length; i++) {
      const division = data.divisions[i];
      try {
        const newDivision = await storage.createDivision({
          name: division.name,
          abbreviation: division.abbreviation,
          divisionNumber: division.divisionNumber || i + 1,
          lowAge: division.lowAge,
          highAge: division.highAge,
          meetId: newMeet.id,
        });
        divisionIdMap.set(division.id, newDivision.id);
      } catch (e) {}
    }
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.athletes.length} athletes...`, progress: 0, total: data.athletes.length });
    const athleteIdMap = new Map<string, string>();
    for (let i = 0; i < data.athletes.length; i++) {
      const athlete = data.athletes[i];
      try {
        const newAthlete = await storage.createAthlete({
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          teamId: teamIdMap.get(athlete.teamId) || undefined,
          meetId: newMeet.id,
          bibNumber: athlete.bibNumber,
          divisionId: divisionIdMap.get(athlete.divisionId) || undefined,
          athleteNumber: athlete.athleteNumber || i + 1,
          gender: athlete.gender,
        });
        athleteIdMap.set(athlete.id, newAthlete.id);
      } catch (e) {}
      if (i % 50 === 0) {
        onProgress?.({ stage: 'database', message: `Inserting athletes...`, progress: i, total: data.athletes.length });
      }
    }
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.events.length} events...` });
    const eventIdMap = new Map<string, string>();
    for (const event of data.events) {
      try {
        const newEvent = await storage.createEvent({
          name: event.name,
          eventNumber: event.eventNumber,
          gender: event.gender || 'M',
          meetId: newMeet.id,
          eventDate: event.eventDate || event.scheduledDate ? new Date(event.eventDate || event.scheduledDate) : undefined,
          eventTime: event.eventTime || event.scheduledTime,
          eventType: event.eventType || 'track',
          status: event.status || 'scheduled',
        });
        eventIdMap.set(event.id, newEvent.id);
      } catch (e) {}
    }
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.entries.length} entries...`, progress: 0, total: data.entries.length });
    for (let i = 0; i < data.entries.length; i++) {
      const entry = data.entries[i];
      try {
        await storage.createEntry({
          athleteId: athleteIdMap.get(entry.athleteId) || entry.athleteId,
          eventId: eventIdMap.get(entry.eventId) || entry.eventId,
          teamId: entry.teamId ? (teamIdMap.get(entry.teamId) || entry.teamId) : undefined,
          divisionId: entry.divisionId ? (divisionIdMap.get(entry.divisionId) || entry.divisionId) : undefined,
          seedMark: entry.seedMark,
          resultType: entry.resultType || 'time',
          preliminaryHeat: entry.preliminaryHeat || entry.heat,
          preliminaryLane: entry.preliminaryLane || entry.lane,
        });
      } catch (e) {}
      if (i % 100 === 0) {
        onProgress?.({ stage: 'database', message: `Inserting entries...`, progress: i, total: data.entries.length });
      }
    }
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.layoutScenes.length} layout scenes...` });
    const sceneIdMap = new Map<number, number>();
    for (const scene of data.layoutScenes) {
      try {
        const newScene = await storage.createLayoutScene({
          name: scene.name,
          meetId: newMeet.id,
          canvasWidth: scene.canvasWidth || scene.width || 1920,
          canvasHeight: scene.canvasHeight || scene.height || 1080,
          aspectRatio: scene.aspectRatio || '16:9',
          backgroundColor: scene.backgroundColor,
        });
        sceneIdMap.set(scene.id, newScene.id);
        
        const objects = scene.objects || [];
        for (const obj of objects) {
          try {
            await storage.createLayoutObject({
              sceneId: newScene.id,
              objectType: obj.objectType || obj.type || 'text',
              x: obj.x,
              y: obj.y,
              width: obj.width,
              height: obj.height,
              rotation: obj.rotation,
              zIndex: obj.zIndex,
              visible: obj.visible,
              locked: obj.locked,
              name: obj.name,
            });
          } catch (e) {}
        }
      } catch (e) {}
    }
    
    onProgress?.({ stage: 'database', message: `Inserting ${data.sceneDisplayMappings.length} scene mappings...` });
    for (const mapping of data.sceneDisplayMappings) {
      try {
        const localSceneId = sceneIdMap.get(mapping.sceneId);
        if (localSceneId) {
          await storage.setSceneTemplateMapping({
            meetId: newMeet.id,
            displayType: mapping.displayType,
            displayMode: mapping.displayMode,
            sceneId: localSceneId,
          });
        }
      } catch (e) {}
    }
    
    onProgress?.({ stage: 'complete', message: 'Sync complete!' });
    
    // Save the cloud URL for update checking
    try {
      const configPath = path.join(DATA_DIR, 'edge-config.json');
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const config = {
        cloudUrl: normalizedUrl,
        edgeId: `edge-${Date.now()}`,
        lastSync: new Date().toISOString(),
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      // Non-critical - continue even if config save fails
    }
    
    return {
      success: true,
      meetName: meet.name,
      meetId: newMeet.id,
      stats: {
        events: data.events.length,
        athletes: data.athletes.length,
        teams: data.teams.length,
        layoutScenes: data.layoutScenes.length,
        sceneMappings: data.sceneDisplayMappings.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}
