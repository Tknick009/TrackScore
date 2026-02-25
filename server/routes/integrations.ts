import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { storage } from "../storage";
import {
  isHeightEvent,
  insertRecordBookSchema,
  insertRecordSchema,
  insertMeetScoringProfileSchema,
  insertSponsorSchema,
  insertSponsorAssignmentSchema,
  insertSponsorRotationProfileSchema,
  insertCombinedEventSchema,
  insertCombinedEventComponentSchema,
  insertWeatherConfigSchema,
  type WSMessage,
  type SelectSponsor,
  type MeetLiveState,
  type TrackDisplayMode,
  type FieldDisplayMode,
  type LynxPortType,
} from "@shared/schema";
import { ingestLIFResults } from "../finishlynx-ingestion";
import { startWeatherPolling, stopWeatherPolling } from "../weather-poller";
import {
  calculateHorizontalStandings,
  calculateVerticalStandings,
} from "../field-standings";
import { lynxListener } from "../lynx-listener";
import {
  startTrackHeatWatcher,
  stopTrackHeatWatcher,
  getTotalHeatsFromCache,
  getTotalHeatsFromAnyWatcher,
  getAllHeatCountsForMeet,
  getActiveTrackHeatWatchers,
  setHeatCountBroadcastCallback,
  type HeatCountData,
} from "../track-heat-watcher";
import {
  startHytekMdbWatcher,
  stopHytekMdbWatcher,
  getActiveHytekMdbWatchers,
  loadHytekMdbConfigs,
  saveHytekMdbConfigs,
  triggerManualImport,
  setHytekImportCallback,
} from "../hytek-mdb-watcher";
import { externalScoreboardService, buildFieldScoreboardPayload } from "../external-scoreboard-service";
import { captureManager, type CaptureChunk } from "../capture-manager";
import { mergeFlightsForEvent, type MergedFieldStandings } from '../parsers/lff-parser';
import { getResulTVParser } from '../parsers/resultv-parser';
import { importCompleteMDB } from '../import-mdb-complete';
import { insertExternalScoreboardSchema } from '@shared/schema';
import type { RouteContext } from "../route-context";

export function registerIntegrationsRoutes(app: Express, ctx: RouteContext) {
  const {
    broadcastToDisplays, broadcastCurrentEvent, broadcastFieldEventUpdate,
    sendToDisplayDevice, getActiveMeetId, connectedDisplayDevices,
    getConnectedDevicesForMeet, prefetchSceneData, getDisplayModeFromTemplate,
    abbreviateEventName, upload, fileStorage, displayClients,
  } = ctx;

  // ===== SCORING / RECORDS / MEDALS =====
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


  // ===== COMBINED EVENTS =====
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
    const { SCORING_TABLES, COMBINED_EVENT_DEFINITIONS } = await import('../combined-events-scoring');
    res.json({ scoringTables: SCORING_TABLES, eventDefinitions: COMBINED_EVENT_DEFINITIONS });
  });
  
  // Calculate points for a single performance
  app.post("/api/combined-events/calculate-points", async (req, res) => {
    try {
      const { eventType, performance, gender } = req.body;
      const { calculateEventPoints, normalizeEventType } = await import('../combined-events-scoring');
      
      const normalizedEvent = normalizeEventType(eventType);
      const points = calculateEventPoints(normalizedEvent, performance, gender);
      
      res.json({ eventType: normalizedEvent, performance, gender, points });
    } catch (error) {
      console.error("Failed to calculate points:", error);
      res.status(500).json({ error: "Failed to calculate points" });
    }
  });


  // ===== SOCIAL MEDIA =====
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
      
      const { generateEventResultCaption } = await import('../social-media-captions');
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
      const { generateMedalCountCaption } = await import('../social-media-captions');
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
      
      const { generateMeetHighlightCaption } = await import('../social-media-captions');
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


  // ===== FINISHLYNX =====
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


  // ===== RTV IMPORT =====
  // ===== RTV FILE IMPORT =====

  // Configure multer for RTV binary uploads (memory storage for buffer access)
  const rtvUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB limit for RTV files
    },
    fileFilter: (req, file, cb) => {
      const ext = file.originalname.toLowerCase();
      if (ext.endsWith('.rtv') || ext.endsWith('.bin') || file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only .rtv files are allowed.'));
      }
    },
  });

  // Import RTV file and parse text objects
  app.post("/api/import-rtv", rtvUpload.single("rtv"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { parseRtvFile } = await import('../rtv-parser');
      const result = parseRtvFile(req.file.buffer);

      if (!result.success && result.objects.length === 0) {
        return res.status(400).json({
          error: "Failed to parse RTV file",
          warnings: result.warnings,
        });
      }

      res.json({
        success: result.success,
        objects: result.objects,
        warnings: result.warnings,
        fileVersion: result.fileVersion,
        fileName: req.file.originalname,
      });
    } catch (error: any) {
      console.error("RTV import error:", error);
      res.status(500).json({ error: "Failed to process RTV file", details: error.message });
    }
  });


  // ===== WEATHER =====
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


  // ===== LAP COUNTER =====
  // ===== LAP COUNTER =====
  let currentLap = 0;
  let currentLapMode: "lap" | "logo" = "lap";
  let currentLapMeetId: string | undefined = undefined;

  app.get("/api/lap-counter", (_req, res) => {
    res.json({ lap: currentLap, mode: currentLapMode, meetId: currentLapMeetId });
  });

  app.post("/api/lap-counter", (req, res) => {
    const { lap, mode, meetId } = req.body;
    if (meetId) currentLapMeetId = meetId;
    if (mode === "logo") {
      currentLapMode = "logo";
      broadcastToDisplays({ type: "lap_counter_update", lap: currentLap, mode: "logo", meetId: currentLapMeetId });
      return res.json({ lap: currentLap, mode: currentLapMode, meetId: currentLapMeetId });
    }
    const parsed = Number(lap);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 25) {
      return res.status(400).json({ error: "Lap must be an integer 0-25" });
    }
    currentLap = parsed;
    currentLapMode = "lap";
    broadcastToDisplays({ type: "lap_counter_update", lap: currentLap, mode: "lap", meetId: currentLapMeetId });
    res.json({ lap: currentLap, mode: currentLapMode, meetId: currentLapMeetId });
  });

  // ===== LYNX DATA INGEST =====
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

  // Entry accumulator: FinishLynx sends entries one-by-one, we accumulate them
  // Entry accumulators - separate for big board and small board
  // Reset on layout-command "Start List", then accumulate entries as they arrive
  // Display reads entries[0] for Line 1, entries[1] for Line 2, etc.
  const createEmptyAccumulator = () => ({
    entries: [] as any[],
    eventNumber: 0,
    heat: 1,
    eventName: '',
    distance: '',
    lastLayoutCommand: '',
  });
  const entryAccumulator = createEmptyAccumulator(); // Standard/small board
  const entryAccumulatorBig = createEmptyAccumulator(); // Big board

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
      await lynxListener.stop();
      
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
      await lynxListener.stop();
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
      
      await lynxListener.stop();
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
      await lynxListener.stop();
      lynxListener.start();
      res.json({ success: true, status: lynxListener.getStatus() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Receive forwarded Lynx data from remote TCP forwarders (legacy JSON format)
  // This endpoint allows FinishLynx/FieldLynx data to be sent via HTTP
  // when direct TCP connection isn't possible (e.g., different networks)
  app.post("/api/lynx/forward", async (req, res) => {
    try {
      const { data, portType, portName } = req.body;
      
      if (!data || typeof data !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid data' });
      }
      
      const validPortTypes = ['clock', 'results', 'field', 'start_list'];
      if (!portType || !validPortTypes.includes(portType)) {
        return res.status(400).json({ error: 'Invalid portType. Must be one of: clock, results, field, start_list' });
      }
      
      // Process the forwarded data through the Lynx listener
      lynxListener.processForwardedData(data, portType as LynxPortType, portName || 'HTTP Forward');
      
      res.json({ success: true, processed: data.length });
    } catch (error: any) {
      console.error('[Lynx Forward] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic buffer for incoming field data - stores last 50 messages
  const fieldDataDiagnostics: Array<{
    timestamp: string;
    portType: string;
    rawText: string;
    rawHex: string;
    parsedFields: Record<string, string>;
  }> = [];
  const MAX_DIAGNOSTICS = 50;

  // Track which field port data is coming from (for port-based routing)
  // This allows displays to subscribe to specific field ports
  let currentFieldPort: number | null = null;
  
  // Valid field ports: 4560-4569 (10 field event slots)
  const FIELD_PORT_MIN = 4560;
  const FIELD_PORT_MAX = 4569;

  // Field Port State Tracking for Auto-Standings
  // Tracks event info and last update time per port to trigger automatic standings after idle
  interface FieldPortState {
    eventNumber: number;
    roundNumber: number;
    lastUpdateTime: number;  // Timestamp of last data received
    inStandingsMode: boolean;  // Whether we've switched to standings display
    standingsPageTimer?: ReturnType<typeof setTimeout>;  // Timer for page cycling (setTimeout, not interval)
    currentPage: number;
    totalPages: number;
    standings?: MergedFieldStandings;  // Cached standings data
  }
  
  const fieldPortStates: Map<number, FieldPortState> = new Map();
  const STANDINGS_IDLE_TIMEOUT = 120 * 1000;  // 120 seconds before switching to standings
  
  // Check for idle field ports and trigger standings mode
  const checkFieldPortsForStandings = async () => {
    const now = Date.now();
    
    const entries = Array.from(fieldPortStates.entries());
    for (const [port, state] of entries) {
      // Skip if already in standings mode
      if (state.inStandingsMode) continue;
      
      // Check if idle timeout has passed
      if (now - state.lastUpdateTime >= STANDINGS_IDLE_TIMEOUT) {
        console.log(`[Field Auto-Standings] Port ${port} idle for 120s, switching to standings mode for event ${state.eventNumber}`);
        await triggerFieldStandingsMode(port, state);
      }
    }
  };
  
  // Check every 10 seconds for idle ports
  setInterval(checkFieldPortsForStandings, 10000);
  
  // Trigger standings mode for a port - find LFF files and start paging
  async function triggerFieldStandingsMode(port: number, state: FieldPortState) {
    try {
      // Get meet's ingestion settings to find the lynx directory
      // Use the first meet that has ingestion settings configured
      const meets = await storage.getMeets();
      if (meets.length === 0) {
        console.log(`[Field Auto-Standings] No meets found, cannot load standings`);
        return;
      }
      
      // Try to find a meet with ingestion settings configured
      let ingestionSettings = null;
      let activeMeet = null;
      for (const meet of meets) {
        const settings = await storage.getIngestionSettings(meet.id);
        if (settings?.lynxFilesDirectory) {
          ingestionSettings = settings;
          activeMeet = meet;
          break;
        }
      }
      
      if (!activeMeet) {
        // Mark as attempted so we don't spam every 10s — will retry when new data arrives
        state.inStandingsMode = true;
        return;
      }
      
      const ingestionSettingsResult = ingestionSettings;
      if (!ingestionSettings?.lynxFilesDirectory) {
        // Mark as attempted so we don't spam every 10s — will retry when new data arrives
        state.inStandingsMode = true;
        return;
      }
      
      // Merge all flights for this event from LFF files
      const standings = await mergeFlightsForEvent(
        ingestionSettings.lynxFilesDirectory,
        state.eventNumber,
        state.roundNumber
      );
      
      if (!standings || standings.athletes.length === 0) {
        // Mark as attempted so we don't spam — will retry when new data arrives
        state.inStandingsMode = true;
        return;
      }
      
      console.log(`[Field Auto-Standings] Found ${standings.athletes.length} athletes from ${standings.flights.length} flights for event ${state.eventNumber}`);
      
      // Update state
      state.inStandingsMode = true;
      state.standings = standings;
      state.currentPage = 0;
      
      // Broadcast first page and start paging timer
      broadcastFieldStandingsPage(port, state);
    } catch (error) {
      console.error(`[Field Auto-Standings] Error loading standings for port ${port}:`, error);
    }
  }
  
  // Broadcast a page of standings data
  function broadcastFieldStandingsPage(port: number, state: FieldPortState) {
    if (!state.standings) return;
    
    // Get page size from scene layout - will be provided by display
    // For now, use a default of 8 and displays will request based on their layout
    const pageSize = 8;  // This will be dynamically set by displays
    
    const athletes = state.standings.athletes.filter(a => !a.isDNS);  // Filter out DNS
    state.totalPages = Math.ceil(athletes.length / pageSize);
    
    if (state.totalPages === 0) {
      state.totalPages = 1;
    }
    
    // Get current page of athletes
    const startIdx = state.currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, athletes.length);
    const pageAthletes = athletes.slice(startIdx, endIdx);
    
    // Format entries with additional field data for templates
    const entriesWithDetails = pageAthletes.map((athlete, idx) => ({
      place: athlete.overallPlace.toString(),
      lane: (startIdx + idx + 1).toString(),
      name: `${athlete.firstName} ${athlete.lastName}`.trim(),
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      affiliation: athlete.team || '',
      team: athlete.team || '',
      bib: athlete.bibNumber.toString(),
      bestMark: athlete.bestMarkFormatted,
      mark: athlete.bestMarkFormatted,
      time: athlete.bestMarkFormatted,
      // Include attempts for field templates
      attempts: athlete.attempts,
      attemptMarks: athlete.attempts.map(a => {
        if (a.isFoul) return 'F';
        if (a.isPassed) return 'P';
        if (a.isCleared) return 'O';
        if (a.isMissed) return 'X';
        return a.mark !== null ? a.mark.toFixed(2) : '';
      }),
      // Include wind per attempt for horizontal events
      attemptWinds: athlete.attempts.map(a => a.wind !== null ? a.wind.toFixed(1) : ''),
      flightNumber: athlete.flightNumber,
    }));
    
    // Broadcast standings update to all field mode display devices
    const standingsMessage = {
      type: 'field_standings',
      data: {
        eventNumber: state.standings.eventNumber,
        eventName: state.standings.eventName,
        displayMode: 'field_standings',
        fieldPort: port,
        currentPage: state.currentPage + 1,
        totalPages: state.totalPages,
        pageSize,
        totalAthletes: athletes.length,
        isStandings: true,
        entries: entriesWithDetails,
        flights: state.standings.flights,
        isVerticalEvent: state.standings.isVerticalEvent,
        heights: state.standings.heights,
      }
    };
    
    // Send to all connected display devices that are in field mode and on this port
    connectedDisplayDevices.forEach((device) => {
      if (device.ws.readyState === WebSocket.OPEN) {
        // Send to all - let client filter by port
        device.ws.send(JSON.stringify(standingsMessage));
      }
    });
    
    // Also send to displayClients (non-device WebSocket connections)
    displayClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(standingsMessage));
      }
    });
    
    console.log(`[Field Auto-Standings] Broadcast page ${state.currentPage + 1}/${state.totalPages} for event ${state.standings.eventNumber} on port ${port}`);
    
    // Set up next page timer - recalculate each time for dynamic page sizes
    // Clear any existing timer first
    if (state.standingsPageTimer) {
      clearTimeout(state.standingsPageTimer);
      state.standingsPageTimer = undefined;
    }
    
    // Only continue paging if there are multiple pages
    if (state.totalPages > 1) {
      // Calculate display time: 1 second per line shown on this page
      const displayTimeMs = pageAthletes.length * 1000;
      
      state.standingsPageTimer = setTimeout(() => {
        state.currentPage = (state.currentPage + 1) % state.totalPages;
        broadcastFieldStandingsPage(port, state);
      }, displayTimeMs);
    }
  }
  
  // Exit standings mode and return to live display
  function exitFieldStandingsMode(port: number) {
    const state = fieldPortStates.get(port);
    if (!state) return;
    
    if (state.standingsPageTimer) {
      clearTimeout(state.standingsPageTimer);
      state.standingsPageTimer = undefined;
    }
    
    state.inStandingsMode = false;
    state.standings = undefined;
    state.currentPage = 0;
    state.totalPages = 0;
    
    console.log(`[Field Auto-Standings] Exited standings mode for port ${port}`);
  }
  
  // Update field port state when new data arrives
  function updateFieldPortState(port: number, eventNumber: number, roundNumber: number = 1) {
    const existing = fieldPortStates.get(port);
    
    // If we were in standings mode, exit it
    if (existing?.inStandingsMode) {
      exitFieldStandingsMode(port);
    }
    
    fieldPortStates.set(port, {
      eventNumber,
      roundNumber,
      lastUpdateTime: Date.now(),
      inStandingsMode: false,
      currentPage: 0,
      totalPages: 0,
    });
  }

  // NEW: Receive raw bytes from TCP forwarder (ResulTV/LSS binary format)
  // This is the new endpoint for the base64-encoded raw data
  app.post("/api/lynx/raw", async (req, res) => {
    try {
      const { data, encoding, portType, timestamp, fieldPort } = req.body;
      
      if (!data || typeof data !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid data' });
      }
      
      if (encoding !== 'base64') {
        return res.status(400).json({ error: 'Invalid encoding. Must be base64' });
      }
      
      const validPortTypes = ['clock', 'results', 'field'];
      if (!portType || !validPortTypes.includes(portType)) {
        return res.status(400).json({ error: 'Invalid portType. Must be one of: clock, results, field' });
      }
      
      // For field data, validate and store the field port for routing
      if (portType === 'field' && fieldPort) {
        const port = parseInt(fieldPort);
        if (port >= FIELD_PORT_MIN && port <= FIELD_PORT_MAX) {
          currentFieldPort = port;
          console.log(`[Lynx Raw] Field data from port ${port}`);
        } else {
          console.warn(`[Lynx Raw] Invalid field port ${fieldPort}, must be ${FIELD_PORT_MIN}-${FIELD_PORT_MAX}`);
        }
      }
      
      // Decode base64 to buffer
      const rawBytes = Buffer.from(data, 'base64');
      
      // Enhanced diagnostic logging for field data
      if (portType === 'field') {
        const rawText = rawBytes.toString('utf8');
        const rawHex = rawBytes.toString('hex');
        
        // Try to extract any key=value pairs from the data
        const parsedFields: Record<string, string> = {};
        const kvMatches = rawText.matchAll(/([A-Za-z_]+)\s*[=:]\s*([^;\r\n]+)/g);
        for (const match of kvMatches) {
          parsedFields[match[1]] = match[2].trim();
        }
        
        // Look for common device name patterns
        const devicePatterns = [
          /Device[Name]*\s*[=:]\s*([^;\r\n]+)/i,
          /Target[Device]*\s*[=:]\s*([^;\r\n]+)/i,
          /Scoreboard\s*[=:]\s*([^;\r\n]+)/i,
          /Display\s*[=:]\s*([^;\r\n]+)/i,
          /Board\s*[=:]\s*([^;\r\n]+)/i,
        ];
        
        for (const pattern of devicePatterns) {
          const match = rawText.match(pattern);
          if (match) {
            parsedFields['_DETECTED_DEVICE'] = match[1].trim();
            console.log(`[Field Diagnostic] DEVICE NAME DETECTED: "${match[1].trim()}"`);
          }
        }
        
        console.log(`[Field Diagnostic] ========== INCOMING FIELD DATA ==========`);
        console.log(`[Field Diagnostic] Raw text (first 500 chars): ${rawText.substring(0, 500)}`);
        console.log(`[Field Diagnostic] Parsed key-value pairs:`, parsedFields);
        console.log(`[Field Diagnostic] ===========================================`);
        
        // Store for retrieval via API
        fieldDataDiagnostics.push({
          timestamp: new Date().toISOString(),
          portType,
          rawText: rawText.substring(0, 2000), // Limit stored size
          rawHex: rawHex.substring(0, 500),
          parsedFields,
        });
        
        // Keep only last N entries
        while (fieldDataDiagnostics.length > MAX_DIAGNOSTICS) {
          fieldDataDiagnostics.shift();
        }
      }
      
      // Process through the ResulTV parser
      const parser = getResulTVParser();
      parser.processRawData(rawBytes, portType);
      
      res.json({ success: true, bytesProcessed: rawBytes.length });
    } catch (error: any) {
      console.error('[Lynx Raw] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic endpoint to view recent field data
  app.get("/api/field-diagnostics", async (req, res) => {
    res.json({
      count: fieldDataDiagnostics.length,
      messages: fieldDataDiagnostics,
      hint: "Look for 'Device', 'Target', 'Scoreboard', or 'Board' fields in parsedFields",
    });
  });

  // Clear diagnostics buffer
  app.delete("/api/field-diagnostics", async (req, res) => {
    fieldDataDiagnostics.length = 0;
    res.json({ success: true, message: "Diagnostics buffer cleared" });
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


  // ===== LYNX SAVED CONFIGS =====
  app.get("/api/lynx/saved-configs", async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      const configs = await storage.getLynxConfigs(meetId);
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // ===== INGESTION SETTINGS =====
  // ===============================
  // INGESTION SETTINGS ROUTES
  // ===============================

  // Get ingestion settings for a meet
  app.get("/api/meets/:meetId/ingestion-settings", async (req, res) => {
    try {
      const { meetId } = req.params;
      const settings = await storage.getIngestionSettings(meetId);
      res.json(settings || {
        meetId,
        lynxFilesDirectory: null,
        lynxFilesEnabled: false,
        hytekMdbPath: null,
        hytekMdbEnabled: false,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update ingestion settings for a meet
  app.patch("/api/meets/:meetId/ingestion-settings", async (req, res) => {
    try {
      const { meetId } = req.params;
      const settings = await storage.upsertIngestionSettings({
        meetId,
        ...req.body,
      });
      
      // Restart watchers if enabled
      const { ingestionManager } = await import('../ingestion-manager');
      if (settings.lynxFilesEnabled || settings.hytekMdbEnabled) {
        await ingestionManager.startWatchersForMeet(meetId);
      } else {
        await ingestionManager.stopWatchersForMeet(meetId);
      }
      
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get ingestion status for a meet
  app.get("/api/meets/:meetId/ingestion-status", async (req, res) => {
    try {
      const { meetId } = req.params;
      const { ingestionManager } = await import('../ingestion-manager');
      const status = await ingestionManager.getStatus(meetId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test Lynx files directory
  app.post("/api/meets/:meetId/ingestion-settings/test-lynx-directory", async (req, res) => {
    try {
      const { directory } = req.body;
      const { ingestionManager } = await import('../ingestion-manager');
      const result = await ingestionManager.testLynxDirectory(directory);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test HyTek MDB file path
  app.post("/api/meets/:meetId/ingestion-settings/test-mdb-path", async (req, res) => {
    try {
      const { path } = req.body;
      const { ingestionManager } = await import('../ingestion-manager');
      const result = await ingestionManager.testMdbPath(path);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start ingestion for a meet
  app.post("/api/meets/:meetId/ingestion-settings/start", async (req, res) => {
    try {
      const { meetId } = req.params;
      const { ingestionManager } = await import('../ingestion-manager');
      const result = await ingestionManager.startWatchersForMeet(meetId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stop ingestion for a meet
  app.post("/api/meets/:meetId/ingestion-settings/stop", async (req, res) => {
    try {
      const { meetId } = req.params;
      const { ingestionManager } = await import('../ingestion-manager');
      await ingestionManager.stopWatchersForMeet(meetId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get processed files for a meet
  app.get("/api/meets/:meetId/processed-files", async (req, res) => {
    try {
      const { meetId } = req.params;
      const files = await storage.getProcessedFiles(meetId);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clear processed files for a meet
  app.delete("/api/meets/:meetId/processed-files", async (req, res) => {
    try {
      const { meetId } = req.params;
      await storage.clearProcessedFiles(meetId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger immediate MDB import
  app.post("/api/meets/:meetId/ingestion-settings/import-mdb", async (req, res) => {
    try {
      const { meetId } = req.params;
      const settings = await storage.getIngestionSettings(meetId);
      
      if (!settings?.hytekMdbPath) {
        return res.status(400).json({ error: 'No MDB path configured' });
      }
      
      // Clear existing import data before re-importing
      const clearStats = await storage.clearMeetImportData(meetId);
      console.log(`🧹 Pre-import clear: ${JSON.stringify(clearStats)}`);
      
      const stats = await importCompleteMDB(settings.hytekMdbPath, meetId);
      
      await storage.updateIngestionSettings(meetId, {
        hytekMdbLastImportAt: new Date(),
      } as any);
      
      res.json({ success: true, stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get live meet state (aggregated)

  // ===== MEET LIVE =====
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

  // Track mode change handler - SIMPLIFIED: just pass through raw data from FinishLynx
  // Layout switching is now controlled by FinishLynx via layout-command events
  lynxListener.on('track-mode-change', async (eventNumber, mode, data) => {
    const isBigBoard = data.sourcePortType === 'results_big';
    console.log(`[Lynx] Track mode change: Event ${eventNumber} → ${mode} (${isBigBoard ? 'BIG BOARD' : 'standard'})`);
    liveState.trackMode = mode;
    liveState.currentEventNumber = eventNumber;
    liveState.isArmed = data.armed || false;
    
    try {
      // Auto-activate event when data arrives (set to in_progress if scheduled)
      const allMatchingEvents = await storage.getEventsByLynxEventNumber(eventNumber);

      // Get total heats from EVT watcher for the active meet
      const roundNum = data.round ? parseInt(String(data.round)) : 1;
      const activeMeetId = await getActiveMeetId();

      // Filter to active meet's events to avoid stale data from old meets
      const matchingEvents = activeMeetId 
        ? allMatchingEvents.filter(e => e.meetId === activeMeetId) 
        : allMatchingEvents;
      // Fallback to all events if no matches in active meet
      const effectiveEvents = matchingEvents.length > 0 ? matchingEvents : allMatchingEvents;

      for (const event of effectiveEvents) {
        if (event.status === 'scheduled') {
          await storage.updateEventStatus(event.id, 'in_progress');
          console.log(`[Lynx] Auto-activated event ${event.name} (${event.id}) to in_progress`);
          await broadcastCurrentEvent();
        }
      }

      let evtHeats: number | null = null;
      if (activeMeetId) {
        evtHeats = getTotalHeatsFromCache(activeMeetId, data.eventNumber, roundNum);
        console.log(`[Lynx Heat] eventNumber=${data.eventNumber}, round=${roundNum}, totalHeats=${evtHeats} (active meet: ${activeMeetId})`);
      } else {
        evtHeats = getTotalHeatsFromAnyWatcher(data.eventNumber, roundNum);
        console.log(`[Lynx Heat] eventNumber=${data.eventNumber}, round=${roundNum}, totalHeats=${evtHeats} (no active meet, searched all)`);
      }
      const totalHeats = evtHeats ?? 1;
      
      // Get round name and advancement formula from database if event exists
      // Use only events from the active meet to avoid stale advancement formulas from old meets
      let roundName = 'Finals';
      let totalRounds = 1;
      let advanceByPlace: number | null = null;
      let advanceByTime: number | null = null;
      let isMultiEvent: boolean = false;
      let eventType: string | null = null;
      let eventGender: string | null = null;
      
      if (effectiveEvents.length > 0) {
        const event = effectiveEvents[0];
        totalRounds = event.numRounds || 1;
        advanceByPlace = event.advanceByPlace ?? null;
        advanceByTime = event.advanceByTime ?? null;
        isMultiEvent = event.isMultiEvent ?? false;
        eventType = event.eventType ?? null;
        eventGender = event.gender ?? null;
        
        // Determine round name based on event configuration
        if (totalRounds === 1) {
          roundName = 'Finals';
        } else if (totalRounds === 2) {
          roundName = roundNum === 1 ? 'Prelims' : 'Finals';
        } else if (totalRounds === 3) {
          if (roundNum === 1) roundName = 'Prelims';
          else if (roundNum === 2) roundName = 'Semis';
          else roundName = 'Finals';
        } else if (totalRounds === 4) {
          if (roundNum === 1) roundName = 'Prelims';
          else if (roundNum === 2) roundName = 'Quarters';
          else if (roundNum === 3) roundName = 'Semis';
          else roundName = 'Finals';
        } else {
          if (roundNum === totalRounds) roundName = 'Finals';
          else if (roundNum === totalRounds - 1) roundName = 'Semis';
          else roundName = `Round ${roundNum}`;
        }
      }

      // Determine display mode for scene template mapping
      // Multi-events use 'multi_track' instead of 'track_results' to show points
      let displayMode = mode === 'results' ? 'track_results' : 
                        mode === 'running' ? 'running_time' : 
                        mode === 'start_list' ? 'start_list' : mode;
      if (isMultiEvent && mode === 'results') {
        displayMode = 'multi_track';
      }
      
      // Broadcast to different channels based on source port
      // Big board data goes to 'track_mode_change_big', regular goes to 'track_mode_change'
      const messageType = isBigBoard ? 'track_mode_change_big' : 'track_mode_change';
      broadcastToDisplays({
        type: messageType,
        data: {
          eventNumber,
          mode,
          displayMode, // Scene template mapping mode (multi_track for multi-events)
          totalHeats, // Include total heats for "Heat X of Y" display
          roundName, // Include round name for "Prelims", "Finals", etc.
          totalRounds, // Total rounds configured for event
          advanceByPlace, // For qualifier display (big Q)
          advanceByTime, // For qualifier display (little q)
          isMultiEvent, // For multi-event points display
          eventType, // For calculating multi-event points
          gender: eventGender, // For calculating multi-event points
          ...data, // Pass through all raw data from FinishLynx
        }
      } as any);
    } catch (error) {
      console.error('[Lynx] Error handling track mode change:', error);
    }
  });

  // Clock handler - NO SMART LOGIC, just pass through exactly what FinishLynx sends
  lynxListener.on('clock-update', (eventNumber, time, command) => {
    // Just broadcast the raw clock data to all displays
    broadcastToDisplays({
      type: 'clock_update',
      data: {
        eventNumber,
        time,
        command,
      }
    } as WSMessage);
  });

  // Layout command handler - FinishLynx tells us when to switch layouts
  // Uses ResulTV-style Command=LayoutDraw;Name=XXX; format
  // IMPORTANT: "Start List" command signals start of a new page - clear accumulated entries
  lynxListener.on('layout-command', (layoutName: string, sourcePortType?: string) => {
    const isBigBoard = sourcePortType === 'results_big';
    const acc = isBigBoard ? entryAccumulatorBig : entryAccumulator;
    console.log(`[Lynx] Layout command: ${layoutName} (${isBigBoard ? 'BIG BOARD' : 'standard'})`);
    
    // Clear accumulated entries ONLY on exact "Start List" command (page boundary)
    // FinishLynx sends "Command=LayoutDraw;Name=Start List;" before each page of entries
    // Don't clear on "Results" or other commands - that's a different display mode
    const normalizedLayout = layoutName.toLowerCase().trim();
    if (normalizedLayout === 'start list' || normalizedLayout === 'startlist') {
      console.log(`[Lynx] Clearing ${isBigBoard ? 'big board' : 'standard'} entry accumulator for new page (${acc.entries.length} entries cleared)`);
      acc.entries = [];
      acc.lastLayoutCommand = layoutName;
    }
    
    // Broadcast layout switch command - big board uses separate channel
    const messageType = isBigBoard ? 'layout_command_big' : 'layout_command';
    broadcastToDisplays({
      type: messageType,
      data: {
        layoutName,
      }
    } as any);
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
      
      // Update combined events if this is a component event
      const combinedEventsToUpdate = await storage.getCombinedEventsByLynxEventNumber(eventNumber);
      for (const ce of combinedEventsToUpdate) {
        await storage.updateCombinedEventTotals(ce.id);
        const standings = await storage.getCombinedEventStandings(ce.id);
        broadcastToDisplays({
          type: 'combined_event_update',
          meetId: ce.meetId,
          combinedEventId: ce.id,
          standings
        });
        console.log(`[Lynx] Updated combined event ${ce.id} standings after track result`);
      }
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
    
    // Update field port state to reset the standings timer
    // This will exit standings mode if active and reset the idle timer
    // Prefer sourcePort from TCP listener over currentFieldPort from HTTP
    const resolvedFieldPort = (data.sourcePort && data.sourcePort >= FIELD_PORT_MIN && data.sourcePort <= FIELD_PORT_MAX) ? data.sourcePort : currentFieldPort;
    if (resolvedFieldPort) {
      updateFieldPortState(resolvedFieldPort, eventNumber, data.round || 1);
    }
    
    liveState.activeFieldEvents.set(eventNumber, {
      mode,
      athleteName: data.athleteName,
      attemptNumber: data.attemptNumber,
      mark: data.mark,
    });
    
    let accumulatedResults = data.results || [];
    let isMultiEvent = false;
    let eventType: string | null = null;
    let eventGender: string | null = null;
    
    try {
      // Auto-activate event when data arrives (set to in_progress if scheduled)
      const allFieldMatchEvents = await storage.getEventsByLynxEventNumber(eventNumber);
      // Filter to active meet's events to avoid stale data from old meets
      const fieldActiveMeetId = await getActiveMeetId();
      const fieldMeetFiltered = fieldActiveMeetId 
        ? allFieldMatchEvents.filter(e => e.meetId === fieldActiveMeetId) 
        : allFieldMatchEvents;
      const fieldEffectiveEvents = fieldMeetFiltered.length > 0 ? fieldMeetFiltered : allFieldMatchEvents;
      
      for (const event of fieldEffectiveEvents) {
        if (event.status === 'scheduled') {
          await storage.updateEventStatus(event.id, 'in_progress');
          console.log(`[Lynx] Auto-activated field event ${event.name} (${event.id}) to in_progress`);
          await broadcastCurrentEvent();
        }
        // Get multi-event info from first matching event
        if (!eventType) {
          isMultiEvent = event.isMultiEvent ?? false;
          eventType = event.eventType ?? null;
          eventGender = event.gender ?? null;
        }
      }
      
      // Use exactly what FieldLynx sent — no merging with DB history.
      // Past attempts are irrelevant; the display shows only the current live state.
      accumulatedResults = data.results || [];
      
      await storage.upsertLiveEventData({
        eventNumber,
        eventType: 'field',
        mode,
        heat: 1,
        round: data.round || 1,
        flight: data.flight || 1,
        wind: data.wind,
        status: data.officialStatus,
        eventName: data.eventName,
        entries: accumulatedResults,
      });
    } catch (error) {
      console.error('[Lynx] Error storing field mode change:', error);
    }
    
    // Determine display mode for scene template mapping
    // Multi-events use 'multi_field' instead of 'field_results' to show points
    const displayMode = isMultiEvent ? 'multi_field' : 'field_results';
    
    // Get field port for routing: prefer sourcePort from TCP listener, fall back to currentFieldPort from HTTP
    const fieldPort = (data.sourcePort && data.sourcePort >= FIELD_PORT_MIN && data.sourcePort <= FIELD_PORT_MAX) ? data.sourcePort : currentFieldPort;
    
    // Broadcast field event update with accumulated results
    // Include fieldPort for port-based routing - displays can filter by port
    const fieldBroadcastData = {
      eventNumber,
      mode,
      displayMode, // Scene template mapping mode (multi_field for multi-events)
      eventName: data.eventName,
      flight: data.flight,
      wind: data.wind,
      results: accumulatedResults,
      isMultiEvent, // For multi-event points display
      eventType, // For calculating multi-event points
      gender: eventGender, // For calculating multi-event points
      fieldPort, // Port number for device routing (4560-4569)
    };
    
    // Send field data ONLY to displays configured for this exact port.
    // This is server-side filtering — no client-side state is involved,
    // so port changes take effect the moment the DB and in-memory map are updated.
    const fieldMsg = JSON.stringify({ type: `field_mode_change_${fieldPort}`, data: fieldBroadcastData });
    let fieldRecipients = 0;
    for (const [, dev] of connectedDisplayDevices) {
      if (dev.fieldPort === fieldPort && dev.ws.readyState === dev.ws.OPEN) {
        dev.ws.send(fieldMsg);
        fieldRecipients++;
      }
    }
    // Fallback: also send to legacy display clients that are NOT registered devices
    // (e.g. plain browser tabs that never sent register_display_device)
    // For these we still use the type-prefixed channel so clients can self-filter.
    const registeredWs = new Set([...connectedDisplayDevices.values()].map(d => d.ws));
    for (const client of displayClients) {
      if (!registeredWs.has(client) && client.readyState === client.OPEN) {
        client.send(fieldMsg);
      }
    }
    console.log(`[Lynx] Field data port ${fieldPort} → sent to ${fieldRecipients} registered device(s)`);
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
      
      // Update combined events if this is a component event
      const combinedEventsToUpdate = await storage.getCombinedEventsByLynxEventNumber(eventNumber);
      for (const ce of combinedEventsToUpdate) {
        await storage.updateCombinedEventTotals(ce.id);
        const standings = await storage.getCombinedEventStandings(ce.id);
        broadcastToDisplays({
          type: 'combined_event_update',
          meetId: ce.meetId,
          combinedEventId: ce.id,
          standings
        });
        console.log(`[Lynx] Updated combined event ${ce.id} standings after field result`);
      }
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
  
  // Start list handler - ACCUMULATES entries as they arrive one-by-one
  // Layout command "Start List" clears the accumulator, then entries fill in
  // Display reads entries[0] for Line 1, entries[1] for Line 2, etc.
  // IMPORTANT: FinishLynx sends entries in display order - DO NOT sort!
  lynxListener.on('start-list', async (eventNumber, heat, entries, metadata) => {
    // Field events emit a synthetic start-list so the server knows athletes are present,
    // but they must NOT broadcast a start_list message — that would briefly flip the
    // field display into track start_list mode and cause the PASS/FOUL flash.
    // Field displays get all their data from field_mode_change / field_mode_change_<port>.
    const isFieldSource = metadata?.sourcePortType === 'field';
    if (isFieldSource) return;

    const isBigBoard = metadata?.sourcePortType === 'results_big';
    const acc = isBigBoard ? entryAccumulatorBig : entryAccumulator;
    
    // Update accumulator metadata
    acc.eventNumber = eventNumber;
    acc.heat = heat;
    acc.eventName = metadata?.eventName || acc.eventName;
    acc.distance = metadata?.distance || acc.distance;
    
    // Accumulate new entries in arrival order (FinishLynx sends them in display order)
    // Skip empty entries (blank lane, bib, name)
    for (const entry of entries) {
      const hasContent = entry.lane || entry.bib || entry.name;
      if (hasContent) {
        acc.entries.push(entry);
      }
    }
    
    console.log(`[Lynx] Start list (${isBigBoard ? 'BIG BOARD' : 'standard'}): Event ${eventNumber}, Heat ${heat}, +${entries.length} entries, total: ${acc.entries.length}`);
    
    // Get total heats from EVT watcher for the active meet
    const roundNum = metadata?.round ? parseInt(String(metadata.round)) : 1;
    const activeMeetId = await getActiveMeetId();
    let evtHeats: number | null = null;
    if (activeMeetId) {
      evtHeats = getTotalHeatsFromCache(activeMeetId, eventNumber, roundNum);
      console.log(`[Lynx StartList Heat] eventNumber=${eventNumber}, round=${roundNum}, totalHeats=${evtHeats} (active meet: ${activeMeetId})`);
    } else {
      // Fallback to searching all watchers if no displays connected
      evtHeats = getTotalHeatsFromAnyWatcher(eventNumber, roundNum);
      console.log(`[Lynx StartList Heat] eventNumber=${eventNumber}, round=${roundNum}, totalHeats=${evtHeats} (no active meet, searched all)`);
    }
    const totalHeats = evtHeats ?? 1;
    
    // Get round name and advancement formula from database if event exists
    let roundName = 'Finals';
    let totalRounds = 1;
    let advanceByPlace: number | null = null;
    let advanceByTime: number | null = null;
    let isMultiEvent: boolean = false;
    let eventType: string | null = null;
    let eventGender: string | null = null;
    
    try {
      const allMatchEvents = await storage.getEventsByLynxEventNumber(eventNumber);
      // Filter to active meet's events to avoid stale advancement formulas from old meets
      const meetFilteredEvents = activeMeetId 
        ? allMatchEvents.filter(e => e.meetId === activeMeetId) 
        : allMatchEvents;
      const effectiveMatchEvents = meetFilteredEvents.length > 0 ? meetFilteredEvents : allMatchEvents;
      
      if (effectiveMatchEvents.length > 0) {
        const event = effectiveMatchEvents[0];
        totalRounds = event.numRounds || 1;
        advanceByPlace = event.advanceByPlace ?? null;
        advanceByTime = event.advanceByTime ?? null;
        isMultiEvent = event.isMultiEvent ?? false;
        eventType = event.eventType ?? null;
        eventGender = event.gender ?? null;
        
        // Determine round name based on event configuration
        if (totalRounds === 1) {
          roundName = 'Finals';
        } else if (totalRounds === 2) {
          roundName = roundNum === 1 ? 'Prelims' : 'Finals';
        } else if (totalRounds === 3) {
          if (roundNum === 1) roundName = 'Prelims';
          else if (roundNum === 2) roundName = 'Semis';
          else roundName = 'Finals';
        } else if (totalRounds === 4) {
          if (roundNum === 1) roundName = 'Prelims';
          else if (roundNum === 2) roundName = 'Quarters';
          else if (roundNum === 3) roundName = 'Semis';
          else roundName = 'Finals';
        } else {
          if (roundNum === totalRounds) roundName = 'Finals';
          else if (roundNum === totalRounds - 1) roundName = 'Semis';
          else roundName = `Round ${roundNum}`;
        }
      }
    } catch (error) {
      console.error('[Lynx] Error getting round info:', error);
    }
    
    // Broadcast entries in arrival order (FinishLynx controls display order)
    // Display maps by array position: Line 1 = entries[0], Line 2 = entries[1], etc.
    const messageType = isBigBoard ? 'start_list_big' : 'start_list';
    broadcastToDisplays({
      type: messageType,
      data: {
        eventNumber,
        heat,
        totalHeats, // Include total heats for "Heat X of Y" display
        roundName, // Include round name for "Prelims", "Finals", etc.
        totalRounds, // Total rounds configured for event
        advanceByPlace, // For qualifier display (big Q)
        advanceByTime, // For qualifier display (little q)
        isMultiEvent, // For multi-event points display
        eventType, // For calculating multi-event points
        gender: eventGender, // For calculating multi-event points
        entries: acc.entries, // Arrival order = display order
        eventName: acc.eventName,
        distance: acc.distance,
      }
    } as any);
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
        } else if (process.env.EDGE_MODE === 'true') {
          // In Edge Mode, auto-start with default ports for FinishLynx
          // Port 4554: Big Board (8+ lines), Port 4555: Small Board (P10/P6)
          const edgeDefaultConfig = [
            { port: 4554, portType: 'results_big' as LynxPortType, name: 'Big Board Results' },
            { port: 4555, portType: 'results' as LynxPortType, name: 'FinishLynx Results' },
            { port: 4556, portType: 'clock' as LynxPortType, name: 'FinishLynx Clock' },
            { port: 4557, portType: 'field' as LynxPortType, name: 'FieldLynx' },
            { port: 4560, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4560' },
            { port: 4561, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4561' },
            { port: 4562, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4562' },
            { port: 4563, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4563' },
            { port: 4564, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4564' },
            { port: 4565, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4565' },
            { port: 4566, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4566' },
            { port: 4567, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4567' },
            { port: 4568, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4568' },
            { port: 4569, portType: 'field' as LynxPortType, name: 'FieldLynx Port 4569' },
          ];
          lynxListener.configure(edgeDefaultConfig);
          lynxListener.start();
          console.log(`✅ Lynx listeners auto-started for Edge Mode on default ports`);
          edgeDefaultConfig.forEach(cfg => {
            console.log(`   - ${cfg.name}: port ${cfg.port} (${cfg.portType})`);
          });
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


  // ===== TRACK HEAT WATCHER =====
  // ===============================
  // TRACK HEAT WATCHER ROUTES
  // ===============================
  
  const TRACK_HEAT_CONFIG_FILE = './track-heat-config.json';
  
  interface TrackHeatConfig {
    meetId: string;
    evtFilePath: string;
  }
  
  function loadTrackHeatConfigs(): TrackHeatConfig[] {
    try {
      if (fs.existsSync(TRACK_HEAT_CONFIG_FILE)) {
        const content = fs.readFileSync(TRACK_HEAT_CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('[Track Heat Config] Error loading config:', err);
    }
    return [];
  }
  
  function saveTrackHeatConfigs(configs: TrackHeatConfig[]): void {
    fs.writeFileSync(TRACK_HEAT_CONFIG_FILE, JSON.stringify(configs, null, 2));
  }
  
  // Set up the broadcast callback for heat count updates
  setHeatCountBroadcastCallback((meetId: string, data: HeatCountData[]) => {
    broadcastToDisplays({
      type: 'heat_counts_update',
      meetId,
      heatCounts: data,
    } as any);
    console.log(`[Track Heat Watcher] Broadcast heat counts for meet ${meetId}:`, data);
  });
  
  // Initialize track heat watchers on startup
  (async () => {
    try {
      const configs = loadTrackHeatConfigs();
      for (const config of configs) {
        const result = startTrackHeatWatcher(config.meetId, config.evtFilePath);
        if (result.success) {
          console.log(`[Track Heat Watcher] Initialized watcher for meet ${config.meetId}`);
        }
      }
    } catch (err) {
      console.error('[Track Heat Watcher] Error initializing watchers:', err);
    }
  })();
  
  // Set up the broadcast callback for hytek mdb imports
  setHytekImportCallback((meetId: string) => {
    broadcastToDisplays({
      type: 'hytek_import_complete',
      meetId,
    } as any);
    console.log(`[HyTek MDB Watcher] Broadcast cache invalidation for meet ${meetId}`);
  });

  // Initialize hytek mdb watchers on startup
  (async () => {
    try {
      const hytekConfigs = loadHytekMdbConfigs();
      for (const config of hytekConfigs) {
        const result = startHytekMdbWatcher(config.meetId, config.mdbDirectory);
        if (result.success) {
          console.log(`[HyTek MDB Watcher] Initialized watcher for meet ${config.meetId}`);
        }
      }
    } catch (err) {
      console.error('[HyTek MDB Watcher] Error initializing watchers:', err);
    }
  })();
  
  // Get current track heat watcher config
  app.get("/api/track-heat-watcher", async (req, res) => {
    try {
      const configs = loadTrackHeatConfigs();
      const activeWatchers = getActiveTrackHeatWatchers();
      res.json({ configs, activeWatchers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get heat counts for a specific meet
  app.get("/api/track-heat-watcher/:meetId/heats", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      const heatCounts = getAllHeatCountsForMeet(meetId);
      res.json({ meetId, heatCounts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get specific heat count
  app.get("/api/track-heat-watcher/:meetId/heats/:eventNumber/:round", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      const eventNumber = parseInt(req.params.eventNumber);
      const round = parseInt(req.params.round) || 1;
      
      const totalHeats = getTotalHeatsFromCache(meetId, eventNumber, round);
      res.json({ meetId, eventNumber, round, totalHeats: totalHeats ?? null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Start/configure track heat watcher for a meet
  app.post("/api/track-heat-watcher", async (req, res) => {
    try {
      const { meetId, evtFilePath } = req.body;
      
      if (!meetId || typeof meetId !== 'string') {
        return res.status(400).json({ error: "meetId is required" });
      }
      
      if (!evtFilePath || typeof evtFilePath !== 'string') {
        return res.status(400).json({ error: "evtFilePath is required" });
      }
      
      // Start the watcher
      const result = startTrackHeatWatcher(meetId, evtFilePath);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Save to config
      const configs = loadTrackHeatConfigs();
      const existingIndex = configs.findIndex(c => c.meetId === meetId);
      if (existingIndex >= 0) {
        configs[existingIndex] = { meetId, evtFilePath };
      } else {
        configs.push({ meetId, evtFilePath });
      }
      saveTrackHeatConfigs(configs);
      
      // Return current heat counts
      const heatCounts = getAllHeatCountsForMeet(meetId);
      
      res.json({ 
        success: true, 
        meetId, 
        evtFilePath,
        heatCounts 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Stop track heat watcher for a meet
  app.delete("/api/track-heat-watcher/:meetId", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      
      stopTrackHeatWatcher(meetId);
      
      // Remove from config
      const configs = loadTrackHeatConfigs();
      const filtered = configs.filter(c => c.meetId !== meetId);
      saveTrackHeatConfigs(filtered);
      
      res.json({ success: true, meetId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // ===== HYTEK MDB WATCHER =====
  // ===============================
  // HYTEK MDB WATCHER ROUTES
  // ===============================
  
  // Get current hytek mdb watcher config and status
  app.get("/api/hytek-mdb-watcher", async (req, res) => {
    try {
      const configs = loadHytekMdbConfigs();
      const activeWatchers = getActiveHytekMdbWatchers();
      res.json({ configs, activeWatchers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Start/update hytek mdb watcher
  app.post("/api/hytek-mdb-watcher", async (req, res) => {
    try {
      const { meetId, mdbDirectory } = req.body;
      
      if (!meetId || typeof meetId !== 'string') {
        return res.status(400).json({ error: "meetId is required" });
      }
      
      if (!mdbDirectory || typeof mdbDirectory !== 'string') {
        return res.status(400).json({ error: "mdbDirectory is required" });
      }
      
      const result = startHytekMdbWatcher(meetId, mdbDirectory);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Save to config
      const configs = loadHytekMdbConfigs();
      const existingIndex = configs.findIndex(c => c.meetId === meetId);
      if (existingIndex >= 0) {
        configs[existingIndex] = { meetId, mdbDirectory };
      } else {
        configs.push({ meetId, mdbDirectory });
      }
      saveHytekMdbConfigs(configs);
      
      res.json({ success: true, meetId, mdbDirectory });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Trigger manual re-import
  app.post("/api/hytek-mdb-watcher/:meetId/reimport", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      const result = await triggerManualImport(meetId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Stop hytek mdb watcher
  app.delete("/api/hytek-mdb-watcher/:meetId", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      
      stopHytekMdbWatcher(meetId);
      
      // Remove from config
      const configs = loadHytekMdbConfigs();
      const filtered = configs.filter(c => c.meetId !== meetId);
      saveHytekMdbConfigs(filtered);
      
      res.json({ success: true, meetId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // ===== EXTERNAL SCOREBOARDS =====
  // ===============================
  // EXTERNAL SCOREBOARD ROUTES
  // ===============================

  // List all external scoreboards
  app.get("/api/external-scoreboards", async (req, res) => {
    try {
      const scoreboards = await storage.getExternalScoreboards();
      res.json(scoreboards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single external scoreboard
  app.get("/api/external-scoreboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scoreboard ID" });
      }
      const scoreboard = await storage.getExternalScoreboard(id);
      if (!scoreboard) {
        return res.status(404).json({ error: "Scoreboard not found" });
      }
      res.json(scoreboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create external scoreboard
  app.post("/api/external-scoreboards", async (req, res) => {
    try {
      const validated = insertExternalScoreboardSchema.parse(req.body);
      const scoreboard = await storage.createExternalScoreboard(validated);
      res.status(201).json(scoreboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update external scoreboard
  app.patch("/api/external-scoreboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scoreboard ID" });
      }
      const scoreboard = await storage.updateExternalScoreboard(id, req.body);
      if (!scoreboard) {
        return res.status(404).json({ error: "Scoreboard not found" });
      }
      res.json(scoreboard);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete external scoreboard
  app.delete("/api/external-scoreboards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scoreboard ID" });
      }
      const deleted = await storage.deleteExternalScoreboard(id);
      if (!deleted) {
        return res.status(404).json({ error: "Scoreboard not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start external scoreboard - initiates TCP connection
  app.post("/api/external-scoreboards/:id/start", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scoreboard ID" });
      }
      const success = await externalScoreboardService.startScoreboard(id);
      if (!success) {
        return res.status(404).json({ error: "Scoreboard not found" });
      }
      const scoreboard = await storage.getExternalScoreboard(id);
      res.json(scoreboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stop external scoreboard - closes TCP connection
  app.post("/api/external-scoreboards/:id/stop", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scoreboard ID" });
      }
      await externalScoreboardService.stopScoreboard(id);
      const scoreboard = await storage.getExternalScoreboard(id);
      if (!scoreboard) {
        return res.status(404).json({ error: "Scoreboard not found" });
      }
      res.json(scoreboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger immediate send to scoreboard
  app.post("/api/external-scoreboards/:id/send", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scoreboard ID" });
      }
      const scoreboard = await storage.getExternalScoreboard(id);
      if (!scoreboard) {
        return res.status(404).json({ error: "Scoreboard not found" });
      }
      if (scoreboard.sessionId) {
        await broadcastFieldEventUpdate(scoreboard.sessionId);
      }
      res.json({ success: true, message: "Send triggered" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CAPTURE =====
  // ============= RAW CAPTURE ROUTES =============
  app.post('/api/capture/start', (_req, res) => {
    const session = captureManager.start();
    res.json({ sessionId: session.id, startedAt: session.startedAt });
  });

  app.post('/api/capture/stop', (_req, res) => {
    captureManager.stop();
    res.json({ success: true });
  });

  app.get('/api/capture/status', (_req, res) => {
    const session = captureManager.getSession();
    res.json({
      active: captureManager.isActive(),
      sessionId: session?.id ?? null,
      startedAt: session?.startedAt ?? null,
      chunkCount: session?.chunks.length ?? 0,
    });
  });

  app.get('/api/capture/chunks', (_req, res) => {
    const session = captureManager.getSession();
    res.json(session?.chunks ?? []);
  });

  app.get('/api/capture/files', (_req, res) => {
    res.json(captureManager.listFiles());
  });

  app.get('/api/capture/files/:name', (req, res) => {
    const content = captureManager.readFile(req.params.name);
    if (!content) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  });

  // Wire capture live-stream into WebSocket broadcasts
  captureManager.onBroadcast((chunk: CaptureChunk) => {
    broadcastToDisplays({ type: 'raw_capture', data: chunk } as any);
  });
}
