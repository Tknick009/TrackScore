import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertEventSchema,
  insertAthleteSchema,
  insertTrackResultSchema,
  insertFieldResultSchema,
  insertMeetSchema,
  type DisplayBoardState,
  type WSMessage,
} from "@shared/schema";

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

  app.get("/api/events/:id/results", async (req, res) => {
    const eventWithResults = await storage.getEventWithResults(req.params.id);
    if (!eventWithResults) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(eventWithResults);
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

  // Track Results
  app.get("/api/results/track", async (req, res) => {
    const results = await storage.getTrackResults();
    res.json(results);
  });

  app.get("/api/results/track/event/:eventId", async (req, res) => {
    const results = await storage.getTrackResultsByEvent(req.params.eventId);
    res.json(results);
  });

  app.post("/api/results/track", async (req, res) => {
    try {
      const data = insertTrackResultSchema.parse(req.body);
      const result = await storage.createTrackResult(data);
      await broadcastCurrentEvent();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Field Results
  app.get("/api/results/field", async (req, res) => {
    const results = await storage.getFieldResults();
    res.json(results);
  });

  app.get("/api/results/field/event/:eventId", async (req, res) => {
    const results = await storage.getFieldResultsByEvent(req.params.eventId);
    res.json(results);
  });

  app.post("/api/results/field", async (req, res) => {
    try {
      const data = insertFieldResultSchema.parse(req.body);
      const result = await storage.createFieldResult(data);
      await broadcastCurrentEvent();
      res.json(result);
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
