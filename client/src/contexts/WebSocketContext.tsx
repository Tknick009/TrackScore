import { createContext, useContext, useEffect, useState } from "react";

// Context exposes raw WebSocket for backward compatibility
const WebSocketContext = createContext<WebSocket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    return () => {
      socket.close();
    };
  }, []);

  // Context value is raw WebSocket for backward compatibility
  return <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>;
}

// Hook returns raw WebSocket (backward compatible)
export function useWebSocket() {
  return useContext(WebSocketContext);
}

// NEW: Dedicated hook for overlay messages
export function useOverlayMessages() {
  const ws = useWebSocket();
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        // Only track overlay-specific messages
        if (data.type === 'overlay_show' || data.type === 'overlay_hide' || data.type === 'overlay_update') {
          setLastMessage(data);
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  return lastMessage;
}
