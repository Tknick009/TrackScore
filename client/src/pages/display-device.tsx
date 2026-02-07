import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, Tv, LayoutGrid, Calendar, Radio } from "lucide-react";
import type { Meet, Event } from "@shared/schema";

// Transition duration in milliseconds - crisp and fast for live stadium use
const TRANSITION_DURATION_MS = 150;

// Robust transition hook with proper race condition handling
interface TransitionState {
  activeKey: string;
  previousKey: string | null;
  phase: 'idle' | 'transitioning';
  version: number;
  fadeStarted: boolean;
}

interface PreviousSnapshot {
  template: string | null;
  sceneId: number | null;
  currentSceneData: any;
  version: number;
}

function useLayoutTransition(
  currentLayoutKey: string,
  currentProps: { template: string | null; sceneId: number | null; currentSceneData: any }
) {
  const [state, setState] = useState<TransitionState>({
    activeKey: currentLayoutKey,
    previousKey: null,
    phase: 'idle',
    version: 0,
    fadeStarted: false,
  });
  
  // Store snapshot of outgoing layout's props when transition starts
  const snapshotRef = useRef<PreviousSnapshot | null>(null);
  
  // Keep track of last stable (idle) props - these are what we snapshot when transitioning
  const lastStablePropsRef = useRef({
    template: currentProps.template,
    sceneId: currentProps.sceneId,
    currentSceneData: currentProps.currentSceneData,
  });
  
  const lastKeyRef = useRef<string>(currentLayoutKey);
  const versionRef = useRef<number>(0);
  
  // Update lastStableProps only when phase is idle and key matches
  useEffect(() => {
    if (state.phase === 'idle' && currentLayoutKey === lastKeyRef.current) {
      lastStablePropsRef.current = {
        template: currentProps.template,
        sceneId: currentProps.sceneId,
        currentSceneData: currentProps.currentSceneData,
      };
    }
  }, [state.phase, currentLayoutKey, currentProps.template, currentProps.sceneId, currentProps.currentSceneData]);
  
  // Handle layout key changes - snapshot the LAST STABLE props (the outgoing layout)
  useEffect(() => {
    if (currentLayoutKey === lastKeyRef.current) {
      return;
    }
    
    // Increment version
    const newVersion = ++versionRef.current;
    
    // Snapshot the LAST STABLE props - these are the OUTGOING layout's props
    // (NOT currentProps which already reflect the new layout)
    snapshotRef.current = {
      template: lastStablePropsRef.current.template,
      sceneId: lastStablePropsRef.current.sceneId,
      currentSceneData: lastStablePropsRef.current.currentSceneData,
      version: newVersion,
    };
    
    const previousKey = lastKeyRef.current;
    lastKeyRef.current = currentLayoutKey;
    
    // Start transition - fadeStarted will be triggered via queueMicrotask
    setState({
      activeKey: currentLayoutKey,
      previousKey: previousKey,
      phase: 'transitioning',
      version: newVersion,
      fadeStarted: false,
    });
    
    // Defer fade start to next microtask with version binding
    const capturedVersion = newVersion;
    queueMicrotask(() => {
      // Only start fade if this is still the current version
      if (versionRef.current !== capturedVersion) return;
      setState(prev => prev.version === capturedVersion ? { ...prev, fadeStarted: true } : prev);
    });
  }, [currentLayoutKey]);
  
  // Callback for when transition completes (called from transitionend handler)
  const completeTransition = useCallback((completedVersion: number) => {
    // Only complete if this is still the current transition version
    if (completedVersion !== versionRef.current) return;
    
    // Clear snapshot only for matching version
    if (snapshotRef.current?.version === completedVersion) {
      snapshotRef.current = null;
    }
    
    setState(prev => prev.version === completedVersion ? {
      ...prev,
      previousKey: null,
      phase: 'idle',
      fadeStarted: false,
    } : prev);
  }, []);
  
  return { 
    state, 
    completeTransition, 
    currentVersion: versionRef.current,
    snapshot: snapshotRef.current,
  };
}
import { 
  BigBoard,
  RunningTime,
  RunningResults,
  CompiledResults,
  FieldSideBySide,
  SingleAthleteTrack,
  SingleAthleteField,
} from "@/components/display/templates";
import { BroadcastDisplay } from "@/components/display/templates/BroadcastDisplay";
import { 
  type DisplayType, 
  DISPLAY_CAPABILITIES,
  isTemplateCompatible,
} from "@/lib/displayCapabilities";
import { SceneCanvas } from "@/components/scene-canvas";

interface LiveEventData {
  eventNumber: number;
  eventName: string;
  heat?: number;
  totalHeats?: number; // Total heats from database for "Heat X of Y" display
  round?: number;
  entries?: any[];
  wind?: string;
  distance?: string;
  status?: string;
  mode?: string;
}

interface DisplayDeviceState {
  displayType: DisplayType | null;
  meetId: string | null;
  currentTemplate: string | null;
  currentSceneId: number | null;
  currentSceneData: { scene: any; objects: any[] } | null; // Pre-fetched scene data for instant switching
  currentEventId: number | null;
  currentLayoutMode: string | null; // Track current layout mode to debounce duplicate commands
  isConnected: boolean;
  setupComplete: boolean;
  liveClockTime: string | null;
  liveClockCommand: string | null;  // Command from FinishLynx (e.g., 'armed')
  liveEventData: LiveEventData | null;
  pagingSize: number;
  pagingInterval: number;
}

// Storage helpers for device identity - keyed by device name for persistence across type changes
function getDeviceStorageKey(deviceName: string): string {
  const safeName = deviceName.replace(/[^a-zA-Z0-9]/g, '_');
  return `display_device_id_${safeName}`;
}

function getStoredDeviceId(deviceName: string): string | null {
  const storageKey = getDeviceStorageKey(deviceName);
  
  try {
    const fromLocalStorage = localStorage.getItem(storageKey);
    if (fromLocalStorage) return fromLocalStorage;
  } catch (e) {}
  
  const cookieMatch = document.cookie.match(new RegExp(`${storageKey}=([^;]+)`));
  if (cookieMatch) return cookieMatch[1];
  
  return null;
}

function getLastDeviceName(): string {
  try {
    return localStorage.getItem('display_device_last_name') || '';
  } catch (e) {
    return '';
  }
}

function saveDeviceId(deviceName: string, deviceId: string): void {
  const storageKey = getDeviceStorageKey(deviceName);
  
  try {
    localStorage.setItem(storageKey, deviceId);
  } catch (e) {}
  
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${storageKey}=${deviceId};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function saveLastDeviceName(deviceName: string): void {
  try {
    localStorage.setItem('display_device_last_name', deviceName);
  } catch (e) {}
}

export default function DisplayDevice() {
  const [state, setState] = useState<DisplayDeviceState>({
    displayType: null,
    meetId: null,
    currentTemplate: null,
    currentSceneId: null,
    currentSceneData: null,
    currentEventId: null,
    currentLayoutMode: null,
    isConnected: false,
    setupComplete: false,
    liveClockTime: null,
    liveClockCommand: null,
    liveEventData: null,
    pagingSize: 8,
    pagingInterval: 5,
  });
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>(getLastDeviceName());
  const [registeredDeviceId, setRegisteredDeviceId] = useState<string | null>(null);
  const registeredDeviceIdRef = useRef<string | null>(null);
  // Big board toggle - when true, subscribes to 'track_mode_change_big' channel
  const [isBigBoard, setIsBigBoard] = useState<boolean>(false);
  const isBigBoardRef = useRef<boolean>(false);
  
  // Field event mode - when true, display subscribes to field event channels
  const [isFieldMode, setIsFieldMode] = useState<boolean>(false);
  const isFieldModeRef = useRef<boolean>(false);
  // Field port selection (4560-4569) for port-based routing
  const [fieldPort, setFieldPort] = useState<number>(4560);
  const fieldPortRef = useRef<number>(4560);
  // Field display type: vertical (HJ/PV) or horizontal (LJ/SP/Discus/etc.)
  const [fieldDisplayType, setFieldDisplayType] = useState<'vertical' | 'horizontal'>('horizontal');
  const fieldDisplayTypeRef = useRef<'vertical' | 'horizontal'>('horizontal');
  
  const wsRef = useRef<WebSocket | null>(null);
  const deviceNameRef = useRef<string>('');

  const { data: meets } = useQuery<Meet[]>({
    queryKey: ['/api/meets'],
  });

  // Fetch scene template mappings for the current meet
  // These map (displayType, displayMode) → sceneId
  const { data: sceneMappings = [] } = useQuery<Array<{
    id: number;
    meetId: string;
    displayType: string;
    displayMode: string;
    sceneId: number;
  }>>({
    queryKey: [`/api/scene-template-mappings/${state.meetId}`],
    enabled: !!state.meetId && state.setupComplete,
  });

  // Keep mappings in a ref so WebSocket handler can access latest values
  const sceneMappingsRef = useRef(sceneMappings);
  useEffect(() => {
    sceneMappingsRef.current = sceneMappings;
  }, [sceneMappings]);

  // Helper to look up sceneId from mappings (uses ref for WebSocket handler access)
  const getSceneForModeRef = useRef((displayType: string, displayMode: string): number | null => {
    const mapping = sceneMappingsRef.current.find(
      m => m.displayType === displayType && m.displayMode === displayMode
    );
    return mapping?.sceneId || null;
  });

  const selectedMeetIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track current layout mode for debouncing duplicate commands from FinishLynx
  // Reset when system is "armed" to ensure each heat gets fresh scene switching
  const currentLayoutModeRef = useRef<string | null>(null);

  // Update meetId ref when selected meet changes
  useEffect(() => {
    if (selectedMeetId) {
      selectedMeetIdRef.current = selectedMeetId;
    }
  }, [selectedMeetId]);
  
  useEffect(() => {
    registeredDeviceIdRef.current = registeredDeviceId;
  }, [registeredDeviceId]);

  // Keep bigBoard ref in sync with state
  useEffect(() => {
    isBigBoardRef.current = isBigBoard;
  }, [isBigBoard]);
  
  // Keep field mode refs in sync with state
  useEffect(() => {
    isFieldModeRef.current = isFieldMode;
  }, [isFieldMode]);
  
  useEffect(() => {
    fieldPortRef.current = fieldPort;
  }, [fieldPort]);
  
  useEffect(() => {
    fieldDisplayTypeRef.current = fieldDisplayType;
  }, [fieldDisplayType]);

  // WebSocket connection - runs when setup is complete
  useEffect(() => {
    if (!state.setupComplete || !state.displayType || !state.meetId) return;
    
    const meetId = state.meetId;
    
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    
    const displayType = state.displayType;
    let isCleaningUp = false;
    
    const connectWebSocket = () => {
      if (isCleaningUp) return;
      
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCleaningUp) {
          ws.close();
          return;
        }
        console.log('Display device connected to WebSocket');
        setState(prev => ({ ...prev, isConnected: true }));
        
        // Use stored device ID if available (per display type), otherwise server will create a new one
        const displayName = deviceNameRef.current || 'Display';
        const storedId = getStoredDeviceId(displayName);
        console.log(`Registering device: ${displayName} (stored ID: ${storedId || 'new'}) for meet ${meetId}`);
        ws.send(JSON.stringify({
          type: 'register_display_device',
          meetId: meetId,
          deviceName: displayName,
          displayType: displayType,
          deviceId: storedId, // Send stored ID for reconnection matching
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type);
          
          if (message.type === 'device_registered') {
            console.log('Device successfully registered:', message.data);
            // Save the server-issued device ID for future reconnections (per display type)
            if (message.data?.deviceId) {
              saveDeviceId(deviceNameRef.current || 'Display', message.data.deviceId);
              setRegisteredDeviceId(message.data.deviceId);
              console.log('Saved device ID for reconnection:', message.data.deviceId);
              const deviceData = message.data;
              if (deviceData.fieldPort !== undefined) {
                setFieldPort(deviceData.fieldPort ?? 4560);
              }
              if (deviceData.isBigBoard !== undefined) {
                setIsBigBoard(!!deviceData.isBigBoard);
              }
              if (deviceData.displayMode !== undefined) {
                setIsFieldMode(deviceData.displayMode === 'field');
              }
              if (deviceData.displayType) {
                setState(prev => ({ ...prev, displayType: deviceData.displayType }));
              }
            }
          }
          
          if (message.type === 'display_command') {
            // Pre-warm React Query cache for instant inline rendering (no HTTP fetch needed)
            const newSceneId = message.sceneId ? Number(message.sceneId) : null;
            
            if (newSceneId && message.sceneData) {
              try {
                // Hydrate React Query cache synchronously before state update
                queryClient.setQueryData(['/api/layout-scenes', newSceneId], message.sceneData.scene);
                queryClient.setQueryData(['/api/layout-objects', { sceneId: newSceneId }], message.sceneData.objects);
                console.log(`[Display] Hydrated React Query cache for scene ${newSceneId} - instant switch ready`);
              } catch (e) {
                console.warn('[Display] Failed to hydrate React Query cache:', e);
              }
            }
            
            setState(prev => {
              // Determine if we're switching to a new scene
              const isSwitchingScenes = newSceneId !== prev.currentSceneId;
              const isSwitchingToTemplate = !newSceneId && message.template;
              
              // Preserve scene data if staying on same scene and no new data provided
              let sceneData = message.sceneData || null;
              if (!sceneData && newSceneId && newSceneId === prev.currentSceneId) {
                sceneData = prev.currentSceneData; // Keep existing scene data for same scene
              }
              
              console.log(`[Display] Command: sceneId=${newSceneId}, template=${message.template}, switching=${isSwitchingScenes}`);
              
              return {
                ...prev,
                // Template: use message template, or null if we have a scene, or keep previous
                currentTemplate: message.template ?? (newSceneId ? null : prev.currentTemplate),
                // Scene ID: use new scene ID or null if switching to template
                currentSceneId: isSwitchingToTemplate ? null : (newSceneId ?? prev.currentSceneId),
                // Scene data: use new data, or preserved data for same scene, or null for template
                currentSceneData: isSwitchingToTemplate ? null : sceneData,
                currentEventId: message.eventId ?? prev.currentEventId,
                // Merge live data - preserve entries if incoming data doesn't have them
                liveEventData: message.liveEventData 
                  ? {
                      ...prev.liveEventData,
                      ...message.liveEventData,
                      // Preserve entries if new data doesn't include them
                      entries: message.liveEventData.entries?.length > 0 
                        ? message.liveEventData.entries 
                        : prev.liveEventData?.entries || [],
                    }
                  : prev.liveEventData,
                pagingSize: message.pagingSize ?? prev.pagingSize,
                pagingInterval: message.pagingInterval ?? prev.pagingInterval,
              };
            });
          }
          
          if (message.type === 'paging_settings') {
            setState(prev => ({
              ...prev,
              pagingSize: message.pagingSize ?? prev.pagingSize,
              pagingInterval: message.pagingInterval ?? prev.pagingInterval,
            }));
          }

          if (message.type === 'device_config_update') {
            const data = message.data;
            const myDeviceId = registeredDeviceIdRef.current;
            if (data && data.deviceId === myDeviceId) {
              console.log(`[Display] Device config update: fieldPort=${data.fieldPort}, isBigBoard=${data.isBigBoard}`);
              if (data.fieldPort !== undefined) {
                setFieldPort(data.fieldPort ?? 4560);
              }
              if (data.isBigBoard !== undefined) {
                setIsBigBoard(!!data.isBigBoard);
              }
              if (data.pagingSize !== undefined) {
                setState(prev => ({ ...prev, pagingSize: data.pagingSize }));
              }
              if (data.pagingInterval !== undefined) {
                setState(prev => ({ ...prev, pagingInterval: data.pagingInterval }));
              }
              if (data.displayType !== undefined) {
                setState(prev => ({ ...prev, displayType: data.displayType }));
              }
            }
          }
          
          // Clock update - just pass through exactly what FinishLynx sends
          if (message.type === 'clock_update') {
            const data = message.data;
            if (data) {
              // Reset layout mode debouncing when system is armed
              // This ensures each new heat gets fresh scene switching
              if (data.command === 'armed') {
                console.log(`[Display] System ARMED - resetting layout mode for fresh scene switching`);
                currentLayoutModeRef.current = null;
              }
              
              setState(prev => ({
                ...prev,
                liveClockTime: data.time || '',
                liveClockCommand: data.command || '',
              }));
            }
          }
          
          // Scene mapping changed - update display without refresh when operator changes scene mappings
          if (message.type === 'scene_mapping_changed') {
            const { meetId: mappingMeetId, displayType: mappingDisplayType, displayMode: mappingDisplayMode, sceneId: newSceneId } = message;
            
            // Check if this mapping is for our meet and display type
            if (mappingMeetId === selectedMeetIdRef.current && mappingDisplayType === displayType) {
              console.log(`[Display] Scene mapping changed: ${mappingDisplayType}/${mappingDisplayMode} → scene ${newSceneId}`);
              
              // Update the local mappings ref immediately (don't wait for query refetch)
              // This ensures the next split detection or mode change uses the new mapping
              const existingMappings = sceneMappingsRef.current || [];
              const updatedMappings = existingMappings.filter(
                m => !(m.displayType === mappingDisplayType && m.displayMode === mappingDisplayMode)
              );
              updatedMappings.push({
                id: 0, // temporary ID
                meetId: mappingMeetId,
                displayType: mappingDisplayType,
                displayMode: mappingDisplayMode,
                sceneId: newSceneId,
              });
              sceneMappingsRef.current = updatedMappings;
              console.log(`[Display] Updated local mappings cache: ${updatedMappings.length} mappings`);
              
              // Also invalidate the query cache for consistency
              queryClient.invalidateQueries({ queryKey: [`/api/scene-template-mappings/${mappingMeetId}`] });
              
              // If this mapping is for the current layout mode, switch to the new scene immediately
              if (currentLayoutModeRef.current === mappingDisplayMode) {
                console.log(`[Display] Current mode matches (${mappingDisplayMode}) - switching to scene ${newSceneId}`);
                
                // Fetch the new scene data and switch
                fetch(`/api/layout-scenes/${newSceneId}`)
                  .then(res => res.json())
                  .then(scene => {
                    return fetch(`/api/layout-objects?sceneId=${newSceneId}`)
                      .then(res => res.json())
                      .then(objects => {
                        // Hydrate cache for instant rendering
                        queryClient.setQueryData(['/api/layout-scenes', newSceneId], scene);
                        queryClient.setQueryData(['/api/layout-objects', { sceneId: newSceneId }], objects);
                        
                        setState(prev => ({
                          ...prev,
                          currentTemplate: null,
                          currentSceneId: newSceneId,
                          currentSceneData: { scene, objects },
                        }));
                      });
                  })
                  .catch(err => console.error('[Display] Failed to fetch new scene:', err));
              }
            }
          }
          
          // Layout command from FinishLynx - switch scenes based on Scene Layout Mapping
          // Maps FinishLynx layout names to displayMode, then looks up scene from mappings
          // DEBOUNCING: Ignore duplicate layout commands to prevent glitchy transitions
          // Listen to 'layout_command_big' for big board displays, 'layout_command' for small boards
          const myLayoutChannel = isBigBoardRef.current ? 'layout_command_big' : 'layout_command';
          if (message.type === myLayoutChannel) {
            const layoutName = message.data?.layoutName?.toLowerCase() || '';
            
            // Map FinishLynx layout names to displayMode values used in Scene Layout Mappings:
            // start_list, running_time, track_results, field_results, field_standings, team_scores
            let displayMode: string | null = null;
            if (layoutName.includes('running') || layoutName.includes('time')) {
              displayMode = 'running_time';
            } else if (layoutName.includes('result')) {
              displayMode = 'track_results';
            } else if (layoutName.includes('start') || layoutName.includes('draw')) {
              displayMode = 'start_list';
            } else if (layoutName.includes('field') && layoutName.includes('standing')) {
              displayMode = 'field_standings';
            } else if (layoutName.includes('field')) {
              displayMode = 'field_results';
            } else if (layoutName.includes('team') || layoutName.includes('score')) {
              displayMode = 'team_scores';
            } else if (layoutName.includes('idle') || layoutName.includes('meettitle') || layoutName.includes('logo')) {
              displayMode = 'idle';
            }
            
            // Debounce: Skip if same mode as current (FinishLynx sends commands every 2s)
            if (displayMode && currentLayoutModeRef.current === displayMode) {
              return; // Ignore duplicate - already on this mode
            }
            
            // Log the transition
            console.log(`[Display] Layout command: "${layoutName}" → mode: ${displayMode} (was: ${currentLayoutModeRef.current})`);
            
            if (displayMode === 'idle') {
              // Logo/idle mode - use meet-logo template
              currentLayoutModeRef.current = displayMode;
              setState(prev => ({
                ...prev,
                currentLayoutMode: displayMode,
                currentTemplate: 'meet-logo',
                currentSceneId: null,
              }));
            } else if (displayMode && displayType) {
              // Update mode ref immediately for debouncing
              currentLayoutModeRef.current = displayMode;
              
              // Look up the scene from Scene Layout Mappings (use ref for current values)
              // For running_time, fall back to start_list scene if not configured (same layout, just with clock)
              let sceneId = getSceneForModeRef.current(displayType, displayMode);
              if (!sceneId && displayMode === 'running_time') {
                sceneId = getSceneForModeRef.current(displayType, 'start_list');
                console.log(`[Display] No running_time scene, falling back to start_list scene: ${sceneId}`);
              }
              console.log(`[Display] Mode "${displayMode}" → Scene ID: ${sceneId || 'none (using default template)'}`);
              
              if (sceneId) {
                // Use the configured scene - prefetch scene data for instant rendering
                const capturedMode = displayMode;
                (async () => {
                  try {
                    const [sceneRes, objectsRes] = await Promise.all([
                      fetch(`/api/layout-scenes/${sceneId}`),
                      fetch(`/api/layout-objects?sceneId=${sceneId}`),
                    ]);
                    // Verify we're still on this mode (in case a new command came in during fetch)
                    if (currentLayoutModeRef.current !== capturedMode) {
                      console.log(`[Display] Mode changed during fetch, ignoring stale data`);
                      return;
                    }
                    if (sceneRes.ok && objectsRes.ok) {
                      const scene = await sceneRes.json();
                      const objects = await objectsRes.json();
                      // Hydrate React Query cache for instant SceneCanvas rendering
                      queryClient.setQueryData(['/api/layout-scenes', sceneId], scene);
                      queryClient.setQueryData(['/api/layout-objects', { sceneId }], objects);
                      setState(prev => ({
                        ...prev,
                        currentLayoutMode: capturedMode,
                        currentSceneId: sceneId,
                        currentSceneData: { scene, objects },
                        currentTemplate: null,
                      }));
                    }
                  } catch (e) {
                    console.warn('[Display] Failed to prefetch scene data:', e);
                    if (currentLayoutModeRef.current === capturedMode) {
                      setState(prev => ({
                        ...prev,
                        currentLayoutMode: capturedMode,
                        currentSceneId: sceneId,
                        currentTemplate: null,
                      }));
                    }
                  }
                })();
              } else {
                // No scene configured - fall back to default template behavior
                let fallbackTemplate: string | null = null;
                if (displayMode === 'running_time') fallbackTemplate = 'running-time';
                else if (displayMode === 'track_results') fallbackTemplate = 'live-results';
                else if (displayMode === 'start_list') fallbackTemplate = 'BigBoard';
                
                if (fallbackTemplate) {
                  setState(prev => ({
                    ...prev,
                    currentLayoutMode: displayMode,
                    currentTemplate: fallbackTemplate,
                    currentSceneId: null,
                  }));
                }
              }
            }
          }
          
          // Handle scene updates for real-time layout changes
          if (message.type === 'scene_update') {
            const sceneId = message.data?.sceneId;
            if (sceneId) {
              console.log(`[Display] Scene ${sceneId} updated - refreshing display`);
              // Invalidate cache to force refetch
              queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', sceneId] });
              queryClient.invalidateQueries({ queryKey: ['/api/layout-objects', { sceneId }] });
              // If we have the full scene data, hydrate it directly for instant update
              if (message.data?.scene) {
                queryClient.setQueryData(['/api/layout-scenes', sceneId], message.data.scene);
              }
            }
          }
          
          // Handle track mode change updates from FinishLynx (event switching)
          // NO SMART LOGIC - just pass through exactly what FinishLynx sends
          // Listen to 'track_mode_change_big' for big board displays, 'track_mode_change' for small boards
          const myChannel = isBigBoardRef.current ? 'track_mode_change_big' : 'track_mode_change';
          if (message.type === myChannel) {
            const data = message.data;
            if (data) {
              const entries = data.entries || data.results || [];
              console.log(`[Display] Track mode change (${isBigBoardRef.current ? 'BIG BOARD' : 'standard'}): Event ${data.eventNumber}, mode=${data.mode}, ${entries.length} entries`);
              
              // Scene switching is now handled purely by layout commands from FinishLynx
              // No automatic split detection - FinishLynx controls which layout to show
              // This keeps the logic simple and predictable
              
              // Check if we need to switch to multi_track scene for multi-event results
              // This auto-switches the display to show points when a multi-event is detected
              const incomingDisplayMode = data.displayMode;
              if (incomingDisplayMode === 'multi_track' && currentLayoutModeRef.current !== 'multi_track' && displayType) {
                const multiTrackSceneId = getSceneForModeRef.current(displayType, 'multi_track');
                if (multiTrackSceneId) {
                  console.log(`[Display] Multi-event detected, switching to multi_track scene: ${multiTrackSceneId}`);
                  currentLayoutModeRef.current = 'multi_track';
                  (async () => {
                    try {
                      const [sceneRes, objectsRes] = await Promise.all([
                        fetch(`/api/layout-scenes/${multiTrackSceneId}`),
                        fetch(`/api/layout-objects?sceneId=${multiTrackSceneId}`),
                      ]);
                      if (sceneRes.ok && objectsRes.ok) {
                        const scene = await sceneRes.json();
                        const objects = await objectsRes.json();
                        queryClient.setQueryData(['/api/layout-scenes', multiTrackSceneId], scene);
                        queryClient.setQueryData(['/api/layout-objects', { sceneId: multiTrackSceneId }], objects);
                        setState(prev => ({
                          ...prev,
                          currentLayoutMode: 'multi_track',
                          currentSceneId: multiTrackSceneId,
                          currentSceneData: { scene, objects },
                          currentTemplate: null,
                        }));
                      }
                    } catch (e) {
                      console.warn('[Display] Failed to switch to multi_track scene:', e);
                    }
                  })();
                }
              } else if (incomingDisplayMode === 'track_results' && currentLayoutModeRef.current === 'multi_track' && displayType) {
                // Switch back to regular track_results if we were in multi_track
                const trackResultsSceneId = getSceneForModeRef.current(displayType, 'track_results');
                if (trackResultsSceneId) {
                  console.log(`[Display] Regular event, switching back to track_results scene: ${trackResultsSceneId}`);
                  currentLayoutModeRef.current = 'track_results';
                  (async () => {
                    try {
                      const [sceneRes, objectsRes] = await Promise.all([
                        fetch(`/api/layout-scenes/${trackResultsSceneId}`),
                        fetch(`/api/layout-objects?sceneId=${trackResultsSceneId}`),
                      ]);
                      if (sceneRes.ok && objectsRes.ok) {
                        const scene = await sceneRes.json();
                        const objects = await objectsRes.json();
                        queryClient.setQueryData(['/api/layout-scenes', trackResultsSceneId], scene);
                        queryClient.setQueryData(['/api/layout-objects', { sceneId: trackResultsSceneId }], objects);
                        setState(prev => ({
                          ...prev,
                          currentLayoutMode: 'track_results',
                          currentSceneId: trackResultsSceneId,
                          currentSceneData: { scene, objects },
                          currentTemplate: null,
                        }));
                      }
                    } catch (e) {
                      console.warn('[Display] Failed to switch to track_results scene:', e);
                    }
                  })();
                }
              }
              
              setState(prev => {
                const eventChanged = prev.liveEventData?.eventNumber !== data.eventNumber;
                return {
                  ...prev,
                  liveEventData: {
                    eventNumber: data.eventNumber,
                    eventName: data.eventName || prev.liveEventData?.eventName || '',
                    heat: data.heat ?? prev.liveEventData?.heat,
                    totalHeats: data.totalHeats ?? prev.liveEventData?.totalHeats,
                    round: data.round ?? prev.liveEventData?.round,
                    roundName: eventChanged ? (data.roundName ?? 'Finals') : (data.roundName ?? prev.liveEventData?.roundName),
                    mode: data.mode,
                    wind: data.wind,
                    distance: data.distance || prev.liveEventData?.distance,
                    entries: entries.length > 0 ? entries : (prev.liveEventData?.entries || []),
                    advanceByPlace: eventChanged ? (data.advanceByPlace ?? null) : (data.advanceByPlace ?? prev.liveEventData?.advanceByPlace),
                    advanceByTime: eventChanged ? (data.advanceByTime ?? null) : (data.advanceByTime ?? prev.liveEventData?.advanceByTime),
                    isMultiEvent: data.isMultiEvent,
                    eventType: data.eventType,
                    gender: data.gender,
                  },
                };
              });
            }
          }
          
          // Handle field mode change updates from FinishLynx/Athletic Field App
          // Check for both global field_mode_change and port-specific field_mode_change_{port}
          const isGlobalFieldChange = message.type === 'field_mode_change';
          const isPortSpecificFieldChange = message.type.startsWith('field_mode_change_');
          
          if (isGlobalFieldChange || isPortSpecificFieldChange) {
            const data = message.data;
            if (data) {
              // Port-based routing: In field mode, only show data from our selected port
              // Track mode displays ignore field data, field mode displays filter by port
              if (isFieldModeRef.current) {
                // Check if this data is for our port
                const dataPort = data.fieldPort;
                const myPort = fieldPortRef.current;
                
                // If data has a port and it doesn't match ours, ignore it
                if (dataPort && dataPort !== myPort) {
                  console.log(`[Display] Ignoring field data for port ${dataPort}, we're listening on ${myPort}`);
                  return;
                }
                
                // If this is a port-specific message, check if it's for our port
                if (isPortSpecificFieldChange) {
                  const messagePort = parseInt(message.type.replace('field_mode_change_', ''));
                  if (messagePort !== myPort) {
                    return; // Not for us
                  }
                }
                
                console.log(`[Display] Field mode change (port ${myPort}): Event ${data.eventNumber}, ${data.results?.length || 0} results`);
              } else {
                // Track mode - ignore field data
                console.log(`[Display] Ignoring field data - display is in track mode`);
                return;
              }
              
              // Determine the display mode based on field type (vertical vs horizontal) and multi-event status
              const isMultiEvent = data.isMultiEvent;
              const myFieldType = fieldDisplayTypeRef.current; // 'vertical' or 'horizontal'
              
              // Build the target display mode
              let targetDisplayMode: string;
              if (isMultiEvent) {
                targetDisplayMode = myFieldType === 'vertical' ? 'multi_field_vertical' : 'multi_field_horizontal';
              } else {
                targetDisplayMode = myFieldType === 'vertical' ? 'field_results_vertical' : 'field_results_horizontal';
              }
              
              // Fallback to generic modes if specific modes don't have mappings
              const fallbackMode = isMultiEvent ? 'multi_field' : 'field_results';
              
              // Try to switch to the appropriate scene
              if (currentLayoutModeRef.current !== targetDisplayMode && displayType) {
                let sceneId = getSceneForModeRef.current(displayType, targetDisplayMode);
                
                // Fallback to generic mode if specific mode not found
                if (!sceneId) {
                  sceneId = getSceneForModeRef.current(displayType, fallbackMode);
                  if (sceneId) {
                    console.log(`[Display] No scene for ${targetDisplayMode}, falling back to ${fallbackMode}`);
                    targetDisplayMode = fallbackMode;
                  }
                }
                
                if (sceneId) {
                  console.log(`[Display] Field event switching to ${targetDisplayMode} scene: ${sceneId}`);
                  currentLayoutModeRef.current = targetDisplayMode;
                  (async () => {
                    try {
                      const [sceneRes, objectsRes] = await Promise.all([
                        fetch(`/api/layout-scenes/${sceneId}`),
                        fetch(`/api/layout-objects?sceneId=${sceneId}`),
                      ]);
                      if (sceneRes.ok && objectsRes.ok) {
                        const scene = await sceneRes.json();
                        const objects = await objectsRes.json();
                        queryClient.setQueryData(['/api/layout-scenes', sceneId], scene);
                        queryClient.setQueryData(['/api/layout-objects', { sceneId: sceneId }], objects);
                        setState(prev => ({
                          ...prev,
                          currentLayoutMode: targetDisplayMode,
                          currentSceneId: sceneId,
                          currentSceneData: { scene, objects },
                          currentTemplate: null,
                        }));
                      }
                    } catch (e) {
                      console.warn(`[Display] Failed to switch to ${targetDisplayMode} scene:`, e);
                    }
                  })();
                }
              }
              
              setState(prev => ({
                ...prev,
                liveEventData: {
                  eventNumber: data.eventNumber,
                  eventName: data.eventName || prev.liveEventData?.eventName || '',
                  heat: prev.liveEventData?.heat,
                  totalHeats: prev.liveEventData?.totalHeats,
                  round: prev.liveEventData?.round,
                  mode: data.mode,
                  wind: data.wind,
                  distance: prev.liveEventData?.distance,
                  entries: data.results || [],
                  // Pass through multi-event info for points calculation
                  isMultiEvent: data.isMultiEvent,
                  eventType: data.eventType,
                  gender: data.gender,
                },
              }));
            }
          }
          
          // Handle field_standings (auto-standings from parsed LFF files after 120s idle)
          if (message.type === 'field_standings') {
            const data = message.data;
            if (data && isFieldModeRef.current) {
              // Port-based routing: only show standings for our port
              const myPort = fieldPortRef.current;
              if (data.fieldPort && data.fieldPort !== myPort) {
                console.log(`[Display] Ignoring field standings for port ${data.fieldPort}, we're listening on ${myPort}`);
                return;
              }
              
              console.log(`[Display] Field standings received: Event ${data.eventNumber}, Page ${data.currentPage}/${data.totalPages}, ${data.entries?.length} athletes`);
              
              // Switch to field_standings scene if we have a mapping for it
              if (displayType) {
                let sceneId = getSceneForModeRef.current(displayType, 'field_standings');
                let actualMode = 'field_standings';
                
                // Fallback to field_results if no field_standings scene
                if (!sceneId) {
                  sceneId = getSceneForModeRef.current(displayType, 'field_results');
                  actualMode = 'field_results';
                  if (sceneId) {
                    console.log(`[Display] No field_standings scene, falling back to field_results`);
                  }
                }
                
                // Only switch if we have a scene and it's different
                if (sceneId && currentLayoutModeRef.current !== actualMode) {
                  console.log(`[Display] Switching to ${actualMode} scene: ${sceneId}`);
                  currentLayoutModeRef.current = actualMode;
                  (async () => {
                    try {
                      const [sceneRes, objectsRes] = await Promise.all([
                        fetch(`/api/layout-scenes/${sceneId}`),
                        fetch(`/api/layout-objects?sceneId=${sceneId}`),
                      ]);
                      if (sceneRes.ok && objectsRes.ok) {
                        const scene = await sceneRes.json();
                        const objects = await objectsRes.json();
                        queryClient.setQueryData(['/api/layout-scenes', sceneId], scene);
                        queryClient.setQueryData(['/api/layout-objects', { sceneId }], objects);
                        setState(prev => ({
                          ...prev,
                          currentLayoutMode: actualMode,
                          currentSceneId: sceneId,
                          currentSceneData: { scene, objects },
                          currentTemplate: null,
                        }));
                      }
                    } catch (e) {
                      console.warn(`[Display] Failed to switch to ${actualMode} scene:`, e);
                    }
                  })();
                }
              }
              
              // Update the live event data with standings entries
              // Use the actual mode that was set (field_standings or field_results fallback)
              const usedMode = currentLayoutModeRef.current || 'field_standings';
              setState(prev => ({
                ...prev,
                liveEventData: {
                  eventNumber: data.eventNumber,
                  eventName: data.eventName || prev.liveEventData?.eventName || '',
                  heat: data.currentPage, // Use page as heat for display
                  totalHeats: data.totalPages,
                  mode: usedMode,
                  entries: data.entries || [],
                  isStandings: true,
                  isVerticalEvent: data.isVerticalEvent,
                  wind: undefined,
                  distance: prev.liveEventData?.distance,
                },
              }));
            }
          }
          
          // Handle start_list updates from FinishLynx (pre-race athlete list)
          // Pure pass-through: show exactly what FinishLynx sends, no accumulation
          // Listen to 'start_list_big' for big board displays, 'start_list' for small boards
          const myStartListChannel = isBigBoardRef.current ? 'start_list_big' : 'start_list';
          if (message.type === myStartListChannel) {
            const data = message.data;
            if (data) {
              console.log(`[Display] Start list (${isBigBoardRef.current ? 'BIG BOARD' : 'standard'}): Event ${data.eventNumber}, Heat ${data.heat}, ${data.entries?.length || 0} entries`);
              setState(prev => {
                const eventChanged = prev.liveEventData?.eventNumber !== data.eventNumber;
                return {
                  ...prev,
                  liveEventData: {
                    eventNumber: data.eventNumber,
                    eventName: data.eventName || prev.liveEventData?.eventName || '',
                    heat: data.heat,
                    totalHeats: data.totalHeats || prev.liveEventData?.totalHeats,
                    round: data.round || prev.liveEventData?.round,
                    roundName: eventChanged ? (data.roundName ?? 'Finals') : (data.roundName ?? prev.liveEventData?.roundName),
                    mode: 'start_list',
                    entries: data.entries || [],
                    wind: prev.liveEventData?.wind,
                    distance: data.distance || prev.liveEventData?.distance,
                    advanceByPlace: eventChanged ? (data.advanceByPlace ?? null) : (data.advanceByPlace ?? prev.liveEventData?.advanceByPlace),
                    advanceByTime: eventChanged ? (data.advanceByTime ?? null) : (data.advanceByTime ?? prev.liveEventData?.advanceByTime),
                    isMultiEvent: data.isMultiEvent ?? (eventChanged ? undefined : prev.liveEventData?.isMultiEvent),
                    eventType: data.eventType ?? (eventChanged ? undefined : prev.liveEventData?.eventType),
                    gender: data.gender ?? (eventChanged ? undefined : prev.liveEventData?.gender),
                  },
                };
              });
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        if (isCleaningUp) return;
        console.log('WebSocket closed, reconnecting in 3s...');
        setState(prev => ({ ...prev, isConnected: false }));
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      isCleaningUp = true;
      isConnectingRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [state.setupComplete, state.displayType, state.meetId]);

  const startDisplay = () => {
    if (selectedMeetId && deviceName.trim()) {
      saveLastDeviceName(deviceName.trim());
      deviceNameRef.current = deviceName.trim();
      setState(prev => ({ 
        ...prev, 
        displayType: 'P10',
        meetId: selectedMeetId,
        setupComplete: true 
      }));
    }
  };

  // Show setup screen if not complete
  if (!state.setupComplete) {
    const canStart = selectedMeetId && deviceName.trim();
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-white text-center mb-2">
            Display Device Setup
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Select a meet and enter a device name
          </p>
          
          {/* Meet Selector */}
          <div className="mb-10">
            <label className="block text-gray-300 text-sm font-medium mb-3 text-center">
              Select Meet
            </label>
            <div className="max-w-md mx-auto">
              <Select value={selectedMeetId || ''} onValueChange={setSelectedMeetId}>
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white h-14 text-lg" data-testid="select-meet">
                  <SelectValue placeholder="Choose a meet..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {meets?.map(meet => (
                    <SelectItem 
                      key={meet.id} 
                      value={meet.id}
                      className="text-white hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {meet.name}
                        {meet.status === 'active' && (
                          <span className="text-xs bg-green-600 px-2 py-0.5 rounded ml-2">Active</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Device Name Input */}
          <div className="mb-10">
            <Label className="block text-gray-300 text-sm font-medium mb-3 text-center">
              Device Name <span className="text-red-400">*</span>
            </Label>
            <div className="max-w-md mx-auto">
              <Input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., Finish Line P10, Home Stretch Board..."
                className="w-full bg-gray-900 border-gray-700 text-white h-14 text-lg placeholder:text-gray-500"
                data-testid="input-device-name"
              />
              <p className="text-gray-500 text-xs mt-2 text-center">
                This name will identify this display in the control panel
              </p>
            </div>
          </div>
          
          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={startDisplay}
              disabled={!canStart}
              className={`px-8 py-4 text-xl font-bold rounded-lg transition-all ${
                canStart 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              data-testid="button-start-display"
            >
              Start Display
            </button>
            {!canStart && (
              <p className="text-gray-500 text-sm mt-3">
                Please enter a device name and select a meet
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // At this point, setupComplete is true, so displayType and meetId are guaranteed to be set
  return (
    <DisplayRenderer
      displayType={state.displayType!}
      meetId={state.meetId}
      template={state.currentTemplate}
      sceneId={state.currentSceneId}
      currentSceneData={state.currentSceneData}
      eventId={state.currentEventId}
      deviceId={registeredDeviceId || 'pending'}
      isConnected={state.isConnected}
      liveClockTime={state.liveClockTime}
      liveEventData={state.liveEventData}
      pagingSize={state.pagingSize}
      pagingInterval={state.pagingInterval}
    />
  );
}

interface DisplayRendererProps {
  displayType: DisplayType;
  meetId: string | null;
  template: string | null;
  sceneId: number | null;
  currentSceneData: { scene: any; objects: any[] } | null;
  eventId: number | null;
  deviceId: string;
  isConnected: boolean;
  liveClockTime: string | null;
  liveEventData: LiveEventData | null;
  pagingSize: number;
  pagingInterval: number;
}

interface EventWithEntries extends Event {
  entries: any[];
}

function DisplayRenderer({ displayType, meetId, template, sceneId, currentSceneData, eventId, deviceId, isConnected, liveClockTime, liveEventData, pagingSize, pagingInterval }: DisplayRendererProps) {
  const { data: meet } = useQuery<Meet>({
    queryKey: ['/api/meets', meetId],
    enabled: !!meetId,
  });

  const { data: currentEventData } = useQuery<EventWithEntries>({
    queryKey: ['/api/events/current', meetId],
    enabled: !!meetId,
    refetchInterval: 5000,
  });

  const { data: specificEvent } = useQuery<EventWithEntries>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: teamStandings } = useQuery({
    queryKey: [`/api/meets/${meetId}/scoring/standings`],
    enabled: !!meetId,
    refetchInterval: 10000,
  });

  const currentEvent = specificEvent || currentEventData;
  
  // Generate a unique layout key for transition tracking
  // Only trigger transition when scene/template changes, not on data updates
  const layoutKey = useMemo(() => {
    if (sceneId) return `scene-${sceneId}`;
    if (template) return `template-${template}`;
    return 'idle';
  }, [sceneId, template]);
  
  // Use transition hook for smooth crossfade between layouts
  // Props are snapshotted inside the hook when transition starts
  const { state: transitionState, completeTransition, currentVersion: transitionVersion, snapshot } = useLayoutTransition(
    layoutKey,
    { template, sceneId, currentSceneData }
  );

  const renderContent = (overrideProps?: { template?: string | null; sceneId?: number | null; currentSceneData?: any }) => {
    const effectiveTemplate = overrideProps?.template !== undefined ? overrideProps.template : template;
    const effectiveSceneId = overrideProps?.sceneId !== undefined ? overrideProps.sceneId : sceneId;
    const effectiveSceneData = overrideProps?.currentSceneData !== undefined ? overrideProps.currentSceneData : currentSceneData;
    // If a custom scene is assigned, render it inline using SceneCanvas
    if (effectiveSceneId) {
      const capability = DISPLAY_CAPABILITIES[displayType];
      const isSingleAthleteDisplay = capability.maxAthletes === 1;
      
      // P10/P6: Fixed-size rendering at exact native resolution at position 0,0
      // BigBoard: Full viewport rendering with scaling
      if (isSingleAthleteDisplay) {
        return (
          <SceneCanvas
            sceneId={effectiveSceneId}
            scene={effectiveSceneData?.scene}
            objects={effectiveSceneData?.objects}
            meetId={meetId || undefined}
            liveEventData={liveEventData}
            liveClockTime={liveClockTime}
            pagingSize={pagingSize}
            pagingInterval={pagingInterval}
            displayWidth={capability.resolution.width}
            displayHeight={capability.resolution.height}
          />
        );
      }
      
      // BigBoard uses full viewport with scaling
      return (
        <SceneCanvas
          sceneId={effectiveSceneId}
          scene={effectiveSceneData?.scene}
          objects={effectiveSceneData?.objects}
          meetId={meetId || undefined}
          liveEventData={liveEventData}
          liveClockTime={liveClockTime}
          pagingSize={pagingSize}
          pagingInterval={pagingInterval}
        />
      );
    }
    
    const templateId = effectiveTemplate || '';
    const capability = DISPLAY_CAPABILITIES[displayType];
    const maxAthletes = capability.maxAthletes;
    const isSingleAthleteDisplay = maxAthletes === 1;

    const isTrackResults = templateId.includes('results') && !templateId.includes('field');
    const isFieldResults = templateId.includes('field-results') || templateId.includes('field');
    const isFieldStandings = templateId.includes('field-standings');
    const isRunningTimeTemplate = templateId.includes('running-time');
    const isStartList = templateId.includes('start-list');
    const isTeamScores = templateId === 'team-scores' || templateId.includes('team-scores');
    const isMeetLogo = templateId === 'meet-logo' || templateId.includes('meet-logo') || !effectiveTemplate;
    const isBigBoard = templateId.includes('live-results') || templateId.includes('BigBoard');
    const isBroadcast = displayType === 'Broadcast';

    if (isBroadcast) {
      return (
        <div className="w-screen h-screen">
          <BroadcastDisplay 
            meet={meet} 
            liveClockTime={liveClockTime || undefined}
            liveEventData={liveEventData}
          />
        </div>
      );
    }

    if (isMeetLogo || !effectiveTemplate) {
      // Get color scheme from meet or use defaults
      const primaryColor = meet?.primaryColor || '#0066CC';
      const secondaryColor = meet?.secondaryColor || '#003366';
      const hasLogo = !!meet?.logoUrl;
      
      // Create radial gradient background using meet colors - more prominent colors
      // Center spotlight with primary color, fading to secondary, with dark edges
      const gradientBackground = `radial-gradient(ellipse 80% 60% at center, ${primaryColor} 0%, ${secondaryColor} 50%, #0a0a0a 100%)`;
      
      // For P10/P6, show a compact status display
      if (isSingleAthleteDisplay) {
        // If logo exists, show logo with color scheme gradient
        if (hasLogo) {
          return (
            <div 
              className="flex items-center justify-center overflow-hidden"
              style={{ 
                width: `${capability.resolution.width}px`, 
                height: `${capability.resolution.height}px`,
                background: gradientBackground,
                fontFamily: "'Barlow Semi Condensed', sans-serif"
              }}
            >
              <img 
                src={meet.logoUrl!} 
                alt={meet?.name || 'Meet Logo'} 
                style={{
                  maxWidth: '85%',
                  maxHeight: '85%',
                  objectFit: 'contain',
                }}
              />
            </div>
          );
        }
        
        // No logo - show black screen with green dot and display name
        return (
          <div 
            className="bg-black flex items-center justify-center"
            style={{ 
              width: `${capability.resolution.width}px`, 
              height: `${capability.resolution.height}px`,
              fontFamily: "'Barlow Semi Condensed', sans-serif"
            }}
          >
            <div className="text-white text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <p className="text-sm font-bold" style={{ color: meet?.textColor || '#FFFFFF' }}>{displayType}</p>
            </div>
          </div>
        );
      }
      
      // BigBoard uses full screen
      // If logo exists, show logo with color scheme gradient
      if (hasLogo) {
        return (
          <div 
            className="h-screen w-screen flex items-center justify-center overflow-hidden"
            style={{ 
              background: gradientBackground,
              fontFamily: "'Barlow Semi Condensed', sans-serif" 
            }}
          >
            <div className="text-center">
              <img 
                src={meet.logoUrl!} 
                alt={meet?.name || 'Meet Logo'} 
                className="max-h-[60vh] max-w-[80vw] mx-auto object-contain"
              />
            </div>
          </div>
        );
      }
      
      // No logo - show black screen with green dot and display name
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <div className="text-white text-center" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
            <div className={`w-6 h-6 rounded-full mx-auto mb-4 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <p className="text-3xl font-bold" style={{ color: meet?.textColor || '#FFFFFF' }}>
              {displayType === 'BigBoard' ? 'Big Board' : displayType}
            </p>
            <p className="text-sm text-gray-500 mt-2">{capability.resolution.width}x{capability.resolution.height}</p>
          </div>
        </div>
      );
    }

    if (isTeamScores) {
      const standings = teamStandings as any[] | undefined;
      if (!standings || standings.length === 0) {
        return (
          <div className="h-screen w-screen bg-black flex items-center justify-center">
            <div className="text-white text-center" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
              <h1 className="text-4xl font-bold mb-4">Team Standings</h1>
              <p className="text-xl text-gray-400">No scoring data available</p>
            </div>
          </div>
        );
      }
      return (
        <div className="h-screen w-screen bg-black overflow-hidden p-8" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
          <h1 className="text-5xl font-bold text-white text-center mb-8">
            {meet?.name || 'Team Standings'}
          </h1>
          <div className="max-w-4xl mx-auto">
            {standings.slice(0, 10).map((team: any, index: number) => (
              <div 
                key={team.teamId || index}
                className="flex items-center justify-between py-5 px-8 mb-3 rounded text-white"
                style={{
                  background: `linear-gradient(90deg, 
                    rgba(0, 140, 220, 0.65) 0%, 
                    rgba(0, 160, 255, 0.45) 40%, 
                    rgba(0, 140, 220, 0.25) 80%,
                    transparent 100%
                  )`,
                }}
              >
                <div className="flex items-center gap-6">
                  <span className="text-5xl font-black w-16" style={{ fontWeight: 900 }}>{index + 1}</span>
                  {team.teamLogo && (
                    <img src={team.teamLogo} alt="" className="h-12 w-12 object-contain" />
                  )}
                  <span className="text-3xl font-bold">{team.teamName || team.name}</span>
                </div>
                <span className="text-5xl font-black text-yellow-400" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {team.totalPoints || team.points || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Get color scheme from meet for waiting states
    const waitingPrimaryColor = meet?.primaryColor || '#0066CC';
    const waitingSecondaryColor = meet?.secondaryColor || '#003366';
    const waitingHasLogo = !!meet?.logoUrl;
    const waitingGradient = `radial-gradient(ellipse 80% 60% at center, ${waitingPrimaryColor} 0%, ${waitingSecondaryColor} 50%, #0a0a0a 100%)`;
    
    const waitingState = isSingleAthleteDisplay ? (
      waitingHasLogo ? (
        <div 
          className="flex items-center justify-center overflow-hidden"
          style={{ 
            width: `${capability.resolution.width}px`, 
            height: `${capability.resolution.height}px`,
            background: waitingGradient,
            fontFamily: "'Barlow Semi Condensed', sans-serif"
          }}
        >
          <img 
            src={meet!.logoUrl!} 
            alt={meet?.name || 'Meet Logo'} 
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              objectFit: 'contain',
            }}
          />
        </div>
      ) : (
        <div 
          className="bg-black flex items-center justify-center"
          style={{ 
            width: `${capability.resolution.width}px`, 
            height: `${capability.resolution.height}px`,
            fontFamily: "'Barlow Semi Condensed', sans-serif"
          }}
        >
          <div className="text-white text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <p className="text-sm font-bold">{displayType}</p>
          </div>
        </div>
      )
    ) : (
      waitingHasLogo ? (
        <div 
          className="h-screen w-screen flex items-center justify-center overflow-hidden"
          style={{ 
            background: waitingGradient,
            fontFamily: "'Barlow Semi Condensed', sans-serif" 
          }}
        >
          <div className="text-center">
            <img 
              src={meet!.logoUrl!} 
              alt={meet?.name || 'Meet Logo'} 
              className="max-h-[60vh] max-w-[80vw] mx-auto object-contain"
            />
            <div className="mt-8">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isConnected ? 'bg-blue-900/50 text-blue-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : 'bg-yellow-400'}`}></span>
                Waiting for event...
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen w-screen bg-black flex items-center justify-center">
          <div className="text-white text-center" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
            <div className={`w-6 h-6 rounded-full mx-auto mb-4 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <p className="text-3xl font-bold">{displayType === 'BigBoard' ? 'Big Board' : displayType}</p>
            <p className="text-sm text-gray-500 mt-2">Waiting for event...</p>
          </div>
        </div>
      )
    );

    if (isSingleAthleteDisplay && (currentEvent || liveEventData)) {
      // Use live FinishLynx data directly when currentEvent isn't loaded yet
      const eventWithLiveName = currentEvent 
        ? { ...currentEvent, name: liveEventData?.eventName || '' }
        : {
            id: 0,
            name: liveEventData?.eventName || '',
            eventType: 'track',
            status: liveEventData?.mode === 'results' ? 'completed' : 'in_progress',
            entries: (liveEventData?.entries || []).map((entry: any, idx: number) => {
              const firstName = entry.firstName || entry.name?.split(' ')[0] || '';
              const lastName = entry.lastName || entry.name?.split(' ').slice(1).join(' ') || entry.name || '';
              const teamName = entry.affiliation || entry.team || '';
              return {
                id: idx,
                finalLane: entry.lane || idx + 1,
                finalPlace: entry.place,
                finalMark: entry.time || entry.mark || entry.result || '',
                athlete: {
                  firstName,
                  lastName,
                  team: teamName,
                },
                team: {
                  name: teamName,
                  logoUrl: teamName ? `/logos/NCAA/${teamName}.png` : null,
                },
              };
            }),
          };
      if (isFieldResults || isFieldStandings) {
        return <SingleAthleteField event={eventWithLiveName as any} meet={meet} focusIndex={0} />;
      }
      return <SingleAthleteTrack event={eventWithLiveName as any} meet={meet} focusIndex={0} />;
    }

    if (isRunningTimeTemplate) {
      // Use live FinishLynx data directly - always available before currentEvent loads
      const eventWithLiveName = currentEvent 
        ? { ...currentEvent, name: liveEventData?.eventName || '' }
        : liveEventData ? {
            id: 0,
            name: liveEventData.eventName || '',
            eventType: 'track',
            status: liveEventData.mode === 'results' ? 'completed' : 'in_progress',
            entries: [],
          }
        : null;
      return <RunningTime event={eventWithLiveName as any} meet={meet} liveTime={liveClockTime || undefined} />;
    }

    if ((isFieldResults || isFieldStandings) && currentEvent) {
      // Always override event name with live FinishLynx data
      const eventWithLiveName = {
        ...currentEvent,
        name: liveEventData?.eventName || '', // Always use live data for event name
      };
      return <FieldSideBySide event={eventWithLiveName as any} meet={meet} />;
    }

    // For track results, start lists, and BigBoard - always use live data for event name (never database)
    if ((isTrackResults || isStartList || isBigBoard) && (currentEvent || liveEventData)) {
      // Always override event name with live FinishLynx data
      const eventWithLiveName = currentEvent 
        ? {
            ...currentEvent,
            name: liveEventData?.eventName || '', // Always use live data for event name
          }
        : {
            id: 0,
            name: liveEventData?.eventName || '',
            eventType: 'track',
            status: liveEventData?.mode === 'results' ? 'completed' : 'in_progress',
            entries: (liveEventData?.entries || []).map((entry: any, idx: number) => {
              const firstName = entry.firstName || entry.name?.split(' ')[0] || '';
              const lastName = entry.lastName || entry.name?.split(' ').slice(1).join(' ') || entry.name || '';
              const teamName = entry.affiliation || entry.team || '';
              return {
                id: idx,
                finalLane: entry.lane || idx + 1,
                finalPlace: entry.place,
                finalMark: entry.time || entry.mark || entry.result || '',
                athlete: {
                  firstName,
                  lastName,
                  team: teamName,
                },
                team: {
                  name: teamName,
                  logoUrl: teamName ? `/logos/NCAA/${teamName}.png` : null,
                },
              };
            }),
            wind: liveEventData?.wind,
            heat: liveEventData?.heat,
            round: liveEventData?.round,
          };
      return <BigBoard event={eventWithLiveName as any} meet={meet} pagingSize={pagingSize} pagingIntervalMs={pagingInterval * 1000} />;
    }

    if (!currentEvent && !liveEventData && (isTrackResults || isFieldResults || isStartList || isFieldStandings)) {
      return waitingState;
    }

    if (isSingleAthleteDisplay && !currentEvent && !liveEventData) {
      return waitingState;
    }

    // Default fallback - show logo with color scheme or black screen with green dot
    const fallbackPrimaryColor = meet?.primaryColor || '#0066CC';
    const fallbackSecondaryColor = meet?.secondaryColor || '#003366';
    const fallbackHasLogo = !!meet?.logoUrl;
    const fallbackGradient = `radial-gradient(ellipse 80% 60% at center, ${fallbackPrimaryColor} 0%, ${fallbackSecondaryColor} 50%, #0a0a0a 100%)`;
    
    if (fallbackHasLogo) {
      return (
        <div 
          className="h-screen w-screen flex items-center justify-center overflow-hidden"
          style={{ 
            background: fallbackGradient,
            fontFamily: "'Barlow Semi Condensed', sans-serif" 
          }}
        >
          <div className="text-center">
            <img 
              src={meet!.logoUrl!} 
              alt={meet?.name || 'Meet Logo'} 
              className="max-h-[60vh] max-w-[80vw] mx-auto object-contain"
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="text-white text-center" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
          <div className={`w-6 h-6 rounded-full mx-auto mb-4 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <p className="text-3xl font-bold">{displayType === 'BigBoard' ? 'Big Board' : displayType}</p>
          <p className="text-sm text-gray-500 mt-2">{capability.resolution.width}x{capability.resolution.height}</p>
        </div>
      </div>
    );
  };

  // Get fixed dimensions for P10/P6 displays
  const resolution = DISPLAY_CAPABILITIES[displayType].resolution;
  const isFixedSizeDisplay = displayType === 'P10' || displayType === 'P6';

  // Ref for incoming layer to attach transitionend handler
  const incomingLayerRef = useRef<HTMLDivElement>(null);
  
  // Handle transitionend event to complete the transition - use { once: true } and version binding
  useEffect(() => {
    const layer = incomingLayerRef.current;
    if (!layer || transitionState.phase !== 'transitioning') return;
    
    const capturedVersion = transitionState.version;
    
    const handleTransitionEnd = (e: TransitionEvent) => {
      // Only handle opacity transitions on this exact element (not children)
      if (e.propertyName !== 'opacity' || e.target !== layer) return;
      completeTransition(capturedVersion);
    };
    
    // Use { once: true } so the handler is automatically removed after firing
    layer.addEventListener('transitionend', handleTransitionEnd, { once: true });
    
    // Cleanup removes handler if a new version starts before animation completes
    return () => layer.removeEventListener('transitionend', handleTransitionEnd);
  }, [transitionState.phase, transitionState.version, completeTransition]);

  // Render content - instant layout switching for crisp transitions
  // Debouncing in the layout command handler prevents glitchy rapid switches
  const renderWithTransition = () => {
    // Just render current content directly - no crossfade animation
    // The debouncing logic ensures we only switch when the layout actually changes
    return renderContent();
  };

  if (isFixedSizeDisplay) {
    // P10 and P6 use exact pixel dimensions at position 0,0
    return (
      <div className="bg-black min-h-screen">
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${resolution.width}px`,
            height: `${resolution.height}px`,
            overflow: 'hidden',
            backgroundColor: '#000',
          }}
        >
          {renderWithTransition()}
        </div>
      </div>
    );
  }

  // BigBoard uses full screen
  return (
    <div className="h-screen w-screen bg-black overflow-hidden" style={{ position: 'relative' }}>
      {renderWithTransition()}
    </div>
  );
}
