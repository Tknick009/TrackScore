import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ 
  ws: null,
  isConnected: false 
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true); // Track whether to reconnect
  const maxReconnectDelay = 30000; // 30 seconds max
  const baseDelay = 1000; // 1 second base

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const newWs = new WebSocket(wsUrl);
    wsRef.current = newWs;

    newWs.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
      setWs(newWs);
    };

    newWs.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setWs(null);
      wsRef.current = null;
      
      // Only attempt reconnection if we should (not during intentional shutdown)
      if (!shouldReconnectRef.current) {
        console.log("Skipping reconnection (intentional shutdown)");
        return;
      }
      
      // Attempt reconnection with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(2, reconnectAttemptsRef.current),
        maxReconnectDelay
      );
      
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    };

    newWs.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'hytek_import_complete') {
          console.log(`[WebSocket] HyTek import complete for meet ${data.meetId}, invalidating cache`);
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
          queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
          queryClient.invalidateQueries({ queryKey: ["/api/hytek-mdb-watcher"] });
          queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
          queryClient.invalidateQueries({ queryKey: ["/api/public/meets"] });
        }
      } catch (e) {}
    });

    newWs.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true; // Enable reconnection
    connect();

    return () => {
      // Disable reconnection before cleanup
      shouldReconnectRef.current = false;
      
      // Cleanup timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Cleanup socket using ref (always has latest value)
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ ws, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook returns raw WebSocket (backward compatible)
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  return context.ws;
}

// NEW: Hook to get WebSocket connection status
export function useWebSocketConnection() {
  return useContext(WebSocketContext);
}

// NEW: Dedicated hook for overlay messages
export function useOverlayMessages() {
  const ws = useWebSocket();
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        // Only track overlay-specific messages
        if (data.type === 'overlay_show' || data.type === 'overlay_hide' || data.type === 'overlay_update') {
          setMessage(data);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  return message;
}
