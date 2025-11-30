import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getTemplateById, type LayoutTemplate } from '@shared/layout-templates';
import type { EventWithEntries, Meet } from '@shared/schema';
import { useWebSocket, useWebSocketConnection } from '@/contexts/WebSocketContext';
import { 
  LiveResultsBoard, 
  LiveTimeBoard, 
  FieldEventBoard, 
  StandingsBoard 
} from '@/components/display/templates';
import { Loader2 } from 'lucide-react';

export default function PresetDisplay() {
  const params = useParams<{ templateId: string }>();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const meetId = searchParams.get('meetId');
  const eventId = searchParams.get('eventId');
  
  const [template, setTemplate] = useState<LayoutTemplate | null>(null);
  const [currentEvent, setCurrentEvent] = useState<EventWithEntries | null>(null);
  const [runningTime, setRunningTime] = useState<string>('0:00.00');
  const [liveData, setLiveData] = useState<any>(null);
  
  const ws = useWebSocket();
  const { isConnected } = useWebSocketConnection();

  useEffect(() => {
    if (params.templateId) {
      const found = getTemplateById(params.templateId);
      setTemplate(found || null);
    }
  }, [params.templateId]);

  const { data: meet } = useQuery<Meet>({
    queryKey: [`/api/meets/${meetId}`],
    enabled: !!meetId,
  });

  const { data: fetchedCurrentEvent, refetch: refetchEvent } = useQuery<EventWithEntries>({
    queryKey: eventId ? [`/api/events/${eventId}/entries`] : ['/api/events/current'],
    enabled: true,
    refetchInterval: 5000,
  });

  const { data: teamStandings } = useQuery({
    queryKey: [`/api/meets/${meetId}/scoring/standings`],
    enabled: !!meetId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (fetchedCurrentEvent) {
      setCurrentEvent(fetchedCurrentEvent);
    }
  }, [fetchedCurrentEvent]);

  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'board_update' && data.event) {
          setCurrentEvent(data.event);
        }
        
        if (data.type === 'live_time') {
          setRunningTime(data.time || '0:00.00');
        }
        
        if (data.type === 'live_data') {
          setLiveData(data);
          if (data.runningTime) {
            setRunningTime(data.runningTime);
          }
        }

        if (data.type === 'event_update') {
          refetchEvent();
        }
      } catch (e) {
      }
    };
    
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, refetchEvent]);

  if (!template) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-xl">Loading display...</p>
          <p className="text-sm text-gray-400 mt-2">Template: {params.templateId}</p>
        </div>
      </div>
    );
  }

  const renderDisplay = () => {
    const templateId = template.id;
    const isTrackResults = templateId.includes('results') && !templateId.includes('field');
    const isFieldResults = templateId.includes('field-results');
    const isFieldStandings = templateId.includes('field-standings');
    const isRunningTime = templateId.includes('running-time');
    const isStartList = templateId.includes('start-list');
    const isTeamScores = templateId.includes('team-scores');
    const isMeetLogo = templateId.includes('meet-logo');

    const waitingState = (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Display Ready</p>
          <p className="text-sm text-gray-400 mt-2">{template.name}</p>
          <p className="text-xs text-gray-500 mt-1">Waiting for event data...</p>
        </div>
      </div>
    );

    if (isMeetLogo) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <div className="text-white text-center p-8">
            {meet?.logoUrl ? (
              <img src={meet.logoUrl} alt={meet.name} className="max-h-[60vh] mx-auto mb-6" />
            ) : null}
            <h1 className="text-6xl font-bold mb-4">{meet?.name || 'Track Meet'}</h1>
            {meet?.location && <p className="text-2xl text-gray-300">{meet.location}</p>}
            {meet?.startDate && <p className="text-xl text-gray-400 mt-2">{new Date(meet.startDate).toLocaleDateString()}</p>}
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

    return waitingState;
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {renderDisplay()}
      
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded text-sm">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
