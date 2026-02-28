import type { Express } from "express";
import { storage } from "../storage";
import {
  insertAthleteSchema,
  insertTeamSchema,
  insertDivisionSchema,
} from "@shared/schema";
import type { RouteContext } from "../route-context";
import * as path from 'path';
import { unlink } from 'fs/promises';

export function registerAthletesTeamsRoutes(app: Express, ctx: RouteContext) {
  const { fileStorage, imageUpload, broadcastToDisplays } = ctx;

  // ===== ATHLETES =====
  app.get("/api/athletes", async (req, res) => {
    try {
      const { meetId, search } = req.query;
      let athletes;
      if (meetId) {
        athletes = await storage.getAthletesByMeetId(meetId as string);
        // Get teams to include team names
        const teams = await storage.getTeamsByMeetId(meetId as string);
        const teamMap = new Map(teams.map(t => [t.id, t.name]));
        let athletesWithTeams = athletes.map(a => ({
          ...a,
          teamName: a.teamId ? teamMap.get(a.teamId) || null : null
        }));
        
        // Filter by search if provided
        if (search && typeof search === 'string' && search.trim()) {
          const searchLower = search.toLowerCase().trim();
          athletesWithTeams = athletesWithTeams.filter(a => {
            const fullName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            const bibNumber = (a.bibNumber || '').toLowerCase();
            return fullName.includes(searchLower) || bibNumber.includes(searchLower);
          });
        }
        
        return res.json(athletesWithTeams);
      }
      athletes = await storage.getAthletes();
      
      // Filter by search if provided
      if (search && typeof search === 'string' && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        athletes = athletes.filter(a => {
          const fullName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          const bibNumber = (a.bibNumber || '').toLowerCase();
          return fullName.includes(searchLower) || bibNumber.includes(searchLower);
        });
      }
      
      res.json(athletes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/athletes/:id", async (req, res) => {
    const athlete = await storage.getAthlete(req.params.id);
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }
    res.json(athlete);
  });

  // Get events for an athlete
  app.get("/api/athletes/:id/events", async (req, res) => {
    try {
      const athlete = await storage.getAthlete(req.params.id);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      const entries = await storage.getEntriesByAthlete(req.params.id);
      
      // Extract unique events with entry details
      const eventsMap = new Map<string, { event: any; entry: any }>();
      for (const entry of entries) {
        if (entry.event && !eventsMap.has(entry.event.id)) {
          eventsMap.set(entry.event.id, {
            event: entry.event,
            entry: {
              id: entry.id,
              seedMark: entry.seedMark,
              finalMark: entry.finalMark,
              finalPlace: entry.finalPlace,
              isScratched: entry.isScratched,
              isDisqualified: entry.isDisqualified,
              checkInStatus: entry.checkInStatus,
              // Heat/Lane assignments (use most relevant round)
              heat: entry.finalHeat || entry.semifinalHeat || entry.quarterfinalHeat || entry.preliminaryHeat,
              lane: entry.finalLane || entry.semifinalLane || entry.quarterfinalLane || entry.preliminaryLane,
            }
          });
        }
      }
      
      // Sort by event number
      const events = Array.from(eventsMap.values())
        .sort((a, b) => (a.event.eventNumber || 0) - (b.event.eventNumber || 0));
      
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/athletes", async (req, res) => {
    try {
      const data = insertAthleteSchema.parse(req.body);
      const athlete = await storage.createAthlete(data);
      res.json(athlete);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== TEAMS =====
  app.get("/api/teams", async (req, res) => {
    try {
      const { meetId } = req.query;
      if (meetId) {
        const teams = await storage.getTeamsByMeetId(meetId as string);
        return res.json(teams);
      }
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const data = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(data);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Look up team by affiliation name — returns logo URL + colors for curtain use.
  // Logo: exact-match against /public/logos/NCAA/{name}.png (no fuzzy matching).
  // Colors: manually set team colors take priority; otherwise extracted from the logo.
  app.get("/api/teams/by-affiliation", async (req, res) => {
    try {
      const { name, meetId } = req.query;
      if (!name) return res.status(400).json({ error: "name required" });
      const nameStr = String(name).trim();

      // 1. Check for NCAA logo by exact name match
      const ncaaLogoPath = path.join(process.cwd(), 'public', 'logos', 'NCAA', `${nameStr}.png`);
      let logoUrl: string | null = null;
      let primaryColor: string | null = null;
      let secondaryColor: string | null = null;

      const logoExists = await import('fs/promises').then(fs => fs.access(ncaaLogoPath).then(() => true).catch(() => false));
      if (logoExists) {
        logoUrl = `/logos/NCAA/${encodeURIComponent(nameStr)}.png`;
        // Extract dominant colors from the logo
        try {
          const fs = await import('fs/promises');
          const buf = await fs.readFile(ncaaLogoPath);
          const colors = await fileStorage.extractColorsFromImage(buf);
          primaryColor = colors.primaryColor;
          secondaryColor = colors.secondaryColor;
        } catch { /* use defaults if extraction fails */ }
      }

      // 2. Look up team in DB for manually overridden colors
      try {
        const teamsToSearch = meetId
          ? await storage.getTeamsByMeetId(String(meetId))
          : await storage.getTeams();
        const match = teamsToSearch.find(t =>
          t.name.trim() === nameStr ||
          (t.shortName && t.shortName.trim() === nameStr) ||
          (t.abbreviation && t.abbreviation.trim() === nameStr)
        );
        if (match) {
          // Manually set colors override extracted colors
          if (match.primaryColor) primaryColor = match.primaryColor;
          if (match.secondaryColor) secondaryColor = match.secondaryColor;
          // Uploaded logo overrides NCAA static logo
          const uploadedLogo = await storage.getTeamLogo(match.id);
          if (uploadedLogo) logoUrl = fileStorage.publicUrlForKey(uploadedLogo.storageKey);
        }
      } catch { /* DB lookup is best-effort */ }

      res.json({ name: nameStr, logoUrl, primaryColor, secondaryColor });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update team colors
  app.patch("/api/teams/:id/colors", async (req, res) => {
    try {
      const { primaryColor, secondaryColor } = req.body;
      const team = await storage.getTeam(req.params.id);
      if (!team) return res.status(404).json({ error: "Team not found" });
      const updated = await storage.updateTeam(req.params.id, { primaryColor, secondaryColor });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/teams/:id/score-override", async (req, res) => {
    try {
      const teamId = req.params.id;
      const { gender, score } = req.body;
      
      if (!gender || (gender !== 'M' && gender !== 'W')) {
        return res.status(400).json({ error: "Gender must be 'M' or 'W'" });
      }
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const numericScore = score !== null && score !== undefined && score !== '' ? Number(score) : null;
      if (numericScore !== null && (!isFinite(numericScore) || numericScore < 0)) {
        return res.status(400).json({ error: "Score must be a non-negative number" });
      }
      
      const updateData: any = {};
      if (gender === 'M') {
        updateData.menScoreOverride = numericScore;
      } else {
        updateData.womenScoreOverride = numericScore;
      }
      
      await storage.updateTeam(teamId, updateData);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating team score override:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/meets/:meetId/refresh-team-scores", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      
      const meetTeams = await storage.getTeamsByMeetId(meetId);
      for (const team of meetTeams) {
        await storage.updateTeam(team.id, { 
          menScoreOverride: null, 
          womenScoreOverride: null 
        });
      }
      
      const meet = await storage.getMeet(meetId);
      if (meet?.mdbPath) {
        try {
          const { importCompleteMDB } = await import('../import-mdb-complete');
          await importCompleteMDB(meet.mdbPath, meetId);
          console.log(`[Refresh Team Scores] Re-imported MDB for meet ${meetId}`);
        } catch (err) {
          console.log(`[Refresh Team Scores] MDB re-import failed:`, err);
        }
      }
      
      const [menStandings, womenStandings] = await Promise.all([
        storage.getTeamStandings(meetId, { gender: "M" }),
        storage.getTeamStandings(meetId, { gender: "W" }),
      ]);
      
      res.json({ men: menStandings, women: womenStandings });
    } catch (error: any) {
      console.error("Error refreshing team scores:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Divisions
  app.get("/api/divisions", async (req, res) => {
    const divisions = await storage.getDivisions();
    res.json(divisions);
  });

  app.post("/api/divisions", async (req, res) => {
    try {
      const data = insertDivisionSchema.parse(req.body);
      const division = await storage.createDivision(data);
      res.json(division);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ARCHIVED: Season management feature

  // Meets

  // ===== ATHLETE PHOTOS =====
  // ===== ATHLETE PHOTOS =====

  // Upload athlete photo
  // Test with: POST /api/athletes/{athleteId}/photo with multipart/form-data photo field
  app.post("/api/athletes/:id/photo", imageUpload.single("photo"), async (req, res) => {
    let photoData: {
      storageKey: string;
      width: number;
      height: number;
      byteSize: number;
      contentType: string;
    } | null = null;

    try {
      const athleteId = req.params.id;

      if (!req.file) {
        return res.status(400).json({ error: "No photo uploaded" });
      }

      const file = req.file;
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        await unlink(file.path).catch(console.error);
        return res.status(400).json({ 
          error: "File too large. Maximum size is 5MB" 
        });
      }

      // Validate MIME type
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        await unlink(file.path).catch(console.error);
        return res.status(400).json({ 
          error: "Invalid file type. Only JPEG, PNG, and GIF are allowed" 
        });
      }

      // Check if athlete exists
      const athlete = await storage.getAthlete(athleteId);
      if (!athlete) {
        await unlink(file.path).catch(console.error);
        return res.status(404).json({ error: "Athlete not found" });
      }

      // Read file buffer
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(file.path);

      // ATOMIC PATTERN:
      // 1. Save new file to disk first
      photoData = await fileStorage.saveAthletePhoto(
        buffer,
        athleteId,
        athlete.meetId,
        file.originalname
      );

      // Clean up temp file
      await unlink(file.path).catch(console.error);

      // 2. DB transaction: get old, delete old, insert new, return old storageKey
      const { newPhoto, oldPhoto } = await storage.createAthletePhoto({
        athleteId,
        meetId: athlete.meetId,
        storageKey: photoData.storageKey,
        originalFilename: file.originalname,
        contentType: photoData.contentType,
        width: photoData.width,
        height: photoData.height,
        byteSize: photoData.byteSize,
      });

      // 3. Delete old file from disk (only after DB commit succeeds)
      if (oldPhoto && oldPhoto.storageKey) {
        await fileStorage.deleteByKey(oldPhoto.storageKey).catch(console.error);
      }

      // Return photo with URL
      res.json({
        id: newPhoto.id,
        url: fileStorage.publicUrlForKey(newPhoto.storageKey),
        width: newPhoto.width,
        height: newPhoto.height,
        byteSize: newPhoto.byteSize,
      });
    } catch (error: any) {
      console.error("Error uploading athlete photo:", error);
      
      // Cleanup new file if DB transaction failed
      if (photoData && photoData.storageKey) {
        await fileStorage.deleteByKey(photoData.storageKey).catch(console.error);
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  // Get athlete photo
  // Test with: GET /api/athletes/{athleteId}/photo
  app.get("/api/athletes/:id/photo", async (req, res) => {
    try {
      const athleteId = req.params.id;
      const photo = await storage.getAthletePhoto(athleteId);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      res.json({
        id: photo.id,
        url: fileStorage.publicUrlForKey(photo.storageKey),
        width: photo.width,
        height: photo.height,
        byteSize: photo.byteSize,
      });
    } catch (error: any) {
      console.error("Error fetching athlete photo:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete athlete photo
  // Test with: DELETE /api/athletes/{athleteId}/photo
  app.delete("/api/athletes/:id/photo", async (req, res) => {
    try {
      const athleteId = req.params.id;
      
      // Delete from database (returns old record with storageKey)
      const result = await storage.deleteAthletePhoto(athleteId);
      
      if (!result.deleted) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Delete physical file
      await fileStorage.deleteByKey(result.photo.storageKey);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting athlete photo:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get bulk athlete photos by athlete IDs
  // Test with: GET /api/athletes/photos/bulk?ids=id1,id2,id3
  app.get("/api/athletes/photos/bulk", async (req, res) => {
    try {
      const idsParam = req.query.ids as string;
      
      if (!idsParam) {
        return res.json([]);
      }

      const athleteIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
      
      if (athleteIds.length === 0) {
        return res.json([]);
      }

      // Fetch photos for all athlete IDs in parallel
      const photoPromises = athleteIds.map(id => storage.getAthletePhoto(id));
      const photos = await Promise.all(photoPromises);

      // Map to response format with public URLs
      const photoData = photos
        .map((photo, index) => {
          if (!photo) return null;
          return {
            athleteId: athleteIds[index],
            url: fileStorage.publicUrlForKey(photo.storageKey),
            width: photo.width,
            height: photo.height,
          };
        })
        .filter(Boolean);

      res.json(photoData);
    } catch (error: any) {
      console.error("Error fetching bulk athlete photos:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== TEAM LOGOS =====
  // ===== TEAM LOGOS =====

  // Get bulk team logos by team IDs
  // Test with: GET /api/teams/logos/bulk?ids=id1,id2,id3
  app.get("/api/teams/logos/bulk", async (req, res) => {
    try {
      const idsParam = req.query.ids as string;
      
      if (!idsParam) {
        return res.json([]);
      }

      const teamIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
      
      if (teamIds.length === 0) {
        return res.json([]);
      }

      // Fetch logos for all team IDs in parallel
      const logoPromises = teamIds.map(id => storage.getTeamLogo(id));
      const logos = await Promise.all(logoPromises);

      // Map to response format with public URLs
      const logoData = logos
        .map((logo, index) => {
          if (!logo) return null;
          return {
            teamId: teamIds[index],
            url: fileStorage.publicUrlForKey(logo.storageKey),
            width: logo.width,
            height: logo.height,
          };
        })
        .filter(Boolean);

      res.json(logoData);
    } catch (error: any) {
      console.error("Error fetching bulk team logos:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload team logo
  // Test with: POST /api/teams/{teamId}/logo with multipart/form-data logo field
  app.post("/api/teams/:id/logo", imageUpload.single("logo"), async (req, res) => {
    let logoData: {
      storageKey: string;
      width: number;
      height: number;
      byteSize: number;
      contentType: string;
    } | null = null;

    try {
      const teamId = req.params.id;

      if (!req.file) {
        return res.status(400).json({ error: "No logo uploaded" });
      }

      const file = req.file;
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          error: "File too large. Maximum size is 5MB" 
        });
      }

      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only JPEG, PNG, and GIF are allowed" 
        });
      }

      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      const buffer = file.buffer;

      logoData = await fileStorage.saveTeamLogo(
        buffer,
        teamId,
        team.meetId,
        file.originalname
      );

      // 2. DB transaction: get old, delete old, insert new, return old storageKey
      const { newLogo, oldLogo } = await storage.createTeamLogo({
        teamId,
        meetId: team.meetId,
        storageKey: logoData.storageKey,
        originalFilename: file.originalname,
        contentType: logoData.contentType,
        width: logoData.width,
        height: logoData.height,
        byteSize: logoData.byteSize,
      });

      // 3. Delete old file from disk (only after DB commit succeeds)
      if (oldLogo && oldLogo.storageKey) {
        await fileStorage.deleteByKey(oldLogo.storageKey).catch(console.error);
      }

      // Return logo with URL
      res.json({
        id: newLogo.id,
        url: fileStorage.publicUrlForKey(newLogo.storageKey),
        width: newLogo.width,
        height: newLogo.height,
        byteSize: newLogo.byteSize,
      });
    } catch (error: any) {
      console.error("Error uploading team logo:", error);
      
      // Cleanup new file if DB transaction failed
      if (logoData && logoData.storageKey) {
        await fileStorage.deleteByKey(logoData.storageKey).catch(console.error);
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  // Get team logo
  // Test with: GET /api/teams/{teamId}/logo
  app.get("/api/teams/:id/logo", async (req, res) => {
    try {
      const teamId = req.params.id;
      const logo = await storage.getTeamLogo(teamId);
      
      if (!logo) {
        return res.status(404).json({ error: "Logo not found" });
      }

      res.json({
        id: logo.id,
        url: fileStorage.publicUrlForKey(logo.storageKey),
        width: logo.width,
        height: logo.height,
        byteSize: logo.byteSize,
      });
    } catch (error: any) {
      console.error("Error fetching team logo:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete team logo
  // Test with: DELETE /api/teams/{teamId}/logo
  app.delete("/api/teams/:id/logo", async (req, res) => {
    try {
      const teamId = req.params.id;
      
      // Delete from database (returns old record with storageKey)
      const result = await storage.deleteTeamLogo(teamId);
      
      if (!result.deleted) {
        return res.status(404).json({ error: "Logo not found" });
      }

      // Delete physical file
      await fileStorage.deleteByKey(result.logo.storageKey);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting team logo:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== NCAA LOGO LOOKUP =====
  // ===== NCAA LOGO LOOKUP =====

  // Get NCAA logo URL for a team name (matches team name to pre-loaded NCAA logos)
  // Test with: GET /api/ncaa-logo?name=Bucknell
  app.get("/api/ncaa-logo", async (req, res) => {
    try {
      const teamName = req.query.name as string;
      
      if (!teamName) {
        return res.status(400).json({ error: "Team name is required" });
      }

      const fs = await import('fs/promises');
      const path = await import('path');
      const logosDir = path.join(process.cwd(), 'public', 'logos', 'NCAA');
      
      // Try to find matching logo file
      let logoPath: string | null = null;
      
      try {
        const files = await fs.readdir(logosDir);
        
        // Try exact match first (case-insensitive)
        const exactMatch = files.find(f => 
          f.toLowerCase() === `${teamName.toLowerCase()}.png`
        );
        
        if (exactMatch) {
          logoPath = `/logos/NCAA/${exactMatch}`;
        } else {
          // Normalize function for consistent matching
          const normalize = (s: string) => s.toLowerCase()
            .replace(/\./g, '')  // Remove periods
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
          
          const normalizedName = normalize(teamName);
          
          const normalizedMatch = files.find(f => {
            const fileName = normalize(f.replace('.png', ''));
            return fileName === normalizedName;
          });
          
          if (normalizedMatch) {
            logoPath = `/logos/NCAA/${normalizedMatch}`;
          }
        }
      } catch (dirError) {
        // Directory doesn't exist
        console.warn("NCAA logos directory not found");
      }

      if (logoPath) {
        res.json({ url: logoPath, teamName });
      } else {
        res.status(404).json({ error: "Logo not found", teamName });
      }
    } catch (error: any) {
      console.error("Error looking up NCAA logo:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get NCAA logos for multiple teams at once
  // Test with: GET /api/ncaa-logos/bulk?names=Bucknell,Lehigh,Lafayette
  app.get("/api/ncaa-logos/bulk", async (req, res) => {
    try {
      const namesParam = req.query.names as string;
      
      if (!namesParam) {
        return res.json([]);
      }

      const teamNames = namesParam.split(',').map(n => n.trim()).filter(Boolean);
      
      if (teamNames.length === 0) {
        return res.json([]);
      }

      const fs = await import('fs/promises');
      const path = await import('path');
      const logosDir = path.join(process.cwd(), 'public', 'logos', 'NCAA');
      
      let files: string[] = [];
      try {
        files = await fs.readdir(logosDir);
      } catch (dirError) {
        return res.json([]);
      }

      // Normalize function for consistent matching
      const normalize = (s: string) => s.toLowerCase()
        .replace(/\./g, '')  // Remove periods
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

      const results = teamNames.map(teamName => {
        // Try exact match first (case-insensitive)
        const exactMatch = files.find(f => 
          f.toLowerCase() === `${teamName.toLowerCase()}.png`
        );
        
        if (exactMatch) {
          return { teamName, url: `/logos/NCAA/${exactMatch}` };
        }
        
        // Try normalized matching
        const normalizedName = normalize(teamName);
        
        const normalizedMatch = files.find(f => {
          const fileName = normalize(f.replace('.png', ''));
          return fileName === normalizedName;
        });
        
        if (normalizedMatch) {
          return { teamName, url: `/logos/NCAA/${normalizedMatch}` };
        }
        
        return { teamName, url: null };
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error looking up bulk NCAA logos:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // List all available NCAA logos
  // Test with: GET /api/ncaa-logos
  app.get("/api/ncaa-logos", async (req, res) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const logosDir = path.join(process.cwd(), 'public', 'logos', 'NCAA');
      
      const files = await fs.readdir(logosDir);
      const logos = files
        .filter(f => f.endsWith('.png') && f !== '0.png')
        .map(f => ({
          name: f.replace('.png', ''),
          url: `/logos/NCAA/${f}`
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({ count: logos.length, logos });
    } catch (error: any) {
      console.error("Error listing NCAA logos:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ===== LOGO MANAGER =====

  // Levenshtein distance for fuzzy matching suggestions
  function levenshteinLogo(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function findBestLogoMatch(expected: string, orphanFiles: string[]): string | null {
    if (orphanFiles.length === 0) return null;
    const expectedLower = expected.toLowerCase();
    let bestFile: string | null = null;
    let bestScore = Infinity;
    for (const f of orphanFiles) {
      const nameWithoutExt = f.substring(0, f.lastIndexOf('.')).toLowerCase();
      const dist = levenshteinLogo(expectedLower, nameWithoutExt);
      if (dist < bestScore) {
        bestScore = dist;
        bestFile = f;
      }
    }
    // Only suggest if similarity is reasonable (distance < 60% of expected length)
    if (bestFile && bestScore <= Math.ceil(expected.length * 0.6)) {
      return bestFile;
    }
    return null;
  }

  // List all teams for a meet with logo match status against NCAA logo files
  app.get('/api/meets/:meetId/logo-manager', async (req, res) => {
    try {
      const { meetId } = req.params;
      const fs = await import('fs/promises');
      const path = await import('path');
      const logosDir = path.join(process.cwd(), 'public', 'logos', 'NCAA');

      // Read all logo files
      let logoFiles: string[] = [];
      try {
        const allFiles = await fs.readdir(logosDir);
        logoFiles = allFiles.filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f) && f !== '0.png');
      } catch (e: any) {
        return res.status(400).json({ error: `Cannot read logos directory: ${e.message}` });
      }

      // Build lookup map: lowercase name (without ext) → actual filename
      const fileMap = new Map<string, string>();
      for (const f of logoFiles) {
        const nameWithoutExt = f.substring(0, f.lastIndexOf('.')).toLowerCase();
        fileMap.set(nameWithoutExt, f);
      }

      // Normalize for matching (remove periods, normalize spaces)
      const normalize = (s: string) => s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
      const normalizedFileMap = new Map<string, string>();
      for (const f of logoFiles) {
        const nameWithoutExt = f.substring(0, f.lastIndexOf('.'));
        normalizedFileMap.set(normalize(nameWithoutExt), f);
      }

      // Get all teams for this meet
      const teams = await storage.getTeamsByMeetId(meetId);

      const results = teams.map(team => {
        const teamName = (team.name || '').trim();
        const lowerName = teamName.toLowerCase();

        // Try exact match first
        let matchedFile = fileMap.get(lowerName) || null;

        // Try normalized match
        if (!matchedFile) {
          matchedFile = normalizedFileMap.get(normalize(teamName)) || null;
        }

        return {
          teamId: team.id,
          teamName,
          affiliation: team.affiliation || '',
          expectedFilename: teamName,
          matchedFile,
          hasLogo: !!matchedFile,
          logoUrl: matchedFile ? `/logos/NCAA/${matchedFile}` : null,
          suggestedFile: null as string | null,
        };
      });

      // Find orphan logo files that don't match any team in this meet
      const matchedFiles = new Set(results.filter(r => r.matchedFile).map(r => r.matchedFile!));
      const orphanFiles = logoFiles.filter(f => !matchedFiles.has(f));

      // Fuzzy match: suggest best orphan file for each unmatched team
      for (const r of results) {
        if (!r.hasLogo) {
          r.suggestedFile = findBestLogoMatch(r.expectedFilename, orphanFiles);
        }
      }

      res.json({
        teams: results,
        orphanFiles,
        logosDir,
        totalLogos: logoFiles.length,
      });
    } catch (error: any) {
      console.error('Logo manager error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Rename a logo file to match a team's expected filename
  app.post('/api/meets/:meetId/logo-manager/rename', async (req, res) => {
    try {
      const { oldFilename, newFilename } = req.body;

      if (!oldFilename || !newFilename) {
        return res.status(400).json({ error: 'oldFilename and newFilename are required' });
      }

      const fs = await import('fs/promises');
      const path = await import('path');
      const logosDir = path.join(process.cwd(), 'public', 'logos', 'NCAA');

      const ext = oldFilename.substring(oldFilename.lastIndexOf('.'));
      const oldPath = path.join(logosDir, oldFilename);
      const newPath = path.join(logosDir, `${newFilename}${ext}`);

      try {
        await fs.access(oldPath);
      } catch {
        return res.status(404).json({ error: `File not found: ${oldFilename}` });
      }

      try {
        await fs.access(newPath);
        return res.status(409).json({ error: `File already exists: ${newFilename}${ext}` });
      } catch {
        // Good
      }

      await fs.rename(oldPath, newPath);
      res.json({ success: true, oldFilename, newFilename: `${newFilename}${ext}` });
    } catch (error: any) {
      console.error('Logo rename error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== ATHLETE BESTS =====
  // ==================== Athlete Bests API ====================

  // Get all bests for an athlete
  app.get("/api/athletes/:athleteId/bests", async (req, res) => {
    try {
      const { athleteId } = req.params;
      const bests = await storage.getAthleteBests(athleteId);
      res.json(bests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all bests for athletes in a meet
  app.get("/api/meets/:meetId/athlete-bests", async (req, res) => {
    try {
      const { meetId } = req.params;
      const bests = await storage.getAthleteBestsByMeet(meetId);
      res.json(bests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update an athlete best
  app.post("/api/athlete-bests", async (req, res) => {
    try {
      const data = req.body;
      
      // Validate required fields
      if (!data.athleteId || !data.eventType || !data.bestType || data.mark === undefined) {
        return res.status(400).json({ error: "Missing required fields: athleteId, eventType, bestType, mark" });
      }
      
      // Validate bestType
      if (!['college', 'season'].includes(data.bestType)) {
        return res.status(400).json({ error: "bestType must be 'college' or 'season'" });
      }
      
      const best = await storage.upsertAthleteBest({
        athleteId: data.athleteId,
        eventType: data.eventType,
        bestType: data.bestType,
        mark: parseFloat(data.mark),
        seasonId: data.seasonId || null,
        achievedAt: data.achievedAt ? new Date(data.achievedAt) : null,
        meetName: data.meetName || null,
        source: data.source || 'manual',
      });
      
      res.status(201).json(best);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update an athlete best
  app.patch("/api/athlete-bests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const best = await storage.updateAthleteBest(id, updates);
      if (!best) {
        return res.status(404).json({ error: "Athlete best not found" });
      }
      
      res.json(best);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete an athlete best
  app.delete("/api/athlete-bests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAthleteBest(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk import athlete bests from CSV
  app.post("/api/meets/:meetId/athlete-bests/import", async (req, res) => {
    try {
      const { meetId } = req.params;
      const { bests } = req.body; // Array of { athleteNumber, eventType, bestType, mark, meetName?, achievedAt? }
      
      if (!Array.isArray(bests)) {
        return res.status(400).json({ error: "bests must be an array" });
      }
      
      // Get all athletes in the meet for lookup by number
      const athletes = await storage.getAthletesByMeetId(meetId);
      const athletesByNumber = new Map(athletes.map(a => [String(a.athleteNumber), a]));
      
      // Get current season for the meet
      const meet = await storage.getMeet(meetId);
      const seasonId = meet?.seasonId || null;
      
      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: [],
      };
      
      for (const item of bests) {
        try {
          const athlete = athletesByNumber.get(String(item.athleteNumber));
          if (!athlete) {
            results.failed++;
            results.errors.push(`Athlete ${item.athleteNumber} not found`);
            continue;
          }
          
          await storage.upsertAthleteBest({
            athleteId: athlete.id,
            eventType: item.eventType,
            bestType: item.bestType,
            mark: parseFloat(item.mark),
            seasonId: item.bestType === 'season' ? seasonId : null,
            achievedAt: item.achievedAt ? new Date(item.achievedAt) : null,
            meetName: item.meetName || null,
            source: 'import',
          });
          
          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Error for athlete ${item.athleteNumber}: ${err.message}`);
        }
      }
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}
