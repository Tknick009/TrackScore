import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { unlink } from "fs/promises";
import { z } from "zod";
import QRCode from "qrcode";
import { storage } from "./storage";
import { FileStorage } from "./file-storage";
import { lynxListener } from "./lynx-listener";
import type { TrackDisplayMode, FieldDisplayMode, LynxPortType, MeetLiveState } from "@shared/schema";
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
  insertEventSplitConfigSchema,
  insertEntrySplitSchema,
  insertWindReadingSchema,
  insertFieldAttemptSchema,
  insertJudgeTokenSchema,
  insertSponsorSchema,
  insertSponsorAssignmentSchema,
  insertSponsorRotationProfileSchema,
  insertCombinedEventSchema,
  insertCombinedEventComponentSchema,
  overlayConfigSchema,
  insertWeatherConfigSchema,
  type DisplayBoardState,
  type WSMessage,
  type EntrySplit,
  type FieldAttempt,
  type SelectSponsor,
} from "@shared/schema";
import { importCompleteMDB } from "./import-mdb-complete";
import { generateEventCSV, generateMeetCSV } from "./export-utils";
import { ingestLIFResults } from "./finishlynx-ingestion";
import { generateCertificatePDF, type CertificateData } from './certificate-generator';
import { startWeatherPolling, stopWeatherPolling } from './weather-poller';
import archiver from 'archiver';

// Check-in validation schemas
const checkInSchema = z.object({
  operator: z.string().min(1),
  method: z.string().default('manual')
});

const bulkCheckInSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
  operator: z.string().min(1),
  method: z.string().default('bulk')
});

// Overlay validation schemas
const overlayUpdateSchema = z.object({
  overlayType: z.enum(['lower-third', 'scorebug', 'athlete-spotlight', 'team-standings']),
  data: z.object({
    meetId: z.string().optional(),
    eventId: z.string().optional(),
    athleteId: z.string().optional(),
    teamId: z.string().optional()
  })
});

const overlayHideSchema = z.object({
  overlayType: z.enum(['lower-third', 'scorebug', 'athlete-spotlight', 'team-standings'])
});

// Track connected WebSocket clients
const displayClients = new Set<WebSocket>();

// Track display devices with their WebSocket connections
interface ConnectedDisplayDevice {
  ws: WebSocket;
  deviceId: string;
  deviceName: string;
  meetId: string;
}
const connectedDisplayDevices = new Map<string, ConnectedDisplayDevice>();

// Broadcast function
function broadcastToDisplays(message: WSMessage) {
  const messageStr = JSON.stringify(message);
  displayClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Send targeted message to a specific display device
function sendToDisplayDevice(deviceId: string, message: WSMessage) {
  const device = connectedDisplayDevices.get(deviceId);
  if (device && device.ws.readyState === WebSocket.OPEN) {
    device.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Get list of connected display devices for a meet
function getConnectedDevicesForMeet(meetId: string): string[] {
  const devices: string[] = [];
  connectedDisplayDevices.forEach((device, id) => {
    if (device.meetId === meetId) {
      devices.push(id);
    }
  });
  return devices;
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

  // ===== PUBLIC SPECTATOR API =====

  // Get current meet (public info only)
  app.get("/api/public/current-meet", async (req, res) => {
    try {
      const meets = await storage.getMeets();
      const currentMeet = meets.length > 0 ? meets[0] : null;
      
      if (!currentMeet) {
        return res.status(404).json({ error: "No active meet" });
      }
      
      res.json({
        id: currentMeet.id,
        name: currentMeet.name,
        startDate: currentMeet.startDate,
        endDate: currentMeet.endDate,
        location: currentMeet.location
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get events for spectator view
  app.get("/api/public/meets/:meetId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByMeetId(req.params.meetId);
      
      const publicEvents = events.map(e => ({
        id: e.id,
        name: e.name,
        eventType: e.eventType,
        gender: e.gender,
        status: e.status,
        eventTime: e.eventTime
      }));
      
      res.json(publicEvents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get event results (with athlete info)
  app.get("/api/public/events/:eventId/results", async (req, res) => {
    try {
      const event = await storage.getEventWithEntries(req.params.eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const results = event.entries.map(entry => ({
        id: entry.id,
        athleteName: entry.athlete ? `${entry.athlete.firstName} ${entry.athlete.lastName}` : "Unknown",
        athleteId: entry.athlete?.id,
        teamName: entry.team?.name,
        bibNumber: entry.athlete?.bibNumber,
        finalPlace: entry.finalPlace,
        finalMark: entry.finalMark
      })).sort((a, b) => (a.finalPlace || 999) - (b.finalPlace || 999));
      
      res.json({
        event: {
          id: event.id,
          name: event.name,
          eventType: event.eventType,
          status: event.status
        },
        results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get team standings
  app.get("/api/public/meets/:meetId/team-standings", async (req, res) => {
    try {
      const standings = await storage.getTeamStandings(req.params.meetId);
      res.json(standings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get medal standings
  app.get("/api/public/meets/:meetId/medal-standings", async (req, res) => {
    try {
      const standings = await storage.getMedalStandings(req.params.meetId);
      res.json(standings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get athletes (public info only)
  app.get("/api/public/meets/:meetId/athletes", async (req, res) => {
    try {
      const athletes = await storage.getAthletesByMeetId(req.params.meetId);
      
      const publicAthletes = await Promise.all(athletes.map(async (a) => {
        const team = a.teamId ? await storage.getTeam(a.teamId) : null;
        return {
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          bibNumber: a.bibNumber,
          teamId: a.teamId,
          teamName: team?.name
        };
      }));
      
      res.json(publicAthletes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single athlete details
  app.get("/api/public/athletes/:athleteId", async (req, res) => {
    try {
      const athlete = await storage.getAthlete(req.params.athleteId);
      
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      let photoUrl = null;
      try {
        const photo = await storage.getAthletePhoto(athlete.id);
        if (photo?.storageKey) {
          photoUrl = fileStorage.publicUrlForKey(photo.storageKey);
        }
      } catch (e) {
        // Photo not available
      }
      
      const team = athlete.teamId ? await storage.getTeam(athlete.teamId) : null;
      
      res.json({
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        bibNumber: athlete.bibNumber,
        teamName: team?.name,
        photoUrl
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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
      let athletes;
      if (meetId) {
        athletes = await storage.getAthletesByMeetId(meetId as string);
        // Get teams to include team names
        const teams = await storage.getTeamsByMeetId(meetId as string);
        const teamMap = new Map(teams.map(t => [t.id, t.name]));
        const athletesWithTeams = athletes.map(a => ({
          ...a,
          teamName: a.teamId ? teamMap.get(a.teamId) || null : null
        }));
        return res.json(athletesWithTeams);
      }
      athletes = await storage.getAthletes();
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

  // Entries (unified results for track and field)
  app.get("/api/entries", async (req, res) => {
    const entries = await storage.getEntries();
    res.json(entries);
  });

  app.get("/api/entries/event/:eventId", async (req, res) => {
    const entries = await storage.getEntriesByEvent(req.params.eventId);
    res.json(entries);
  });

  app.get("/api/entries/event/:eventId/details", async (req, res) => {
    const entries = await storage.getEntriesWithDetails(req.params.eventId);
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

  // Check-in endpoints
  app.post("/api/entries/:id/check-in", async (req, res) => {
    try {
      // Validate request body
      const validated = checkInSchema.parse(req.body);
      
      // Verify entry exists and get initial entry with full details
      const entry = await storage.getEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      
      const updated = await storage.markCheckedIn(
        req.params.id, 
        validated.operator, 
        validated.method
      );
      
      // Broadcast full entry data
      broadcastToDisplays({
        type: 'check_in_update',
        meetId: entry.event.meetId,
        eventId: entry.eventId,
        entry: updated
      });
      
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/events/:eventId/bulk-check-in", async (req, res) => {
    try {
      const validated = bulkCheckInSchema.parse(req.body);
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // SHORT-CIRCUIT: Verify ALL entries BEFORE any updates
      const invalidIds: string[] = [];
      
      for (const id of validated.entryIds) {
        const entry = await storage.getEntry(id);
        if (!entry || entry.eventId !== req.params.eventId) {
          invalidIds.push(id);
        }
      }
      
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          error: "Some entries do not belong to this event or do not exist",
          invalidIds,
          invalidCount: invalidIds.length
        });
      }
      
      // All entries valid, safe to update
      const updated = await storage.bulkCheckIn(
        validated.entryIds, 
        validated.operator, 
        validated.method
      );
      
      // Broadcast each updated entry
      for (const entry of updated) {
        broadcastToDisplays({
          type: 'check_in_update',
          meetId: event.meetId,
          eventId: event.id,
          entry
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/events/:eventId/check-in-stats", async (req, res) => {
    try {
      const stats = await storage.getCheckInStats(req.params.eventId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Split Times
  app.get("/api/events/:eventId/splits/config", async (req, res) => {
    const configs = await storage.getSplitConfigs(req.params.eventId);
    res.json(configs);
  });

  app.put("/api/events/:eventId/splits/config", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const validated = z.array(insertEventSplitConfigSchema).parse(req.body);
      const updated = await storage.updateSplitConfigs(event.eventType, event.meetId, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  app.post("/api/entries/:entryId/splits", async (req, res) => {
    try {
      const validated = insertEntrySplitSchema.parse(req.body);
      const entry = await storage.getEntry(req.params.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      
      const split = await storage.createEntrySplit({
        ...validated,
        entryId: req.params.entryId
      });
      
      const allSplits = await storage.getEntrySplits(entry.eventId);
      broadcastToDisplays({
        type: 'split_update',
        meetId: entry.event.meetId,
        eventId: entry.eventId,
        entryId: entry.id,
        splits: allSplits.get(entry.id) || []
      });
      
      res.json(split);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  app.post("/api/events/:eventId/splits/batch", async (req, res) => {
    try {
      const validated = z.array(insertEntrySplitSchema).parse(req.body);
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const splits = await storage.createEntrySplitsBatch(validated);
      
      const affectedEntryIds = [...new Set(splits.map(s => s.entryId))];
      const allSplits = await storage.getEntrySplits(event.id);
      
      for (const entryId of affectedEntryIds) {
        broadcastToDisplays({
          type: 'split_update',
          meetId: event.meetId,
          eventId: event.id,
          entryId,
          splits: allSplits.get(entryId) || []
        });
      }
      
      res.json(splits);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  app.get("/api/events/:eventId/splits", async (req, res) => {
    const splits = await storage.getEntrySplits(req.params.eventId);
    const obj: Record<string, EntrySplit[]> = {};
    splits.forEach((value, key) => { obj[key] = value; });
    res.json(obj);
  });

  app.delete("/api/entries/:entryId/splits/:splitIndex", async (req, res) => {
    const entry = await storage.getEntry(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    await storage.deleteEntrySplit(req.params.entryId, parseInt(req.params.splitIndex));
    
    const allSplits = await storage.getEntrySplits(entry.eventId);
    broadcastToDisplays({
      type: 'split_update',
      meetId: entry.event.meetId,
      eventId: entry.eventId,
      entryId: entry.id,
      splits: allSplits.get(entry.id) || []
    });
    
    res.status(204).send();
  });

  // Wind Readings
  app.post("/api/events/:eventId/wind-readings", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Validate wind speed is in reasonable range
      const validated = insertWindReadingSchema.extend({
        windSpeed: z.number().min(-5.0).max(9.9)
      }).parse(req.body);
      
      const reading = await storage.createWindReading({
        ...validated,
        eventId: req.params.eventId
      });
      
      // Broadcast update
      broadcastToDisplays({
        type: 'wind_update',
        meetId: event.meetId,
        eventId: event.id,
        reading
      });
      
      res.json(reading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  app.get("/api/events/:eventId/wind-readings", async (req, res) => {
    const readings = await storage.getWindReadings(req.params.eventId);
    res.json(readings);
  });

  app.patch("/api/wind-readings/:id", async (req, res) => {
    try {
      const validated = z.object({
        windSpeed: z.number().min(-5.0).max(9.9)
      }).parse(req.body);
      
      const reading = await storage.updateWindReading(req.params.id, validated.windSpeed);
      
      // Get event to broadcast
      const eventId = reading.eventId;
      const event = await storage.getEvent(eventId);
      if (event) {
        broadcastToDisplays({
          type: 'wind_update',
          meetId: event.meetId,
          eventId: event.id,
          reading
        });
      }
      
      res.json(reading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/wind-readings/:id", async (req, res) => {
    await storage.deleteWindReading(req.params.id);
    res.status(204).send();
  });

  // ===== JUDGE TOKEN MANAGEMENT =====

  // Create judge token
  app.post("/api/judge-tokens", async (req, res) => {
    try {
      const validated = insertJudgeTokenSchema.extend({
        code: z.string().length(8).regex(/^[A-Z0-9]+$/)
      }).parse(req.body);
      
      const token = await storage.createJudgeToken(validated);
      res.json(token);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Get judge tokens for meet
  app.get("/api/meets/:meetId/judge-tokens", async (req, res) => {
    const tokens = await storage.getJudgeTokens(req.params.meetId);
    res.json(tokens);
  });

  // Deactivate judge token
  app.delete("/api/judge-tokens/:id", async (req, res) => {
    await storage.deactivateJudgeToken(req.params.id);
    res.status(204).send();
  });

  // Validate judge token (login)
  app.post("/api/judge/login", async (req, res) => {
    try {
      const { code, pin } = z.object({
        code: z.string(),
        pin: z.string().optional()
      }).parse(req.body);
      
      const token = await storage.getJudgeToken(code);
      if (!token) {
        return res.status(401).json({ error: "Invalid code" });
      }
      
      if (token.pin && token.pin !== pin) {
        return res.status(401).json({ error: "Invalid PIN" });
      }
      
      res.json({ token, judgeId: token.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // ===== FIELD ATTEMPTS =====

  // Create field attempt
  app.post("/api/field-attempts", async (req, res) => {
    try {
      const validated = insertFieldAttemptSchema.extend({
        attemptIndex: z.number().min(1).max(6),
        status: z.enum(["mark", "foul", "pass", "scratch"]),
        measurement: z.number().positive().optional()
      }).parse(req.body);
      
      // Validate: mark status requires measurement
      if (validated.status === "mark" && !validated.measurement) {
        return res.status(400).json({ error: "Mark requires measurement" });
      }
      
      // Get entry to find event
      const entry = await storage.getEntry(validated.entryId);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }
      
      const attempt = await storage.createFieldAttempt(validated);
      
      // Broadcast update
      broadcastToDisplays({
        type: 'field_attempt_update',
        meetId: entry.event.meetId,
        eventId: entry.eventId,
        entryId: entry.id,
        attempt
      });
      
      res.json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Get attempts for entry
  app.get("/api/entries/:entryId/field-attempts", async (req, res) => {
    const attempts = await storage.getFieldAttempts(req.params.entryId);
    res.json(attempts);
  });

  // Get all attempts for event
  app.get("/api/events/:eventId/field-attempts", async (req, res) => {
    const attempts = await storage.getEventFieldAttempts(req.params.eventId);
    const obj: Record<string, FieldAttempt[]> = {};
    attempts.forEach((value, key) => { obj[key] = value; });
    res.json(obj);
  });

  // Update field attempt
  app.patch("/api/field-attempts/:id", async (req, res) => {
    try {
      const validated = z.object({
        status: z.enum(["mark", "foul", "pass", "scratch"]).optional(),
        measurement: z.number().positive().optional(),
        notes: z.string().optional()
      }).parse(req.body);
      
      const attempt = await storage.updateFieldAttempt(req.params.id, validated);
      
      // Get entry to broadcast
      const entry = await storage.getEntry(attempt.entryId);
      if (entry) {
        broadcastToDisplays({
          type: 'field_attempt_update',
          meetId: entry.event.meetId,
          eventId: entry.eventId,
          entryId: entry.id,
          attempt
        });
      }
      
      res.json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Delete field attempt
  app.delete("/api/field-attempts/:id", async (req, res) => {
    await storage.deleteFieldAttempt(req.params.id);
    res.status(204).send();
  });

  // Teams
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

  app.delete("/api/meets/:id", async (req, res) => {
    try {
      const meet = await storage.getMeet(req.params.id);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      await storage.deleteMeet(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // ===== DISPLAY DEVICES (Remote Display Control) =====

  // Get all display devices for a meet
  app.get("/api/display-devices/meet/:meetId", async (req, res) => {
    try {
      const devices = await storage.getDisplayDevices(req.params.meetId);
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register a display device (called when display connects)
  app.post("/api/display-devices/register", async (req, res) => {
    try {
      const { meetId, deviceName } = req.body;
      
      if (!meetId || !deviceName) {
        return res.status(400).json({ error: "meetId and deviceName are required" });
      }

      // Get client IP for tracking
      const clientIp = req.headers['x-forwarded-for'] as string || 
                       req.socket.remoteAddress || 
                       'unknown';

      const device = await storage.createOrUpdateDisplayDevice({
        meetId,
        deviceName,
        lastIp: clientIp,
      });

      res.json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update device status (heartbeat)
  app.post("/api/display-devices/:id/heartbeat", async (req, res) => {
    try {
      const clientIp = req.headers['x-forwarded-for'] as string || 
                       req.socket.remoteAddress || 
                       'unknown';

      const device = await storage.updateDisplayDeviceStatus(req.params.id, 'online', clientIp);
      
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }

      res.json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assign an event to a display device
  app.patch("/api/display-devices/:id/assign-event", async (req, res) => {
    try {
      const { eventId } = req.body;
      
      const device = await storage.assignEventToDisplay(req.params.id, eventId || null);
      
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }

      // Get the event data if an event is assigned
      let eventData = null;
      if (eventId) {
        eventData = await storage.getEventWithEntries(eventId);
      }

      // Get the meet for context
      const meets = await storage.getMeets();
      const meet = meets.find(m => m.id === device.meetId);

      // Broadcast the assignment with event data to all connected displays
      broadcastToDisplays({
        type: 'display_assignment',
        data: {
          deviceId: device.id,
          deviceName: device.deviceName,
          eventId: device.assignedEventId,
          event: eventData,
          meet: meet,
        }
      } as WSMessage);

      res.json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Set device offline
  app.patch("/api/display-devices/:id/offline", async (req, res) => {
    try {
      const device = await storage.updateDisplayDeviceStatus(req.params.id, 'offline');
      
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }

      res.json(device);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a display device
  app.delete("/api/display-devices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDisplayDevice(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Display device not found" });
      }

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

  // ===== OVERLAY CONTROL =====

  app.post("/api/overlay/show", async (req, res) => {
    try {
      const validated = overlayConfigSchema.parse(req.body);
      
      broadcastToDisplays({
        type: 'overlay_show',
        ...validated
      });
      
      res.json({ success: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: "Invalid overlay configuration", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/overlay/hide", async (req, res) => {
    try {
      const validated = overlayHideSchema.parse(req.body);
      
      broadcastToDisplays({
        type: 'overlay_hide',
        ...validated
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: "Invalid overlay type" });
    }
  });

  app.post("/api/overlay/update", async (req, res) => {
    try {
      const validated = overlayUpdateSchema.parse(req.body);
      
      broadcastToDisplays({
        type: 'overlay_update',
        ...validated
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: "Invalid overlay update configuration" });
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

  // =============================
  // LAYOUT TEMPLATES API ROUTES
  // =============================

  // Get all available layout templates
  app.get('/api/layout-templates', async (req, res) => {
    try {
      const { LAYOUT_TEMPLATES, DISPLAY_TYPES } = await import('@shared/layout-templates');
      const displayType = req.query.displayType as string | undefined;
      const category = req.query.category as string | undefined;
      
      let templates = LAYOUT_TEMPLATES;
      if (displayType) {
        templates = templates.filter(t => t.displayType === displayType);
      }
      if (category) {
        templates = templates.filter(t => t.category === category);
      }
      
      res.json({ templates, displayTypes: DISPLAY_TYPES });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Apply a layout template (creates layout + zones)
  app.post('/api/layout-templates/:templateId/apply', async (req, res) => {
    try {
      const { getTemplateById } = await import('@shared/layout-templates');
      const template = getTemplateById(req.params.templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Optional custom name from request body
      const customName = req.body.name || template.name;
      const customDescription = req.body.description || template.description;
      
      // Create the layout
      const layout = await storage.createLayout({
        name: customName,
        description: customDescription,
        aspectRatio: template.aspectRatio,
        baseTheme: 'stadium',
      });
      
      // Create all zones for this layout - validate each zone through schema
      for (const zoneTemplate of template.zones) {
        const zoneData = {
          layoutId: layout.id,
          order: zoneTemplate.order,
          xPercent: zoneTemplate.xPercent,
          yPercent: zoneTemplate.yPercent,
          widthPercent: zoneTemplate.widthPercent,
          heightPercent: zoneTemplate.heightPercent,
          boardType: zoneTemplate.boardType,
          dataBinding: zoneTemplate.dataBinding as any,
          boardConfig: zoneTemplate.boardConfig as any,
          stylePreset: zoneTemplate.stylePreset || 'none',
        };
        
        // Validate through the schema
        const parsed = insertLayoutZoneSchema.safeParse(zoneData);
        if (!parsed.success) {
          console.error('Zone validation failed for template', template.id, ':', parsed.error.errors);
          throw new Error(`Zone validation failed: ${parsed.error.errors.map(e => e.message).join(', ')}`);
        }
        
        await storage.createZone(parsed.data);
      }
      
      // Return the created layout with zones
      const result = await storage.getLayoutWithZones(layout.id);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error applying template:', error);
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
      
      // Only handle overrides if explicitly provided (not undefined)
      if (overrides !== undefined && Array.isArray(overrides)) {
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

  // ===== RECORD BOOKS =====

  // Get all record books
  app.get("/api/record-books", async (req, res) => {
    const books = await storage.getRecordBooks();
    res.json(books);
  });

  // Get record book with records
  app.get("/api/record-books/:id", async (req, res) => {
    const book = await storage.getRecordBook(parseInt(req.params.id));
    if (!book) {
      return res.status(404).json({ error: "Record book not found" });
    }
    res.json(book);
  });

  // Create record book
  app.post("/api/record-books", async (req, res) => {
    try {
      const validated = insertRecordBookSchema.parse(req.body);
      const book = await storage.createRecordBook(validated);
      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // ===== RECORDS =====

  // Get records for event type
  app.get("/api/records", async (req, res) => {
    const { eventType, gender } = req.query;
    if (!eventType || !gender) {
      return res.status(400).json({ error: "eventType and gender required" });
    }
    const eventRecords = await storage.getRecordsByEvent(eventType as string, gender as string);
    res.json(eventRecords);
  });

  // Create record
  app.post("/api/records", async (req, res) => {
    try {
      const validated = insertRecordSchema.parse(req.body);
      const record = await storage.createRecord(validated);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Update record
  app.patch("/api/records/:id", async (req, res) => {
    try {
      const validated = insertRecordSchema.partial().parse(req.body);
      const record = await storage.updateRecord(parseInt(req.params.id), validated);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Delete record
  app.delete("/api/records/:id", async (req, res) => {
    await storage.deleteRecord(parseInt(req.params.id));
    res.status(204).send();
  });

  // Check performance against records
  app.post("/api/records/check", async (req, res) => {
    try {
      const { eventType, gender, performance, windSpeed } = z.object({
        eventType: z.string(),
        gender: z.string(),
        performance: z.string(),
        windSpeed: z.number().optional()
      }).parse(req.body);
      
      const checks = await storage.checkForRecords(eventType, gender, performance, windSpeed);
      res.json(checks);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // ===== SPONSORS =====

  // Get all sponsors
  app.get("/api/sponsors", async (req, res) => {
    const sponsors = await storage.getSponsors();
    res.json(sponsors);
  });

  // Create sponsor
  app.post("/api/sponsors", async (req, res) => {
    try {
      const validated = insertSponsorSchema.parse(req.body);
      const sponsor = await storage.createSponsor(validated);
      res.json(sponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Upload sponsor logo
  app.post("/api/sponsors/:id/logo", upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const sponsor = await storage.getSponsor(parseInt(req.params.id));
      if (!sponsor) {
        return res.status(404).json({ error: "Sponsor not found" });
      }
      
      // Delete old logo if exists
      if (sponsor.logoStorageKey) {
        await fileStorage.deleteSponsorLogo(sponsor.logoStorageKey);
      }
      
      const { storageKey, publicUrl } = await fileStorage.saveSponsorLogo(
        sponsor.id,
        req.file
      );
      
      const updated = await storage.updateSponsor(sponsor.id, {
        logoStorageKey: storageKey,
        logoUrl: publicUrl
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to upload sponsor logo:", error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  // Update sponsor
  app.patch("/api/sponsors/:id", async (req, res) => {
    try {
      const validated = insertSponsorSchema.partial().parse(req.body);
      const sponsor = await storage.updateSponsor(parseInt(req.params.id), validated);
      res.json(sponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Delete sponsor
  app.delete("/api/sponsors/:id", async (req, res) => {
    const sponsor = await storage.getSponsor(parseInt(req.params.id));
    if (sponsor?.logoStorageKey) {
      await fileStorage.deleteSponsorLogo(sponsor.logoStorageKey);
    }
    await storage.deleteSponsor(parseInt(req.params.id));
    res.status(204).send();
  });

  // ===== SPONSOR ASSIGNMENTS =====

  // Get assignments for meet
  app.get("/api/meets/:meetId/sponsor-assignments", async (req, res) => {
    const assignments = await storage.getSponsorAssignments(req.params.meetId);
    res.json(assignments);
  });

  // Create assignment
  app.post("/api/sponsor-assignments", async (req, res) => {
    try {
      const validated = insertSponsorAssignmentSchema.parse(req.body);
      const assignment = await storage.createSponsorAssignment(validated);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Delete assignment
  app.delete("/api/sponsor-assignments/:id", async (req, res) => {
    await storage.deleteSponsorAssignment(parseInt(req.params.id));
    res.status(204).send();
  });

  // ===== ROTATION PROFILES =====

  // Get rotation profile
  app.get("/api/meets/:meetId/rotation-profiles/:zoneName", async (req, res) => {
    const profile = await storage.getRotationProfile(req.params.meetId, req.params.zoneName);
    res.json(profile);
  });

  // Create/update rotation profile
  app.post("/api/rotation-profiles", async (req, res) => {
    try {
      const validated = insertSponsorRotationProfileSchema.parse(req.body);
      const profile = await storage.createRotationProfile(validated);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Get active sponsors for rotation (for display boards)
  app.get("/api/meets/:meetId/rotation-sponsors", async (req, res) => {
    const eventType = req.query.eventType as string | undefined;
    const sponsors = await storage.getActiveSponsorsForRotation(req.params.meetId, eventType);
    res.json(sponsors);
  });

  // ===== MEDAL TRACKING =====

  // Get medal standings for meet
  app.get("/api/meets/:meetId/medal-standings", async (req, res) => {
    const standings = await storage.getMedalStandings(req.params.meetId);
    res.json(standings);
  });

  // Get medal awards for meet
  app.get("/api/meets/:meetId/medal-awards", async (req, res) => {
    const awards = await storage.getMedalAwards(req.params.meetId);
    res.json(awards);
  });

  // Get medal awards for event
  app.get("/api/events/:eventId/medal-awards", async (req, res) => {
    const awards = await storage.getEventMedalAwards(req.params.eventId);
    res.json(awards);
  });

  // Recompute medals for event
  app.post("/api/events/:eventId/medal-recompute", async (req, res) => {
    const event = await storage.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    await storage.recomputeMedalsForEvent(req.params.eventId);
    
    // Get updated standings
    const standings = await storage.getMedalStandings(event.meetId);
    
    // Broadcast update
    broadcastToDisplays({
      type: 'medal_standings_update',
      meetId: event.meetId,
      standings
    });
    
    res.json({ success: true, standings });
  });

  // Recompute medals for entire meet
  app.post("/api/meets/:meetId/medal-recompute-all", async (req, res) => {
    const meet = await storage.getMeet(req.params.meetId);
    if (!meet) {
      return res.status(404).json({ error: "Meet not found" });
    }
    
    // Get all completed events
    const allEvents = await storage.getEventsByMeetId(req.params.meetId);
    const completedEvents = allEvents.filter(e => e.status === 'completed');
    
    // Recompute medals for each event
    for (const event of completedEvents) {
      await storage.recomputeMedalsForEvent(event.id);
    }
    
    const standings = await storage.getMedalStandings(req.params.meetId);
    
    broadcastToDisplays({
      type: 'medal_standings_update',
      meetId: req.params.meetId,
      standings
    });
    
    res.json({ success: true, standings });
  });

  // ===== COMBINED EVENTS (Decathlon/Heptathlon) =====

  // Get combined events for meet
  app.get("/api/meets/:meetId/combined-events", async (req, res) => {
    const events = await storage.getCombinedEvents(req.params.meetId);
    res.json(events);
  });

  // Get combined event
  app.get("/api/combined-events/:id", async (req, res) => {
    const event = await storage.getCombinedEvent(parseInt(req.params.id));
    if (!event) {
      return res.status(404).json({ error: "Combined event not found" });
    }
    res.json(event);
  });

  // Create combined event
  app.post("/api/combined-events", async (req, res) => {
    try {
      const validated = insertCombinedEventSchema.parse(req.body);
      const event = await storage.createCombinedEvent(validated);
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Get combined event components
  app.get("/api/combined-events/:id/components", async (req, res) => {
    const components = await storage.getCombinedEventComponents(parseInt(req.params.id));
    res.json(components);
  });

  // Add component to combined event
  app.post("/api/combined-events/:id/components", async (req, res) => {
    try {
      const validated = insertCombinedEventComponentSchema.parse(req.body);
      const component = await storage.createCombinedEventComponent({
        ...validated,
        combinedEventId: parseInt(req.params.id)
      });
      res.json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      throw error;
    }
  });

  // Get combined event standings
  app.get("/api/combined-events/:id/standings", async (req, res) => {
    const standings = await storage.getCombinedEventStandings(parseInt(req.params.id));
    res.json(standings);
  });

  // Recompute combined event totals
  app.post("/api/combined-events/:id/recompute", async (req, res) => {
    const event = await storage.getCombinedEvent(parseInt(req.params.id));
    if (!event) {
      return res.status(404).json({ error: "Combined event not found" });
    }
    
    await storage.updateCombinedEventTotals(event.id);
    const standings = await storage.getCombinedEventStandings(event.id);
    
    broadcastToDisplays({
      type: 'combined_event_update',
      meetId: event.meetId,
      combinedEventId: event.id,
      standings
    });
    
    res.json({ success: true, standings });
  });
  
  // Add athlete to combined event
  app.post("/api/combined-events/:id/athletes", async (req, res) => {
    try {
      const { athleteId } = req.body;
      const combinedEventId = parseInt(req.params.id);
      
      const event = await storage.getCombinedEvent(combinedEventId);
      if (!event) {
        return res.status(404).json({ error: "Combined event not found" });
      }
      
      await storage.addAthleteToCombinedEvent(combinedEventId, athleteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to add athlete to combined event:", error);
      res.status(500).json({ error: "Failed to add athlete" });
    }
  });
  
  // Remove athlete from combined event
  app.delete("/api/combined-events/:id/athletes/:athleteId", async (req, res) => {
    try {
      const combinedEventId = parseInt(req.params.id);
      const { athleteId } = req.params;
      
      await storage.removeAthleteFromCombinedEvent(combinedEventId, athleteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove athlete from combined event:", error);
      res.status(500).json({ error: "Failed to remove athlete" });
    }
  });
  
  // Delete combined event
  app.delete("/api/combined-events/:id", async (req, res) => {
    try {
      await storage.deleteCombinedEvent(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete combined event:", error);
      res.status(500).json({ error: "Failed to delete combined event" });
    }
  });
  
  // Update combined event status
  app.patch("/api/combined-events/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateCombinedEventStatus(parseInt(req.params.id), status);
      if (!updated) {
        return res.status(404).json({ error: "Combined event not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update combined event status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });
  
  // Get scoring coefficients for reference
  app.get("/api/combined-events/scoring-tables", async (req, res) => {
    const { SCORING_TABLES, COMBINED_EVENT_DEFINITIONS } = await import('./combined-events-scoring');
    res.json({ scoringTables: SCORING_TABLES, eventDefinitions: COMBINED_EVENT_DEFINITIONS });
  });
  
  // Calculate points for a single performance
  app.post("/api/combined-events/calculate-points", async (req, res) => {
    try {
      const { eventType, performance, gender } = req.body;
      const { calculateEventPoints, normalizeEventType } = await import('./combined-events-scoring');
      
      const normalizedEvent = normalizeEventType(eventType);
      const points = calculateEventPoints(normalizedEvent, performance, gender);
      
      res.json({ eventType: normalizedEvent, performance, gender, points });
    } catch (error) {
      console.error("Failed to calculate points:", error);
      res.status(500).json({ error: "Failed to calculate points" });
    }
  });

  // ===== SOCIAL MEDIA CONTENT GENERATOR =====

  // Generate event result post
  app.post("/api/social-media/event-result", async (req, res) => {
    try {
      const { eventId } = req.body;
      
      const event = await storage.getEventWithEntries(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const meet = await storage.getMeet(event.meetId);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      const results = event.entries
        .filter(e => e.finalPlace)
        .sort((a, b) => (a.finalPlace || 999) - (b.finalPlace || 999))
        .slice(0, 3)
        .map(e => ({
          athleteName: e.athlete ? `${e.athlete.firstName} ${e.athlete.lastName}` : "Unknown",
          teamName: e.team?.name,
          finalMark: e.finalMark?.toString(),
          finalPlace: e.finalPlace || undefined
        }));
      
      const { generateEventResultCaption } = await import('./social-media-captions');
      const caption = generateEventResultCaption(event, results, meet.name);
      
      const post = await storage.createSocialMediaPost({
        type: 'event_result',
        caption,
        hashtags: ['TrackAndField', event.eventType.replace(/\s+/g, '')],
        eventId: event.id
      });
      
      res.json(post);
    } catch (error) {
      console.error("Failed to generate event result post:", error);
      res.status(500).json({ error: "Failed to generate post" });
    }
  });

  // Generate medal count post
  app.post("/api/social-media/medal-count", async (req, res) => {
    try {
      const { meetId } = req.body;
      
      const meet = await storage.getMeet(meetId);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      const standings = await storage.getMedalStandings(meetId);
      const { generateMedalCountCaption } = await import('./social-media-captions');
      const caption = generateMedalCountCaption(standings, meet.name);
      
      const post = await storage.createSocialMediaPost({
        type: 'medal_count',
        caption,
        hashtags: ['TrackAndField', 'MedalCount']
      });
      
      res.json(post);
    } catch (error) {
      console.error("Failed to generate medal count post:", error);
      res.status(500).json({ error: "Failed to generate post" });
    }
  });

  // Generate meet highlight post
  app.post("/api/social-media/meet-highlight", async (req, res) => {
    try {
      const { meetId } = req.body;
      
      const meet = await storage.getMeet(meetId);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      const events = await storage.getEventsByMeetId(meetId);
      const athletes = await storage.getAthletesByMeetId(meetId);
      
      const { generateMeetHighlightCaption } = await import('./social-media-captions');
      const caption = generateMeetHighlightCaption(
        meet.name,
        meet.location || "Unknown",
        events.length,
        athletes.length
      );
      
      const post = await storage.createSocialMediaPost({
        type: 'meet_highlight',
        caption,
        hashtags: ['TrackAndField', 'Athletics', 'TrackMeet']
      });
      
      res.json(post);
    } catch (error) {
      console.error("Failed to generate meet highlight post:", error);
      res.status(500).json({ error: "Failed to generate post" });
    }
  });

  // Get all social media posts
  app.get("/api/social-media/posts", async (req, res) => {
    const posts = await storage.getSocialMediaPosts();
    res.json(posts);
  });

  // Delete social media post
  app.delete("/api/social-media/posts/:id", async (req, res) => {
    await storage.deleteSocialMediaPost(req.params.id);
    res.status(204).send();
  });

  // ===== FINISHLYNX INTEGRATION =====

  // Upload LIF file
  app.post("/api/finishlynx/upload", upload.single("lif"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { meetId } = req.body;
      if (!meetId) {
        return res.status(400).json({ error: "meetId required" });
      }
      
      const fileContent = req.file.buffer.toString('utf-8');
      const result = await ingestLIFResults(fileContent, meetId);
      
      // Broadcast update to displays
      broadcastToDisplays({
        type: 'finishlynx_update',
        meetId,
        timestamp: new Date().toISOString()
      });
      
      res.json(result);
    } catch (error) {
      console.error("FinishLynx upload error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Clear old signatures (cleanup)
  app.post("/api/finishlynx/cleanup", async (req, res) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await storage.clearOldSignatures(oneDayAgo);
    res.json({ success: true });
  });

  // ===== CERTIFICATE GENERATION =====

  // Generate single certificate
  app.post("/api/certificates/generate", async (req, res) => {
    try {
      const { eventId, athleteId } = req.body;
      
      const event = await storage.getEventWithEntries(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const meet = await storage.getMeet(event.meetId);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      const entry = event.entries.find(e => e.athleteId === athleteId);
      if (!entry || !entry.athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      if (!entry.finalPlace || entry.finalPlace > 3) {
        return res.status(400).json({ error: "Only podium finishers (1-3) can receive certificates" });
      }
      
      const certificateData: CertificateData = {
        athleteName: `${entry.athlete.firstName} ${entry.athlete.lastName}`,
        eventName: event.name,
        place: entry.finalPlace,
        performance: entry.finalMark?.toString() || "N/A",
        meetName: meet.name,
        meetDate: meet.startDate ? new Date(meet.startDate).toLocaleDateString() : "Unknown",
        teamName: entry.team?.name
      };
      
      const pdfStream = generateCertificatePDF(certificateData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${entry.athlete.lastName}.pdf"`);
      pdfStream.pipe(res);
      
    } catch (error) {
      console.error("Certificate generation error:", error);
      res.status(500).json({ error: "Failed to generate certificate" });
    }
  });

  // Generate bulk certificates for event
  app.post("/api/certificates/bulk-event", async (req, res) => {
    try {
      const { eventId } = req.body;
      
      const event = await storage.getEventWithEntries(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const meet = await storage.getMeet(event.meetId);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      // Get podium finishers (1-3)
      const podium = event.entries
        .filter(e => e.finalPlace && e.finalPlace >= 1 && e.finalPlace <= 3 && e.athlete)
        .sort((a, b) => (a.finalPlace || 0) - (b.finalPlace || 0));
      
      if (podium.length === 0) {
        return res.status(400).json({ error: "No podium finishers found" });
      }
      
      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="certificates-${event.name.replace(/\s+/g, '-')}.zip"`);
      
      archive.pipe(res);
      
      // Generate certificate for each podium finisher
      for (const entry of podium) {
        const certificateData: CertificateData = {
          athleteName: `${entry.athlete!.firstName} ${entry.athlete!.lastName}`,
          eventName: event.name,
          place: entry.finalPlace!,
          performance: entry.finalMark?.toString() || "N/A",
          meetName: meet.name,
          meetDate: meet.startDate ? new Date(meet.startDate).toLocaleDateString() : "Unknown",
          teamName: entry.team?.name
        };
        
        const pdfStream = generateCertificatePDF(certificateData);
        const filename = `certificate-${entry.finalPlace}-${entry.athlete!.lastName}.pdf`;
        archive.append(pdfStream, { name: filename });
      }
      
      await archive.finalize();
      
    } catch (error) {
      console.error("Bulk certificate generation error:", error);
      res.status(500).json({ error: "Failed to generate certificates" });
    }
  });

  // ===== QR CODE GENERATION =====

  // Generate QR code
  app.post("/api/qr/generate", async (req, res) => {
    try {
      const { resourceType, resourceId, meetId } = req.body;
      
      // Build spectator URL
      let url = `${req.protocol}://${req.get('host')}/spectator`;
      
      if (resourceType === 'meet') {
        url += `?meetId=${meetId || resourceId}`;
      } else if (resourceType === 'event') {
        url += `/events/${resourceId}?meetId=${meetId}`;
      } else if (resourceType === 'athlete') {
        url += `/athletes/${resourceId}?meetId=${meetId}`;
      } else if (resourceType === 'standings') {
        url += `/standings?meetId=${meetId}`;
      }
      
      // Create short link
      const qrMeta = await storage.createQRCode({
        resourceType,
        resourceId,
        url
      });
      
      res.json({
        slug: qrMeta.slug,
        url: qrMeta.url,
        shortUrl: `${req.protocol}://${req.get('host')}/q/${qrMeta.slug}`
      });
    } catch (error) {
      console.error("QR generation error:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // Get QR code as SVG
  app.get("/api/qr/:slug/svg", async (req, res) => {
    try {
      const qrMeta = await storage.getQRCode(req.params.slug);
      if (!qrMeta) {
        return res.status(404).json({ error: "QR code not found" });
      }
      
      const shortUrl = `${req.protocol}://${req.get('host')}/q/${qrMeta.slug}`;
      const svg = await QRCode.toString(shortUrl, { type: 'svg', margin: 2 });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (error) {
      console.error("SVG generation error:", error);
      res.status(500).json({ error: "Failed to generate SVG" });
    }
  });

  // Get QR code as PNG
  app.get("/api/qr/:slug/png", async (req, res) => {
    try {
      const qrMeta = await storage.getQRCode(req.params.slug);
      if (!qrMeta) {
        return res.status(404).json({ error: "QR code not found" });
      }
      
      const shortUrl = `${req.protocol}://${req.get('host')}/q/${qrMeta.slug}`;
      const buffer = await QRCode.toBuffer(shortUrl, { 
        type: 'png',
        margin: 2,
        width: 512
      });
      
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      console.error("PNG generation error:", error);
      res.status(500).json({ error: "Failed to generate PNG" });
    }
  });

  // Get all QR codes
  app.get("/api/qr/all", async (req, res) => {
    const qrCodes = await storage.getAllQRCodes();
    res.json(qrCodes);
  });

  // Short link redirect
  app.get("/q/:slug", async (req, res) => {
    const qrMeta = await storage.getQRCode(req.params.slug);
    if (!qrMeta) {
      return res.status(404).send("QR code not found");
    }
    res.redirect(qrMeta.url);
  });

  // ===== WEATHER STATION =====

  // Get weather config (don't expose API key)
  app.get("/api/weather/config/:meetId", async (req, res) => {
    const config = await storage.getWeatherConfig(req.params.meetId);
    if (!config) {
      return res.json(null);
    }
    
    // Return config without API key
    const { apiKey, ...safeConfig } = config;
    res.json({ ...safeConfig, hasApiKey: !!apiKey });
  });

  // Set weather config and start polling
  app.post("/api/weather/config", async (req, res) => {
    try {
      const validated = insertWeatherConfigSchema.parse(req.body);
      await storage.setWeatherConfig(validated);
      startWeatherPolling(validated.meetId, broadcastToDisplays);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete weather config and stop polling
  app.delete("/api/weather/config/:meetId", async (req, res) => {
    await storage.deleteWeatherConfig(req.params.meetId);
    stopWeatherPolling(req.params.meetId);
    res.json({ success: true });
  });

  // Get current weather
  app.get("/api/weather/current/:meetId", async (req, res) => {
    const reading = await storage.getLatestWeatherReading(req.params.meetId);
    res.json(reading);
  });

  // Get weather history
  app.get("/api/weather/history/:meetId", async (req, res) => {
    const hours = parseInt(req.query.hours as string) || 2;
    const history = await storage.getWeatherHistory(req.params.meetId, hours);
    res.json(history);
  });

  // Manual refresh
  app.post("/api/weather/refresh/:meetId", async (req, res) => {
    const config = await storage.getWeatherConfig(req.params.meetId);
    if (!config) {
      return res.status(404).json({ error: "Weather config not found" });
    }
    
    // Restart polling (triggers immediate fetch)
    startWeatherPolling(config.meetId, broadcastToDisplays);
    res.json({ success: true });
  });

  const httpServer = createServer(app);

  // WebSocket Server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    let registeredDeviceId: string | null = null;

    // Handle incoming messages for client identification
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle client identification
        if (data.type === 'identify' && data.clientType === 'overlay') {
          console.log('Overlay client identified');
          displayClients.add(ws);
          
          // Send connection confirmation to overlay
          ws.send(
            JSON.stringify({
              type: "connection_status",
              connected: true,
            } as WSMessage)
          );
        }
        
        // Handle display device registration
        if (data.type === 'register_display_device') {
          const { meetId, deviceName } = data;
          
          if (meetId && deviceName) {
            console.log(`Display device registering: ${deviceName} for meet ${meetId}`);
            
            try {
              // Register/update the device in the database
              const device = await storage.createOrUpdateDisplayDevice({
                meetId,
                deviceName,
              });
              
              registeredDeviceId = device.id;
              
              // Track this WebSocket connection with the device
              connectedDisplayDevices.set(device.id, {
                ws,
                deviceId: device.id,
                deviceName: device.deviceName,
                meetId: device.meetId,
              });
              
              // Send registration confirmation with assigned event
              ws.send(JSON.stringify({
                type: 'device_registered',
                data: {
                  deviceId: device.id,
                  deviceName: device.deviceName,
                  meetId: device.meetId,
                  assignedEventId: device.assignedEventId,
                  status: device.status,
                }
              }));
              
              // Notify control panel that device list has changed
              broadcastToDisplays({
                type: 'devices_updated',
                data: { meetId: device.meetId }
              } as WSMessage);
              
              console.log(`Display device registered: ${device.deviceName} (${device.id})`);
            } catch (error) {
              console.error('Failed to register display device:', error);
              ws.send(JSON.stringify({
                type: 'device_registration_error',
                error: 'Failed to register device'
              }));
            }
          }
        }
        
        // Handle display device heartbeat via WebSocket
        if (data.type === 'device_heartbeat' && registeredDeviceId) {
          await storage.updateDisplayDeviceStatus(registeredDeviceId, 'online');
        }
      } catch (error) {
        // Not a control message, could be other WebSocket traffic
      }
    });

    // Non-overlay clients are added immediately
    // They will receive all broadcasts but can filter on client side
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

    ws.on("close", async () => {
      console.log("WebSocket client disconnected");
      displayClients.delete(ws);
      
      // If this was a registered display device, update its status
      if (registeredDeviceId) {
        connectedDisplayDevices.delete(registeredDeviceId);
        try {
          const device = await storage.updateDisplayDeviceStatus(registeredDeviceId, 'offline');
          if (device) {
            // Notify control panel that device went offline
            broadcastToDisplays({
              type: 'devices_updated',
              data: { meetId: device.meetId }
            } as WSMessage);
            console.log(`Display device offline: ${device.deviceName}`);
          }
        } catch (error) {
          console.error('Failed to update device status:', error);
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      displayClients.delete(ws);
      
      // Clean up device tracking on error
      if (registeredDeviceId) {
        connectedDisplayDevices.delete(registeredDeviceId);
      }
    });
  });

  // Initialize weather polling for all meets on server start
  setImmediate(async () => {
    try {
      const meets = await storage.getMeets();
      
      for (const meet of meets) {
        const config = await storage.getWeatherConfig(meet.id);
        if (config) {
          startWeatherPolling(meet.id, broadcastToDisplays);
          console.log(`✅ Resumed weather polling for meet: ${meet.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize weather polling:', error);
    }
  });

  // ===== LYNX DATA INGEST API =====

  // In-memory live state (will be persisted when we add database support)
  const liveState = {
    trackMode: 'idle' as TrackDisplayMode,
    currentEventNumber: 0,
    currentHeatNumber: 1,
    runningTime: '0:00.00',
    isArmed: false,
    isRunning: false,
    activeFieldEvents: new Map<number, { mode: FieldDisplayMode; athleteName?: string; attemptNumber?: number; mark?: string }>(),
  };

  // Get Lynx connection status (used by UI)
  app.get("/api/lynx/status", async (req, res) => {
    try {
      const status = lynxListener.getStatus();
      res.json({
        ports: status.map(p => ({
          portType: p.portType,
          port: p.port,
          connected: p.connected,
          lastDataAt: p.lastDataAt,
        })),
        currentEventNumber: lynxListener.getCurrentEventNumber(),
        currentHeatNumber: lynxListener.getCurrentHeatNumber(),
        isClockRunning: lynxListener.isClockRunning(),
        lastClockTime: lynxListener.getLastClockTime(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Lynx port configuration
  app.get("/api/lynx/config", async (req, res) => {
    try {
      const status = lynxListener.getStatus();
      res.json({
        configured: status.length > 0,
        ports: status,
        currentEventNumber: lynxListener.getCurrentEventNumber(),
        currentHeatNumber: lynxListener.getCurrentHeatNumber(),
        isClockRunning: lynxListener.isClockRunning(),
        lastClockTime: lynxListener.getLastClockTime(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Configure Lynx ports
  app.post("/api/lynx/config", async (req, res) => {
    try {
      const configSchema = z.object({
        ports: z.array(z.object({
          port: z.number().min(1024).max(65535),
          portType: z.enum(['clock', 'results', 'field', 'start_list']),
          name: z.string(),
          host: z.string().optional(),
        })),
        meetId: z.string().optional(),
        saveToDatabase: z.boolean().optional(),
      });
      
      const { ports, meetId, saveToDatabase } = configSchema.parse(req.body);
      
      // Stop existing listeners
      lynxListener.stop();
      
      // Configure and start new listeners
      lynxListener.configure(ports);
      lynxListener.start();
      
      // Save config to database for auto-start on boot
      if (saveToDatabase !== false) {
        // Clear existing configs for this meet
        await storage.deleteLynxConfigs(meetId);
        
        // Save new configs
        for (const port of ports) {
          await storage.saveLynxConfig({
            port: port.port,
            portType: port.portType,
            name: port.name,
            host: port.host || null,
            meetId: meetId || null,
            enabled: true,
          });
        }
        console.log(`[Lynx] Saved ${ports.length} port configs to database`);
      }
      
      res.json({ success: true, ports: lynxListener.getStatus() });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Start Lynx listeners
  app.post("/api/lynx/start", async (req, res) => {
    try {
      lynxListener.start();
      res.json({ success: true, status: lynxListener.getStatus() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stop Lynx listeners
  app.post("/api/lynx/stop", async (req, res) => {
    try {
      lynxListener.stop();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Lynx config for a specific meet
  app.get("/api/lynx/config/:meetId", async (req, res) => {
    try {
      // Return current configuration based on listener status
      const status = lynxListener.getStatus();
      const clockPort = status.find(p => p.portType === 'clock')?.port || 4000;
      const resultsPort = status.find(p => p.portType === 'results')?.port || 4001;
      const startListPort = status.find(p => p.portType === 'start_list')?.port || 4002;
      const fieldPort = status.find(p => p.portType === 'field')?.port || 4003;
      const enabled = status.some(p => p.connected);
      
      res.json({
        meetId: req.params.meetId,
        clockPort,
        resultsPort,
        startListPort,
        fieldPort,
        enabled,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Lynx config for a specific meet
  app.post("/api/lynx/config/:meetId", async (req, res) => {
    try {
      const { meetId } = req.params;
      const { clockPort, resultsPort, startListPort, fieldPort, enabled, host } = req.body;
      
      // Reconfigure the listener with new ports
      const ports = [
        { port: clockPort || 4000, portType: 'clock' as const, name: 'Clock', host },
        { port: resultsPort || 4001, portType: 'results' as const, name: 'Results', host },
        { port: startListPort || 4002, portType: 'start_list' as const, name: 'Start List', host },
        { port: fieldPort || 4003, portType: 'field' as const, name: 'Field', host },
      ];
      
      lynxListener.stop();
      lynxListener.configure(ports);
      
      if (enabled) {
        lynxListener.start();
      }
      
      // Save config to database for auto-start on boot
      await storage.deleteLynxConfigs(meetId);
      for (const port of ports) {
        await storage.saveLynxConfig({
          port: port.port,
          portType: port.portType,
          name: port.name,
          host: port.host || null,
          meetId: meetId,
          enabled: enabled !== false,
        });
      }
      console.log(`[Lynx] Saved ${ports.length} port configs for meet ${meetId}`);
      
      res.json({ success: true, status: lynxListener.getStatus() });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reconnect Lynx listeners
  app.post("/api/lynx/reconnect/:meetId", async (req, res) => {
    try {
      lynxListener.stop();
      lynxListener.start();
      res.json({ success: true, status: lynxListener.getStatus() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get live event data by event number
  app.get("/api/live-events/:eventNumber", async (req, res) => {
    try {
      const eventNumber = parseInt(req.params.eventNumber);
      const meetId = req.query.meetId as string | undefined;
      
      const data = await storage.getLiveEventData(eventNumber, meetId);
      if (!data) {
        return res.status(404).json({ error: "No live data for this event" });
      }
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all live events for a meet
  app.get("/api/live-events", async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      const events = await storage.getLiveEventsByMeet(meetId);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clear live event data
  app.delete("/api/live-events", async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      await storage.clearLiveEventData(meetId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get saved Lynx configs
  app.get("/api/lynx/saved-configs", async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      const configs = await storage.getLynxConfigs(meetId);
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get live meet state (aggregated)
  app.get("/api/meets/:meetId/live", async (req, res) => {
    try {
      const { meetId } = req.params;
      const events = await storage.getEventsByMeetId(meetId);
      const currentEventNumber = lynxListener.getCurrentEventNumber();
      
      // Find active track event
      const activeTrackEvent = events.find(e => 
        e.eventNumber === currentEventNumber && 
        (e.eventType?.includes('m') || e.eventType?.includes('hurdles') || e.eventType?.includes('relay'))
      );
      
      // Find active field events (in_progress status)
      const activeFieldEvents = events.filter(e => 
        e.status === 'in_progress' && 
        !e.eventType?.includes('m') && 
        !e.eventType?.includes('hurdles') && 
        !e.eventType?.includes('relay')
      );
      
      const response: MeetLiveState = {
        meetId,
        activeTrackEvent: activeTrackEvent ? {
          event: activeTrackEvent,
          mode: liveState.trackMode,
          runningTime: liveState.runningTime,
          isArmed: liveState.isArmed,
          isRunning: liveState.isRunning,
        } : undefined,
        activeFieldEvents: await Promise.all(activeFieldEvents.map(async event => {
          const fieldState = liveState.activeFieldEvents.get(event.eventNumber || 0);
          return {
            event,
            mode: fieldState?.mode || 'idle' as FieldDisplayMode,
            currentAthlete: undefined, // Would need to look up by name
            currentAttemptNumber: fieldState?.attemptNumber,
            currentHeight: fieldState?.mark,
          };
        })),
        recentResults: [], // Would populate from entries with recent times
        timestamp: Date.now(),
      };
      
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Set up Lynx listener event handlers - store data by event number
  lynxListener.on('track-mode-change', async (eventNumber, mode, data) => {
    console.log(`[Lynx] Track mode change: Event ${eventNumber} → ${mode}`, data);
    liveState.trackMode = mode;
    liveState.currentEventNumber = eventNumber;
    liveState.isArmed = data.armed || false;
    
    try {
      // Store live event data to database
      await storage.upsertLiveEventData({
        eventNumber,
        eventType: 'track',
        mode,
        heat: data.heat || 1,
        round: data.round || 1,
        flight: 1,
        wind: data.wind,
        status: data.status,
        distance: data.distance,
        entries: data.entries || data.results || [],
        runningTime: data.time,
        isArmed: data.armed || false,
        isRunning: mode === 'running',
      });

      // Broadcast display mode change
      broadcastToDisplays({
        type: 'track_mode_change',
        data: {
          eventNumber,
          mode,
          ...data,
        }
      });
    } catch (error) {
      console.error('[Lynx] Error handling track mode change:', error);
    }
  });

  lynxListener.on('clock-update', async (eventNumber, time, isRunning) => {
    liveState.runningTime = time;
    liveState.isRunning = isRunning;
    
    try {
      // Update live event data with running time
      const existing = await storage.getLiveEventData(eventNumber);
      if (existing) {
        await storage.upsertLiveEventData({
          eventNumber,
          eventType: 'track',
          mode: 'running',
          heat: existing.heat || 1,
          round: existing.round || 1,
          flight: 1,
          runningTime: time,
          isRunning,
          entries: existing.entries || [],
        });
      }
    } catch (error) {
      console.error('[Lynx] Error updating clock:', error);
    }
    
    // Broadcast clock update
    broadcastToDisplays({
      type: 'clock_update',
      data: {
        eventNumber,
        time,
        isRunning,
      }
    } as WSMessage);
  });

  lynxListener.on('result', async (eventNumber, lane, place, time, athleteName) => {
    console.log(`[Lynx] Result: Event ${eventNumber}, Lane ${lane}, Place ${place}, Time ${time}`);
    
    try {
      // Get existing entries and merge new result
      const existing = await storage.getLiveEventData(eventNumber);
      const entries = (existing?.entries as any[]) || [];
      
      // Find or add entry for this lane
      const laneStr = String(lane);
      const existingIdx = entries.findIndex((e: any) => e.lane === laneStr);
      const newEntry = {
        lane: laneStr,
        place: String(place),
        time,
        name: athleteName,
      };
      
      if (existingIdx >= 0) {
        entries[existingIdx] = { ...entries[existingIdx], ...newEntry };
      } else {
        entries.push(newEntry);
      }
      
      // Store updated entries
      await storage.upsertLiveEventData({
        eventNumber,
        eventType: 'track',
        mode: 'results',
        heat: existing?.heat || 1,
        round: existing?.round || 1,
        flight: 1,
        entries,
        isRunning: false,
      });
    } catch (error) {
      console.error('[Lynx] Error storing result:', error);
    }
    
    // Broadcast result
    broadcastToDisplays({
      type: 'result_received',
      data: {
        eventNumber,
        lane,
        place,
        time,
        athleteName,
      }
    } as WSMessage);
  });

  lynxListener.on('field-mode-change', async (eventNumber, mode, data) => {
    console.log(`[Lynx] Field mode change: Event ${eventNumber} → ${mode}`, data);
    
    liveState.activeFieldEvents.set(eventNumber, {
      mode,
      athleteName: data.athleteName,
      attemptNumber: data.attemptNumber,
      mark: data.mark,
    });
    
    try {
      // Store field event data to database
      await storage.upsertLiveEventData({
        eventNumber,
        eventType: 'field',
        mode,
        heat: 1,
        round: data.round || 1,
        flight: data.flight || 1,
        wind: data.wind,
        status: data.officialStatus,
        entries: data.results || [],
      });
    } catch (error) {
      console.error('[Lynx] Error storing field mode change:', error);
    }
    
    // Broadcast field event update
    broadcastToDisplays({
      type: 'field_mode_change',
      data: {
        eventNumber,
        mode,
        ...data,
      }
    } as WSMessage);
  });

  lynxListener.on('field-result', async (eventNumber, athleteName, place, mark, attemptNumber, attempts) => {
    console.log(`[Lynx] Field result: Event ${eventNumber}, ${athleteName}, Place ${place}, Mark ${mark}`);
    
    try {
      // Get existing entries and merge new result
      const existing = await storage.getLiveEventData(eventNumber);
      const entries = (existing?.entries as any[]) || [];
      
      // Find or add entry for this athlete
      const existingIdx = entries.findIndex((e: any) => e.name === athleteName);
      const newEntry = {
        name: athleteName,
        place: String(place),
        mark,
        attemptNumber: String(attemptNumber),
        attempts,
      };
      
      if (existingIdx >= 0) {
        entries[existingIdx] = { ...entries[existingIdx], ...newEntry };
      } else {
        entries.push(newEntry);
      }
      
      // Store updated entries
      await storage.upsertLiveEventData({
        eventNumber,
        eventType: 'field',
        mode: 'results',
        heat: 1,
        round: existing?.round || 1,
        flight: existing?.flight || 1,
        entries,
      });
    } catch (error) {
      console.error('[Lynx] Error storing field result:', error);
    }
    
    // Broadcast field result
    broadcastToDisplays({
      type: 'field_result',
      data: {
        eventNumber,
        athleteName,
        place,
        mark,
        attemptNumber,
        attempts,
      }
    } as WSMessage);
  });

  lynxListener.on('field-athlete-up', async (eventNumber, athleteName, attemptNumber, mark) => {
    console.log(`[Lynx] Field athlete up: Event ${eventNumber}, ${athleteName}, Attempt ${attemptNumber}`);
    
    // Broadcast athlete up
    broadcastToDisplays({
      type: 'field_athlete_up',
      data: {
        eventNumber,
        athleteName,
        attemptNumber,
        mark,
      }
    } as WSMessage);
  });
  
  lynxListener.on('start-list', async (eventNumber, heat, entries) => {
    console.log(`[Lynx] Start list: Event ${eventNumber}, Heat ${heat}, ${entries.length} entries`);
    
    try {
      // Store start list to database
      await storage.upsertLiveEventData({
        eventNumber,
        eventType: 'track',
        mode: 'start_list',
        heat,
        round: 1,
        flight: 1,
        entries,
        isArmed: true,
        isRunning: false,
      });
    } catch (error) {
      console.error('[Lynx] Error storing start list:', error);
    }
    
    // Broadcast start list
    broadcastToDisplays({
      type: 'start_list',
      data: {
        eventNumber,
        heat,
        entries,
      }
    } as WSMessage);
  });

  lynxListener.on('connection', (portType, connected) => {
    console.log(`[Lynx] Connection ${portType}: ${connected ? 'connected' : 'disconnected'}`);
    
    broadcastToDisplays({
      type: 'lynx_connection',
      data: {
        portType,
        connected,
      }
    } as WSMessage);
  });

  lynxListener.on('error', (error, portType) => {
    console.error(`[Lynx] Error on ${portType}:`, error.message);
  });

  // Auto-start Lynx listeners from saved configs or environment variables
  (async () => {
    try {
      // First try to load saved configs from database
      const savedConfigs = await storage.getLynxConfigs();
      
      if (savedConfigs.length > 0) {
        // Use saved database configs
        const lynxPortConfigs = savedConfigs.map(cfg => ({
          port: cfg.port,
          portType: cfg.portType as LynxPortType,
          name: cfg.name || `Lynx ${cfg.portType}`,
          host: cfg.host || undefined,
        }));
        
        lynxListener.configure(lynxPortConfigs);
        lynxListener.start();
        console.log(`✅ Lynx listeners auto-started from saved config with ${lynxPortConfigs.length} ports`);
        lynxPortConfigs.forEach(cfg => {
          console.log(`   - ${cfg.name}: port ${cfg.port} (${cfg.portType})`);
        });
      } else {
        // Fall back to environment variables
        const defaultLynxConfig = [];
        if (process.env.LYNX_CLOCK_PORT) {
          defaultLynxConfig.push({ port: parseInt(process.env.LYNX_CLOCK_PORT), portType: 'clock' as LynxPortType, name: 'FinishLynx Clock' });
        }
        if (process.env.LYNX_RESULTS_PORT) {
          defaultLynxConfig.push({ port: parseInt(process.env.LYNX_RESULTS_PORT), portType: 'results' as LynxPortType, name: 'FinishLynx Results' });
        }
        if (process.env.LYNX_FIELD_PORT) {
          defaultLynxConfig.push({ port: parseInt(process.env.LYNX_FIELD_PORT), portType: 'field' as LynxPortType, name: 'FieldLynx' });
        }
        
        if (defaultLynxConfig.length > 0) {
          lynxListener.configure(defaultLynxConfig);
          lynxListener.start();
          console.log(`✅ Lynx listeners started from env vars with ${defaultLynxConfig.length} ports`);
        } else {
          console.log('ℹ️ No Lynx configs found - waiting for configuration');
        }
      }
    } catch (error) {
      console.error('[Lynx] Error during auto-start:', error);
      
      // Fall back to environment variables on database error
      const defaultLynxConfig = [];
      if (process.env.LYNX_CLOCK_PORT) {
        defaultLynxConfig.push({ port: parseInt(process.env.LYNX_CLOCK_PORT), portType: 'clock' as LynxPortType, name: 'FinishLynx Clock' });
      }
      if (process.env.LYNX_RESULTS_PORT) {
        defaultLynxConfig.push({ port: parseInt(process.env.LYNX_RESULTS_PORT), portType: 'results' as LynxPortType, name: 'FinishLynx Results' });
      }
      if (process.env.LYNX_FIELD_PORT) {
        defaultLynxConfig.push({ port: parseInt(process.env.LYNX_FIELD_PORT), portType: 'field' as LynxPortType, name: 'FieldLynx' });
      }
      
      if (defaultLynxConfig.length > 0) {
        lynxListener.configure(defaultLynxConfig);
        lynxListener.start();
        console.log(`✅ Lynx listeners started from env vars with ${defaultLynxConfig.length} ports`);
      }
    }
  })();

  return httpServer;
}
