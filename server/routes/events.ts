import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  insertEventSchema,
  insertEntrySchema,
  insertAthleteSchema,
  insertEventSplitConfigSchema,
  insertEntrySplitSchema,
  insertWindReadingSchema,
  insertFieldAttemptSchema,
  insertJudgeTokenSchema,
  type EntrySplit,
  type FieldAttempt,
} from "@shared/schema";
import { generateEventCSV } from "../export-utils";
import type { RouteContext } from "../route-context";

const checkInSchema = z.object({
  operator: z.string().min(1),
  method: z.string().default('manual')
});

const bulkCheckInSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
  operator: z.string().min(1),
  method: z.string().default('bulk')
});

export function registerEventsRoutes(app: Express, ctx: RouteContext) {
  const { broadcastToDisplays, broadcastCurrentEvent, broadcastFieldEventUpdate } = ctx;

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

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const existing = await storage.getEvent(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Event not found" });
      }
      const allowedFields = ['name', 'advanceByPlace', 'advanceByTime', 'hytekStatus', 'isScored', 'status', 'numRounds', 'numLanes'];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const event = await storage.updateEvent(req.params.id, updates);
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

  // ARCHIVED: Judge token system

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

}
