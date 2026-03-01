import type { Express } from "express";
import { storage } from "../storage";
import {
  isHeightEvent,
  insertFieldEventSessionSchema,
  insertFieldHeightSchema,
  insertFieldEventFlightSchema,
  insertFieldEventAthleteSchema,
  insertFieldEventMarkSchema,
} from "@shared/schema";
import {
  calculateHorizontalStandings,
  calculateVerticalStandings,
  isEliminatedVertical,
} from "../field-standings";
import { exportSessionToLFF, generateLFFContent } from "../lff-exporter";
import { syncAthletesFromEVT, startEVTWatcher, stopEVTWatcher, initEVTWatchers } from "../evt-watcher";
import { parseEVTDirectory, getAthletesFromDirectory, type EVTEventSummary, type EVTAthlete } from "../evt-parser";
import type { RouteContext } from "../route-context";
import * as fs from 'fs';

export function registerFieldEventsRoutes(app: Express, ctx: RouteContext) {
  const { broadcastFieldEventUpdate, autoExportLFF, broadcastToDisplays, fieldSessionSubscribers } = ctx;

  // ===== EVT CONFIG =====
  // ===============================
  // EVT DIRECTORY CONFIG ROUTES
  // ===============================
  
  const EVT_CONFIG_FILE = './evt-config.json';
  
  interface EVTConfig {
    directoryPath: string;
    resultsDirectory?: string; // Path for LIF export output
    // Horizontal event defaults (throws and jumps except high jump/pole vault)
    horizontalPrelimAttempts?: number;
    horizontalFinalists?: number;
    horizontalFinalAttempts?: number;
  }
  
  function loadEVTConfig(): EVTConfig | null {
    try {
      if (fs.existsSync(EVT_CONFIG_FILE)) {
        const content = fs.readFileSync(EVT_CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('[EVT Config] Error loading config:', err);
    }
    return null;
  }
  
  function saveEVTConfig(config: EVTConfig): void {
    fs.writeFileSync(EVT_CONFIG_FILE, JSON.stringify(config, null, 2));
  }
  
  app.get("/api/evt-config", async (req, res) => {
    try {
      const config = loadEVTConfig();
      res.json(config || { directoryPath: "" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/evt-config", async (req, res) => {
    try {
      const { directoryPath, resultsDirectory, horizontalPrelimAttempts, horizontalFinalists, horizontalFinalAttempts } = req.body;
      if (typeof directoryPath !== 'string') {
        return res.status(400).json({ error: "directoryPath must be a string" });
      }
      const prelimAttempts = horizontalPrelimAttempts ?? 3;
      const finalists = horizontalFinalists ?? 8;
      const finalAttempts = horizontalFinalAttempts ?? 3;
      
      const config: EVTConfig = { 
        directoryPath,
        resultsDirectory: resultsDirectory || undefined,
        horizontalPrelimAttempts: prelimAttempts,
        horizontalFinalists: finalists,
        horizontalFinalAttempts: finalAttempts,
      };
      saveEVTConfig(config);
      
      // Ensure results directory exists if specified
      if (resultsDirectory && !fs.existsSync(resultsDirectory)) {
        fs.mkdirSync(resultsDirectory, { recursive: true });
      }
      
      // Apply the new defaults to all existing field event sessions
      const allSessions = await storage.getAllFieldEventSessions();
      let updatedCount = 0;
      
      for (const session of allSessions) {
        const eventName = session.evtEventName || '';
        const updates: Record<string, any> = {};
        
        // Update results directory for all sessions
        if (resultsDirectory) {
          updates.lffExportPath = resultsDirectory;
        }
        
        // Apply horizontal event defaults
        if (isHorizontalEventName(eventName)) {
          updates.prelimAttempts = prelimAttempts;
          updates.finalsAttempts = finalAttempts;
          updates.athletesToFinals = finalists;
          updates.totalAttempts = prelimAttempts + finalAttempts;
        }
        
        if (Object.keys(updates).length > 0) {
          await storage.updateFieldEventSession(session.id, updates);
          updatedCount++;
        }
      }
      
      console.log(`[EVT Config] Applied config to ${updatedCount} sessions`);
      res.json({ ...config, updatedSessions: updatedCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Helper to detect field events from event name
  function isFieldEventName(eventName: string): boolean {
    const name = eventName.toLowerCase();
    const fieldEventKeywords = [
      'shot put', 'shot', 'discus', 'javelin', 'hammer', 'weight throw', 'weight',
      'long jump', 'triple jump', 'high jump', 'pole vault',
      'hj', 'pv', 'lj', 'tj', 'sp', 'dt', 'jt', 'ht', 'wt'
    ];
    return fieldEventKeywords.some(keyword => name.includes(keyword));
  }

  // Detect if an event is a vertical event (high jump or pole vault)
  function isVerticalEventName(eventName: string): boolean {
    const name = eventName.toLowerCase();
    const verticalKeywords = ['high jump', 'pole vault', 'hj', 'pv'];
    return verticalKeywords.some(keyword => name.includes(keyword));
  }

  // Detect if an event is a horizontal event (throws and jumps except vertical)
  function isHorizontalEventName(eventName: string): boolean {
    return isFieldEventName(eventName) && !isVerticalEventName(eventName);
  }
  
  app.get("/api/evt-events", async (req, res) => {
    try {
      const config = loadEVTConfig();
      if (!config || !config.directoryPath) {
        return res.json({ events: [] });
      }
      
      const { summaries } = parseEVTDirectory(config.directoryPath);
      // Filter to only show field events
      const fieldEvents = summaries.filter(evt => isFieldEventName(evt.eventName));
      res.json({ events: fieldEvents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/evt-events/:eventNumber/athletes", async (req, res) => {
    try {
      const config = loadEVTConfig();
      if (!config || !config.directoryPath) {
        return res.json({ athletes: [] });
      }
      
      const eventNumber = parseInt(req.params.eventNumber);
      
      if (isNaN(eventNumber)) {
        return res.status(400).json({ error: "Invalid event number" });
      }
      
      // Get all athletes for this event (all rounds/flights combined)
      const athletes = getAthletesFromDirectory(config.directoryPath, eventNumber);
      res.json({ athletes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-provision sessions for all EVT events
  app.post("/api/evt-events/provision-all", async (req, res) => {
    try {
      const config = loadEVTConfig();
      if (!config || !config.directoryPath) {
        return res.json({ created: 0, sessions: [] });
      }
      
      const { summaries } = parseEVTDirectory(config.directoryPath);
      const fieldEvents = summaries.filter(evt => isFieldEventName(evt.eventName));
      
      // Get all existing sessions to check which EVT events already have sessions
      const existingSessions = await storage.getAllFieldEventSessions();
      const existingEvtSessionMap = new Map<number, typeof existingSessions[0]>();
      const duplicatesToDelete: number[] = [];
      
      // Find duplicates - keep the newest session (highest ID) for each EVT event
      for (const s of existingSessions) {
        if (s.evtEventNumber !== null) {
          const existing = existingEvtSessionMap.get(s.evtEventNumber);
          if (existing) {
            // Keep the one with higher ID (newer), delete the older one
            if (s.id > existing.id) {
              duplicatesToDelete.push(existing.id);
              existingEvtSessionMap.set(s.evtEventNumber, s);
            } else {
              duplicatesToDelete.push(s.id);
            }
          } else {
            existingEvtSessionMap.set(s.evtEventNumber, s);
          }
        }
      }
      
      // Delete duplicate sessions
      for (const dupId of duplicatesToDelete) {
        try {
          await storage.deleteFieldEventSession(dupId);
          console.log(`[EVT Provision] Deleted duplicate session ${dupId}`);
        } catch (e) {
          console.error(`[EVT Provision] Failed to delete duplicate session ${dupId}:`, e);
        }
      }
      
      const createdSessions = [];
      let updatedCount = 0;
      let athletesSyncedCount = 0;
      
      // Update any existing check_in sessions to in_progress
      for (const session of existingSessions) {
        if (session.status === "check_in") {
          await storage.updateFieldEventSession(session.id, { status: "in_progress" });
          // Also update all athletes to checked_in status
          const athletes = await storage.getFieldEventAthletes(session.id);
          for (const athlete of athletes) {
            if (athlete.checkInStatus === "pending") {
              await storage.updateFieldEventAthlete(athlete.id, { checkInStatus: "checked_in" });
            }
          }
          updatedCount++;
        }
      }
      
      // Populate athletes for existing EVT sessions that have 0 athletes
      for (const [evtEventNumber, session] of existingEvtSessionMap) {
        const existingAthletes = await storage.getFieldEventAthletes(session.id);
        if (existingAthletes.length === 0) {
          // Load athletes from EVT files for this event
          const athletes = getAthletesFromDirectory(config.directoryPath, evtEventNumber);
          let orderInFlight = 1;
          for (const athlete of athletes) {
            await storage.createFieldEventAthlete({
              sessionId: session.id,
              entryId: null,
              evtBibNumber: athlete.bibNumber,
              evtFirstName: athlete.firstName,
              evtLastName: athlete.lastName,
              evtTeam: athlete.team,
              order: athlete.order,
              orderInFlight: orderInFlight++,
              flightNumber: athlete.flight || 1,
              checkInStatus: "checked_in",
              competitionStatus: "competing",
            });
          }
          if (athletes.length > 0) {
            console.log(`[EVT Provision] Synced ${athletes.length} athletes to session ${session.id} (${session.evtEventName})`);
            athletesSyncedCount++;
          }
        }
      }
      
      for (const evt of fieldEvents) {
        // Skip if session already exists for this EVT event
        if (existingEvtSessionMap.has(evt.eventNumber)) {
          continue;
        }
        
        // Generate access code
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let accessCode = "";
        for (let i = 0; i < 6; i++) {
          accessCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Determine if this is a horizontal event (uses global defaults) or vertical
        const isHorizontal = isHorizontalEventName(evt.eventName);
        
        // Use config defaults for horizontal events, manual config for vertical
        const prelimAttempts = isHorizontal ? (config.horizontalPrelimAttempts ?? 3) : 3;
        const finalsAttempts = isHorizontal ? (config.horizontalFinalAttempts ?? 3) : 3;
        const athletesToFinals = isHorizontal ? (config.horizontalFinalists ?? 8) : 8;
        const totalAttempts = prelimAttempts + finalsAttempts;
        
        // Use configured results directory for LIF export if specified
        let lffExportPath: string | undefined;
        if (config.resultsDirectory) {
          lffExportPath = config.resultsDirectory;
          // Ensure the directory exists
          if (!fs.existsSync(lffExportPath)) {
            fs.mkdirSync(lffExportPath, { recursive: true });
          }
        }
        
        // Create session with in_progress status (immediately active and configurable)
        const sessionData = {
          eventId: null,
          status: "in_progress" as const,
          measurementUnit: "metric" as const,
          recordWind: false,
          hasFinals: isHorizontal, // Enable finals for horizontal events by default
          prelimAttempts,
          finalsAttempts,
          athletesToFinals,
          totalAttempts,
          accessCode,
          evtEventNumber: evt.eventNumber,
          evtEventName: evt.eventName,
          lffExportPath, // Use configured results directory
        };
        
        const session = await storage.createFieldEventSession(sessionData);
        
        // Also load athletes from EVT file and add them
        const athletes = getAthletesFromDirectory(config.directoryPath, evt.eventNumber);
        let orderInFlight = 1;
        for (const athlete of athletes) {
          await storage.createFieldEventAthlete({
            sessionId: session.id,
            entryId: null,
            evtBibNumber: athlete.bibNumber,
            evtFirstName: athlete.firstName,
            evtLastName: athlete.lastName,
            evtTeam: athlete.team,
            order: athlete.order,
            orderInFlight: orderInFlight++,
            flightNumber: athlete.flight || 1,
            checkInStatus: "checked_in",
            competitionStatus: "competing",
          });
        }
        
        createdSessions.push(session);
      }
      
      res.json({ 
        created: createdSessions.length,
        updated: updatedCount,
        athletesSynced: athletesSyncedCount,
        sessions: createdSessions,
        total: fieldEvents.length
      });
    } catch (error: any) {
      console.error("Error provisioning EVT sessions:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ===== FIELD SESSIONS =====
  // ===============================
  // FIELD EVENT SESSION ROUTES
  // ===============================

  // Rate limiting for access code lookups (prevent brute-force)
  const accessCodeAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const RATE_LIMIT_WINDOW = 60000; // 1 minute
  const MAX_ATTEMPTS = 10; // Max attempts per minute per IP

  function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = accessCodeAttempts.get(ip);
    
    if (!record) {
      accessCodeAttempts.set(ip, { count: 1, lastAttempt: now });
      return false;
    }
    
    // Reset if window expired
    if (now - record.lastAttempt > RATE_LIMIT_WINDOW) {
      accessCodeAttempts.set(ip, { count: 1, lastAttempt: now });
      return false;
    }
    
    // Increment and check
    record.count++;
    record.lastAttempt = now;
    return record.count > MAX_ATTEMPTS;
  }

  // Get all field sessions (optionally filter by eventId or meetId query param)
  app.get("/api/field-sessions", async (req, res) => {
    try {
      const { eventId, meetId } = req.query;
      if (eventId && typeof eventId === 'string') {
        const session = await storage.getFieldEventSessionByEvent(eventId);
        return res.json(session ? [session] : []);
      }
      if (meetId && typeof meetId === 'string') {
        const sessions = await storage.getFieldEventSessionsByMeetId(meetId);
        return res.json(sessions);
      }
      // Return all sessions if no filter specified
      const sessions = await storage.getAllFieldEventSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get field session by ID
  app.get("/api/field-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const session = await storage.getFieldEventSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get field session by event ID
  app.get("/api/field-sessions/event/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const session = await storage.getFieldEventSessionByEvent(eventId);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get field session by access code (for officials to join)
  app.get("/api/field-sessions/access/:code", async (req, res) => {
    try {
      // Rate limiting check
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) {
        console.log(`[Rate Limit] Access code attempt blocked for IP: ${clientIp}`);
        return res.status(429).json({ error: "Too many attempts. Please wait a minute and try again." });
      }

      const { code } = req.params;
      const session = await storage.getFieldEventSessionByAccessCode(code);
      if (!session) {
        return res.status(404).json({ error: "Session not found with that access code" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create field session
  app.post("/api/field-sessions", async (req, res) => {
    try {
      const validated = insertFieldEventSessionSchema.parse(req.body);
      const session = await storage.createFieldEventSession(validated);
      
      // Auto-populate athletes from event entries
      try {
        const entries = await storage.getEntriesByEvent(validated.eventId);
        let orderInFlight = 1;
        for (const entry of entries) {
          await storage.createFieldEventAthlete({
            sessionId: session.id,
            entryId: entry.id,
            flightNumber: 1,
            orderInFlight: orderInFlight++,
            checkInStatus: "pending",
            competitionStatus: "waiting"
          });
        }
        console.log(`[Field Session] Created session ${session.id} with ${entries.length} athletes from entries`);
      } catch (populateError) {
        console.error(`[Field Session] Error populating athletes:`, populateError);
        // Continue - session is still valid even without athletes
      }
      
      res.status(201).json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update field session
  app.patch("/api/field-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      // Extract deviceName before validation (not part of session schema)
      const { deviceName, ...sessionData } = req.body;
      
      const oldSession = await storage.getFieldEventSession(id);
      const validated = insertFieldEventSessionSchema.partial().parse(sessionData);
      const session = await storage.updateFieldEventSession(id, validated);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Manage EVT watcher lifecycle
      if (validated.evtFilePath !== undefined) {
        if (validated.evtFilePath) {
          startEVTWatcher(id, validated.evtFilePath);
        } else if (oldSession?.evtFilePath) {
          stopEVTWatcher(id);
        }
      }
      
      // Broadcast field event update (with device name for scoreboard routing)
      broadcastFieldEventUpdate(id, deviceName).catch(console.error);
      
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Advance to next height (vertical events)
  app.post("/api/field-sessions/:id/advance-height", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const { deviceName, direction: reqDirection } = req.body || {};
      
      const session = await storage.getFieldEventSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const heights = await storage.getFieldHeights(id);
      if (heights.length === 0) {
        return res.status(400).json({ error: "No heights configured" });
      }
      
      const currentIndex = session.currentHeightIndex || 0;
      const maxIndex = Math.max(...heights.map(h => h.heightIndex));
      
      // Allow direction: 1 for next, -1 for previous
      const direction = reqDirection === -1 ? -1 : 1;
      const newIndex = currentIndex + direction;
      
      if (direction === 1 && newIndex > maxIndex) {
        return res.status(400).json({ error: "Already at last height" });
      }
      if (direction === -1 && newIndex < 0) {
        return res.status(400).json({ error: "Already at first height" });
      }
      
      const updated = await storage.updateFieldEventSession(id, {
        currentHeightIndex: newIndex,
      });
      
      // Broadcast update
      broadcastFieldEventUpdate(id, deviceName).catch(console.error);
      
      res.json({ success: true, currentHeightIndex: newIndex });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync athletes from EVT file
  app.post("/api/field-sessions/:id/sync-evt", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const result = await syncAthletesFromEVT(id);
      
      if (result.errors.length > 0 && result.added === 0) {
        return res.status(400).json({ error: result.errors.join(', '), ...result });
      }
      
      // Broadcast update after sync
      broadcastFieldEventUpdate(id).catch(console.error);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete field session
  app.delete("/api/field-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      await storage.deleteFieldEventSession(id);
      // Clean up WebSocket subscriber set for this session to prevent memory leak
      if (fieldSessionSubscribers.has(id)) {
        fieldSessionSubscribers.delete(id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get field session with all related data
  app.get("/api/field-sessions/:id/full", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const session = await storage.getFieldEventSessionWithDetails(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FIELD HEIGHTS =====
  // ===============================
  // FIELD HEIGHTS ROUTES
  // ===============================

  // Get heights for a session
  app.get("/api/field-sessions/:sessionId/heights", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const heights = await storage.getFieldHeights(sessionId);
      res.json(heights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a single height
  app.post("/api/field-sessions/:sessionId/heights", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const validated = insertFieldHeightSchema.parse({ ...req.body, sessionId });
      const height = await storage.createFieldHeight(validated);
      res.status(201).json(height);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk replace all heights for a session
  app.put("/api/field-sessions/:sessionId/heights", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const { heights } = req.body;
      if (!Array.isArray(heights)) {
        return res.status(400).json({ error: "heights must be an array" });
      }
      const validated = heights.map((h: any, index: number) => 
        insertFieldHeightSchema.parse({ ...h, sessionId, heightIndex: h.heightIndex ?? index })
      );
      const created = await storage.setFieldHeights(sessionId, validated);
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update a height
  app.patch("/api/field-heights/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid height ID" });
      }
      const validated = insertFieldHeightSchema.partial().parse(req.body);
      const height = await storage.updateFieldHeight(id, validated);
      if (!height) {
        return res.status(404).json({ error: "Height not found" });
      }
      res.json(height);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a height
  app.delete("/api/field-heights/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid height ID" });
      }
      await storage.deleteFieldHeight(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FIELD ATHLETES =====
  // ===============================
  // FIELD EVENT ATHLETES ROUTES
  // ===============================

  // Get athletes for a session
  app.get("/api/field-sessions/:sessionId/athletes", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const athletes = await storage.getFieldEventAthletes(sessionId);
      res.json(athletes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create field athlete
  app.post("/api/field-sessions/:sessionId/athletes", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const validated = insertFieldEventAthleteSchema.parse({ ...req.body, sessionId });
      const athlete = await storage.createFieldEventAthlete(validated);
      res.status(201).json(athlete);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update field athlete
  app.patch("/api/field-athletes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }
      const validated = insertFieldEventAthleteSchema.partial().parse(req.body);
      const athlete = await storage.updateFieldEventAthlete(id, validated);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      res.json(athlete);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete field athlete
  app.delete("/api/field-athletes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }
      await storage.deleteFieldEventAthlete(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Advance to next athlete in field event session (auto-advance after mark entry)
  app.post("/api/field-sessions/:sessionId/advance", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const { currentAthleteId } = req.body;
      
      // Get all athletes for this session
      const athletes = await storage.getFieldEventAthletes(sessionId);
      const activeAthletes = athletes
        .filter(a => a.checkInStatus === "checked_in" && a.competitionStatus !== "completed")
        .sort((a, b) => {
          if ((a.flightNumber || 1) !== (b.flightNumber || 1)) {
            return (a.flightNumber || 1) - (b.flightNumber || 1);
          }
          return a.orderInFlight - b.orderInFlight;
        });
      
      // Find current athlete index
      const currentIndex = activeAthletes.findIndex(a => a.id === currentAthleteId);
      
      // Determine next athlete (circular rotation)
      if (activeAthletes.length > 1 && currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % activeAthletes.length;
        const nextAthlete = activeAthletes[nextIndex];
        
        // Update current athlete status (no longer "up")
        if (currentAthleteId) {
          await storage.updateFieldEventAthlete(currentAthleteId, { competitionStatus: "active" });
        }
        
        // Set next athlete as "up"
        await storage.updateFieldEventAthlete(nextAthlete.id, { competitionStatus: "up" });
        
        // Broadcast field event update
        broadcastFieldEventUpdate(sessionId).catch(console.error);
        
        res.json({ success: true, nextAthleteId: nextAthlete.id });
      } else {
        res.json({ success: true, nextAthleteId: null });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check-in field athlete
  app.post("/api/field-athletes/:id/check-in", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }
      const { deviceName } = req.body || {};
      const athlete = await storage.checkInFieldAthlete(id);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      // Broadcast field event update
      broadcastFieldEventUpdate(athlete.sessionId, deviceName).catch(console.error);
      
      res.json(athlete);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scratch field athlete
  app.post("/api/field-athletes/:id/scratch", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }
      const { deviceName } = req.body || {};
      const athlete = await storage.scratchFieldAthlete(id);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      // Broadcast field event update
      broadcastFieldEventUpdate(athlete.sessionId, deviceName).catch(console.error);
      
      res.json(athlete);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Set opening height for vertical field events
  app.post("/api/field-athletes/:id/opening-height", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }
      
      const { heightIndex, deviceName } = req.body || {};
      if (typeof heightIndex !== 'number' || heightIndex < 0) {
        return res.status(400).json({ error: "Invalid heightIndex" });
      }
      
      // Get the athlete to find sessionId
      const existingAthlete = await storage.getFieldEventAthlete(id);
      if (!existingAthlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      
      const sessionId = existingAthlete.sessionId;
      
      // Update the athlete's startingHeightIndex
      const updatedAthlete = await storage.updateFieldEventAthlete(id, { 
        startingHeightIndex: heightIndex 
      });
      
      // If heightIndex > 0, create pass marks for all heights from 0 to heightIndex-1
      if (heightIndex > 0) {
        // Get existing marks to determine next attempt number
        const existingMarks = await storage.getFieldEventMarks(sessionId);
        const athleteMarks = existingMarks.filter(m => m.athleteId === id);
        let nextAttemptNumber = athleteMarks.length + 1;
        
        // Create 3 pass marks for each height from 0 to heightIndex-1
        for (let hi = 0; hi < heightIndex; hi++) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await storage.createFieldEventMark({
              sessionId,
              athleteId: id,
              markType: 'pass',
              heightIndex: hi,
              attemptNumber: nextAttemptNumber,
              attemptAtHeight: attempt,
            });
            nextAttemptNumber++;
          }
        }
      }
      
      // Broadcast field event update
      broadcastFieldEventUpdate(sessionId, deviceName).catch(console.error);
      
      res.json({ success: true, athlete: updatedAthlete });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate finals - mark top N athletes as finalists
  app.post("/api/field-sessions/:sessionId/generate-finals", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const { count } = req.body;
      if (!count || typeof count !== 'number' || count < 1) {
        return res.status(400).json({ error: "Invalid count - must be a positive number" });
      }
      
      // Get all athletes with their marks for this session
      const athletes = await storage.getFieldEventAthletes(sessionId);
      const marks = await storage.getFieldEventMarks(sessionId);
      
      // Calculate best mark for each athlete
      const athleteMarks = new Map<number, number>();
      for (const mark of marks) {
        if (mark.markType === 'mark' && mark.measurement !== null) {
          const current = athleteMarks.get(mark.athleteId) || 0;
          if (mark.measurement > current) {
            athleteMarks.set(mark.athleteId, mark.measurement);
          }
        }
      }
      
      // Filter to active athletes (not DNS/scratched) and sort by best mark (descending)
      const rankedAthletes = athletes
        .filter(a => a.checkInStatus === 'checked_in' && a.competitionStatus !== 'dns')
        .map(a => ({
          ...a,
          bestMark: athleteMarks.get(a.id) || 0
        }))
        .sort((a, b) => b.bestMark - a.bestMark);
      
      // Mark top N as finalists
      const finalists = rankedAthletes.slice(0, count);
      const finalistIds: number[] = [];
      
      // Reset all athletes to non-finalist first
      for (const athlete of athletes) {
        await storage.updateFieldEventAthlete(athlete.id, { 
          isFinalist: false, 
          finalsOrder: null 
        });
      }
      
      // Mark finalists with their order (reversed so last place goes first)
      for (let i = 0; i < finalists.length; i++) {
        const finalist = finalists[i];
        // Reverse order: best mark goes last
        const finalsOrder = finalists.length - i;
        await storage.updateFieldEventAthlete(finalist.id, { 
          isFinalist: true, 
          finalsOrder 
        });
        finalistIds.push(finalist.id);
      }
      
      // Update session to finals mode
      await storage.updateFieldEventSession(sessionId, {
        isInFinals: true,
      });
      
      // Broadcast field event update
      broadcastFieldEventUpdate(sessionId).catch(console.error);
      
      res.json({ 
        success: true, 
        finalistCount: finalists.length,
        finalistIds 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete finals - reset session and athletes back to prelims mode
  app.delete("/api/field-sessions/:sessionId/finals", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      const { deleteFinalsMarks } = req.body || {};
      
      // Get session info
      const session = await storage.getFieldEventSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get all athletes for this session
      const athletes = await storage.getFieldEventAthletes(sessionId);
      
      // Reset all athletes - clear finalist status
      for (const athlete of athletes) {
        await storage.updateFieldEventAthlete(athlete.id, { 
          isFinalist: false, 
          finalsOrder: null 
        });
      }
      
      // If requested, delete marks made during finals (attemptNumber > prelimAttempts)
      if (deleteFinalsMarks) {
        const prelimAttempts = session.prelimAttempts || 3;
        const marks = await storage.getFieldEventMarks(sessionId);
        for (const mark of marks) {
          if (mark.attemptNumber > prelimAttempts) {
            await storage.deleteFieldEventMark(mark.id);
          }
        }
      }
      
      // Update session to exit finals mode
      await storage.updateFieldEventSession(sessionId, {
        isInFinals: false,
      });
      
      // Broadcast field event update
      broadcastFieldEventUpdate(sessionId).catch(console.error);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FIELD MARKS =====
  // ===============================
  // FIELD EVENT MARKS ROUTES
  // ===============================

  // Get marks for a session
  app.get("/api/field-sessions/:sessionId/marks", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      const marks = await storage.getFieldEventMarks(sessionId);
      res.json(marks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get marks by athlete
  app.get("/api/field-athletes/:athleteId/marks", async (req, res) => {
    try {
      const athleteId = parseInt(req.params.athleteId);
      if (isNaN(athleteId)) {
        return res.status(400).json({ error: "Invalid athlete ID" });
      }
      const marks = await storage.getFieldEventMarksByAthlete(athleteId);
      res.json(marks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create field mark
  app.post("/api/field-marks", async (req, res) => {
    try {
      // Extract deviceName before validation (not part of mark schema)
      const { deviceName, ...markData } = req.body;
      const validated = insertFieldEventMarkSchema.parse(markData);
      const mark = await storage.createFieldEventMark(validated);
      
      // Handle vertical event progression (high_jump, pole_vault)
      const session = await storage.getFieldEventSession(mark.sessionId);
      if (session && isHeightEvent(session.eventType)) {
        const [allMarks, heights, athletes] = await Promise.all([
          storage.getFieldEventMarks(mark.sessionId),
          storage.getFieldHeights(mark.sessionId),
          storage.getFieldEventAthletes(mark.sessionId)
        ]);
        
        // Check if the athlete who just recorded a mark is now eliminated
        const athleteMarks = allMarks.filter(m => m.athleteId === mark.athleteId);
        const isEliminated = isEliminatedVertical(athleteMarks, heights);
        
        if (isEliminated) {
          // Update athlete's competition status to completed
          await storage.updateFieldEventAthlete(mark.athleteId, {
            competitionStatus: 'completed'
          });
        }
        
        // Check if bar should advance (all active athletes finished at current height)
        const currentHeightIndex = session.currentHeightIndex || 0;
        // Include all athletes who are NOT in a terminal state.
        // Athletes can have various active statuses ('competing', 'checked_in', 'waiting',
        // 'active', 'up') — exclude only terminal ones to avoid missing anyone.
        const terminalStatuses = new Set(['completed', 'dns', 'scratched', 'retired', 'checked_out']);
        const activeAthletes = athletes.filter(a => 
          a.checkInStatus === 'checked_in' && !terminalStatuses.has(a.competitionStatus || '')
        );
        
        // For bar advancement, we need to check if all active athletes have either:
        // 1. Cleared the current height, or
        // 2. Been eliminated (3 consecutive misses), or
        // 3. Passed the current height
        let allFinishedAtCurrentHeight = true;
        
        for (const athlete of activeAthletes) {
          // Re-check elimination status with latest data
          const athleteCurrentMarks = allMarks.filter(m => m.athleteId === athlete.id);
          const athleteEliminated = isEliminatedVertical(athleteCurrentMarks, heights);
          
          if (athleteEliminated) {
            continue; // Eliminated athletes are done at this height
          }
          
          // Check marks at current height
          const marksAtCurrentHeight = athleteCurrentMarks.filter(
            m => m.heightIndex === currentHeightIndex
          );
          
          if (marksAtCurrentHeight.length === 0) {
            // Athlete hasn't attempted yet at this height
            allFinishedAtCurrentHeight = false;
            break;
          }
          
          // Check if athlete cleared, passed, or has 3 misses at this height
          const hasCleared = marksAtCurrentHeight.some(m => m.markType === 'cleared');
          const hasPassed = marksAtCurrentHeight.some(m => m.markType === 'pass');
          const missCount = marksAtCurrentHeight.filter(m => m.markType === 'missed').length;
          
          if (!hasCleared && !hasPassed && missCount < 3) {
            // Athlete still has attempts remaining at this height
            allFinishedAtCurrentHeight = false;
            break;
          }
        }
        
        // Advance bar if all active athletes finished at current height
        if (allFinishedAtCurrentHeight && activeAthletes.length > 0) {
          const nextHeightIndex = currentHeightIndex + 1;
          const hasNextHeight = heights.some(h => h.heightIndex === nextHeightIndex);
          
          if (hasNextHeight) {
            await storage.updateFieldEventSession(mark.sessionId, {
              currentHeightIndex: nextHeightIndex,
              currentAttemptNumber: 1
            });
          }
        }
      }
      
      // Broadcast field event update and auto-export LFF
      broadcastFieldEventUpdate(mark.sessionId, deviceName).catch(console.error);
      autoExportLFF(mark.sessionId).catch(console.error);
      
      res.status(201).json(mark);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update field mark
  app.patch("/api/field-marks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid mark ID" });
      }
      // Extract deviceName before validation
      const { deviceName, ...updateData } = req.body;
      const validated = insertFieldEventMarkSchema.partial().parse(updateData);
      const mark = await storage.updateFieldEventMark(id, validated);
      if (!mark) {
        return res.status(404).json({ error: "Mark not found" });
      }
      
      // Broadcast field event update and auto-export LFF
      broadcastFieldEventUpdate(mark.sessionId, deviceName).catch(console.error);
      autoExportLFF(mark.sessionId).catch(console.error);
      
      res.json(mark);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete field mark
  app.delete("/api/field-marks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid mark ID" });
      }
      
      // Get mark to find session ID before deleting
      const existingMark = await storage.getFieldEventMark(id);
      const sessionId = existingMark?.sessionId;
      
      await storage.deleteFieldEventMark(id);
      
      // Broadcast field event update and auto-export LFF if we had a session ID
      if (sessionId) {
        broadcastFieldEventUpdate(sessionId).catch(console.error);
        autoExportLFF(sessionId).catch(console.error);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== FIELD LFF EXPORT =====
  // ===============================
  // LFF EXPORT ROUTES
  // ===============================

  // Export field session results as LFF file content
  app.get("/api/field-sessions/:id/lff", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      // Use getFieldEventSessionWithDetails to include athletes and marks
      const session = await storage.getFieldEventSessionWithDetails(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const measurementSystem = (req.query.units === 'english' ? 'English' : 'Metric') as 'Metric' | 'English';
      const content = generateLFFContent(session, measurementSystem);
      
      // Use evtEventNumber for EVT sessions, fall back to eventId or session id
      const eventNum = session.evtEventNumber || session.eventId || session.id;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${eventNum}-1-01.lff"`);
      res.send(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export field session results to a file on disk
  app.post("/api/field-sessions/:id/export-lff", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      // Use getFieldEventSessionWithDetails to include athletes and marks
      const session = await storage.getFieldEventSessionWithDetails(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const outputDir = req.body.outputDir || './exports/lff';
      const measurementSystem = (req.body.units === 'english' ? 'English' : 'Metric') as 'Metric' | 'English';
      
      const filePath = await exportSessionToLFF(session, {
        outputDir,
        measurementSystem
      });
      
      res.json({ success: true, filePath });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
