import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { unlink } from "fs/promises";
import { storage } from "./storage";
import {
  insertEventSchema,
  insertAthleteSchema,
  insertEntrySchema,
  insertMeetSchema,
  insertTeamSchema,
  insertDivisionSchema,
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

  // Configure multer for file uploads
  const upload = multer({
    dest: "uploads/",
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
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
