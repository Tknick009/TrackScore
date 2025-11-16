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
  insertSeasonSchema,
  insertTeamSchema,
  insertDivisionSchema,
  insertDisplayThemeSchema,
  insertBoardConfigSchema,
  insertDisplayLayoutSchema,
  insertLayoutCellSchema,
  insertCompositeLayoutSchema,
  insertLayoutZoneSchema,
  updateLayoutZoneSchema,
  insertRecordBookSchema,
  insertRecordSchema,
  insertMeetScoringProfileSchema,
  type DisplayBoardState,
  type WSMessage,
} from "@shared/schema";
import { importCompleteMDB } from "./import-mdb-complete";
import { generateEventCSV, generateMeetCSV } from "./export-utils";

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
    try {
      const { meetId } = req.query;
      if (meetId) {
        const events = await storage.getEventsByMeetId(meetId as string);
        return res.json(events);
      }
      const events = await storage.getEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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

  // Export endpoints for events
  app.get("/api/events/:id/export", async (req, res) => {
    try {
      const { format } = req.query;
      
      // Only support CSV - print/PDF use React routes
      if (format !== 'csv') {
        return res.status(400).json({ error: 'Only CSV format supported. Use /print/events/:id for printing.' });
      }
      
      const eventWithEntries = await storage.getEventWithEntries(req.params.id);
      
      if (!eventWithEntries) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const csv = generateEventCSV(eventWithEntries);
      const filename = `${eventWithEntries.name.replace(/\s+/g, '-')}-results.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Athletes
  app.get("/api/athletes", async (req, res) => {
    try {
      const { meetId } = req.query;
      if (meetId) {
        const athletes = await storage.getAthletesByMeetId(meetId as string);
        return res.json(athletes);
      }
      const athletes = await storage.getAthletes();
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

  // Seasons
  app.get("/api/seasons", async (req, res) => {
    try {
      const seasons = await storage.getSeasons();
      res.json(seasons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/seasons/:id", async (req, res) => {
    try {
      const season = await storage.getSeason(parseInt(req.params.id));
      if (!season) {
        return res.status(404).json({ error: "Season not found" });
      }
      res.json(season);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/seasons", async (req, res) => {
    try {
      const data = insertSeasonSchema.parse(req.body);
      const season = await storage.createSeason(data);
      res.json(season);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/seasons/:id", async (req, res) => {
    try {
      const data = insertSeasonSchema.partial().parse(req.body);
      const season = await storage.updateSeason(parseInt(req.params.id), data);
      if (!season) {
        return res.status(404).json({ error: "Season not found" });
      }
      res.json(season);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/seasons/:id", async (req, res) => {
    try {
      await storage.deleteSeason(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Meets
  app.get("/api/meets", async (req, res) => {
    try {
      const { seasonId } = req.query;
      if (seasonId) {
        const meets = await storage.getMeetsBySeason(parseInt(seasonId as string));
        return res.json(meets);
      }
      const meets = await storage.getMeets();
      res.json(meets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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

  app.patch("/api/meets/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const meet = await storage.updateMeetStatus(req.params.id, status);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      await broadcastCurrentEvent();
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

  // Print data endpoint for event (React print page hydration)
  app.get("/api/events/:id/print-data", async (req, res) => {
    try {
      const eventWithEntries = await storage.getEventWithEntries(req.params.id);
      
      if (!eventWithEntries) {
        return res.status(404).json({ error: "Event not found" });
      }

      const meet = await storage.getMeet(eventWithEntries.meetId);
      
      res.json({
        event: eventWithEntries,
        entries: eventWithEntries.entries || [],
        meet: meet || null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Print data endpoint for meet (React print page hydration)
  app.get("/api/meets/:id/print-data", async (req, res) => {
    try {
      const meet = await storage.getMeet(req.params.id);
      
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }

      // Get all events for this meet
      const events = await storage.getEventsByMeetId(req.params.id);
      
      // Use getEventWithEntries to get full EventWithEntries objects with all metadata
      const eventsWithEntriesRaw = await Promise.all(
        events.map(event => storage.getEventWithEntries(event.id))
      );
      
      // Normalize to always have entries as array, never undefined
      const eventsWithEntries = eventsWithEntriesRaw
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map(item => ({
          ...item,
          entries: item.entries ?? []  // Ensure entries is always an array
        }));
      
      // If some events returned null, log a warning
      if (eventsWithEntries.length < events.length) {
        console.warn(`Some events returned null from getEventWithEntries`);
      }
      
      res.json({
        meet,
        eventsWithEntries  // Now contains full EventWithEntries objects, not partial data
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export endpoint for meets (all events)
  app.get("/api/meets/:id/export", async (req, res) => {
    try {
      const { format } = req.query;
      const meet = await storage.getMeet(req.params.id);
      
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }

      // Get all events for this meet
      const events = await storage.getEventsByMeetId(req.params.id);
      
      // Use getEventWithEntries to get full EventWithEntries objects
      const eventsWithEntriesRaw = await Promise.all(
        events.map(event => storage.getEventWithEntries(event.id))
      );
      
      // Normalize to always have entries as array, never undefined
      const eventsWithEntries = eventsWithEntriesRaw
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map(item => ({
          ...item,
          entries: item.entries ?? []  // Ensure entries is always an array
        }));
      
      if (format === 'csv') {
        const csv = generateMeetCSV(meet, eventsWithEntries);
        const filename = `${meet.name.replace(/\s+/g, '-')}-results.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
      } else {
        res.status(400).json({ error: 'Invalid format. Use csv for meet exports' });
      }
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

  // =============================
  // COMPOSITE LAYOUTS API ROUTES
  // =============================

  // List all layouts (optionally filtered by meetId)
  app.get('/api/layouts', async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      const layouts = await storage.listLayouts(meetId);
      res.json(layouts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single layout by ID
  app.get('/api/layouts/:id', async (req, res) => {
    try {
      const layout = await storage.getLayout(parseInt(req.params.id));
      if (!layout) {
        return res.status(404).json({ error: 'Layout not found' });
      }
      res.json(layout);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get layout with all its zones
  app.get('/api/layouts/:id/with-zones', async (req, res) => {
    try {
      const result = await storage.getLayoutWithZones(parseInt(req.params.id));
      if (!result) {
        return res.status(404).json({ error: 'Layout not found' });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new layout
  app.post('/api/layouts', async (req, res) => {
    try {
      const parsed = insertCompositeLayoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const layout = await storage.createLayout(parsed.data);
      res.status(201).json(layout);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update layout
  app.patch('/api/layouts/:id', async (req, res) => {
    try {
      const layout = await storage.updateLayout(parseInt(req.params.id), req.body);
      if (!layout) {
        return res.status(404).json({ error: 'Layout not found' });
      }
      res.json(layout);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete layout
  app.delete('/api/layouts/:id', async (req, res) => {
    try {
      const success = await storage.deleteLayout(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: 'Layout not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get zones for a specific layout
  app.get('/api/layouts/:id/zones', async (req, res) => {
    try {
      const zones = await storage.getZonesByLayout(parseInt(req.params.id));
      res.json(zones);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================
  // LAYOUT ZONES API ROUTES
  // =============================

  // Create new zone
  app.post('/api/zones', async (req, res) => {
    try {
      console.log('[POST /api/zones] Incoming request body:', JSON.stringify(req.body, null, 2));
      
      const parsed = insertLayoutZoneSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('[POST /api/zones] Validation error:', parsed.error.errors);
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      console.log('[POST /api/zones] Validated data:', JSON.stringify(parsed.data, null, 2));
      console.log('[POST /api/zones] dataBinding type:', typeof parsed.data.dataBinding, 'value:', parsed.data.dataBinding);
      console.log('[POST /api/zones] boardConfig type:', typeof parsed.data.boardConfig, 'value:', parsed.data.boardConfig);
      
      const zone = await storage.createZone(parsed.data);
      
      console.log('[POST /api/zones] Created zone:', JSON.stringify(zone, null, 2));
      console.log('[POST /api/zones] Returned dataBinding type:', typeof zone.dataBinding, 'value:', zone.dataBinding);
      
      res.status(201).json(zone);
    } catch (error: any) {
      console.error('[POST /api/zones] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update zone
  app.patch('/api/zones/:id', async (req, res) => {
    try {
      console.log(`[PATCH /api/zones/${req.params.id}] Incoming request body:`, JSON.stringify(req.body, null, 2));
      
      const parsed = updateLayoutZoneSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error(`[PATCH /api/zones/${req.params.id}] Validation error:`, parsed.error.errors);
        return res.status(400).json({ error: parsed.error.errors });
      }
      
      console.log(`[PATCH /api/zones/${req.params.id}] Validated data:`, JSON.stringify(parsed.data, null, 2));
      if (parsed.data.dataBinding) {
        console.log(`[PATCH /api/zones/${req.params.id}] dataBinding type:`, typeof parsed.data.dataBinding, 'value:', parsed.data.dataBinding);
      }
      if (parsed.data.boardConfig) {
        console.log(`[PATCH /api/zones/${req.params.id}] boardConfig type:`, typeof parsed.data.boardConfig, 'value:', parsed.data.boardConfig);
      }
      
      const zone = await storage.updateZone(parseInt(req.params.id), parsed.data);
      if (!zone) {
        return res.status(404).json({ error: 'Zone not found' });
      }
      
      console.log(`[PATCH /api/zones/${req.params.id}] Updated zone:`, JSON.stringify(zone, null, 2));
      console.log(`[PATCH /api/zones/${req.params.id}] Returned dataBinding type:`, typeof zone.dataBinding, 'value:', zone.dataBinding);
      
      res.json(zone);
    } catch (error: any) {
      console.error(`[PATCH /api/zones/${req.params.id}] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete zone
  app.delete('/api/zones/:id', async (req, res) => {
    try {
      const success = await storage.deleteZone(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: 'Zone not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Record Books
  app.get('/api/record-books', async (req, res) => {
    try {
      const books = await storage.getRecordBooks();
      res.json(books);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/record-books/:id', async (req, res) => {
    try {
      const book = await storage.getRecordBook(parseInt(req.params.id));
      if (!book) {
        return res.status(404).json({ error: 'Record book not found' });
      }
      
      const bookRecords = await storage.getRecords(book.id);
      res.json({ ...book, records: bookRecords });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/record-books', async (req, res) => {
    try {
      const data = insertRecordBookSchema.parse(req.body);
      const book = await storage.createRecordBook(data);
      res.json(book);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/record-books/:id', async (req, res) => {
    try {
      const data = insertRecordBookSchema.partial().parse(req.body);
      const book = await storage.updateRecordBook(parseInt(req.params.id), data);
      if (!book) {
        return res.status(404).json({ error: 'Record book not found' });
      }
      res.json(book);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/record-books/:id', async (req, res) => {
    try {
      await storage.deleteRecordBook(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Records
  app.get('/api/records', async (req, res) => {
    try {
      const bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;
      const eventType = req.query.eventType as string | undefined;
      const gender = req.query.gender as string | undefined;
      
      const recordsList = await storage.getRecords(bookId, eventType, gender);
      res.json(recordsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/records/check', async (req, res) => {
    try {
      const { eventType, performance, gender } = req.query;
      
      if (!eventType || !performance || !gender) {
        return res.status(400).json({ 
          error: 'Missing required parameters: eventType, performance, gender' 
        });
      }
      
      const checks = await storage.checkForRecords(
        eventType as string,
        gender as string,
        performance as string
      );
      
      res.json(checks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/records/:id', async (req, res) => {
    try {
      const record = await storage.getRecord(parseInt(req.params.id));
      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/records', async (req, res) => {
    try {
      const data = insertRecordSchema.parse(req.body);
      const record = await storage.createRecord(data);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/records/:id', async (req, res) => {
    try {
      const data = insertRecordSchema.partial().parse(req.body);
      const record = await storage.updateRecord(parseInt(req.params.id), data);
      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/records/:id', async (req, res) => {
    try {
      await storage.deleteRecord(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================
  // TEAM SCORING APIs
  // ==================

  // Get available scoring presets
  app.get('/api/scoring/presets', async (req, res) => {
    try {
      const presets = await storage.getScoringPresets();
      res.json(presets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get preset with rules
  app.get('/api/scoring/presets/:id', async (req, res) => {
    try {
      const preset = await storage.getScoringPreset(parseInt(req.params.id));
      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }
      const rules = await storage.getPresetRules(preset.id);
      res.json({ preset, rules });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get meet scoring configuration
  app.get('/api/meets/:meetId/scoring', async (req, res) => {
    try {
      const profile = await storage.getMeetScoringProfile(req.params.meetId);
      
      // If no profile exists, return sensible defaults so UI can configure
      if (!profile) {
        const presets = await storage.getScoringPresets();
        const defaultPreset = presets.find(p => p.category === 'invitational') || presets[0];
        
        return res.json({
          meetId: req.params.meetId,
          presetId: defaultPreset?.id || 1,
          genderMode: 'combined',
          divisionMode: 'overall',
          allowRelayScoring: true,
          overrides: []
        });
      }
      
      const overrides = await storage.getMeetScoringOverrides(profile.id);
      res.json({ ...profile, overrides }); // Flatten into single object
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update meet scoring configuration
  app.put('/api/meets/:meetId/scoring', async (req, res) => {
    try {
      const { overrides, ...profileData } = req.body;
      
      // Validate profile data
      const validated = insertMeetScoringProfileSchema.parse({
        ...profileData,
        meetId: req.params.meetId,
      });
      
      // Upsert profile
      const profile = await storage.upsertMeetScoringProfile(validated);
      
      // Handle overrides if provided
      if (overrides && Array.isArray(overrides)) {
        // Delete existing overrides for this profile
        await storage.deleteScoringOverrides(profile.id);
        
        // Insert new overrides
        for (const override of overrides) {
          await storage.upsertScoringOverride({
            profileId: profile.id,
            eventId: override.eventId,
            pointsMap: override.pointsMap,
            relayMultiplier: override.relayMultiplier,
          });
        }
      }
      
      // Broadcast scoring update
      broadcastToDisplays({
        type: 'team_scoring_update',
        meetId: req.params.meetId
      });
      
      // Return updated profile with overrides
      const updatedOverrides = await storage.getMeetScoringOverrides(profile.id);
      res.json({ ...profile, overrides: updatedOverrides });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid scoring configuration", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Get team standings
  app.get('/api/meets/:meetId/scoring/standings', async (req, res) => {
    try {
      const { gender, division, topN } = req.query;
      
      const standings = await storage.getTeamStandings(req.params.meetId, {
        gender: gender as string | undefined,
        division: division as string | undefined,
      });
      
      // Apply topN limit if provided
      const limit = topN ? parseInt(topN as string) : undefined;
      const limitedStandings = limit ? standings.slice(0, limit) : standings;
      
      res.json(limitedStandings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recalculate team scoring
  app.post('/api/meets/:meetId/scoring/recalculate', async (req, res) => {
    try {
      await storage.recalculateTeamScoring(req.params.meetId);
      
      // Broadcast update to displays
      broadcastToDisplays({
        type: 'event_update',
        data: { meetId: req.params.meetId, action: 'scoring_updated' } as any,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get event points breakdown
  app.get('/api/events/:eventId/points', async (req, res) => {
    try {
      const breakdown = await storage.getEventPoints(req.params.eventId);
      res.json(breakdown);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default scoring presets (one-time initialization)
  app.post('/api/scoring/presets/seed', async (req, res) => {
    try {
      const { seedScoringPresets } = await import('./scoring-calculator');
      await seedScoringPresets(storage);
      res.json({ success: true, message: 'Scoring presets seeded successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
