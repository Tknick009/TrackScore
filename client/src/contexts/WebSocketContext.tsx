import { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext<WebSocket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Use window.location.host which includes the port in all environments
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
