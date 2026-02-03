import fs from 'fs';
import path from 'path';
import { storage } from './storage';

const PACKAGES_DIR = './meets';
const UPLOADS_DIR = './uploads';
const LOGOS_DIR = './logos';

export interface MeetPackage {
  version: string;
  exportedAt: string;
  meet: any;
  events: any[];
  athletes: any[];
  entries: any[];
  teams: any[];
  divisions: any[];
  layoutScenes: any[];
  layoutObjects: any[];
  sceneTemplateMappings: any[];
  displayThemes: any[];
}

export interface PackageInfo {
  packageName: string;
  meetName: string;
  meetCode: string;
  exportedAt: string;
  stats: {
    events: number;
    athletes: number;
    teams: number;
    scenes: number;
  };
  hasLogo: boolean;
}

export interface ExportResult {
  success: boolean;
  packagePath?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  meetId?: string;
  meetName?: string;
  stats?: {
    events: number;
    athletes: number;
    teams: number;
    scenes: number;
    mappings: number;
  };
  error?: string;
}

function sanitizeForFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function exportMeetPackage(meetId: string): Promise<ExportResult> {
  try {
    const meet = await storage.getMeet(meetId);
    if (!meet) {
      return { success: false, error: 'Meet not found' };
    }

    const [
      events,
      athletes,
      allEntries,
      teams,
      allDivisions,
      layoutScenes,
      sceneTemplateMappings,
      displayThemes,
    ] = await Promise.all([
      storage.getEventsByMeetId(meetId),
      storage.getAthletesByMeetId(meetId),
      storage.getEntries(),
      storage.getTeamsByMeetId(meetId),
      storage.getDivisions(),
      storage.getLayoutScenes(meetId),
      storage.getSceneTemplateMappings(meetId),
      storage.getDisplayThemes(meetId),
    ]);

    const eventIds = new Set(events.map(e => e.id));
    const entries = allEntries.filter(e => eventIds.has(e.eventId));
    
    const divisionIds = new Set(events.map(e => e.meetId).filter(Boolean));
    const divisions = allDivisions.filter(d => d.meetId === meetId);

    const allLayoutObjects: any[] = [];
    for (const scene of layoutScenes) {
      const objects = await storage.getLayoutObjects(scene.id);
      allLayoutObjects.push(...objects.map((obj: any) => ({ ...obj, originalSceneId: scene.id })));
    }

    const packageName = `${sanitizeForFilename(meet.name)}-${meet.meetCode}`;
    const packageDir = path.join(PACKAGES_DIR, packageName);
    ensureDir(packageDir);

    const packageData: MeetPackage = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      meet,
      events,
      athletes,
      entries,
      teams,
      divisions,
      layoutScenes,
      layoutObjects: allLayoutObjects,
      sceneTemplateMappings,
      displayThemes,
    };

    fs.writeFileSync(
      path.join(packageDir, 'meet-package.json'),
      JSON.stringify(packageData, null, 2)
    );

    const logosDir = path.join(packageDir, 'logos');
    ensureDir(logosDir);

    if (meet.logoUrl && !meet.logoUrl.startsWith('http')) {
      const logoPath = meet.logoUrl.startsWith('/') 
        ? `.${meet.logoUrl}` 
        : meet.logoUrl;
      
      if (fs.existsSync(logoPath)) {
        const destPath = path.join(logosDir, 'meet-logo' + path.extname(logoPath));
        fs.copyFileSync(logoPath, destPath);
      }
    }

    const teamLogosDir = path.join(logosDir, 'teams');
    ensureDir(teamLogosDir);

    for (const theme of displayThemes) {
      if (theme.logoUrl && !theme.logoUrl.startsWith('http')) {
        const logoPath = theme.logoUrl.startsWith('/') 
          ? `.${theme.logoUrl}` 
          : theme.logoUrl;
        
        if (fs.existsSync(logoPath)) {
          const filename = `theme-${theme.id}${path.extname(logoPath)}`;
          fs.copyFileSync(logoPath, path.join(logosDir, filename));
        }
      }
    }

    return {
      success: true,
      packagePath: packageDir,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error during export',
    };
  }
}

export async function listMeetPackages(): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = [];

  if (!fs.existsSync(PACKAGES_DIR)) {
    return packages;
  }

  const dirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const dir of dirs) {
    const packagePath = path.join(PACKAGES_DIR, dir, 'meet-package.json');
    
    if (fs.existsSync(packagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as MeetPackage;
        const logoPath = path.join(PACKAGES_DIR, dir, 'logos', 'meet-logo.png');
        const logoPathJpg = path.join(PACKAGES_DIR, dir, 'logos', 'meet-logo.jpg');
        
        packages.push({
          packageName: dir,
          meetName: data.meet.name,
          meetCode: data.meet.meetCode,
          exportedAt: data.exportedAt,
          stats: {
            events: data.events.length,
            athletes: data.athletes.length,
            teams: data.teams.length,
            scenes: data.layoutScenes.length,
          },
          hasLogo: fs.existsSync(logoPath) || fs.existsSync(logoPathJpg),
        });
      } catch (e) {
      }
    }
  }

  return packages.sort((a, b) => 
    new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
  );
}

export async function importMeetPackage(packageName: string): Promise<ImportResult> {
  try {
    const packageDir = path.join(PACKAGES_DIR, packageName);
    const packagePath = path.join(packageDir, 'meet-package.json');

    if (!fs.existsSync(packagePath)) {
      return { success: false, error: 'Package not found' };
    }

    const data = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as MeetPackage;

    const existingMeet = await storage.getMeetByCode(data.meet.meetCode);
    if (existingMeet) {
      return { 
        success: false, 
        error: `A meet with code ${data.meet.meetCode} already exists. Delete it first or use a different package.` 
      };
    }

    ensureDir(LOGOS_DIR);
    ensureDir(UPLOADS_DIR);

    let meetLogoUrl = data.meet.logoUrl;
    const packageLogosDir = path.join(packageDir, 'logos');
    
    const logoFiles = fs.readdirSync(packageLogosDir).filter(f => f.startsWith('meet-logo'));
    if (logoFiles.length > 0) {
      const srcLogo = path.join(packageLogosDir, logoFiles[0]);
      const destLogo = path.join(LOGOS_DIR, `meet-${data.meet.meetCode}${path.extname(logoFiles[0])}`);
      fs.copyFileSync(srcLogo, destLogo);
      meetLogoUrl = `/logos/meet-${data.meet.meetCode}${path.extname(logoFiles[0])}`;
    }

    const newMeet = await storage.createMeet({
      name: data.meet.name,
      location: data.meet.location,
      startDate: new Date(data.meet.startDate),
      endDate: data.meet.endDate ? new Date(data.meet.endDate) : undefined,
      meetCode: data.meet.meetCode,
      primaryColor: data.meet.primaryColor,
      secondaryColor: data.meet.secondaryColor,
      accentColor: data.meet.accentColor,
      textColor: data.meet.textColor,
      logoUrl: meetLogoUrl,
      mdbPath: data.meet.mdbPath,
      autoRefresh: data.meet.autoRefresh ?? false,
      refreshInterval: data.meet.refreshInterval ?? 15,
      trackLength: data.meet.trackLength,
    });

    const teamIdMap = new Map<string, string>();
    const teamLogosDir = path.join(packageLogosDir, 'teams');
    
    for (const team of data.teams) {
      let logoUrl = team.logoUrl;
      
      if (fs.existsSync(teamLogosDir)) {
        const teamLogoFile = fs.readdirSync(teamLogosDir)
          .find(f => f.startsWith(`team-${team.teamNumber}`));
        
        if (teamLogoFile) {
          const srcLogo = path.join(teamLogosDir, teamLogoFile);
          const destLogo = path.join(LOGOS_DIR, `team-${newMeet.id}-${team.teamNumber}${path.extname(teamLogoFile)}`);
          fs.copyFileSync(srcLogo, destLogo);
          logoUrl = `/logos/team-${newMeet.id}-${team.teamNumber}${path.extname(teamLogoFile)}`;
        }
      }

      try {
        const newTeam = await storage.createTeam({
          name: team.name,
          shortName: team.shortName,
          abbreviation: team.abbreviation,
          teamNumber: team.teamNumber,
          meetId: newMeet.id,
        });
        teamIdMap.set(team.id, newTeam.id);
      } catch (e) {}
    }

    const divisionIdMap = new Map<string, string>();
    for (const division of data.divisions) {
      try {
        const newDivision = await storage.createDivision({
          name: division.name,
          abbreviation: division.abbreviation,
          divisionNumber: division.divisionNumber,
          lowAge: division.lowAge,
          highAge: division.highAge,
          meetId: newMeet.id,
        });
        divisionIdMap.set(division.id, newDivision.id);
      } catch (e) {}
    }

    const athleteIdMap = new Map<string, string>();
    for (const athlete of data.athletes) {
      try {
        const newAthlete = await storage.createAthlete({
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          athleteNumber: athlete.athleteNumber,
          bibNumber: athlete.bibNumber,
          gender: athlete.gender,
          teamId: teamIdMap.get(athlete.teamId) || undefined,
          divisionId: divisionIdMap.get(athlete.divisionId) || undefined,
          meetId: newMeet.id,
        });
        athleteIdMap.set(athlete.id, newAthlete.id);
      } catch (e) {}
    }

    const eventIdMap = new Map<string, string>();
    for (const event of data.events) {
      try {
        const newEvent = await storage.createEvent({
          name: event.name,
          eventNumber: event.eventNumber,
          eventType: event.eventType,
          gender: event.gender,
          distance: event.distance,
          status: event.status || 'scheduled',
          numRounds: event.numRounds,
          numLanes: event.numLanes,
          advanceByPlace: event.advanceByPlace,
          advanceByTime: event.advanceByTime,
          isMultiEvent: event.isMultiEvent,
          eventDate: event.eventDate ? new Date(event.eventDate) : undefined,
          eventTime: event.eventTime,
          sessionName: event.sessionName,
          meetId: newMeet.id,
        });
        eventIdMap.set(event.id, newEvent.id);
      } catch (e) {}
    }

    for (const entry of data.entries) {
      try {
        const newEventId = eventIdMap.get(entry.eventId);
        const newAthleteId = athleteIdMap.get(entry.athleteId);
        
        if (newEventId && newAthleteId) {
          await storage.createEntry({
            eventId: newEventId,
            athleteId: newAthleteId,
            teamId: entry.teamId ? teamIdMap.get(entry.teamId) : undefined,
            divisionId: entry.divisionId ? divisionIdMap.get(entry.divisionId) : undefined,
            seedMark: entry.seedMark,
            resultType: entry.resultType || 'time',
            preliminaryHeat: entry.preliminaryHeat,
            preliminaryLane: entry.preliminaryLane,
            quarterfinalHeat: entry.quarterfinalHeat,
            quarterfinalLane: entry.quarterfinalLane,
            semifinalHeat: entry.semifinalHeat,
            semifinalLane: entry.semifinalLane,
            finalHeat: entry.finalHeat,
            finalLane: entry.finalLane,
          });
        }
      } catch (e) {}
    }

    const sceneIdMap = new Map<number, number>();
    for (const scene of data.layoutScenes) {
      try {
        const newScene = await storage.createLayoutScene({
          name: scene.name,
          description: scene.description,
          canvasWidth: scene.canvasWidth || 1920,
          canvasHeight: scene.canvasHeight || 1080,
          aspectRatio: scene.aspectRatio || '16:9',
          backgroundColor: scene.backgroundColor,
          backgroundImage: scene.backgroundImage,
          isTemplate: scene.isTemplate,
          meetId: newMeet.id,
        });
        sceneIdMap.set(scene.id, newScene.id);

        const sceneObjects = data.layoutObjects.filter(
          (obj: any) => obj.sceneId === scene.id || obj.originalSceneId === scene.id
        );
        
        for (const obj of sceneObjects) {
          try {
            await storage.createLayoutObject({
              sceneId: newScene.id,
              name: obj.name,
              objectType: obj.objectType,
              x: obj.x,
              y: obj.y,
              width: obj.width,
              height: obj.height,
              zIndex: obj.zIndex,
              rotation: obj.rotation,
              dataBinding: obj.dataBinding,
              config: obj.config,
              style: obj.style,
              visible: obj.visible,
              locked: obj.locked,
            });
          } catch (e) {}
        }
      } catch (e) {}
    }

    let mappingsCount = 0;
    for (const mapping of data.sceneTemplateMappings) {
      try {
        const newSceneId = sceneIdMap.get(mapping.sceneId);
        if (newSceneId) {
          await storage.setSceneTemplateMapping({
            meetId: newMeet.id,
            displayType: mapping.displayType,
            displayMode: mapping.displayMode,
            sceneId: newSceneId,
          });
          mappingsCount++;
        }
      } catch (e) {}
    }

    return {
      success: true,
      meetId: newMeet.id,
      meetName: newMeet.name,
      stats: {
        events: data.events.length,
        athletes: data.athletes.length,
        teams: data.teams.length,
        scenes: data.layoutScenes.length,
        mappings: mappingsCount,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error during import',
    };
  }
}

export async function deleteMeetPackage(packageName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const packageDir = path.join(PACKAGES_DIR, packageName);
    
    if (!fs.existsSync(packageDir)) {
      return { success: false, error: 'Package not found' };
    }

    fs.rmSync(packageDir, { recursive: true, force: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
