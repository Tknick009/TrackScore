import { useQuery } from "@tanstack/react-query";
import { useOverlayMessages } from "@/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import { Wind } from "lucide-react";

interface ScoreBugProps {
  config: {
    eventId?: string;
    meetId?: string;
  };
}

export function ScoreBugOverlay({ config }: ScoreBugProps) {
  const overlayMessages = useOverlayMessages();
  const [visible, setVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(config);
  
  useEffect(() => {
    if (overlayMessages?.type === 'overlay_show' && overlayMessages.overlayType === 'scorebug') {
      setVisible(true);
      if (overlayMessages.config) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.config }));
      }
    }
    if (overlayMessages?.type === 'overlay_hide' && overlayMessages.overlayType === 'scorebug') {
      setVisible(false);
    }
    if (overlayMessages?.type === 'overlay_update' && overlayMessages.overlayType === 'scorebug') {
      if (overlayMessages.data) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.data }));
      }
    }
  }, [overlayMessages]);
  
  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", currentConfig.eventId, "with-entries"],
    enabled: !!currentConfig.eventId && visible,
    refetchInterval: visible ? 2000 : false
  });
  
  if (!visible || !event) return null;
  
  const topResults = event.entries
    ?.filter((e: any) => e.finalPlace && e.finalPlace <= 3)
    .sort((a: any, b: any) => (a.finalPlace || 0) - (b.finalPlace || 0))
    .slice(0, 3) || [];
  
  return (
    <div className="absolute top-8 right-8" data-testid="overlay-scorebug">
      <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 shadow-2xl border border-white/20 min-w-80">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
          <div className="text-white text-xl font-bold" data-testid="text-event-name">{event.name}</div>
          {event.status === 'in_progress' && (
            <div className="flex items-center gap-2 text-red-500" data-testid="status-live">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">LIVE</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {topResults.map((entry: any, index: number) => (
            <div key={entry.id} className="flex items-center justify-between" data-testid={`result-${index + 1}`}>
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  entry.finalPlace === 1 ? 'text-yellow-400' :
                  entry.finalPlace === 2 ? 'text-gray-300' :
                  'text-orange-400'
                }`} data-testid={`place-${index + 1}`}>
                  {entry.finalPlace}
                </div>
                <div>
                  <div className="text-white text-lg font-medium" data-testid={`athlete-name-${index + 1}`}>
                    {entry.athlete?.firstName} {entry.athlete?.lastName}
                  </div>
                  {entry.athlete?.team && (
                    <div className="text-white/60 text-sm" data-testid={`team-name-${index + 1}`}>
                      {entry.athlete.team.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-white text-xl font-mono" data-testid={`time-${index + 1}`}>
                {entry.finalTime || entry.finalMark}
              </div>
            </div>
          ))}
        </div>
        
        {event.wind && (
          <div className="mt-3 pt-2 border-t border-white/20 flex items-center gap-2 text-white/70 text-sm" data-testid="wind-reading">
            <Wind className="h-4 w-4" />
            <span>Wind: {event.wind} m/s</span>
          </div>
        )}
      </div>
    </div>
  );
}
