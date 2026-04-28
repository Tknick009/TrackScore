import { useQuery } from "@tanstack/react-query";
import { useOverlayMessages } from "@/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import { Athlete, Event } from "@shared/schema";

interface LowerThirdProps {
  config: {
    athleteId?: string;
    eventId?: string;
    meetId?: string;
    variant?: string;
  };
}

export function LowerThirdOverlay({ config }: LowerThirdProps) {
  const overlayMessages = useOverlayMessages();
  const [visible, setVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(config);
  
  const { data: athlete } = useQuery<Athlete & { team?: { name: string } }>({
    queryKey: ["/api/athletes", currentConfig.athleteId],
    enabled: !!currentConfig.athleteId && visible
  });
  
  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", currentConfig.eventId],
    enabled: !!currentConfig.eventId && visible
  });
  
  useEffect(() => {
    if (overlayMessages?.type === 'overlay_hide' && overlayMessages.overlayType === 'lower-third') {
      setVisible(false);
    }
    if (overlayMessages?.type === 'overlay_show' && overlayMessages.overlayType === 'lower-third') {
      setVisible(true);
      if (overlayMessages.config) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.config }));
      }
    }
    if (overlayMessages?.type === 'overlay_update' && overlayMessages.overlayType === 'lower-third') {
      if (overlayMessages.data) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.data }));
      }
    }
  }, [overlayMessages]);
  
  if (!visible || !athlete) return null;
  
  return (
    <div className="absolute bottom-20 left-10 animate-in slide-in-from-left duration-500" data-testid="overlay-lower-third">
      <div className="bg-gradient-to-r from-primary/95 to-primary/80 backdrop-blur-sm px-8 py-4 rounded-r-lg border-l-4 border-accent shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="text-white text-4xl font-bold tracking-tight" data-testid="text-athlete-name">
              {athlete.firstName} {athlete.lastName}
            </div>
            {athlete.team && (
              <div className="text-white/90 text-2xl font-medium" data-testid="text-team-name">
                {athlete.team.name}
              </div>
            )}
            {event && (
              <div className="text-white/80 text-xl" data-testid="text-event-name">
                {event.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
