import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Tv, LayoutGrid, Calendar } from "lucide-react";
import type { Meet, Event } from "@shared/schema";
import { 
  BigBoard,
  RunningTime,
  RunningResults,
  CompiledResults,
  FieldSideBySide,
  SingleAthleteTrack,
  SingleAthleteField,
} from "@/components/display/templates";
import { 
  type DisplayType, 
  DISPLAY_CAPABILITIES,
  isTemplateCompatible,
} from "@/lib/displayCapabilities";

interface DisplayDeviceState {
  displayType: DisplayType | null;
  meetId: string | null;
  currentTemplate: string | null;
  currentEventId: number | null;
  isConnected: boolean;
  setupComplete: boolean;
}

// Storage helpers for device identity
const DEVICE_STORAGE_KEY = 'display_device_id';

function getStoredDeviceId(): string | null {
  // Try localStorage first
  try {
    const fromLocalStorage = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (fromLocalStorage) return fromLocalStorage;
  } catch (e) {}
  
  // Try cookie as fallback
  const cookieMatch = document.cookie.match(new RegExp(`${DEVICE_STORAGE_KEY}=([^;]+)`));
  if (cookieMatch) return cookieMatch[1];
  
  return null;
}

function saveDeviceId(deviceId: string): void {
  // Save to localStorage
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch (e) {}
  
  // Save to cookie with 1 year expiry
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${DEVICE_STORAGE_KEY}=${deviceId};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export default function DisplayDevice() {
  const [state, setState] = useState<DisplayDeviceState>({
    displayType: null,
    meetId: null,
    currentTemplate: null,
    currentEventId: null,
    isConnected: false,
    setupComplete: false,
  });
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(null);
  const [registeredDeviceId, setRegisteredDeviceId] = useState<string | null>(() => getStoredDeviceId());
  const wsRef = useRef<WebSocket | null>(null);

  const { data: meets } = useQuery<Meet[]>({
    queryKey: ['/api/meets'],
  });

  const selectedMeetIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update meetId ref when selected meet changes
  useEffect(() => {
    if (selectedMeetId) {
      selectedMeetIdRef.current = selectedMeetId;
    }
  }, [selectedMeetId]);

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
        
        // Use stored device ID if available, otherwise server will create a new one
        const storedId = getStoredDeviceId();
        const displayName = `${displayType} Display`;
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
            // Save the server-issued device ID for future reconnections
            if (message.data?.deviceId) {
              saveDeviceId(message.data.deviceId);
              setRegisteredDeviceId(message.data.deviceId);
              console.log('Saved device ID for reconnection:', message.data.deviceId);
            }
          }
          
          if (message.type === 'display_command') {
            setState(prev => ({
              ...prev,
              currentTemplate: message.template || prev.currentTemplate,
              currentEventId: message.eventId || prev.currentEventId,
            }));
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

  const selectDisplayType = (type: DisplayType) => {
    setState(prev => ({ ...prev, displayType: type }));
  };

  const startDisplay = () => {
    if (selectedMeetId && state.displayType) {
      setState(prev => ({ 
        ...prev, 
        meetId: selectedMeetId,
        setupComplete: true 
      }));
    }
  };

  // Show setup screen if not complete
  if (!state.setupComplete) {
    const canStart = selectedMeetId && state.displayType;
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-white text-center mb-2">
            Display Device Setup
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Select a meet and display type
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
          
          {/* Display Type Selection */}
          <label className="block text-gray-300 text-sm font-medium mb-3 text-center">
            Select Display Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card 
              className={`bg-gray-900 border-2 cursor-pointer transition-all hover:bg-gray-800 ${
                state.displayType === 'P10' ? 'border-blue-500 bg-gray-800' : 'border-gray-700 hover:border-blue-500'
              }`}
              onClick={() => selectDisplayType('P10')}
              data-testid="select-p10"
            >
              <CardHeader className="text-center">
                <Monitor className={`w-12 h-12 mx-auto mb-2 ${state.displayType === 'P10' ? 'text-blue-400' : 'text-gray-400'}`} />
                <CardTitle className="text-white text-xl">P10 Display</CardTitle>
                <CardDescription className="text-gray-400">
                  192 x 96 pixels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className={`bg-gray-900 border-2 cursor-pointer transition-all hover:bg-gray-800 ${
                state.displayType === 'P6' ? 'border-green-500 bg-gray-800' : 'border-gray-700 hover:border-green-500'
              }`}
              onClick={() => selectDisplayType('P6')}
              data-testid="select-p6"
            >
              <CardHeader className="text-center">
                <Tv className={`w-12 h-12 mx-auto mb-2 ${state.displayType === 'P6' ? 'text-green-400' : 'text-gray-400'}`} />
                <CardTitle className="text-white text-xl">P6 Display</CardTitle>
                <CardDescription className="text-gray-400">
                  288 x 144 pixels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className={`bg-gray-900 border-2 cursor-pointer transition-all hover:bg-gray-800 ${
                state.displayType === 'BigBoard' ? 'border-purple-500 bg-gray-800' : 'border-gray-700 hover:border-purple-500'
              }`}
              onClick={() => selectDisplayType('BigBoard')}
              data-testid="select-bigboard"
            >
              <CardHeader className="text-center">
                <LayoutGrid className={`w-12 h-12 mx-auto mb-2 ${state.displayType === 'BigBoard' ? 'text-purple-400' : 'text-gray-400'}`} />
                <CardTitle className="text-white text-xl">Big Board</CardTitle>
                <CardDescription className="text-gray-400">
                  1920 x 1080 pixels
                </CardDescription>
              </CardHeader>
            </Card>
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
                Please select both a meet and display type
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
      eventId={state.currentEventId}
      deviceId={registeredDeviceId || 'pending'}
      isConnected={state.isConnected}
    />
  );
}

interface DisplayRendererProps {
  displayType: DisplayType;
  meetId: string | null;
  template: string | null;
  eventId: number | null;
  deviceId: string;
  isConnected: boolean;
}

interface EventWithEntries extends Event {
  entries: any[];
}

function DisplayRenderer({ displayType, meetId, template, eventId, deviceId, isConnected }: DisplayRendererProps) {
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

  const renderContent = () => {
    const templateId = template || '';
    const capability = DISPLAY_CAPABILITIES[displayType];
    const maxAthletes = capability.maxAthletes;
    const isSingleAthleteDisplay = maxAthletes === 1;

    const isTrackResults = templateId.includes('results') && !templateId.includes('field');
    const isFieldResults = templateId.includes('field-results') || templateId.includes('field');
    const isFieldStandings = templateId.includes('field-standings');
    const isRunningTimeTemplate = templateId.includes('running-time');
    const isStartList = templateId.includes('start-list');
    const isTeamScores = templateId === 'team-scores' || templateId.includes('team-scores');
    const isMeetLogo = templateId === 'meet-logo' || templateId.includes('meet-logo') || !template;
    const isBigBoard = templateId.includes('live-results') || templateId.includes('BigBoard');

    if (isMeetLogo || !template) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <div className="text-white text-center p-8" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
            {meet?.logoUrl ? (
              <img src={meet.logoUrl} alt={meet.name} className="max-h-[50vh] mx-auto mb-6" />
            ) : null}
            <h1 className="text-5xl font-bold mb-4">{meet?.name || 'Track Meet'}</h1>
            {meet?.location && <p className="text-2xl text-gray-300">{meet.location}</p>}
            {meet?.startDate && (
              <p className="text-xl text-gray-400 mt-2">
                {new Date(meet.startDate).toLocaleDateString()}
              </p>
            )}
            <div className="mt-12 text-sm">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isConnected ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
                {isConnected ? 'Connected - Ready for Commands' : 'Connecting...'}
              </div>
              <div className="mt-4 text-gray-600 text-xs">
                <p>{displayType} Display</p>
                <p>ID: {deviceId.slice(-8)}</p>
              </div>
            </div>
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

    const waitingState = (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-center" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
          <h2 className="text-3xl font-bold mb-4">{meet?.name || 'Track Meet'}</h2>
          <p className="text-xl mb-2">{template}</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isConnected ? 'bg-blue-900/50 text-blue-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : 'bg-yellow-400'}`}></span>
            Waiting for event data...
          </div>
        </div>
      </div>
    );

    if (isSingleAthleteDisplay && currentEvent) {
      if (isFieldResults || isFieldStandings) {
        return <SingleAthleteField event={currentEvent as any} meet={meet} focusIndex={0} />;
      }
      return <SingleAthleteTrack event={currentEvent as any} meet={meet} focusIndex={0} />;
    }

    if (isRunningTimeTemplate && currentEvent) {
      return <RunningTime event={currentEvent as any} meet={meet} />;
    }

    if ((isFieldResults || isFieldStandings) && currentEvent) {
      return <FieldSideBySide event={currentEvent as any} meet={meet} />;
    }

    if ((isTrackResults || isStartList || isBigBoard) && currentEvent) {
      const showSplits = templateId.includes('splits');
      return <BigBoard event={currentEvent as any} meet={meet} showSplits={showSplits} />;
    }

    if (!currentEvent && (isTrackResults || isFieldResults || isRunningTimeTemplate || isStartList || isFieldStandings)) {
      return waitingState;
    }

    if (isSingleAthleteDisplay && !currentEvent) {
      return waitingState;
    }

    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="text-white text-center p-8" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
          {meet?.logoUrl ? (
            <img src={meet.logoUrl} alt={meet.name} className="max-h-[50vh] mx-auto mb-6" />
          ) : null}
          <h1 className="text-5xl font-bold mb-4">{meet?.name || 'Track Meet'}</h1>
          {meet?.location && <p className="text-2xl text-gray-300">{meet.location}</p>}
          <div className="mt-12 text-sm">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isConnected ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
              {isConnected ? 'Connected - Ready for Commands' : 'Connecting...'}
            </div>
            <div className="mt-4 text-gray-600 text-xs">
              <p>{displayType} Display</p>
              <p>ID: {deviceId.slice(-8)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {renderContent()}
    </div>
  );
}
