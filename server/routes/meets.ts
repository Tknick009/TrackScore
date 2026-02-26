import type { Express } from "express";
import { z } from "zod";
import * as fs from "fs";
import { unlink } from "fs/promises";
import { storage } from "../storage";
import {
  insertMeetSchema,
  insertSeasonSchema,
} from "@shared/schema";
import { APP_VERSION, VERSION_DATE, RELEASE_NOTES } from "@shared/version";
import { generateMeetCSV } from "../export-utils";
import { importCompleteMDB } from "../import-mdb-complete";
import type { RouteContext } from "../route-context";

export function registerMeetsRoutes(app: Express, ctx: RouteContext) {
  const { broadcastCurrentEvent, seedDefaultScenes, upload, imageUpload, fileStorage } = ctx;

  // ===== VERSION / EDGE CONFIG / CLOUD SYNC / MEET PACKAGES =====
  // ===== VERSION API =====
  // Version endpoint for Edge Mode update checking
  app.get("/api/version", (req, res) => {
    res.json({
      version: APP_VERSION,
      date: VERSION_DATE,
      releaseNotes: RELEASE_NOTES,
      edgeMode: process.env.EDGE_MODE === 'true',
    });
  });

  // Edge config endpoint - returns cloud URL for update checking
  app.get("/api/edge-config", (req, res) => {
    try {
      const configPath = './data/edge-config.json';
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        res.json({ cloudUrl: config.cloudUrl || '', edgeId: config.edgeId || '' });
      } else {
        res.json({ cloudUrl: '', edgeId: '' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/edge-config", (req, res) => {
    try {
      const { cloudUrl } = req.body;
      const configPath = './data/edge-config.json';
      const dataDir = './data';
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      let config: any = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      
      config.cloudUrl = cloudUrl || '';
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      res.json({ success: true, cloudUrl: config.cloudUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CLOUD SYNC API =====
  // Preview a meet from cloud before downloading
  app.post("/api/cloud-sync/preview", async (req, res) => {
    try {
      const { cloudSyncPreviewSchema, CloudSyncError } = await import('../cloud-sync');
      
      // Validate request body
      const validation = cloudSyncPreviewSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessages = validation.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        return res.status(400).json({ 
          error: `Invalid request: ${errorMessages}`,
          details: validation.error.errors
        });
      }
      
      const { cloudUrl, meetCode } = validation.data;
      const { previewCloudMeet } = await import('../cloud-sync');
      
      try {
        const result = await previewCloudMeet(cloudUrl, meetCode);
        res.json(result);
      } catch (error: any) {
        // Handle CloudSyncError with proper status codes
        if (error instanceof CloudSyncError) {
          const statusCode = error.statusCode || 500;
          return res.status(statusCode).json({ 
            error: error.message,
            ...(error.details && { details: error.details })
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('[Cloud Sync Preview Error]', error);
      res.status(500).json({ error: 'Internal server error while previewing meet' });
    }
  });

  // Download a meet from cloud
  app.post("/api/cloud-sync/download", async (req, res) => {
    try {
      const { cloudSyncDownloadSchema, CloudSyncError } = await import('../cloud-sync');
      
      // Validate request body
      const validation = cloudSyncDownloadSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessages = validation.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        return res.status(400).json({ 
          error: `Invalid request: ${errorMessages}`,
          details: validation.error.errors
        });
      }
      
      const { cloudUrl, meetCode } = validation.data;
      const { syncFromCloud } = await import('../cloud-sync');
      
      try {
        const result = await syncFromCloud(cloudUrl, meetCode);
        
        if (result.success) {
          res.json(result);
        } else {
          // Check if this is a user error (4xx) or server error (5xx)
          // Based on the error message, determine appropriate status code
          const error = result.error || '';
          let statusCode = 500;
          
          if (error.includes('not found') || error.includes('Meet with code')) {
            statusCode = 404;
          } else if (error.includes('Invalid') || error.includes('Failed to connect')) {
            statusCode = 400;
          }
          
          res.status(statusCode).json({ error: result.error });
        }
      } catch (error: any) {
        // Handle CloudSyncError with proper status codes
        if (error instanceof CloudSyncError) {
          const statusCode = error.statusCode || 500;
          return res.status(statusCode).json({ 
            error: error.message,
            ...(error.details && { details: error.details })
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('[Cloud Sync Download Error]', error);
      res.status(500).json({ error: 'Internal server error while syncing meet' });
    }
  });

  // ===== MEET PACKAGE API (Dropbox sync) =====
  
  // List available meet packages
  app.get("/api/meet-packages", async (req, res) => {
    try {
      const { listMeetPackages } = await import('../meet-package');
      const packages = await listMeetPackages();
      res.json(packages);
    } catch (error: any) {
      console.error('[Meet Packages List Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Export a meet to a package
  app.post("/api/meet-packages/export/:meetId", async (req, res) => {
    try {
      const { exportMeetPackage } = await import('../meet-package');
      const result = await exportMeetPackage(req.params.meetId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      console.error('[Meet Package Export Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import a meet from a package
  app.post("/api/meet-packages/import/:packageName", async (req, res) => {
    try {
      const { importMeetPackage } = await import('../meet-package');
      const result = await importMeetPackage(req.params.packageName);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      console.error('[Meet Package Import Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a meet package
  app.delete("/api/meet-packages/:packageName", async (req, res) => {
    try {
      const { deleteMeetPackage } = await import('../meet-package');
      const result = await deleteMeetPackage(req.params.packageName);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      console.error('[Meet Package Delete Error]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== MEETS CRUD =====
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

  // Lookup meet by code - used for "Join Meet" functionality
  // This must come BEFORE /api/meets/:id to avoid "code" being matched as an ID
  app.get("/api/meets/code/:code", async (req, res) => {
    try {
      const meetCode = req.params.code.toUpperCase();
      const meet = await storage.getMeetByCode(meetCode);
      if (!meet) {
        return res.status(404).json({ message: "No meet found with that code. Please check the code and try again." });
      }
      res.json(meet);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      
      // Seed default scenes for new meet
      await seedDefaultScenes(meet.id);
      
      await broadcastCurrentEvent();
      res.json(meet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/meets/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().optional(),
        location: z.string().optional(),
        startDate: z.coerce.date().optional(),
        autoRefresh: z.boolean().optional(),
        refreshInterval: z.number().min(5).max(300).optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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

  // Seed default scenes for an existing meet (useful for meets created before default scenes were added)
  app.post("/api/meets/:id/seed-default-scenes", async (req, res) => {
    try {
      const meetId = req.params.id;
      const meet = await storage.getMeet(meetId);
      
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      // Check if meet already has scenes
      const existingScenes = await storage.getLayoutScenes(meetId);
      if (existingScenes.length > 0) {
        return res.status(400).json({ 
          error: "Meet already has scenes", 
          sceneCount: existingScenes.length,
          message: "Delete existing scenes first if you want to re-seed defaults"
        });
      }
      
      const seededCount = await seedDefaultScenes(meetId);
      res.json({ 
        success: true, 
        message: `Seeded ${seededCount} default scenes for meet`,
        seededCount 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload meet logo
  app.post("/api/meets/:id/logo", imageUpload.single("logo"), async (req, res) => {
    try {
      const meetId = req.params.id;
      const meet = await storage.getMeet(meetId);
      
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No logo file uploaded" });
      }
      
      const result = await fileStorage.saveMeetLogo(
        req.file.buffer,
        meetId,
        req.file.originalname
      );
      
      const logoUrl = fileStorage.publicUrlForKey(result.storageKey);
      
      // Extract color scheme from logo
      const colorScheme = await fileStorage.extractColorsFromImage(req.file.buffer);
      console.log(`Extracted color scheme from logo:`, colorScheme);
      
      // Update meet with logo URL and extracted color scheme
      const updatedMeet = await storage.updateMeet(meetId, { 
        logoUrl,
        ...colorScheme 
      });
      
      res.json({ 
        success: true, 
        logoUrl,
        colorScheme,
        meet: updatedMeet
      });
    } catch (error: any) {
      console.error("Error uploading meet logo:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete meet logo
  app.delete("/api/meets/:id/logo", async (req, res) => {
    try {
      const meetId = req.params.id;
      const meet = await storage.getMeet(meetId);
      
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      
      // Clear logo URL from meet
      const updatedMeet = await storage.updateMeet(meetId, { logoUrl: null });
      
      res.json({ 
        success: true,
        meet: updatedMeet
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.post("/api/meets/:id/reset", async (req, res) => {
    try {
      const meet = await storage.getMeet(req.params.id);
      if (!meet) {
        return res.status(404).json({ error: "Meet not found" });
      }
      const result = await storage.resetMeet(req.params.id);
      await broadcastCurrentEvent();
      res.json({ 
        success: true, 
        message: `Reset meet: deleted ${result.eventsDeleted} events, ${result.athletesDeleted} athletes, ${result.teamsDeleted} teams, ${result.divisionsDeleted} divisions`,
        ...result 
      });
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

      // Clear existing import data before re-importing
      const clearStats = await storage.clearMeetImportData(meetId);
      console.log(`🧹 Pre-import clear: ${JSON.stringify(clearStats)}`);

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
}
