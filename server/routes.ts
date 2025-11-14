import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { unlink } from "fs/promises";
import { z } from "zod";
import { storage } from "./storage";
import { FileStorage } from "./file-storage";
import {
  insertEventSchema,
  insertAthleteSchema,
  insertEntrySchema,
  insertMeetSchema,
  insertTeamSchema,
  insertDivisionSchema,
  insertDisplayThemeSchema,
  insertBoardConfigSchema,
  insertDisplayLayoutSchema,
  insertLayoutCellSchema,
  type DisplayBoardState,
  type WSMessage,
} from "@shared/schema";
import { importCompleteMDB } from "./import-mdb-complete";

// Track connected WebSocket clients
const displayClients = new Set<WebSocket>();

// Broadcast function
function broadcastToDisplays(message: WSMessage) {
  const messageStr = JSON.stringify(message);
  displayClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Helper to broadcast current event state
async function broadcastCurrentEvent() {
  const currentEvent = await storage.getCurrentEvent();
  const meets = await storage.getMeets();
  const meet = meets[0]; // Get first meet if exists

  const boardState: DisplayBoardState = {
    mode: "live",
    currentEvent,
    meet,
    timestamp: Date.now(),
  };

  broadcastToDisplays({
    type: "board_update",
    data: boardState,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    dest: "uploads/",
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  });

  // Initialize FileStorage for photo/logo management
  const fileStorage = new FileStorage();

  // Events
  app.get("/api/events", async (req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/current", async (req, res) => {
    const event = await storage.getCurrentEvent();
    if (!event) {
      return res.status(404).json({ error: "No current event" });
    }
    res.json(event);
  });

  app.get("/api/events/:id", async (req, res) => {
    const event = await storage.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  });

  app.post("/api/events", async (req, res) => {
    try {
      const data = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(data);
      await broadcastCurrentEvent();
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/events/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const event = await storage.updateEventStatus(req.params.id, status);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      await broadcastCurrentEvent();
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/events/:id/entries", async (req, res) => {
    const eventWithEntries = await storage.getEventWithEntries(req.params.id);
    if (!eventWithEntries) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(eventWithEntries);
  });

  // Athletes
  app.get("/api/athletes", async (req, res) => {
    const athletes = await storage.getAthletes();
    res.json(athletes);
  });

  app.get("/api/athletes/:id", async (req, res) => {
    const athlete = await storage.getAthlete(req.params.id);
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }
    res.json(athlete);
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

  // Entries (unified results for track and field)
  app.get("/api/entries", async (req, res) => {
    const entries = await storage.getEntries();
    res.json(entries);
  });

  app.get("/api/entries/event/:eventId", async (req, res) => {
    const entries = await storage.getEntriesByEvent(req.params.eventId);
    res.json(entries);
  });

  app.post("/api/entries", async (req, res) => {
    try {
      const data = insertEntrySchema.parse(req.body);
      const entry = await storage.createEntry(data);
      await broadcastCurrentEvent();
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/entries/:id", async (req, res) => {
    try {
      const entry = await storage.updateEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      await broadcastCurrentEvent();
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Teams
  app.get("/api/teams", async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
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

  // Meets
  app.get("/api/meets", async (req, res) => {
    const meets = await storage.getMeets();
    res.json(meets);
  });

  app.get("/api/meets/:id", async (req, res) => {
    const meet = await storage.getMeet(req.params.id);
    if (!meet) {
      return res.status(404).json({ error: "Meet not found" });
    }
    res.json(meet);
  });

  app.post("/api/meets", async (req, res) => {
    try {
      const data = insertMeetSchema.parse(req.body);
      const meet = await storage.createMeet(data);
      await broadcastCurrentEvent();
      res.json(meet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/meets/:id", async (req, res) => {
    try {
      const updateSchema = insertMeetSchema.partial().pick({
        autoRefresh: true,
        refreshInterval: true,
      }).extend({
        refreshInterval: z.number().min(5).max(300).optional(),
      });

      const data = updateSchema.parse(req.body);
      const meet = await storage.updateMeet(req.params.id, data);

      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }

      res.json(meet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/meets/:id/events", async (req, res) => {
    try {
      const events = await storage.getEventsByMeetId(req.params.id);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/meets/:id/upload", upload.single("mdbFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const filePath = file.path;
      const meetId = req.params.id;

      // Validate file extension
      const originalName = file.originalname.toLowerCase();
      if (!originalName.endsWith(".mdb")) {
        await unlink(filePath).catch(console.error);
        return res.status(400).json({ 
          error: "Invalid file type. Only .mdb files are allowed" 
        });
      }

      // Verify meet exists
      const existingMeet = await storage.getMeet(meetId);
      if (!existingMeet) {
        await unlink(filePath).catch(console.error);
        return res.status(404).json({ error: "Meet not found" });
      }

      console.log(`📁 Processing MDB import for meet: ${existingMeet.name} (${meetId})`);
      console.log(`📍 File: ${file.originalname}`);

      // Run the import
      const stats = await importCompleteMDB(filePath, meetId);

      // Update meet with mdbPath and lastImportAt
      await storage.updateMeet(meetId, { 
        mdbPath: filePath,
        lastImportAt: new Date()
      });

      // Note: File is kept for auto-refresh functionality
      // (not deleted as it may be needed for periodic re-imports)

      // Broadcast current event after successful import
      await broadcastCurrentEvent();

      console.log(`✅ Import complete: ${JSON.stringify(stats)}`);

      res.json({
        success: true,
        message: "Import completed successfully",
        statistics: stats,
      });
    } catch (error: any) {
      console.error("❌ Import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Display Management
  app.post("/api/displays/register", async (req, res) => {
    try {
      const { meetCode, computerName } = req.body;
      
      if (!meetCode || !computerName) {
        return res.status(400).json({ error: "meetCode and computerName are required" });
      }

      const result = await storage.registerDisplay(meetCode, computerName);
      
      if (!result) {
        return res.status(404).json({ error: "Meet not found with the provided code" });
      }

      res.json({
        displayId: result.display.id,
        authToken: result.display.authToken,
        meetId: result.meet.id,
        meetName: result.meet.name,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/displays/:id/assign", async (req, res) => {
    try {
      const { targetType, targetId, layout } = req.body;
      
      if (!targetType) {
        return res.status(400).json({ error: "targetType is required" });
      }

      const assignment = await storage.assignDisplay(req.params.id, {
        targetType,
        targetId,
        layout,
      });

      if (!assignment) {
        return res.status(404).json({ error: "Display not found" });
      }

      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/displays/meet/:meetId", async (req, res) => {
    try {
      const displays = await storage.getDisplaysByMeet(req.params.meetId);
      
      const displaysWithAssignments = await Promise.all(
        displays.map(async (display) => {
          const assignment = await storage.getDisplayAssignment(display.id);
          return {
            ...display,
            assignment,
          };
        })
      );

      res.json(displaysWithAssignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/displays/:id/heartbeat", async (req, res) => {
    try {
      await storage.updateDisplayHeartbeat(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== DISPLAY THEMES =====

  // Get all themes for a meet
  app.get("/api/meets/:meetId/themes", async (req, res) => {
    try {
      const themes = await storage.getDisplayThemes(req.params.meetId);
      res.json(themes);
    } catch (error) {
      console.error("Error fetching display themes:", error);
      res.status(500).json({ error: "Failed to fetch display themes" });
    }
  });

  // Get default theme for a meet
  app.get("/api/meets/:meetId/themes/default", async (req, res) => {
    try {
      const theme = await storage.getDefaultDisplayTheme(req.params.meetId);
      if (!theme) {
        return res.status(404).json({ error: "Default theme not found" });
      }
      res.json(theme);
    } catch (error) {
      console.error("Error fetching default theme:", error);
      res.status(500).json({ error: "Failed to fetch default theme" });
    }
  });

  // Create a new theme
  app.post("/api/meets/:meetId/themes", async (req, res) => {
    try {
      const parsed = insertDisplayThemeSchema.parse({
        ...req.body,
        meetId: req.params.meetId,
      });
      const theme = await storage.createDisplayTheme(parsed);
      res.json(theme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid theme data", details: error.errors });
      }
      console.error("Error creating display theme:", error);
      res.status(500).json({ error: "Failed to create display theme" });
    }
  });

  // Update a theme
  app.patch("/api/themes/:id", async (req, res) => {
    try {
      const parsed = insertDisplayThemeSchema.partial().parse(req.body);
      const theme = await storage.updateDisplayTheme(req.params.id, parsed);
      if (!theme) {
        return res.status(404).json({ error: "Theme not found" });
      }
      res.json(theme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid theme data", details: error.errors });
      }
      console.error("Error updating display theme:", error);
      res.status(500).json({ error: "Failed to update display theme" });
    }
  });

  // Delete a theme
  app.delete("/api/themes/:id", async (req, res) => {
    try {
      await storage.deleteDisplayTheme(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting display theme:", error);
      res.status(500).json({ error: "Failed to delete display theme" });
    }
  });

  // ===== BOARD CONFIGS =====

  // Get board config
  app.get("/api/meets/:meetId/boards/:boardId/config", async (req, res) => {
    try {
      const config = await storage.getBoardConfig(req.params.boardId, req.params.meetId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching board config:", error);
      res.status(500).json({ error: "Failed to fetch board config" });
    }
  });

  // Create or update board config
  app.put("/api/meets/:meetId/boards/:boardId/config", async (req, res) => {
    try {
      // Check if config exists
      const existing = await storage.getBoardConfig(req.params.boardId, req.params.meetId);
      
      if (existing) {
        // Update existing
        const parsed = insertBoardConfigSchema.partial().parse(req.body);
        const updated = await storage.updateBoardConfig(existing.id, parsed);
        return res.json(updated);
      } else {
        // Create new
        const parsed = insertBoardConfigSchema.parse({
          ...req.body,
          meetId: req.params.meetId,
          boardId: req.params.boardId,
        });
        const created = await storage.createBoardConfig(parsed);
        return res.json(created);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid config data", details: error.errors });
      }
      console.error("Error saving board config:", error);
      res.status(500).json({ error: "Failed to save board config" });
    }
  });

  // Delete board config
  app.delete("/api/boards/:boardId/config", async (req, res) => {
    try {
      const meetId = req.query.meetId as string;
      if (!meetId) {
        return res.status(400).json({ error: "meetId query parameter required" });
      }
      
      const config = await storage.getBoardConfig(req.params.boardId, meetId);
      if (config) {
        await storage.deleteBoardConfig(config.id);
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting board config:", error);
      res.status(500).json({ error: "Failed to delete board config" });
    }
  });

  // ===== DISPLAY LAYOUTS =====

  // Get all layouts for a meet
  app.get("/api/display-layouts/meet/:meetId", async (req, res) => {
    try {
      const layouts = await storage.getDisplayLayoutsByMeet(req.params.meetId);
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching display layouts:", error);
      res.status(500).json({ error: "Failed to fetch display layouts" });
    }
  });

  // Get a specific layout by ID
  app.get("/api/display-layouts/:id", async (req, res) => {
    try {
      const layout = await storage.getDisplayLayoutById(req.params.id);
      if (!layout) {
        return res.status(404).json({ error: "Layout not found" });
      }
      res.json(layout);
    } catch (error) {
      console.error("Error fetching display layout:", error);
      res.status(500).json({ error: "Failed to fetch display layout" });
    }
  });

  // Create a new display layout
  app.post("/api/display-layouts", async (req, res) => {
    try {
      const parsed = insertDisplayLayoutSchema.parse(req.body);
      const layout = await storage.createDisplayLayout(parsed);
      res.json(layout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid layout data", details: error.errors });
      }
      console.error("Error creating display layout:", error);
      res.status(500).json({ error: "Failed to create display layout" });
    }
  });

  // Update a display layout
  app.patch("/api/display-layouts/:id", async (req, res) => {
    try {
      const parsed = insertDisplayLayoutSchema.partial().parse(req.body);
      const layout = await storage.updateDisplayLayout(req.params.id, parsed);
      res.json(layout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid layout data", details: error.errors });
      }
      console.error("Error updating display layout:", error);
      res.status(500).json({ error: "Failed to update display layout" });
    }
  });

  // Delete a display layout
  app.delete("/api/display-layouts/:id", async (req, res) => {
    try {
      await storage.deleteDisplayLayout(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting display layout:", error);
      res.status(500).json({ error: "Failed to delete display layout" });
    }
  });

  // ===== LAYOUT CELLS =====

  // Get all cells for a layout
  app.get("/api/layout-cells/layout/:layoutId", async (req, res) => {
    try {
      const cells = await storage.getLayoutCellsByLayout(req.params.layoutId);
      res.json(cells);
    } catch (error) {
      console.error("Error fetching layout cells:", error);
      res.status(500).json({ error: "Failed to fetch layout cells" });
    }
  });

  // Create a new layout cell
  app.post("/api/layout-cells", async (req, res) => {
    try {
      const parsed = insertLayoutCellSchema.parse(req.body);
      const cell = await storage.createLayoutCell(parsed);
      res.json(cell);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid cell data", details: error.errors });
      }
      console.error("Error creating layout cell:", error);
      res.status(500).json({ error: "Failed to create layout cell" });
    }
  });

  // Update a layout cell
  app.patch("/api/layout-cells/:id", async (req, res) => {
    try {
      const parsed = insertLayoutCellSchema.partial().parse(req.body);
      const cell = await storage.updateLayoutCell(req.params.id, parsed);
      
      // Broadcast layout_update to all connected displays when cell is updated
      // This ensures other clients stay in sync when cells are auto-cleared or manually edited
      broadcastToDisplays({
        type: "layout_update",
        data: { layoutId: cell.layoutId, cellId: cell.id },
      });
      
      res.json(cell);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid cell data", details: error.errors });
      }
      console.error("Error updating layout cell:", error);
      res.status(500).json({ error: "Failed to update layout cell" });
    }
  });

  // Delete a layout cell
  app.delete("/api/layout-cells/:id", async (req, res) => {
    try {
      await storage.deleteLayoutCell(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting layout cell:", error);
      res.status(500).json({ error: "Failed to delete layout cell" });
    }
  });

  // ===== ATHLETE PHOTOS =====

  // Upload athlete photo
  // Test with: POST /api/athletes/{athleteId}/photo with multipart/form-data photo field
  app.post("/api/athletes/:id/photo", upload.single("photo"), async (req, res) => {
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

  // ===== TEAM LOGOS =====

  // Upload team logo
  // Test with: POST /api/teams/{teamId}/logo with multipart/form-data logo field
  app.post("/api/teams/:id/logo", upload.single("logo"), async (req, res) => {
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

      // Check if team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        await unlink(file.path).catch(console.error);
        return res.status(404).json({ error: "Team not found" });
      }

      // Read file buffer
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(file.path);

      // ATOMIC PATTERN:
      // 1. Save new file to disk first
      logoData = await fileStorage.saveTeamLogo(
        buffer,
        teamId,
        team.meetId,
        file.originalname
      );

      // Clean up temp file
      await unlink(file.path).catch(console.error);

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

  // MDB File Import
  app.post("/api/import/mdb", upload.single("mdbFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const filePath = file.path;

      // Validate file extension
      const originalName = file.originalname.toLowerCase();
      if (!originalName.endsWith(".mdb")) {
        // Clean up uploaded file
        await unlink(filePath).catch(console.error);
        return res.status(400).json({ 
          error: "Invalid file type. Only .mdb files are allowed" 
        });
      }

      console.log(`📁 Processing MDB import: ${file.originalname}`);

      // Get or create meet for this import
      const { meetId, meetName } = req.body;
      let targetMeetId: string;

      if (meetId) {
        // Verify meet exists
        const existingMeet = await storage.getMeet(meetId);
        if (!existingMeet) {
          await unlink(filePath).catch(console.error);
          return res.status(404).json({ error: "Meet not found" });
        }
        targetMeetId = meetId;
        console.log(`📍 Importing to existing meet: ${existingMeet.name} (${targetMeetId})`);
      } else {
        // Create new meet
        const newMeet = await storage.createMeet({
          name: meetName || file.originalname.replace('.mdb', ''),
          startDate: new Date(),
          location: null,
        });
        targetMeetId = newMeet.id;
        console.log(`📍 Created new meet: ${newMeet.name} (${targetMeetId})`);
      }

      // Run the import with meetId
      const stats = await importCompleteMDB(filePath, targetMeetId);

      // Delete the temporary file after successful import
      await unlink(filePath).catch((err) => {
        console.warn(`⚠️  Failed to delete temporary file: ${filePath}`, err);
      });

      // Broadcast current event after successful import
      await broadcastCurrentEvent();

      console.log(`✅ Import complete: ${JSON.stringify(stats)}`);

      // Return statistics
      res.json({
        success: true,
        message: "Import completed successfully",
        meetId: targetMeetId,
        statistics: stats,
      });
    } catch (error: any) {
      console.error("❌ Import failed:", error);

      // Clean up the file if it exists
      if (req.file) {
        await unlink(req.file.path).catch(console.error);
      }

      res.status(500).json({ 
        error: "Import failed", 
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  // WebSocket Server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Display client connected");
    displayClients.add(ws);

    // Send current state immediately on connection
    broadcastCurrentEvent().catch(console.error);

    // Send connection status
    ws.send(
      JSON.stringify({
        type: "connection_status",
        connected: true,
      } as WSMessage)
    );

    ws.on("close", () => {
      console.log("Display client disconnected");
      displayClients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      displayClients.delete(ws);
    });
  });

  return httpServer;
}
