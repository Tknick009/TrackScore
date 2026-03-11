import type { Express } from "express";
import { storage } from "../storage";
import {
  insertCompositeLayoutSchema,
  insertLayoutZoneSchema,
  updateLayoutZoneSchema,
  insertLayoutSceneSchema,
  insertLayoutObjectSchema,
} from "@shared/schema";
import type { RouteContext } from "../route-context";
import { insertRecordSchema, insertMeetScoringProfileSchema } from "@shared/schema";
import { z } from 'zod';

export function registerLayoutsScenesRoutes(app: Express, ctx: RouteContext) {
  const { fileStorage, upload, seedDefaultScenes, prefetchSceneData, broadcastToDisplays } = ctx;

  // ===== COMPOSITE LAYOUTS =====
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

  // ===== LAYOUT ZONES =====
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

  // ===== LAYOUT TEMPLATES =====
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


  // ===== LAYOUT SCENES =====
  // ===== LAYOUT SCENES API ROUTES =====

  // Get all scenes (optional ?meetId= filter)
  app.get('/api/layout-scenes', async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      const scenes = await storage.getLayoutScenes(meetId);
      res.json(scenes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single scene with all objects
  app.get('/api/layout-scenes/:id', async (req, res) => {
    try {
      const scene = await storage.getLayoutScene(parseInt(req.params.id));
      if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      res.json(scene);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new scene
  app.post('/api/layout-scenes', async (req, res) => {
    try {
      const parsed = insertLayoutSceneSchema.parse(req.body);
      const scene = await storage.createLayoutScene(parsed);
      res.status(201).json(scene);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid scene data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update scene (with objects)
  app.patch('/api/layout-scenes/:id', async (req, res) => {
    try {
      const sceneId = parseInt(req.params.id);
      const { objects, ...sceneData } = req.body;
      
      // Update scene metadata
      const parsed = insertLayoutSceneSchema.partial().parse(sceneData);
      const scene = await storage.updateLayoutScene(sceneId, parsed);
      if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      
      // If objects array is provided, replace all objects
      if (Array.isArray(objects)) {
        // Delete existing objects for this scene
        const existingObjects = await storage.getLayoutObjects(sceneId);
        for (const obj of existingObjects) {
          await storage.deleteLayoutObject(obj.id);
        }
        
        // Create new objects
        for (const obj of objects) {
          await storage.createLayoutObject({ ...obj, sceneId });
        }
      }
      
      // Return updated scene with objects
      const updatedScene = await storage.getLayoutScene(sceneId);
      
      // Broadcast scene update to all connected displays for real-time updates
      broadcastToDisplays({
        type: 'scene_update',
        data: { sceneId, scene: updatedScene }
      });
      
      res.json(updatedScene);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid scene data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Delete scene
  app.delete('/api/layout-scenes/:id', async (req, res) => {
    try {
      const success = await storage.deleteLayoutScene(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== LAYOUT OBJECTS API ROUTES =====

  // Get all objects in a scene (via query parameter)
  app.get('/api/layout-objects', async (req, res) => {
    try {
      const sceneIdParam = req.query.sceneId;
      if (!sceneIdParam) {
        return res.json([]);
      }
      const sceneId = parseInt(sceneIdParam as string);
      if (isNaN(sceneId)) {
        return res.status(400).json({ error: 'Invalid sceneId' });
      }
      const objects = await storage.getLayoutObjects(sceneId);
      res.json(objects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all objects in a scene (via path parameter)
  app.get('/api/layout-scenes/:sceneId/objects', async (req, res) => {
    try {
      const objects = await storage.getLayoutObjects(parseInt(req.params.sceneId));
      res.json(objects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single object
  app.get('/api/layout-objects/:id', async (req, res) => {
    try {
      const object = await storage.getLayoutObject(parseInt(req.params.id));
      if (!object) {
        return res.status(404).json({ error: 'Object not found' });
      }
      res.json(object);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new object in scene
  app.post('/api/layout-scenes/:sceneId/objects', async (req, res) => {
    try {
      const sceneId = parseInt(req.params.sceneId);
      const parsed = insertLayoutObjectSchema.parse({ ...req.body, sceneId });
      const object = await storage.createLayoutObject(parsed);
      res.status(201).json(object);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid object data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update object
  app.patch('/api/layout-objects/:id', async (req, res) => {
    try {
      const parsed = insertLayoutObjectSchema.partial().parse(req.body);
      const object = await storage.updateLayoutObject(parseInt(req.params.id), parsed);
      if (!object) {
        return res.status(404).json({ error: 'Object not found' });
      }
      
      // Broadcast object update to all connected displays for real-time updates
      broadcastToDisplays({
        type: 'scene_update',
        data: { sceneId: object.sceneId, objectId: object.id }
      });
      
      res.json(object);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid object data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Delete object
  app.delete('/api/layout-objects/:id', async (req, res) => {
    try {
      const success = await storage.deleteLayoutObject(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: 'Object not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reorder objects in a scene
  app.post('/api/layout-scenes/:sceneId/objects/reorder', async (req, res) => {
    try {
      const sceneId = parseInt(req.params.sceneId);
      const { objectIds } = req.body;
      
      if (!Array.isArray(objectIds) || !objectIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ error: 'objectIds must be an array of numbers' });
      }
      
      const objects = await storage.reorderObjects(sceneId, objectIds);
      res.json(objects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Batch update objects positions (for alignment/distribute operations)
  app.post('/api/layout-objects/batch-update', async (req, res) => {
    try {
      const { updates } = req.body as { updates: Array<{ id: number; data: { x?: number; y?: number; width?: number; height?: number } }> };
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'updates must be a non-empty array' });
      }
      
      // Validate each update
      for (const update of updates) {
        if (typeof update.id !== 'number' || !update.data) {
          return res.status(400).json({ error: 'Each update must have id (number) and data' });
        }
      }
      
      // Process all updates and track results
      const results: Array<{ id: number; success: boolean; object?: any; error?: string }> = [];
      
      for (const { id, data } of updates) {
        try {
          const parsed = insertLayoutObjectSchema.partial().parse(data);
          const object = await storage.updateLayoutObject(id, parsed);
          if (object) {
            results.push({ id, success: true, object });
          } else {
            results.push({ id, success: false, error: 'Object not found' });
          }
        } catch (err: any) {
          results.push({ id, success: false, error: err.message || 'Update failed' });
        }
      }
      
      // Check if any updates failed
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        return res.status(207).json({
          message: `${failures.length} of ${updates.length} updates failed`,
          results,
          failedIds: failures.map(f => f.id),
        });
      }
      
      res.json({ success: true, results });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid object data', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Scene Template Mappings - assign custom scenes to display types and modes
  app.get('/api/scene-template-mappings/:meetId', async (req, res) => {
    try {
      const mappings = await storage.getSceneTemplateMappings(req.params.meetId);
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/scene-template-mappings/:meetId/:displayType/:displayMode', async (req, res) => {
    try {
      const { meetId, displayType, displayMode } = req.params;
      const mapping = await storage.getSceneTemplateMappingByTypeAndMode(meetId, displayType, displayMode);
      if (!mapping) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
      res.json(mapping);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/scene-template-mappings', async (req, res) => {
    try {
      const { meetId, displayType, displayMode, sceneId } = req.body;
      
      if (!meetId || !displayType || !displayMode || !sceneId) {
        return res.status(400).json({ error: 'Missing required fields: meetId, displayType, displayMode, sceneId' });
      }
      
      const mapping = await storage.setSceneTemplateMapping({
        meetId,
        displayType,
        displayMode,
        sceneId: parseInt(sceneId),
      });
      
      // Broadcast mapping change to all displays so they update without refresh
      broadcastToDisplays({
        type: 'scene_mapping_changed',
        meetId,
        displayType,
        displayMode,
        sceneId: parseInt(sceneId),
      });
      
      res.json(mapping);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/scene-template-mappings/:id', async (req, res) => {
    try {
      const success = await storage.deleteSceneTemplateMapping(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // ===== SCENE EXPORT/IMPORT =====
  // ===== SCENE EXPORT/IMPORT =====
  
  // Export all scenes for a meet (or all scenes if no meetId provided)
  app.get('/api/scenes/export', async (req, res) => {
    try {
      const meetId = req.query.meetId as string | undefined;
      const scenes = await storage.getLayoutScenes(meetId);
      
      // Get objects for each scene
      const scenesWithObjects = await Promise.all(
        scenes.map(async (scene) => {
          const objects = await storage.getLayoutObjects(scene.id);
          return {
            ...scene,
            objects,
          };
        })
      );
      
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        meetId: meetId || null,
        scenes: scenesWithObjects,
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="scenes-export-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Import scenes from JSON
  app.post('/api/scenes/import', async (req, res) => {
    try {
      const { scenes, targetMeetId, replaceExisting } = req.body;
      
      if (!scenes || !Array.isArray(scenes)) {
        return res.status(400).json({ error: 'Invalid import data: scenes array required' });
      }
      
      const importResults: Array<{ originalId: number; newId: number; name: string; objectCount: number }> = [];
      
      // If replaceExisting, delete existing scenes for this meet first
      if (replaceExisting && targetMeetId) {
        const existingScenes = await storage.getLayoutScenes(targetMeetId);
        for (const scene of existingScenes) {
          await storage.deleteLayoutScene(scene.id);
        }
      }
      
      for (const sceneData of scenes) {
        const { objects, id: originalId, ...sceneFields } = sceneData;
        
        // Create the scene with the target meet ID if provided
        const newScene = await storage.createLayoutScene({
          ...sceneFields,
          meetId: targetMeetId || sceneFields.meetId,
        });
        
        let objectCount = 0;
        
        // Create objects for this scene
        if (objects && Array.isArray(objects)) {
          for (const objData of objects) {
            const { id: _objId, sceneId: _sceneId, ...objectFields } = objData;
            await storage.createLayoutObject({
              ...objectFields,
              sceneId: newScene.id,
            });
            objectCount++;
          }
        }
        
        importResults.push({
          originalId,
          newId: newScene.id,
          name: newScene.name,
          objectCount,
        });
      }
      
      res.json({
        success: true,
        imported: importResults.length,
        scenes: importResults,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= RECORD BOOKS MANAGEMENT =============
  
  // Get all record books (including inactive) with their records
  app.get('/api/record-books', async (req, res) => {
    try {
      const includeInactive = req.query.all === 'true';
      const books = includeInactive 
        ? await storage.getAllRecordBooks()
        : await storage.getRecordBooks();
      
      // Fetch records for each book
      const booksWithRecords = [];
      for (const book of books) {
        const bookWithRecords = await storage.getRecordBook(book.id);
        if (bookWithRecords) {
          // Normalize gender in records for display
          const normalizedRecords = bookWithRecords.records.map(rec => ({
            ...rec,
            gender: rec.gender === 'male' ? 'M' : rec.gender === 'female' ? 'W' : rec.gender,
          }));
          booksWithRecords.push({ ...bookWithRecords, records: normalizedRecords });
        }
      }
      
      res.json(booksWithRecords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a record book (name, scope, active status)
  app.patch('/api/record-books/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, scope, isActive, displayOrder } = req.body;
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (scope !== undefined) {
        const validScopes = ['facility', 'meet', 'national', 'international', 'custom'];
        if (!validScopes.includes(scope)) {
          return res.status(400).json({ error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` });
        }
        updates.scope = scope;
      }
      if (isActive !== undefined) updates.isActive = isActive;
      if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
      
      const updated = await storage.updateRecordBook(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Record book not found' });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a record book and all its records
  app.delete('/api/record-books/:id', async (req, res) => {
    try {
      await storage.deleteRecordBook(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all active records with book info (for schedule display)
  app.get('/api/records/all', async (req, res) => {
    try {
      const books = await storage.getRecordBooks(); // only active books
      const allRecords: Array<{
        id: number;
        eventType: string;
        gender: string;
        performance: string;
        athleteName: string;
        team: string | null;
        date: Date | null;
        bookName: string;
        bookScope: string;
        bookDisplayOrder: number;
      }> = [];

      for (const book of books) {
        const bookWithRecords = await storage.getRecordBook(book.id);
        if (bookWithRecords) {
          for (const rec of bookWithRecords.records) {
            // Normalize gender to short codes (M/F) to match events table
            // Events table stores 'M'/'F', records may have 'male'/'female'/'M'/'F'/'W'
            const normalizedGender = rec.gender === 'male' ? 'M' : rec.gender === 'female' ? 'F' : rec.gender === 'W' ? 'F' : rec.gender;
            allRecords.push({
              id: rec.id,
              eventType: rec.eventType,
              gender: normalizedGender,
              performance: rec.performance,
              athleteName: rec.athleteName,
              team: rec.team,
              date: rec.date,
              bookName: book.name,
              bookScope: book.scope,
              bookDisplayOrder: (book as any).displayOrder ?? 99,
            });
          }
        }
      }

      res.json(allRecords);
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

  // Get records for a specific event type and gender (for display pipeline)
  // IMPORTANT: This route MUST be registered before /api/records/:id to avoid
  // Express matching "by-event" as the :id parameter
  app.get('/api/records/by-event', async (req, res) => {
    try {
      const { eventType, gender } = req.query;
      if (!eventType) {
        return res.status(400).json({ error: 'eventType parameter is required' });
      }
      const recs = await storage.getRecordsByEvent(
        eventType as string,
        (gender as string) || 'male'
      );
      
      // Enrich with record book names
      const bookIds = [...new Set(recs.map(r => r.recordBookId))];
      const books = await Promise.all(bookIds.map(id => storage.getRecordBook(id)));
      const bookMap = new Map(books.filter(Boolean).map(b => [b!.id, b!]));
      
      const enriched = recs.map(r => ({
        ...r,
        bookName: bookMap.get(r.recordBookId)?.name || 'Unknown',
        bookScope: bookMap.get(r.recordBookId)?.scope || 'custom',
      }));
      
      res.json(enriched);
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

  // ARCHIVED: Team scoring calculation feature (MDB team score import still active)

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

  app.get('/api/meets/:meetId/scoring/standings', async (req, res) => {
    try {
      const meetId = req.params.meetId;
      const gender = req.query.gender as string | undefined;
      const division = req.query.division as string | undefined;

      const scope: { gender?: string; division?: string } = {};
      if (gender && gender !== 'all') scope.gender = gender;
      if (division && division !== 'all') scope.division = division;

      const standings = await storage.getTeamStandings(meetId, Object.keys(scope).length > 0 ? scope : undefined);

      res.json(standings);
    } catch (error: any) {
      console.error('[standings] Error computing team standings:', error);
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

  // Get event points breakdown
  app.get('/api/events/:eventId/points', async (req, res) => {
    try {
      const breakdown = await storage.getEventPoints(req.params.eventId);
      res.json(breakdown);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ARCHIVED: Record books feature (second set)

  // ARCHIVED: Sponsor system

}
