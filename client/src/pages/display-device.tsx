import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, Tv, LayoutGrid } from "lucide-react";
import type { Meet, Event } from "@shared/schema";
import { LiveResultsBoard } from "@/components/display/templates/LiveResultsBoard";
import { LiveTimeBoard } from "@/components/display/templates/LiveTimeBoard";
import { FieldEventBoard } from "@/components/display/templates/FieldEventBoard";
import { StandingsBoard } from "@/components/display/templates/StandingsBoard";

type DisplayType = 'P10' | 'P6' | 'BigBoard';

interface DisplayDeviceState {
  displayType: DisplayType | null;
  meetId: string | null;
  currentTemplate: string | null;
  currentEventId: number | null;
}

export default function DisplayDevice() {
  const [state, setState] = useState<DisplayDeviceState>({
    displayType: null,
    meetId: null,
    currentTemplate: null,
    currentEventId: null,
  });
  const [deviceId] = useState(() => `display-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: meets } = useQuery<Meet[]>({
    queryKey: ['/api/meets'],
  });

  const activeMeet = meets?.find(m => m.status === 'active') || meets?.[0];

  useEffect(() => {
    if (state.displayType && activeMeet) {
      setState(prev => ({ ...prev, meetId: activeMeet.id }));
      connectWebSocket();
    }
  }, [state.displayType, activeMeet?.id]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Display device connected');
      const displayName = `${state.displayType} Display - ${deviceId.slice(-6)}`;
      ws.send(JSON.stringify({
        type: 'register_display_device',
        meetId: activeMeet?.id,
        deviceName: displayName,
        displayType: state.displayType,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
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
      console.log('WebSocket closed, reconnecting in 3s...');
      setTimeout(connectWebSocket, 3000);
    };

    return () => {
      ws.close();
    };
  };

  const selectDisplayType = (type: DisplayType) => {
    setState(prev => ({ ...prev, displayType: type }));
  };

  if (!state.displayType) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-white text-center mb-2">
            Display Device Setup
          </h1>
          <p className="text-gray-400 text-center mb-12">
            Select the type of display connected to this computer
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="bg-gray-900 border-gray-700 cursor-pointer transition-all hover:border-blue-500 hover:bg-gray-800"
              onClick={() => selectDisplayType('P10')}
              data-testid="select-p10"
            >
              <CardHeader className="text-center">
                <Monitor className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                <CardTitle className="text-white text-2xl">P10 Display</CardTitle>
                <CardDescription className="text-gray-400">
                  192 x 96 pixels
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-500">
                  Small LED matrix display for basic timing and results
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-900 border-gray-700 cursor-pointer transition-all hover:border-green-500 hover:bg-gray-800"
              onClick={() => selectDisplayType('P6')}
              data-testid="select-p6"
            >
              <CardHeader className="text-center">
                <Tv className="w-16 h-16 mx-auto text-green-400 mb-4" />
                <CardTitle className="text-white text-2xl">P6 Display</CardTitle>
                <CardDescription className="text-gray-400">
                  288 x 144 pixels
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-500">
                  Medium LED display with more detail and rows
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-900 border-gray-700 cursor-pointer transition-all hover:border-purple-500 hover:bg-gray-800"
              onClick={() => selectDisplayType('BigBoard')}
              data-testid="select-bigboard"
            >
              <CardHeader className="text-center">
                <LayoutGrid className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <CardTitle className="text-white text-2xl">Big Board</CardTitle>
                <CardDescription className="text-gray-400">
                  1920 x 1080 pixels
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-gray-500">
                  Full HD stadium display with maximum detail
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DisplayRenderer
      displayType={state.displayType}
      meetId={state.meetId}
      template={state.currentTemplate}
      eventId={state.currentEventId}
      deviceId={deviceId}
    />
  );
}

interface DisplayRendererProps {
  displayType: DisplayType;
  meetId: string | null;
  template: string | null;
  eventId: number | null;
  deviceId: string;
}

interface EventWithEntries extends Event {
  entries: any[];
}

function DisplayRenderer({ displayType, meetId, template, eventId, deviceId }: DisplayRendererProps) {
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
    const isTrackResults = templateId.includes('results') && !templateId.includes('field');
    const isFieldResults = templateId.includes('field-results');
    const isFieldStandings = templateId.includes('field-standings');
    const isRunningTime = templateId.includes('running-time');
    const isStartList = templateId.includes('start-list');
    const isTeamScores = templateId === 'team-scores' || templateId.includes('team-scores');
    const isMeetLogo = templateId === 'meet-logo' || templateId.includes('meet-logo') || !template;

    if (isMeetLogo) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <div className="text-white text-center p-8">
            {meet?.logoUrl ? (
              <img src={meet.logoUrl} alt={meet.name} className="max-h-[60vh] mx-auto mb-6" />
            ) : null}
            <h1 className="text-6xl font-bold mb-4">{meet?.name || 'Track Meet'}</h1>
            {meet?.location && <p className="text-2xl text-gray-300">{meet.location}</p>}
            {meet?.startDate && (
              <p className="text-xl text-gray-400 mt-2">
                {new Date(meet.startDate).toLocaleDateString()}
              </p>
            )}
            <div className="mt-8 text-sm text-gray-600">
              <p>Display: {displayType}</p>
              <p>Device ID: {deviceId.slice(-8)}</p>
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
            <div className="text-white text-center">
              <h1 className="text-4xl font-bold mb-4">Team Standings</h1>
              <p className="text-xl text-gray-400">No scoring data available</p>
            </div>
          </div>
        );
      }
      return (
        <div className="h-screen w-screen bg-black overflow-hidden p-8">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            {meet?.name || 'Team Standings'}
          </h1>
          <div className="max-w-4xl mx-auto">
            {standings.slice(0, 10).map((team: any, index: number) => (
              <div 
                key={team.teamId || index}
                className="flex items-center justify-between py-4 px-6 mb-2 bg-gray-900 rounded text-white"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold w-12">{index + 1}</span>
                  <span className="text-2xl">{team.teamName || team.name}</span>
                </div>
                <span className="text-3xl font-bold text-yellow-400">
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
        <div className="text-white text-center">
          <p className="text-xl">Display Ready</p>
          <p className="text-sm text-gray-400 mt-2">{template}</p>
          <p className="text-xs text-gray-500 mt-1">Waiting for event data...</p>
        </div>
      </div>
    );

    if (isRunningTime && currentEvent) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <LiveTimeBoard
            event={currentEvent}
            meet={meet}
            mode="running"
          />
        </div>
      );
    }

    if ((isTrackResults || isStartList) && currentEvent) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <LiveResultsBoard
            event={currentEvent}
            meet={meet}
            mode={isStartList ? 'start-list' : 'results'}
          />
        </div>
      );
    }

    if ((isFieldResults || isFieldStandings) && currentEvent) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <FieldEventBoard
            event={currentEvent}
            meet={meet}
            mode={isFieldResults ? 'attempts' : 'standings'}
          />
        </div>
      );
    }

    if (currentEvent && (isTrackResults || isFieldResults || isRunningTime || isStartList || isFieldStandings)) {
      return waitingState;
    }

    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="text-white text-center p-8">
          {meet?.logoUrl ? (
            <img src={meet.logoUrl} alt={meet.name} className="max-h-[60vh] mx-auto mb-6" />
          ) : null}
          <h1 className="text-6xl font-bold mb-4">{meet?.name || 'Track Meet'}</h1>
          {meet?.location && <p className="text-2xl text-gray-300">{meet.location}</p>}
          <div className="mt-8 text-sm text-gray-600">
            <p>Display: {displayType}</p>
            <p>Device ID: {deviceId.slice(-8)}</p>
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
