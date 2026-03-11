import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  isHeightEvent,
  insertDisplayThemeSchema,
  insertBoardConfigSchema,
  insertDisplayLayoutSchema,
  insertLayoutCellSchema,
  overlayConfigSchema,
  type WSMessage,
} from "@shared/schema";
import { mergeFlightsForEvent, parseLFFFile, findLFFFilesForEvent } from "../parsers/lff-parser";
import { parseLIFFile, type NormalizedResult, type LIFEventHeader } from "../parsers/lif-parser";
import * as fs from 'fs';
import * as pathModule from 'path';
import {
  calculateHorizontalStandings,
  calculateVerticalStandings,
} from "../field-standings";
import type { RouteContext } from "../route-context";
import { getTotalHeatsFromCache } from '../track-heat-watcher';

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

export function registerDisplaysRoutes(app: Express, ctx: RouteContext) {
  const {
    broadcastToDisplays, broadcastCurrentEvent, sendToDisplayDevice, connectedDisplayDevices,
    prefetchSceneData, getDisplayModeFromTemplate, abbreviateEventName, fileStorage,
    enrichEntriesWithRecordTags,
  } = ctx;

  // ===== DISPLAY REGISTRATION =====
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

  // ===== DISPLAY DEVICES =====
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

  // Assign an event to a display device (only for field mode displays)
  app.patch("/api/display-devices/:id/assign-event", async (req, res) => {
    try {
      const { eventId } = req.body;
      
      // Get current device to check mode
      const existingDevice = await storage.getDisplayDevice(req.params.id);
      if (!existingDevice) {
        return res.status(404).json({ error: "Display device not found" });
      }
      
      // Only field mode displays can have events manually assigned
      if (existingDevice.displayMode === 'track') {
        return res.status(400).json({ 
          error: "Track displays cannot be manually assigned to events. They automatically show data from Lynx." 
        });
      }
      
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

  // Set display mode (track = auto from Lynx, field = manual assignment)
  app.patch("/api/display-devices/:id/mode", async (req, res) => {
    try {
      const { displayMode } = req.body;
      
      if (!displayMode || !['track', 'field'].includes(displayMode)) {
        return res.status(400).json({ error: "displayMode must be 'track' or 'field'" });
      }
      
      const device = await storage.updateDisplayDeviceMode(req.params.id, displayMode);
      
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }

      // Broadcast the mode change
      broadcastToDisplays({
        type: 'display_mode_change',
        data: {
          deviceId: device.id,
          deviceName: device.deviceName,
          displayMode: device.displayMode,
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

  // Send command to a display device (push template/content)
  app.post("/api/display-devices/:id/command", async (req, res) => {
    try {
      const { template, eventId } = req.body;
      const deviceId = req.params.id;
      
      // Get the device
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }
      
      // Validate template compatibility with device display type
      // Display type capabilities:
      // - P10 (192x96): 1 athlete max
      // - P6 (288x144): 1 athlete max  
      // - BigBoard (1920x1080): 8 athletes max
      const displayType = device.displayType || 'P10';
      const isSingleAthleteDisplay = displayType === 'P10' || displayType === 'P6';
      
      if (template && isSingleAthleteDisplay) {
        // Use the shared layout templates registry to validate compatibility
        const { getTemplateById } = await import('@shared/layout-templates');
        const templateInfo = getTemplateById(template);
        
        // Check if template exists in registry and has display type metadata
        if (templateInfo) {
          // Template found in registry - check if its displayType matches device
          if (templateInfo.displayType === 'BigBoard') {
            return res.status(400).json({ 
              error: `Template '${template}' is a BigBoard template and not compatible with ${displayType} displays. P10/P6 displays can only show one athlete at a time.`,
              suggestion: template.includes('field') 
                ? `${displayType.toLowerCase()}-field-results`
                : `${displayType.toLowerCase()}-results`,
              displayType: displayType,
              maxAthletes: 1
            });
          }
        } else {
          // Template not in registry - check by prefix/name patterns
          const templateLower = template.toLowerCase();
          
          // Explicitly incompatible: BigBoard templates and multi-athlete components
          const isExplicitlyIncompatible = 
            templateLower.startsWith('bigboard-') ||
            templateLower === 'bigboard' ||
            ['compiledresults', 'runningresults', 'fieldsidebyside'].includes(templateLower.replace(/-/g, ''));
          
          if (isExplicitlyIncompatible) {
            return res.status(400).json({ 
              error: `Template '${template}' is not compatible with ${displayType} displays. P10/P6 displays can only show one athlete at a time.`,
              suggestion: templateLower.includes('field') 
                ? `${displayType.toLowerCase()}-field-results`
                : `${displayType.toLowerCase()}-results`,
              displayType: displayType,
              maxAthletes: 1
            });
          }
        }
      }
      
      // Update the template in database
      if (template !== undefined) {
        await storage.updateDisplayTemplate(deviceId, template);
      }
      
      // If setting an event, update that too
      if (eventId !== undefined) {
        await storage.assignEventToDisplay(deviceId, eventId);
      }
      
      // Find the connected WebSocket for this device
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        // Look up custom scene mapping if template is provided
        let sceneId: number | null = null;
        let sceneData: { scene: any; objects: any[] } | null = null;
        let liveEventData: any = null;
        
        if (template && device.meetId) {
          const displayMode = getDisplayModeFromTemplate(template);
          if (displayMode) {
            try {
              const mapping = await storage.getSceneTemplateMappingByTypeAndMode(
                device.meetId,
                displayType,
                displayMode
              );
              if (mapping) {
                sceneId = mapping.sceneId;
                // Pre-fetch scene data for instant switching
                sceneData = await prefetchSceneData(sceneId);
                console.log(`[Manual Command] ${device.deviceName}: Using custom scene ${sceneId} for ${displayMode}`);
              }
            } catch (err) {
              console.error(`[Manual Command] Error looking up scene mapping:`, err);
            }
          }
          
          // Get latest live event data for modes that need it
          if (displayMode === 'start_list' || displayMode === 'running_time' || displayMode === 'track_results') {
            try {
              // Get the most recent live event data
              const liveData = await storage.getLiveEventsByMeet();
              if (liveData && liveData.length > 0) {
                // Use the most recent entry
                const latestLive = liveData[0];
                
                // Get total heats - first check EVT watcher cache, then fall back to database
                let totalHeats = 1;
                const allMatchingEvents = await storage.getEventsByLynxEventNumber(latestLive.eventNumber);
                // Filter to the device's meet to avoid pulling data from other meets
                const matchingEvents = device.meetId
                  ? allMatchingEvents.filter(e => e.meetId === device.meetId)
                  : allMatchingEvents;
                const effectiveEvents = matchingEvents.length > 0 ? matchingEvents : allMatchingEvents;
                if (effectiveEvents.length > 0) {
                  const event = effectiveEvents[0];
                  const roundNum = latestLive.round ? parseInt(String(latestLive.round)) : 1;
                  
                  // First try the EVT watcher cache
                  const cachedHeats = getTotalHeatsFromCache(event.meetId, latestLive.eventNumber, roundNum);
                  if (cachedHeats !== null) {
                    totalHeats = cachedHeats;
                  } else {
                    // Fall back to database calculation
                    const roundStr = latestLive.round ? String(latestLive.round).toLowerCase() : undefined;
                    totalHeats = await storage.getTotalHeatsForEvent(event.id, roundStr);
                  }
                }
                
                liveEventData = {
                  eventNumber: latestLive.eventNumber,
                  eventName: latestLive.eventName,
                  mode: latestLive.mode,
                  heat: latestLive.heat,
                  totalHeats, // Total heats from database for "Heat X of Y" display
                  round: latestLive.round,
                  entries: latestLive.entries,
                  wind: latestLive.wind,
                };
              }
            } catch (err) {
              console.error(`[Manual Command] Error getting live data:`, err);
            }
          }
        }
        
        // Send command to the display device
        connectedDevice.ws.send(JSON.stringify({
          type: 'display_command',
          template: sceneId ? null : template, // Use template only if no custom scene
          sceneId: sceneId, // Custom scene ID (if mapped)
          sceneData: sceneData, // Pre-fetched scene data for instant switching
          eventId,
          liveEventData,
          pagingSize: connectedDevice.pagingSize,
          pagingInterval: connectedDevice.pagingInterval,
        }));
        
        res.json({ success: true, delivered: true, sceneId });
      } else {
        // Device not connected, but command saved to database
        res.json({ success: true, delivered: false, message: "Device offline - command saved for when it reconnects" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remote refresh — send a reload command to a connected display device
  app.post("/api/display-devices/:id/refresh", async (req, res) => {
    try {
      const deviceId = req.params.id;

      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }

      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        connectedDevice.ws.send(JSON.stringify({ type: 'refresh' }));
        console.log(`[Remote Refresh] Sent refresh to ${device.deviceName}`);
        res.json({ success: true, delivered: true });
      } else {
        res.json({ success: true, delivered: false, message: "Device offline — refresh will apply when it reconnects" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle auto-mode for a display device
  app.post("/api/display-devices/:id/auto-mode", async (req, res) => {
    try {
      const { enabled } = req.body;
      const deviceId = req.params.id;
      
      // Persist to database
      const autoModeValue = enabled !== false;
      const updatedDevice = await storage.updateDisplayAutoMode(deviceId, autoModeValue);
      
      if (!updatedDevice) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      // Update in-memory state if device is connected
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice) {
        connectedDevice.autoMode = autoModeValue;
        
        // Notify the device of auto-mode status
        // Layout switching is now controlled by FinishLynx via layout-command events
        if (connectedDevice.ws.readyState === WebSocket.OPEN) {
          connectedDevice.ws.send(JSON.stringify({
            type: 'auto_mode_update',
            autoMode: connectedDevice.autoMode,
          }));
        }
      }
      
      console.log(`[Auto-Mode] ${updatedDevice.deviceName}: ${autoModeValue ? 'ENABLED' : 'DISABLED'}`);
      
      res.json({ success: true, autoMode: autoModeValue });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get auto-mode status for a display device
  app.get("/api/display-devices/:id/auto-mode", async (req, res) => {
    try {
      const deviceId = req.params.id;
      
      // Get persisted value from database
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      const isConnected = !!connectedDevice;
      
      res.json({ 
        connected: isConnected, 
        autoMode: device.autoMode ?? true // Default to true
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get paging settings for a display device
  app.get("/api/display-devices/:id/paging", async (req, res) => {
    try {
      const device = await storage.getDisplayDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json({ 
        pagingSize: device.pagingSize ?? 8,
        pagingInterval: device.pagingInterval ?? 5
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update paging settings for a display device
  app.patch("/api/display-devices/:id/paging", async (req, res) => {
    try {
      const { pagingSize, pagingInterval } = req.body;
      const deviceId = req.params.id;
      
      // Validate inputs
      const size = Math.max(1, Math.min(20, parseInt(pagingSize) || 8));
      const interval = Math.max(1, Math.min(60, parseInt(pagingInterval) || 5));
      
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      // Update paging settings in database
      const updated = await storage.updateDisplayDevice(deviceId, { 
        pagingSize: size, 
        pagingInterval: interval 
      });
      
      // Update the in-memory device record with new paging settings
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice) {
        connectedDevice.pagingSize = size;
        connectedDevice.pagingInterval = interval;
        
        // Notify the connected device of the new settings
        if (connectedDevice.ws.readyState === WebSocket.OPEN) {
          connectedDevice.ws.send(JSON.stringify({
            type: 'paging_settings',
            pagingSize: size,
            pagingInterval: interval,
          }));
        }
      }
      
      res.json({ success: true, pagingSize: size, pagingInterval: interval });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update display device config (fieldPort, isBigBoard, pagingSize, pagingInterval, displayType)
  app.patch("/api/display-devices/:id", async (req, res) => {
    try {
      const { fieldPort, isBigBoard, pagingSize, pagingInterval, displayType, displayWidth, displayHeight, displayScale } = req.body;
      const id = req.params.id;

      const device = await storage.getDisplayDevice(id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      const validDisplayTypes = ['P10', 'P6', 'BigBoard', 'Broadcast', 'Custom'];
      if (displayType) {
        if (!validDisplayTypes.includes(displayType)) {
          return res.status(400).json({ error: `Invalid display type. Must be one of: ${validDisplayTypes.join(', ')}` });
        }
        await storage.updateDisplayDeviceType(id, displayType, undefined, displayWidth, displayHeight);
      }

      const updates: Partial<{ pagingSize: number; pagingInterval: number; fieldPort: number | null; isBigBoard: boolean; displayScale: number }> = {};
      if (fieldPort !== undefined) updates.fieldPort = fieldPort;
      if (isBigBoard !== undefined) updates.isBigBoard = isBigBoard;
      if (pagingSize !== undefined) updates.pagingSize = Math.max(1, Math.min(20, parseInt(pagingSize) || 8));
      if (pagingInterval !== undefined) updates.pagingInterval = Math.max(1, Math.min(60, parseInt(pagingInterval) || 5));
      if (displayScale !== undefined) updates.displayScale = Math.max(1, Math.min(200, parseInt(displayScale) || 100));

      if (Object.keys(updates).length > 0) {
        await storage.updateDisplayDevice(id, updates);
      }

      const finalDevice = await storage.getDisplayDevice(id);

      // Update in-memory connected device record so server-side field broadcasts
      // are immediately filtered to the correct port — no client-side state race
      const connectedDevice = connectedDisplayDevices.get(id);
      if (connectedDevice && finalDevice) {
        connectedDevice.fieldPort = finalDevice.fieldPort ?? undefined;
        if (finalDevice.displayType) connectedDevice.displayType = finalDevice.displayType;
        if (finalDevice.pagingSize !== undefined) connectedDevice.pagingSize = finalDevice.pagingSize ?? 8;
        if (finalDevice.pagingInterval !== undefined) connectedDevice.pagingInterval = finalDevice.pagingInterval ?? 5;
      }

      // Push display scale update directly to the connected device for instant effect
      if (displayScale !== undefined && connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        connectedDevice.ws.send(JSON.stringify({
          type: 'update_display_scale',
          deviceId: id,
          displayScale: updates.displayScale ?? 100,
        }));
      }

      broadcastToDisplays({
        type: 'device_config_update',
        data: {
          deviceId: id,
          displayType: finalDevice?.displayType,
          fieldPort: finalDevice?.fieldPort,
          isBigBoard: finalDevice?.isBigBoard,
          pagingSize: finalDevice?.pagingSize,
          pagingInterval: finalDevice?.pagingInterval,
          displayMode: finalDevice?.displayMode,
          displayScale: finalDevice?.displayScale,
        }
      } as WSMessage);

      res.json(finalDevice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send Hytek Results to a display device (compiled results from database)
  app.post("/api/display-devices/:id/hytek-results", async (req, res) => {
    try {
      const { eventId, pagingLines, round } = req.body;
      const deviceId = req.params.id;
      
      if (!eventId) {
        return res.status(400).json({ error: "eventId is required" });
      }
      
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const allEntries = await storage.getEntriesByEvent(eventId);
      
      if (allEntries.length === 0) {
        return res.status(400).json({ error: "No entries found for this event", warning: true });
      }
      
      const selectedRound = round || 'final';
      
      const getRoundFields = (entry: any) => {
        switch (selectedRound) {
          case 'preliminary':
            return {
              mark: entry.preliminaryMark,
              place: entry.preliminaryPlace,
              heat: entry.preliminaryHeat,
              lane: entry.preliminaryLane,
            };
          case 'quarterfinal':
            return {
              mark: entry.quarterfinalMark,
              place: entry.quarterfinalPlace,
              heat: entry.quarterfinalHeat,
              lane: entry.quarterfinalLane,
            };
          case 'semifinal':
            return {
              mark: entry.semifinalMark,
              place: entry.semifinalPlace,
              heat: entry.semifinalHeat,
              lane: entry.semifinalLane,
            };
          case 'final':
          default:
            return {
              mark: entry.finalMark,
              place: entry.finalPlace,
              heat: entry.finalHeat,
              lane: entry.finalLane || entry.finalsLane,
            };
        }
      };
      
      const totalRounds = event.numRounds || 1;
      // Determine the correct round label:
      // - For multi-round events, label based on which round is selected
      // - For single-round events, it's always the "Final" (the only round IS the final)
      // - Auto-detect: if we're viewing final data and entries have finalMark/finalPlace, it's "Final"
      const roundLabel = selectedRound === 'preliminary' ? (totalRounds > 1 ? 'Prelims' : 'Final')
        : selectedRound === 'quarterfinal' ? 'Quarterfinals'
        : selectedRound === 'semifinal' ? 'Semis'
        : 'Final';
      
      const relevantEntries = allEntries.filter(entry => {
        const fields = getRoundFields(entry);
        return fields.heat != null || fields.lane != null || fields.mark != null || fields.place != null;
      });
      
      const entriesToShow = relevantEntries.length > 0 ? relevantEntries : allEntries;
      
      // Detect multi-event early for sorting (multi-events sort by points descending)
      const isMultiEventForSort = (event as any).isMultiEvent === true || /\b(decathlon|heptathlon|pentathlon)\b/i.test(event.name || '');
      
      const sortedEntries = entriesToShow.sort((a, b) => {
        const aFields = getRoundFields(a);
        const bFields = getRoundFields(b);
        // Sort by place first if available
        if (aFields.place && bFields.place) {
          return aFields.place - bFields.place;
        }
        if (aFields.place) return -1;
        if (bFields.place) return 1;
        // For multi-events, sort by mark (points) descending — higher is better
        if (isMultiEventForSort) {
          const aMark = typeof aFields.mark === 'number' ? aFields.mark : 0;
          const bMark = typeof bFields.mark === 'number' ? bFields.mark : 0;
          if (aMark !== bMark) return bMark - aMark; // descending
          return (a.seedMark || 0) - (b.seedMark || 0);
        }
        // For regular events, sort by heat then mark ascending
        const aHeat = aFields.heat || 0;
        const bHeat = bFields.heat || 0;
        if (aHeat !== bHeat) return aHeat - bHeat;
        const aMark = typeof aFields.mark === 'number' ? aFields.mark : 999;
        const bMark = typeof bFields.mark === 'number' ? bFields.mark : 999;
        if (aMark !== bMark) return aMark - bMark;
        if (aFields.lane && bFields.lane) {
          return aFields.lane - bFields.lane;
        }
        return (a.seedMark || 999) - (b.seedMark || 999);
      });
      
      const athleteIds = sortedEntries.map(e => e.athleteId).filter((id): id is string => !!id);
      const uniqueAthleteIds = [...new Set(athleteIds)];
      
      const athleteMap = new Map<string, any>();
      const teamMap = new Map<string, any>();
      
      if (uniqueAthleteIds.length > 0) {
        const athletes = await Promise.all(uniqueAthleteIds.map(id => storage.getAthlete(id)));
        athletes.forEach(a => { if (a) athleteMap.set(a.id, a); });
      }
      
      const teamIds = new Set<string>();
      sortedEntries.forEach(e => {
        if (e.teamId) teamIds.add(e.teamId);
      });
      athleteMap.forEach(a => {
        if (a.teamId) teamIds.add(a.teamId);
      });
      
      if (teamIds.size > 0) {
        const teams = await Promise.all([...teamIds].map(id => storage.getTeam(id)));
        teams.forEach(t => { if (t) teamMap.set(t.id, t); });
      }
      
      const ceilToPrecision = (val: number, precision: number): number => {
        const factor = Math.pow(10, precision);
        // Round UP to nearest hundredth (track & field rule: 8.315 → 8.32)
        return Math.ceil(val * factor - 1e-9) / factor;
      };
      const formatTimeSeconds = (seconds: number, precision: number = 2): string => {
        const rounded = ceilToPrecision(seconds, precision);
        if (rounded >= 3600) {
          const hours = Math.floor(rounded / 3600);
          const mins = Math.floor((rounded % 3600) / 60);
          const secs = ceilToPrecision(rounded % 60, precision).toFixed(precision);
          return `${hours}:${String(mins).padStart(2, '0')}:${secs.padStart(precision + 3, '0')}`;
        }
        if (rounded >= 60) {
          const mins = Math.floor(rounded / 60);
          const secs = ceilToPrecision(rounded % 60, precision).toFixed(precision);
          return `${mins}:${secs.padStart(precision + 3, '0')}`;
        }
        return rounded.toFixed(precision);
      };
      
      const isTrackEvent = event.eventType ? !['high_jump','pole_vault','long_jump','triple_jump','shot_put','discus','hammer','javelin','weight_throw'].some(ft => event.eventType!.toLowerCase().includes(ft.replace('_',''))) : true;
      
      // Detect multi-event (heptathlon, pentathlon, decathlon)
      // Multi-event marks are total points (integer), not times or distances
      const isMultiEvent = (event as any).isMultiEvent === true || /\b(decathlon|heptathlon|pentathlon)\b/i.test(event.name || '');
      
      // Detect relay events for proper name display
      const eventNameLower = (event.name || '').toLowerCase();
      const eventTypeLower = (event.eventType || '').toLowerCase();
      const isRelayEvent = eventNameLower.includes('relay') || eventNameLower.includes('medley') || eventTypeLower.startsWith('4x') || eventTypeLower.includes('relay') || /^\d+x\d+/.test(eventTypeLower);
      
      // Fetch wind readings for this event (track events only)
      let windReading: string | null = null;
      if (isTrackEvent) {
        try {
          const windReadings = await storage.getWindReadings(eventId);
          if (windReadings.length > 0) {
            // Use the most recent wind reading
            const latestWind = windReadings[windReadings.length - 1];
            if (latestWind.windSpeed !== null && latestWind.windSpeed !== undefined) {
              windReading = String(latestWind.windSpeed);
            }
          }
        } catch (err) {
          // Wind readings not available, continue without
        }
      }
      
      const isFinalRound = selectedRound === 'final';
      const isPrelimRound = !isFinalRound;
      
      // Determine per-round advancement values (Q/q qualifiers)
      // The advancement_json column stores per-round data: {"preliminary":{"place":N,"time":N},"quarterfinal":...,"semifinal":...}
      // Fall back to legacy advanceByPlace/advanceByTime columns (which only store prelims data)
      let eventAdvanceByPlace = 0;
      let eventAdvanceByTime = 0;
      if (!isFinalRound) {
        const advJsonStr = (event as any).advancementJson || (event as any).advancement_json;
        if (advJsonStr) {
          try {
            const advData = JSON.parse(advJsonStr);
            // Map selectedRound to advancement key
            const roundKey = selectedRound; // 'preliminary', 'quarterfinal', 'semifinal'
            if (advData[roundKey]) {
              eventAdvanceByPlace = advData[roundKey].place || 0;
              eventAdvanceByTime = advData[roundKey].time || 0;
            }
            console.log(`[Hytek Q/q] advancement_json parsed for round=${roundKey}: place=${eventAdvanceByPlace}, time=${eventAdvanceByTime}, raw=${advJsonStr}`);
          } catch (e) {
            console.log(`[Hytek Q/q] Failed to parse advancement_json: ${advJsonStr}`);
          }
        }
        // Fall back to legacy columns if JSON didn't provide values
        if (eventAdvanceByPlace === 0 && eventAdvanceByTime === 0) {
          eventAdvanceByPlace = (event as any).advanceByPlace || 0;
          eventAdvanceByTime = (event as any).advanceByTime || 0;
          console.log(`[Hytek Q/q] Using legacy advancement: advanceByPlace=${eventAdvanceByPlace}, advanceByTime=${eventAdvanceByTime}`);
        }
      }
      console.log(`[Hytek Q/q DEBUG] selectedRound=${selectedRound}, isFinalRound=${isFinalRound}, isPrelimRound=${isPrelimRound}, advanceByPlace=${eventAdvanceByPlace}, advanceByTime=${eventAdvanceByTime}, isTrackEvent=${isTrackEvent}, eventName=${event.name}`);
      
      // === Q/q QUALIFIER ASSIGNMENT (prelim rounds only, track events) ===
      // Big Q = top advanceByPlace finishers from EACH heat (by within-heat place)
      // little q = next fastest eventAdvanceByTime times across ALL heats (excluding Big Q)
      const qualifierPlaceSet = new Set<string>(); // Big Q
      const qualifierTimeSet = new Set<string>();  // little q
      
      if (isPrelimRound && isTrackEvent && (eventAdvanceByPlace > 0 || eventAdvanceByTime > 0)) {
        // Step 1: Group valid entries by heat
        const heatGroups = new Map<number, { entryId: string; place: number; mark: number }[]>();
        const statusCodesToSkip = new Set(['NH', 'NM', 'FOUL', 'DNS', 'DNF', 'DQ', 'SCR', 'FS', 'NT']);
        sortedEntries.forEach(entry => {
          const fields = getRoundFields(entry);
          const heat = fields.heat || 0;
          const place = fields.place || 0;
          const mark = fields.mark;
          if (typeof mark !== 'number' || mark <= 0) return;
          if (entry.isScratched || entry.isDisqualified) return;
          const dqCode = entry.notes ? String(entry.notes).trim().toUpperCase() : '';
          if (statusCodesToSkip.has(dqCode)) return;
          
          if (!heatGroups.has(heat)) heatGroups.set(heat, []);
          heatGroups.get(heat)!.push({ entryId: entry.id, place, mark });
        });
        
        // Step 2: Big Q — top advanceByPlace finishers from EACH heat (by within-heat place)
        if (eventAdvanceByPlace > 0) {
          heatGroups.forEach((entries) => {
            const sorted = [...entries].sort((a, b) => {
              if (a.place && b.place) return a.place - b.place;
              if (a.place) return -1;
              if (b.place) return 1;
              return a.mark - b.mark; // fallback: fastest time
            });
            sorted.slice(0, eventAdvanceByPlace).forEach(e => qualifierPlaceSet.add(e.entryId));
          });
        }
        
        // Step 3: little q — next fastest eventAdvanceByTime times across ALL heats (excluding Big Q)
        if (eventAdvanceByTime > 0) {
          const nonQEntries: { entryId: string; mark: number }[] = [];
          heatGroups.forEach(entries => {
            entries.forEach(e => {
              if (!qualifierPlaceSet.has(e.entryId)) {
                nonQEntries.push({ entryId: e.entryId, mark: e.mark });
              }
            });
          });
          nonQEntries.sort((a, b) => a.mark - b.mark);
          nonQEntries.slice(0, eventAdvanceByTime).forEach(e => qualifierTimeSet.add(e.entryId));
        }
        
        console.log(`[Hytek Q/q] advanceByPlace=${eventAdvanceByPlace}, advanceByTime=${eventAdvanceByTime}, heats=${heatGroups.size}, BigQ=${qualifierPlaceSet.size}, littleQ=${qualifierTimeSet.size}`);
      }
      
      // Filter out scratches and DNS before building display entries
      const displayEntries = sortedEntries.filter(entry => {
        const dqCode = entry.notes ? String(entry.notes).trim().toUpperCase() : '';
        return !entry.isScratched && dqCode !== 'SCR' && dqCode !== 'DNS';
      });
      
      // Enrich entries with PB/SB/MR/FR record tags before building display objects.
      // enrichEntriesWithRecordTags expects finalMark in ms (track) or mm (field),
      // but HyTek marks are already in seconds (track) or meters (field).
      // We temporarily multiply by 1000 so the enrichment division works correctly.
      try {
        for (const entry of displayEntries) {
          (entry as any)._origFinalMark = entry.finalMark;
          if (selectedRound !== 'final') {
            const fields = getRoundFields(entry);
            if (typeof fields.mark === 'number') {
              (entry as any).finalMark = fields.mark * 1000;
            } else {
              // No round-specific mark; convert existing finalMark to ms/mm
              if (typeof entry.finalMark === 'number') {
                (entry as any).finalMark = entry.finalMark * 1000;
              }
            }
          } else {
            // Final round: finalMark is in seconds/meters, convert to ms/mm
            if (typeof entry.finalMark === 'number') {
              (entry as any).finalMark = entry.finalMark * 1000;
            }
          }
        }
        console.log(`[Hytek Results] Enriching ${displayEntries.length} entries for record tags (eventType=${event.eventType}, gender=${event.gender})`);
        await enrichEntriesWithRecordTags(
          event.eventType || 'track',
          event.gender || '',
          displayEntries as any[]
        );
        // Log the record tags that were computed
        const taggedEntries = displayEntries.filter(e => ((e as any).recordTags || []).length > 0);
        if (taggedEntries.length > 0) {
          console.log(`[Hytek Results] Record tags found: ${taggedEntries.map(e => `${e.athleteId}: [${(e as any).recordTags.join(',')}]`).join(', ')}`);
        } else {
          console.log(`[Hytek Results] No record tags found for any entries`);
        }
      } catch (err) {
        console.warn('[Hytek Results] Failed to enrich with record tags:', err);
      } finally {
        // Always restore original finalMark values, even if enrichment throws
        for (const entry of displayEntries) {
          if ('_origFinalMark' in (entry as any)) {
            (entry as any).finalMark = (entry as any)._origFinalMark;
            delete (entry as any)._origFinalMark;
          }
        }
      }
      
      // For compiled prelim results, re-sort: Big Q by time, little q by time, rest by time, DQ/SCR at end
      if (isPrelimRound && isTrackEvent && (qualifierPlaceSet.size > 0 || qualifierTimeSet.size > 0)) {
        const compiledStatusCodes = new Set(['NH', 'NM', 'FOUL', 'DNS', 'DNF', 'DQ', 'SCR', 'FS', 'NT']);
        displayEntries.sort((a, b) => {
          const aFields = getRoundFields(a);
          const bFields = getRoundFields(b);
          
          // Status/DQ/SCR at the end
          const aDq = a.notes ? String(a.notes).trim().toUpperCase() : '';
          const bDq = b.notes ? String(b.notes).trim().toUpperCase() : '';
          const aIsStatus = a.isDisqualified || a.isScratched || compiledStatusCodes.has(aDq);
          const bIsStatus = b.isDisqualified || b.isScratched || compiledStatusCodes.has(bDq);
          if (aIsStatus !== bIsStatus) return aIsStatus ? 1 : -1;
          
          // Group: Q=0, q=1, none=2
          const aGroup = qualifierPlaceSet.has(a.id) ? 0 : qualifierTimeSet.has(a.id) ? 1 : 2;
          const bGroup = qualifierPlaceSet.has(b.id) ? 0 : qualifierTimeSet.has(b.id) ? 1 : 2;
          if (aGroup !== bGroup) return aGroup - bGroup;
          
          // Within group, sort by time ascending
          const aMark = typeof aFields.mark === 'number' ? aFields.mark : 999999;
          const bMark = typeof bFields.mark === 'number' ? bFields.mark : 999999;
          return aMark - bMark;
        });
      }
      
      const enrichedEntries = displayEntries.map((entry, index) => {
        const athlete = entry.athleteId ? athleteMap.get(entry.athleteId) : null;
        const teamId = entry.teamId || athlete?.teamId;
        const team = teamId ? teamMap.get(teamId) : null;
        const fields = getRoundFields(entry);
        // For compiled prelim results, use compiled position (1,2,3...) based on Q/q sort order
        // For finals or non-compiled results, use within-heat place or fallback to index
        const position = (isPrelimRound && isTrackEvent && (qualifierPlaceSet.size > 0 || qualifierTimeSet.size > 0))
          ? (index + 1)
          : (fields.place || (index + 1));
        
        const dqCode = entry.notes ? String(entry.notes).trim().toUpperCase() : null;
        const knownStatusCodes = ['NH', 'NM', 'FOUL', 'DNS', 'DNF', 'DQ', 'SCR', 'FS', 'NT'];
        const isKnownStatus = dqCode && knownStatusCodes.includes(dqCode);
        
        let markValue: string;
        if (isKnownStatus) {
          markValue = dqCode!;
        } else if (entry.isDisqualified && dqCode) {
          markValue = dqCode;
        } else if (entry.isDisqualified) {
          markValue = 'DQ';
        } else if (entry.isScratched) {
          markValue = 'SCR';
        } else {
          const rawMark = fields.mark ?? entry.seedMark ?? '';
          if (typeof rawMark === 'number') {
            if (isMultiEvent) {
              // Multi-event marks are total points — display as integer
              markValue = Math.round(rawMark).toString();
            } else if (isTrackEvent) {
              markValue = formatTimeSeconds(rawMark);
            } else {
              markValue = rawMark.toFixed(2);
            }
          } else {
            markValue = rawMark;
          }
        }
        
        let qualifier = '';
        if (isPrelimRound && !isKnownStatus && !entry.isDisqualified && !entry.isScratched) {
          if (qualifierPlaceSet.has(entry.id)) {
            qualifier = 'Q';
          } else if (qualifierTimeSet.has(entry.id)) {
            qualifier = 'q';
          }
        }
        
        const teamName = team?.name || team?.shortName || '';
        const teamAbbrev = team?.abbreviation || team?.shortName || '';
        
        // For relay events, use team name as the athlete name
        let displayFirstName = athlete?.firstName || '';
        let displayLastName = athlete?.lastName || '';
        let displayName = athlete ? `${athlete.firstName} ${athlete.lastName}`.trim() : 'Unknown';
        if (isRelayEvent && teamName) {
          displayName = teamName;
          displayFirstName = '';
          displayLastName = teamName;
        }
        
        return {
          position,
          lane: fields.lane || 0,
          heat: fields.heat || 0,
          bib: athlete?.bibNumber || athlete?.athleteNumber?.toString() || '',
          firstName: displayFirstName,
          lastName: displayLastName,
          name: displayName,
          team: teamAbbrev,
          affiliation: teamName,
          time: markValue,
          mark: markValue,
          result: markValue,
          place: fields.place,
          qualifier,
          isScratched: entry.isScratched || false,
          isDisqualified: entry.isDisqualified || false,
          statusCode: isKnownStatus ? dqCode : null,
          // Include athleteId so client can look up PB/SB from athlete bests
          athleteId: entry.athleteId || '',
          // Multi-event points: totalPoints is the athlete's accumulated points across all component events
          // eventPoints is per-component (same as mark for multi-events)
          ...(isMultiEvent ? {
            totalPoints: markValue,
            eventPoints: markValue,
          } : {}),
          // PB/SB/MR/FR record tags (enriched above)
          recordTags: (entry as any).recordTags || [],
        };
      });
      
      // Use paging lines (lines = seconds)
      const lines = Math.max(1, Math.min(20, parseInt(pagingLines) || 8));
      
      // Determine display type and select appropriate template
      const displayType = device.displayType || 'P10';
      const isSingleAthleteDisplay = displayType === 'P10' || displayType === 'P6';
      
      // For P10/P6 displays, use single-athlete template; for BigBoard, use compiled results
      const defaultTemplate = isSingleAthleteDisplay 
        ? `${displayType.toLowerCase()}-results` 
        : 'bigboard-compiled-results';
      
      // Find the connected WebSocket for this device
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        // Lock device to hytek mode so FinishLynx broadcasts don't override it
        connectedDevice.contentMode = 'hytek';
        storage.updateDisplayContentMode(deviceId, 'hytek').catch(err => console.error('[Hytek] Failed to persist contentMode:', err));
        // Update paging settings (lines = seconds)
        connectedDevice.pagingSize = lines;
        connectedDevice.pagingInterval = lines;
        
        let sceneId: number | null = null;
        let sceneData: { scene: any; objects: any[] } | null = null;
        
        if (device.meetId) {
          try {
            let mapping = await storage.getSceneTemplateMappingByTypeAndMode(device.meetId, displayType, 'hytek_results');
            if (!mapping) {
              mapping = await storage.getSceneTemplateMappingByTypeAndMode(device.meetId, displayType, 'track_results');
            }
            if (mapping) {
              sceneId = mapping.sceneId;
              sceneData = await prefetchSceneData(sceneId);
            }
          } catch (err) {
            console.error(`[Hytek Results] Error looking up scene mapping:`, err);
          }
        }
        
        const maxHeat = sortedEntries.reduce((max, e) => {
          const h = getRoundFields(e).heat || 0;
          return h > max ? h : max;
        }, 0);
        
        connectedDevice.ws.send(JSON.stringify({
          type: 'display_command',
          template: sceneId ? null : defaultTemplate,
          sceneId,
          sceneData,
          liveEventData: {
            eventNumber: event.eventNumber || 0,
            eventName: event.name,
            roundName: roundLabel,
            totalHeats: maxHeat,
            mode: 'results',
            entries: enrichedEntries,
            // Only send advancement data for non-final rounds
            advanceByPlace: isFinalRound ? null : (eventAdvanceByPlace || undefined),
            advanceByTime: isFinalRound ? null : (eventAdvanceByTime || undefined),
            // Additional metadata for better display rendering
            eventType: event.eventType || 'track',
            gender: event.gender || '',
            isRelay: isRelayEvent,
            wind: windReading,
            isFieldEvent: !isTrackEvent,
            isMultiEvent,
          },
          pagingSize: lines,
          pagingInterval: lines,
        }));
        
        await storage.updateDisplayDevice(deviceId, {
          pagingSize: lines,
          pagingInterval: lines,
        });
        
        console.log(`[Hytek Results] Sent ${enrichedEntries.length} entries (${roundLabel}) to ${device.deviceName} (${displayType}, paging: ${lines} lines/${lines}s)`);
        res.json({ success: true, delivered: true, entryCount: enrichedEntries.length });
      } else {
        res.json({ success: false, delivered: false, message: "Device offline" });
      }
    } catch (error: any) {
      console.error(`[Hytek Results] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== WINNERS BOARD (LIF/LFF) =====
  // Shared helper: parse LIF/LFF files for a given event and return enriched winners data
  async function parseWinnersFromLynxFiles(meetId: string, evtNum: number) {
    const ingestionSettings = await storage.getIngestionSettings(meetId);
    if (!ingestionSettings?.lynxFilesDirectory) {
      throw Object.assign(new Error("No Lynx files directory configured. Set it in Ingestion Settings."), { status: 400 });
    }
    
    const lynxDir = ingestionSettings.lynxFilesDirectory;
    if (!fs.existsSync(lynxDir)) {
      throw Object.assign(new Error(`Lynx files directory not found: ${lynxDir}`), { status: 400 });
    }
    
    const allFiles = fs.readdirSync(lynxDir);
    const eventPattern = new RegExp(`^0*${evtNum}-(\\d+)-(\\d+)\\.(lif|lff)$`, 'i');
    
    interface FileMatch { filePath: string; round: number; heat: number; ext: string; }
    const matchingFiles: FileMatch[] = [];
    for (const file of allFiles) {
      const match = file.match(eventPattern);
      if (match) {
        matchingFiles.push({
          filePath: pathModule.join(lynxDir, file),
          round: parseInt(match[1]),
          heat: parseInt(match[2]),
          ext: match[3].toLowerCase(),
        });
      }
    }
    
    if (matchingFiles.length === 0) {
      throw Object.assign(new Error(`No LIF/LFF files found for event ${evtNum} in ${lynxDir}`), { status: 400, warning: true });
    }
    
    const maxRound = Math.max(...matchingFiles.map(f => f.round));
    const latestRoundFiles = matchingFiles.filter(f => f.round === maxRound);
    const hasLIF = latestRoundFiles.some(f => f.ext === 'lif');
    const hasLFF = latestRoundFiles.some(f => f.ext === 'lff');
    
    let eventName = '';
    let isFieldEvent = false;
    
    interface WinnerCandidate {
      place: number; mark: number | null; firstName: string; lastName: string;
      team: string | null; bibNumber: number; isDNS: boolean; isDNF: boolean; isDQ: boolean;
    }
    const candidates: WinnerCandidate[] = [];
    
    if (hasLIF) {
      const lifFiles = latestRoundFiles.filter(f => f.ext === 'lif').sort((a, b) => a.heat - b.heat);
      for (const fileInfo of lifFiles) {
        try {
          const { header, results } = await parseLIFFile(fileInfo.filePath);
          if (!eventName && header.eventName) eventName = header.eventName;
          for (const result of results) {
            if (result.isDNS || result.isDNF || result.isDQ) continue;
            if (result.place === null || result.place <= 0) continue;
            candidates.push({
              place: result.place, mark: result.mark, firstName: result.firstName,
              lastName: result.lastName, team: result.team, bibNumber: result.bibNumber,
              isDNS: result.isDNS, isDNF: result.isDNF, isDQ: result.isDQ,
            });
          }
        } catch (err) { console.warn(`[Winners-Lynx] Failed to parse LIF file ${fileInfo.filePath}:`, err); }
      }
    }
    
    // Use LIF (track) if available; only fall back to LFF (field) when no LIF files exist.
    // This prevents duplicate candidates and incorrect sort direction when both types exist.
    if (!hasLIF && hasLFF) {
      isFieldEvent = true;
      const lffFiles = latestRoundFiles.filter(f => f.ext === 'lff').sort((a, b) => a.heat - b.heat);
      for (const fileInfo of lffFiles) {
        try {
          const { header, results } = await parseLFFFile(fileInfo.filePath);
          if (!eventName && header.eventName) eventName = header.eventName;
          for (const result of results) {
            if (result.isDNS) continue;
            if (result.place === null || result.place <= 0) continue;
            candidates.push({
              place: result.place, mark: result.bestMark, firstName: result.firstName,
              lastName: result.lastName, team: result.team, bibNumber: result.bibNumber,
              isDNS: result.isDNS, isDNF: false, isDQ: false,
            });
          }
        } catch (err) { console.warn(`[Winners-Lynx] Failed to parse LFF file ${fileInfo.filePath}:`, err); }
      }
    }
    
    if (candidates.length === 0) {
      throw Object.assign(new Error(`No placed results found for event ${evtNum} (round ${maxRound})`), { status: 400, warning: true });
    }
    
    // When multiple heats/sections exist in the same round, each LIF/LFF file
    // has per-heat places (1st in heat 1, 1st in heat 2, etc.).
    // We need to sort by actual mark across ALL heats, then reassign overall places.
    const multipleHeats = (hasLIF ? latestRoundFiles.filter(f => f.ext === 'lif') : latestRoundFiles.filter(f => f.ext === 'lff')).length > 1;
    
    candidates.sort((a, b) => {
      if (a.mark !== null && b.mark !== null) {
        return isFieldEvent ? (b.mark - a.mark) : (a.mark - b.mark);
      }
      if (a.mark !== null) return -1;
      if (b.mark !== null) return 1;
      return a.place - b.place;
    });
    
    // Reassign overall places when merging multiple heats
    if (multipleHeats) {
      candidates.forEach((c, i) => { c.place = i + 1; });
    }
    
    const top4 = candidates.slice(0, 4);
    
    // Enrich with DB data
    const athletes = await storage.getAthletesByMeetId(meetId);
    const allEvents = await storage.getEventsByMeetId(meetId);
    const dbEvent = allEvents.find(e => e.eventNumber === evtNum);
    
    const bibToAthlete = new Map<number, any>();
    for (const a of athletes) {
      if (a.bibNumber) bibToAthlete.set(parseInt(a.bibNumber), a);
    }
    
    // Fetch all teams for this meet and build lookup maps (by id, abbreviation, name)
    // This is critical for relays where bib numbers don't map to individual athletes
    const allMeetTeams = await storage.getTeamsByMeetId(meetId);
    const teamMap = new Map<string, any>();
    const teamByAbbrev = new Map<string, any>(); // abbreviation (upper) → team
    const teamByName = new Map<string, any>();   // name (upper) → team
    for (const t of allMeetTeams) {
      teamMap.set(t.id, t);
      if (t.abbreviation) teamByAbbrev.set(t.abbreviation.toUpperCase(), t);
      if (t.shortName) teamByAbbrev.set(t.shortName.toUpperCase(), t);
      if (t.name) teamByName.set(t.name.toUpperCase(), t);
    }
    
    const teamLogoMap = new Map<string, string>();
    const headshotMap = new Map<string, string>();
    try {
      const teamLogos = await storage.getTeamLogosByMeet(meetId);
      teamLogos.forEach(logo => { teamLogoMap.set(logo.teamId, fileStorage.publicUrlForKey(logo.storageKey)); });
    } catch (err) { console.warn('[Winners-Lynx] Failed to fetch team logos:', err); }
    try {
      const photos = await storage.getAthletePhotosByMeet(meetId);
      photos.forEach(photo => { headshotMap.set(photo.athleteId, fileStorage.publicUrlForKey(photo.storageKey)); });
    } catch (err) { console.warn('[Winners-Lynx] Failed to fetch athlete photos:', err); }
    
    const isMultiEvent = /\b(decathlon|heptathlon|pentathlon)\b/i.test(eventName || dbEvent?.name || '');
    const displayEventNameLower = (eventName || dbEvent?.name || '').toLowerCase();
    const isRelayEvent = displayEventNameLower.includes('relay') || displayEventNameLower.includes('medley') || /\d+x\d+/.test(displayEventNameLower);
    const ceilToPrecision = (val: number, precision: number): number => {
      const factor = Math.pow(10, precision);
      // Round UP to nearest hundredth (track & field rule: 8.315 → 8.32)
      return Math.ceil(val * factor - 1e-9) / factor;
    };
    const formatTimeSeconds = (seconds: number, precision: number = 2): string => {
      const rounded = ceilToPrecision(seconds, precision);
      if (rounded >= 3600) {
        const hours = Math.floor(rounded / 3600);
        const mins = Math.floor((rounded % 3600) / 60);
        const secs = ceilToPrecision(rounded % 60, precision).toFixed(precision);
        return `${hours}:${String(mins).padStart(2, '0')}:${secs.padStart(precision + 3, '0')}`;
      }
      if (rounded >= 60) {
        const mins = Math.floor(rounded / 60);
        const secs = ceilToPrecision(rounded % 60, precision).toFixed(precision);
        return `${mins}:${secs.padStart(precision + 3, '0')}`;
      }
      return rounded.toFixed(precision);
    };
    
    const winnersEntries = top4.map((winner) => {
      const dbAthlete = bibToAthlete.get(winner.bibNumber);
      let teamId = dbAthlete?.teamId;
      let team = teamId ? teamMap.get(teamId) : null;
      
      // For relay events (or when bib doesn't match an individual athlete),
      // fall back to matching team by the abbreviation from the LIF/LFF file
      if (!team && winner.team) {
        const abbrevMatch = teamByAbbrev.get(winner.team.toUpperCase());
        const nameMatch = teamByName.get(winner.team.toUpperCase());
        team = abbrevMatch || nameMatch || null;
        if (team) teamId = team.id;
      }
      
      const firstName = dbAthlete?.firstName || winner.firstName;
      const lastName = dbAthlete?.lastName || winner.lastName;
      const teamName = team?.name || team?.shortName || winner.team || '';
      const teamAbbrev = team?.abbreviation || team?.shortName || winner.team || '';
      
      let markValue: string;
      if (typeof winner.mark === 'number') {
        if (isMultiEvent) markValue = Math.round(winner.mark).toString();
        else if (!isFieldEvent) markValue = formatTimeSeconds(winner.mark);
        else markValue = winner.mark.toFixed(2);
      } else {
        markValue = '';
      }
      
      const teamLogoUrl = teamId ? teamLogoMap.get(teamId) : null;
      const headshotUrl = dbAthlete ? headshotMap.get(dbAthlete.id) : null;
      
      // For relay events, use the relay name from the LIF data (lastName field, e.g. "Navy 'A'")
      // as the display name, and show the full team name as affiliation
      let displayFirstName = firstName;
      let displayLastName = lastName;
      let displayName = `${firstName} ${lastName}`.trim() || 'Unknown';
      if (isRelayEvent) {
        // Combine lastName + firstName for full relay name (e.g., "Navy" + "'A'" = "Navy 'A'")
        const relayName = winner.firstName
          ? `${winner.lastName} ${winner.firstName}`.trim()
          : (winner.lastName || teamName);
        displayName = relayName || teamName;
        displayFirstName = '';
        displayLastName = relayName || teamName;
      }
      
      return {
        position: winner.place, place: winner.place,
        firstName: displayFirstName, lastName: displayLastName,
        name: displayName,
        team: teamAbbrev, affiliation: teamName, isRelay: isRelayEvent,
        time: markValue, mark: markValue,
        teamLogoUrl: teamLogoUrl || null, logoUrl: teamLogoUrl || null,
        headshotUrl: headshotUrl || null, athletePhotoUrl: headshotUrl || null,
      };
    });
    
    let meetLogoUrl: string | null = null;
    let meetName = '';
    try { const meet = await storage.getMeet(meetId); meetLogoUrl = meet?.logoUrl || null; meetName = meet?.name || ''; } catch (err) { /* ok */ }
    
    const displayEventName = eventName || dbEvent?.name || `Event ${evtNum}`;
    
    return { winnersEntries, displayEventName, meetName, meetLogoUrl, maxRound, source: hasLIF ? 'lif' : 'lff', isFieldEvent };
  }

  // List events that have LIF/LFF files available in the Lynx directory
  app.get("/api/meets/:meetId/winners-available-events", async (req, res) => {
    try {
      const meetId = req.params.meetId;
      const ingestionSettings = await storage.getIngestionSettings(meetId);
      if (!ingestionSettings?.lynxFilesDirectory) {
        return res.json({ events: [] });
      }
      
      const lynxDir = ingestionSettings.lynxFilesDirectory;
      if (!fs.existsSync(lynxDir)) {
        return res.json({ events: [] });
      }
      
      const allFiles = fs.readdirSync(lynxDir);
      const filePattern = /^0*(\d+)-(\d+)-(\d+)\.(lif|lff)$/i;
      
      // Collect unique event numbers and track latest file modification time per event
      const eventLatestMtime = new Map<number, number>();
      for (const file of allFiles) {
        const match = file.match(filePattern);
        if (match) {
          const evtNum = parseInt(match[1]);
          try {
            const stat = fs.statSync(pathModule.join(lynxDir, file));
            const mtime = stat.mtimeMs;
            const existing = eventLatestMtime.get(evtNum);
            if (existing === undefined || mtime > existing) {
              eventLatestMtime.set(evtNum, mtime);
            }
          } catch {
            // If stat fails, just record the event with epoch 0
            if (!eventLatestMtime.has(evtNum)) {
              eventLatestMtime.set(evtNum, 0);
            }
          }
        }
      }
      
      // Match with DB events for names, sort by latest LIF/LFF modification time (newest first)
      const allEvents = await storage.getEventsByMeetId(meetId);
      const available = Array.from(eventLatestMtime.entries())
        .sort((a, b) => b[1] - a[1])  // Sort by mtime descending (most recent first)
        .map(([num, _mtime]) => {
          const dbEvent = allEvents.find(e => e.eventNumber === num);
          return {
            eventNumber: num,
            eventId: dbEvent?.id || null,
            name: dbEvent?.name || `Event ${num}`,
            eventTime: dbEvent?.eventTime || null,
          };
        });
      
      res.json({ events: available });
    } catch (error: any) {
      console.error('[Winners-Available] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Preview Winners Board — parse and return data without sending to display
  app.post("/api/meets/:meetId/winners-board-preview", async (req, res) => {
    try {
      const { eventNumber } = req.body;
      const meetId = req.params.meetId;
      
      if (!eventNumber) {
        return res.status(400).json({ error: "eventNumber is required" });
      }
      const evtNum = parseInt(eventNumber);
      if (isNaN(evtNum) || evtNum <= 0) {
        return res.status(400).json({ error: "eventNumber must be a positive integer" });
      }
      
      const result = await parseWinnersFromLynxFiles(meetId, evtNum);
      
      res.json({
        success: true,
        eventName: result.displayEventName,
        meetName: result.meetName,
        meetLogoUrl: result.meetLogoUrl,
        round: result.maxRound,
        source: result.source,
        entryCount: result.winnersEntries.length,
        entries: result.winnersEntries,
      });
    } catch (error: any) {
      console.error('[Winners-Preview] Error:', error);
      const status = error.status || 500;
      res.status(status).json({ error: error.message, warning: error.warning || false });
    }
  });

  // Send Winners Board to display — parse LIF/LFF files and push to device via WebSocket
  app.post("/api/display-devices/:id/winners-board-lynx", async (req, res) => {
    try {
      const { eventNumber } = req.body;
      const deviceId = req.params.id;
      
      if (!eventNumber) {
        return res.status(400).json({ error: "eventNumber is required" });
      }
      const evtNum = parseInt(eventNumber);
      if (isNaN(evtNum) || evtNum <= 0) {
        return res.status(400).json({ error: "eventNumber must be a positive integer" });
      }
      
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }
      const meetId = device.meetId;
      if (!meetId) {
        return res.status(400).json({ error: "Device has no assigned meet" });
      }
      
      const result = await parseWinnersFromLynxFiles(meetId, evtNum);
      
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        connectedDevice.contentMode = 'winners';
        storage.updateDisplayContentMode(deviceId, 'winners').catch(err => console.error('[Winners] Failed to persist contentMode:', err));
        
        // Check if user has a custom scene mapped for 'winners' mode on this display type
        const displayType = device.displayType || 'P10';
        let sceneId: number | null = null;
        let sceneData: { scene: any; objects: any[] } | null = null;
        
        try {
          // Look for a scene mapping for 'winners' content mode, then fall back to 'track_results'
          let mapping = await storage.getSceneTemplateMappingByTypeAndMode(meetId, displayType, 'winners');
          if (!mapping) {
            mapping = await storage.getSceneTemplateMappingByTypeAndMode(meetId, displayType, 'track_results');
          }
          if (mapping) {
            sceneId = mapping.sceneId;
            sceneData = await prefetchSceneData(sceneId);
            console.log(`[Winners-Lynx] Using custom scene ${sceneId} for ${displayType} winners`);
          }
        } catch (err) {
          console.error(`[Winners-Lynx] Error looking up scene mapping:`, err);
        }
        
        connectedDevice.ws.send(JSON.stringify({
          type: 'display_command',
          template: sceneId ? null : 'winners-board',
          sceneId,
          sceneData,
          liveEventData: {
            eventName: result.displayEventName,
            mode: 'winners',
            meetLogoUrl: result.meetLogoUrl,
            entries: result.winnersEntries,
          },
          winnersData: {
            eventName: result.displayEventName,
            meetName: result.meetName,
            meetLogoUrl: result.meetLogoUrl,
            entries: result.winnersEntries,
          },
        }));
        
        console.log(`[Winners-Lynx] Sent ${result.winnersEntries.length} winners for "${result.displayEventName}" (event ${evtNum}, round ${result.maxRound}) to ${device.deviceName} (scene: ${sceneId || 'built-in'})`);
        res.json({ success: true, delivered: true, entryCount: result.winnersEntries.length, round: result.maxRound, source: result.source });
      } else {
        res.json({ success: false, delivered: false, message: "Device offline" });
      }
    } catch (error: any) {
      console.error(`[Winners-Lynx] Error:`, error);
      const status = error.status || 500;
      res.status(status).json({ error: error.message, warning: error.warning || false });
    }
  });

  // ===== RECORD BOARD (LIF/LFF) =====
  // Reuses parseWinnersFromLynxFiles but only takes the 1st-place finisher

  // Preview Record Board — parse and return winner data without sending to display
  app.post("/api/meets/:meetId/record-board-preview", async (req, res) => {
    try {
      const { eventNumber } = req.body;
      const meetId = req.params.meetId;
      
      if (!eventNumber) {
        return res.status(400).json({ error: "eventNumber is required" });
      }
      const evtNum = parseInt(eventNumber);
      if (isNaN(evtNum) || evtNum <= 0) {
        return res.status(400).json({ error: "eventNumber must be a positive integer" });
      }
      
      const result = await parseWinnersFromLynxFiles(meetId, evtNum);
      // Only the winner (1st place)
      const winner = result.winnersEntries.find((e: any) => e.position === 1) || result.winnersEntries[0];
      
      // Get meet colors and logo effect for the display
      let primaryColor = '#FFD700';
      let secondaryColor = '#1a1a2e';
      let logoEffect: string | null = null;
      try {
        const meet = await storage.getMeet(meetId);
        if (meet) {
          primaryColor = meet.primaryColor || primaryColor;
          secondaryColor = meet.secondaryColor || secondaryColor;
          logoEffect = (meet as any).logoEffect || null;
        }
      } catch (err) { /* ok */ }
      
      res.json({
        success: true,
        eventName: result.displayEventName,
        meetName: result.meetName,
        meetLogoUrl: result.meetLogoUrl,
        meetLogoEffect: logoEffect,
        primaryColor,
        secondaryColor,
        round: result.maxRound,
        source: result.source,
        entry: winner || null,
      });
    } catch (error: any) {
      console.error('[Record-Preview] Error:', error);
      const status = error.status || 500;
      res.status(status).json({ error: error.message, warning: error.warning || false });
    }
  });

  // Send Record Board to display — parse LIF/LFF files and push winner + record label to device
  app.post("/api/display-devices/:id/record-board", async (req, res) => {
    try {
      const { eventNumber, recordLabel } = req.body;
      const deviceId = req.params.id;
      
      if (!eventNumber) {
        return res.status(400).json({ error: "eventNumber is required" });
      }
      if (!recordLabel || typeof recordLabel !== 'string' || !recordLabel.trim()) {
        return res.status(400).json({ error: "recordLabel is required (e.g. 'Meet Record', 'Facility Record')" });
      }
      const evtNum = parseInt(eventNumber);
      if (isNaN(evtNum) || evtNum <= 0) {
        return res.status(400).json({ error: "eventNumber must be a positive integer" });
      }
      
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }
      const meetId = device.meetId;
      if (!meetId) {
        return res.status(400).json({ error: "Device has no assigned meet" });
      }
      
      const result = await parseWinnersFromLynxFiles(meetId, evtNum);
      const winner = result.winnersEntries.find((e: any) => e.position === 1) || result.winnersEntries[0];
      
      // Get meet colors and logo effect
      let primaryColor = '#FFD700';
      let secondaryColor = '#1a1a2e';
      let logoEffect: string | null = null;
      try {
        const meet = await storage.getMeet(meetId);
        if (meet) {
          primaryColor = meet.primaryColor || primaryColor;
          secondaryColor = meet.secondaryColor || secondaryColor;
          logoEffect = (meet as any).logoEffect || null;
        }
      } catch (err) { /* ok */ }
      
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        connectedDevice.contentMode = 'record';
        storage.updateDisplayContentMode(deviceId, 'record').catch(err => console.error('[Record] Failed to persist contentMode:', err));
        
        // Check if user has a custom scene mapped for 'record' or 'winners' mode on this display type
        const displayType = device.displayType || 'P10';
        let sceneId: number | null = null;
        let sceneData: { scene: any; objects: any[] } | null = null;
        
        try {
          let mapping = await storage.getSceneTemplateMappingByTypeAndMode(meetId, displayType, 'record');
          if (!mapping) {
            mapping = await storage.getSceneTemplateMappingByTypeAndMode(meetId, displayType, 'winners');
          }
          if (!mapping) {
            mapping = await storage.getSceneTemplateMappingByTypeAndMode(meetId, displayType, 'track_results');
          }
          if (mapping) {
            sceneId = mapping.sceneId;
            sceneData = await prefetchSceneData(sceneId);
            console.log(`[Record-Board] Using custom scene ${sceneId} for ${displayType} record board`);
          }
        } catch (err) {
          console.error(`[Record-Board] Error looking up scene mapping:`, err);
        }
        
        connectedDevice.ws.send(JSON.stringify({
          type: 'display_command',
          template: sceneId ? null : 'record-board',
          sceneId,
          sceneData,
          liveEventData: {
            eventName: result.displayEventName,
            mode: 'record',
            entries: winner ? [winner] : [],
            recordLabel: recordLabel.trim(),
            meetName: result.meetName,
            meetLogoUrl: result.meetLogoUrl,
            meetLogoEffect: logoEffect,
            primaryColor,
            secondaryColor,
          },
        }));
        
        console.log(`[Record-Board] Sent record "${recordLabel}" for "${result.displayEventName}" (event ${evtNum}) to ${device.deviceName} (scene: ${sceneId || 'built-in'})`);
        res.json({ success: true, delivered: true, round: result.maxRound, source: result.source });
      } else {
        res.json({ success: false, delivered: false, message: "Device offline" });
      }
    } catch (error: any) {
      console.error(`[Record-Board] Error:`, error);
      const status = error.status || 500;
      res.status(status).json({ error: error.message, warning: error.warning || false });
    }
  });

  // Send Team Scores to a display device
  app.post("/api/display-devices/:id/team-scores", async (req, res) => {
    try {
      const { pagingLines, gender, maxPages } = req.body;
      const deviceId = req.params.id;
      const selectedGender: string = gender === 'W' ? 'W' : 'M';
      const effectiveMaxPages = Math.max(0, parseInt(maxPages) || 0);
      const genderLabel = selectedGender === 'W' ? "Women's" : "Men's";
      
      // Get the device
      const device = await storage.getDisplayDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Display device not found" });
      }
      
      if (!device.meetId) {
        return res.status(400).json({ error: "Device has no assigned meet" });
      }
      
      // Collect scored events for this gender (names + count)
      let totalEventsScored = 0;
      let scoredEventNames: string[] = [];
      try {
        const allEvents = await storage.getEventsByMeetId(device.meetId);
        const filtered = allEvents.filter((e: any) => {
          if (!e.isScored) return false;
          const g = (e.gender || '').toUpperCase().charAt(0);
          return selectedGender === 'M' ? (g === 'M' || g === '') : (g === 'W' || g === 'F');
        });
        totalEventsScored = filtered.length;
        scoredEventNames = filtered
          .sort((a: any, b: any) => (a.eventNumber || 0) - (b.eventNumber || 0))
          .map((e: any) => {
            const raw = e.name || '';
            const stripped = raw
              .replace(/^(Men'?s?|Women'?s?)\s+/i, '')
              .replace(/\s+/g, ' ')
              .trim();
            return abbreviateEventName(stripped);
          })
          .filter((n: string) => n.length > 0);
      } catch (err) {
        console.log('[Team Scores] Could not count scored events');
      }
      
      // Use getTeamStandings which handles gender-filtered scoring
      let standings: any[] = [];
      let hasScores = false;
      try {
        standings = await storage.getTeamStandings(device.meetId, { gender: selectedGender });
        hasScores = standings.some((s: any) => (s.totalPoints || 0) > 0);
      } catch (err) {
        console.log('[Team Scores] getTeamStandings failed, falling back to manual scoring');
      }
      
      // Get team logos for all paths
      const logoMap = new Map<string, string>();
      try {
        const allLogos = await storage.getTeamLogosByMeet(device.meetId);
        for (const logo of allLogos) {
          logoMap.set(logo.teamId, fileStorage.publicUrlForKey(logo.storageKey));
        }
      } catch {}
      
      // Get team abbreviations from teams table for richer display
      const teamAbbrMap = new Map<string, string>();
      try {
        const allTeams = await storage.getTeamsByMeetId(device.meetId);
        for (const t of allTeams) {
          if (t.abbreviation) teamAbbrMap.set(t.id, t.abbreviation);
        }
      } catch {}
      
      // Build team entries from standings (getTeamStandings is the canonical source)
      let teamEntries: any[];
      if (standings.length > 0) {
        teamEntries = standings
          .filter((s: any) => (s.totalPoints || 0) > 0)
          .map((s: any, index: number) => ({
            place: String(index + 1),
            name: s.teamName || 'Unknown',
            lastName: s.teamName || 'Unknown',
            affiliation: teamAbbrMap.get(s.teamId) || s.teamName || '',
            team: teamAbbrMap.get(s.teamId) || s.teamName || '',
            time: String(s.totalPoints || 0),
            mark: String(s.totalPoints || 0),
            points: s.totalPoints || 0,
            logoUrl: logoMap.get(s.teamId) || null,
            eventCount: s.eventCount || 0,
            eventBreakdown: s.eventBreakdown || [],
          }));
      } else {
        // Fallback: no scoring rules configured — show teams with 0 points
        const teams = await storage.getTeamsByMeetId(device.meetId);
        if (teams.length === 0) {
          return res.status(400).json({ error: "No teams found for this meet", warning: true });
        }
        
        // Without scoring rules, just list the teams alphabetically
        teamEntries = teams
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map((team, index: number) => ({
            place: String(index + 1),
            name: team.name || team.shortName || 'Unknown',
            lastName: team.name || team.shortName || 'Unknown',
            affiliation: team.abbreviation || team.name || team.shortName || '',
            team: team.abbreviation || team.name || team.shortName || '',
            time: '0',
            mark: '0',
            points: 0,
            logoUrl: logoMap.get(team.id) || null,
            eventCount: 0,
            eventBreakdown: [],
          }));
      }
      
      // Use paging lines (lines = seconds)
      const lines = Math.max(1, Math.min(20, parseInt(pagingLines) || 8));
      
      // Find the connected WebSocket for this device
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice && connectedDevice.ws.readyState === WebSocket.OPEN) {
        // Lock device to team_scores mode so FinishLynx broadcasts don't override it
        connectedDevice.contentMode = 'team_scores';
        storage.updateDisplayContentMode(deviceId, 'team_scores').catch(err => console.error('[Team Scores] Failed to persist contentMode:', err));
        // Update paging settings (lines = seconds)
        connectedDevice.pagingSize = lines;
        connectedDevice.pagingInterval = lines;
        
        // Look up custom scene mapping for team_scores mode
        const displayType = device.displayType || 'P10';
        let sceneId: number | null = null;
        let sceneData: { scene: any; objects: any[] } | null = null;
        
        if (device.meetId) {
          try {
            const mapping = await storage.getSceneTemplateMappingByTypeAndMode(
              device.meetId,
              displayType,
              'team_scores'
            );
            if (mapping) {
              sceneId = mapping.sceneId;
              sceneData = await prefetchSceneData(sceneId);
            }
          } catch (err) {
            console.error(`[Team Scores] Error looking up scene mapping:`, err);
          }
        }
        
        // Send command to the display device
        connectedDevice.ws.send(JSON.stringify({
          type: 'display_command',
          template: sceneId ? null : 'team-scores',
          sceneId,
          sceneData,
          liveEventData: {
            mode: 'team_scores',
            eventName: `${genderLabel} Team Scores`,
            gender: selectedGender,
            totalEventsScored,
            scoredEventNames,
            entries: teamEntries,
          },
          pagingSize: lines,
          pagingInterval: lines,
          maxPages: effectiveMaxPages,
        }));
        
        // Update database with paging settings
        await storage.updateDisplayDevice(deviceId, {
          pagingSize: lines,
          pagingInterval: lines,
        });
        
        console.log(`[Team Scores] Sent ${teamEntries.length} ${genderLabel} teams to ${device.deviceName} (paging: ${lines} lines/${lines}s, maxPages: ${effectiveMaxPages || 'all'}, hasScores: ${hasScores})`);
        res.json({ 
          success: true, 
          delivered: true, 
          teamCount: teamEntries.length,
          hasScores,
          warning: hasScores ? undefined : "No scoring data available - all teams will show 0 points"
        });
      } else {
        res.json({ success: false, delivered: false, message: "Device offline" });
      }
    } catch (error: any) {
      console.error(`[Team Scores] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Switch device content mode (lynx, hytek, team_scores, field)
  // Used to unlock a device back to FinishLynx mode after showing HyTek/team scores/field
  app.patch("/api/display-devices/:id/content-mode", async (req, res) => {
    try {
      const { contentMode } = req.body;
      const deviceId = req.params.id;
      
      const validModes = ['lynx', 'hytek', 'team_scores', 'field', 'winners', 'record'];
      if (!contentMode || !validModes.includes(contentMode)) {
        return res.status(400).json({ error: `contentMode must be one of: ${validModes.join(', ')}` });
      }
      
      const connectedDevice = connectedDisplayDevices.get(deviceId);
      if (connectedDevice) {
        connectedDevice.contentMode = contentMode;
        storage.updateDisplayContentMode(deviceId, contentMode).catch(err => console.error('[Content Mode] Failed to persist contentMode:', err));
        console.log(`[Content Mode] Device ${connectedDevice.deviceName} switched to ${contentMode}`);
        
        // Notify the display device of the content mode change so it updates immediately
        if (connectedDevice.ws.readyState === WebSocket.OPEN) {
          connectedDevice.ws.send(JSON.stringify({
            type: 'content_mode_change',
            contentMode,
            deviceId,
          }));
        }
        
        // When switching back to lynx, immediately send the current event state
        // so the display updates right away instead of waiting for the next broadcast
        if (contentMode === 'lynx') {
          broadcastCurrentEvent().catch(console.error);
        }
      }
      
      res.json({ success: true, contentMode });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get device content mode
  app.get("/api/display-devices/:id/content-mode", async (req, res) => {
    try {
      const connectedDevice = connectedDisplayDevices.get(req.params.id);
      const contentMode = connectedDevice?.contentMode || 'lynx';
      res.json({ contentMode });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== DISPLAY THEMES =====
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

}
