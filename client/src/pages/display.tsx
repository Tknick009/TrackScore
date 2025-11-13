import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventWithEntries, DisplayBoardState, WSMessage, Event } from "@shared/schema";
import { DisplayBoard } from "@/components/display-board";

export default function Display() {
  const [boardState, setBoardState] = useState<DisplayBoardState>({
    mode: "live",
    timestamp: Date.now(),
  });
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fallback: fetch current event if WebSocket not connected
  const { data: fallbackEvent } = useQuery<Event>({
    queryKey: ["/api/events/current"],
    refetchInterval: 5000, // Poll every 5 seconds as fallback
    enabled: !ws || ws.readyState !== WebSocket.OPEN,
  });

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        
        if (message.type === "board_update") {
          setBoardState(message.data);
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // Use WebSocket data if available, otherwise use fallback
  const displayEvent = boardState.currentEvent || (fallbackEvent as EventWithEntries);

  return (
    <div className="bg-background" data-testid="display-board">
      <DisplayBoard
        event={displayEvent}
        meet={boardState.meet}
        mode={boardState.mode}
      />
    </div>
  );
}
