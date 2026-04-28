import { useQuery } from "@tanstack/react-query";
import { useOverlayMessages } from "@/contexts/WebSocketContext";
import { useEffect, useState } from "react";

interface TeamStandingsProps {
  config: {
    meetId?: string;
  };
}

export function TeamStandingsOverlay({ config }: TeamStandingsProps) {
  const overlayMessages = useOverlayMessages();
  const [visible, setVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(config);
  
  useEffect(() => {
    if (overlayMessages?.type === 'overlay_show' && overlayMessages.overlayType === 'team-standings') {
      setVisible(true);
      if (overlayMessages.config) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.config }));
      }
    }
    if (overlayMessages?.type === 'overlay_hide' && overlayMessages.overlayType === 'team-standings') {
      setVisible(false);
    }
    if (overlayMessages?.type === 'overlay_update' && overlayMessages.overlayType === 'team-standings') {
      if (overlayMessages.data) {
        setCurrentConfig(prev => ({ ...prev, ...overlayMessages.data }));
      }
    }
  }, [overlayMessages]);
  
  const { data: standings } = useQuery<any[]>({
    queryKey: ["/api/team-scores", currentConfig.meetId],
    enabled: !!currentConfig.meetId && visible,
    refetchInterval: visible ? 5000 : false
  });
  
  const topTeams = standings?.slice(0, 5) || [];
  
  if (!visible || topTeams.length === 0) return null;
  
  return (
    <div className="absolute top-8 left-8" data-testid="overlay-team-standings">
      <div className="bg-black/85 backdrop-blur-md rounded-lg p-5 shadow-2xl border border-white/20 min-w-96">
        <div className="text-white text-2xl font-bold mb-4 pb-3 border-b border-white/20" data-testid="text-title">
          Team Standings
        </div>
        
        <div className="space-y-3">
          {topTeams.map((team: any, index: number) => (
            <div key={team.id} className="flex items-center justify-between" data-testid={`team-${index + 1}`}>
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-bold ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-orange-400' :
                  'text-white/80'
                }`} data-testid={`position-${index + 1}`}>
                  {index + 1}
                </div>
                <div className="text-white text-xl font-medium" data-testid={`team-name-${index + 1}`}>
                  {team.name}
                </div>
              </div>
              <div className="text-white text-2xl font-bold" data-testid={`points-${index + 1}`}>
                {team.totalPoints || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
