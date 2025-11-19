import { useQuery } from "@tanstack/react-query";
import { useOverlayMessages } from "@/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import { Athlete } from "@shared/schema";

interface AthleteSpotlightProps {
  config: {
    athleteId?: string;
    meetId?: string;
  };
}

export function AthleteSpotlightOverlay({ config }: AthleteSpotlightProps) {
  const overlayMessages = useOverlayMessages();
  const [visible, setVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(config);
  
  useEffect(() => {
    if (overlayMessages?.type === 'overlay_show' && overlayMessages.overlayType === 'athlete-spotlight') {
      setVisible(true);
      if (overlayMessages.config) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.config }));
      }
    }
    if (overlayMessages?.type === 'overlay_hide' && overlayMessages.overlayType === 'athlete-spotlight') {
      setVisible(false);
    }
    if (overlayMessages?.type === 'overlay_update' && overlayMessages.overlayType === 'athlete-spotlight') {
      if (overlayMessages.data) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.data }));
      }
    }
  }, [overlayMessages]);
  
  const { data: athlete } = useQuery<Athlete & { team?: { name: string }; division?: { name: string } }>({
    queryKey: ["/api/athletes", currentConfig.athleteId],
    enabled: !!currentConfig.athleteId && visible
  });
  
  const { data: photo } = useQuery<{ url: string }>({
    queryKey: ["/api/athletes", currentConfig.athleteId, "photo"],
    enabled: !!currentConfig.athleteId && visible
  });
  
  if (!visible || !athlete) return null;
  
  return (
    <div className="absolute bottom-10 right-10 animate-in slide-in-from-right duration-500" data-testid="overlay-athlete-spotlight">
      <div className="bg-gradient-to-br from-black/90 to-black/70 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 min-w-96">
        <div className="flex items-start gap-6">
          {photo?.url && (
            <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-primary flex-shrink-0">
              <img 
                src={photo.url} 
                alt={`${athlete.firstName} ${athlete.lastName}`}
                className="w-full h-full object-cover"
                data-testid="img-athlete-photo"
              />
            </div>
          )}
          
          <div className="flex-1">
            <div className="text-white text-3xl font-bold mb-1" data-testid="text-athlete-name">
              {athlete.firstName} {athlete.lastName}
            </div>
            
            {athlete.team && (
              <div className="text-white/80 text-xl mb-2" data-testid="text-team-name">
                {athlete.team.name}
              </div>
            )}
            
            {athlete.bibNumber && (
              <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-white text-sm font-medium mb-3" data-testid="text-bib-number">
                BIB #{athlete.bibNumber}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-white/70 text-sm">
              {athlete.gender && (
                <div data-testid="text-gender">{athlete.gender === 'M' ? 'Male' : athlete.gender === 'F' ? 'Female' : 'Mixed'}</div>
              )}
              {athlete.division && (
                <div data-testid="text-division">Div: {athlete.division.name}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
