import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { LowerThirdOverlay } from "@/components/overlays/lower-third";
import { ScoreBugOverlay } from "@/components/overlays/scorebug";
import { AthleteSpotlightOverlay } from "@/components/overlays/athlete-spotlight";
import { TeamStandingsOverlay } from "@/components/overlays/team-standings";

export default function OverlayPage() {
  const [, params] = useRoute("/overlay/:type");
  const overlayType = params?.type;
  const ws = useWebSocket();
  const [identified, setIdentified] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const meetId = searchParams.get('meetId') || undefined;
  const eventId = searchParams.get('eventId') || undefined;
  const athleteId = searchParams.get('athleteId') || undefined;
  const teamId = searchParams.get('teamId') || undefined;
  const variant = searchParams.get('variant') || 'default';
  
  const config = { meetId, eventId, athleteId, teamId, variant };
  
  // Identify as overlay client when WebSocket connects
  useEffect(() => {
    if (!ws || identified) return;
    
    // Wait for socket to be OPEN before sending identify
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'identify', clientType: 'overlay' }));
      setIdentified(true);
      console.log("Overlay identified as display client");
    } else if (ws.readyState === WebSocket.CONNECTING) {
      // Wait for open event
      const handleOpen = () => {
        ws.send(JSON.stringify({ type: 'identify', clientType: 'overlay' }));
        setIdentified(true);
        console.log("Overlay identified as display client");
      };
      ws.addEventListener('open', handleOpen);
      return () => ws.removeEventListener('open', handleOpen);
    }
  }, [ws, identified]);
  
  useEffect(() => {
    document.body.classList.add('overlay-page');
    return () => {
      document.body.classList.remove('overlay-page');
    };
  }, []);
  
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none bg-transparent" data-testid="overlay-container">
      {overlayType === 'lower-third' && <LowerThirdOverlay config={config} />}
      {overlayType === 'scorebug' && <ScoreBugOverlay config={config} />}
      {overlayType === 'athlete-spotlight' && <AthleteSpotlightOverlay config={config} />}
      {overlayType === 'team-standings' && <TeamStandingsOverlay config={config} />}
    </div>
  );
}
