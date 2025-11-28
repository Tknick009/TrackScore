import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventWithEntries, DisplayBoardState, WSMessage, Event } from "@shared/schema";
import { DisplayBoard } from "@/components/display-board";
import { MultiEventDisplay } from "@/components/display/MultiEventDisplay";

interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  meetId: string;
  assignedEventId: string | null;
  status: string;
}

function generateDeviceName(): string {
  const adjectives = ['Main', 'Field', 'Track', 'Stadium', 'Finish', 'Start', 'Pit', 'Tower', 'Press'];
  const nouns = ['Display', 'Board', 'Screen', 'Monitor', 'View'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

interface AssignedEventState {
  event: EventWithEntries | null;
  meet?: any;
}

function SingleEventDisplay({ deviceName, meetId }: { deviceName: string; meetId: string | null }) {
  const [boardState, setBoardState] = useState<DisplayBoardState>({
    mode: "live",
    timestamp: Date.now(),
  });
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceRegistration | null>(null);
  const [assignedEvent, setAssignedEvent] = useState<AssignedEventState | null>(null);

  // Fallback: fetch current event if WebSocket not connected and no assigned event
  const { data: fallbackEvent } = useQuery<Event>({
    queryKey: ["/api/events/current"],
    refetchInterval: 5000,
    enabled: (!ws || ws.readyState !== WebSocket.OPEN) && !assignedEvent?.event,
  });

  const registerDevice = useCallback((websocket: WebSocket) => {
    if (meetId && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'register_display_device',
        meetId,
        deviceName,
      }));
      console.log(`Registering display device: ${deviceName} for meet ${meetId}`);
    }
  }, [meetId, deviceName]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
      registerDevice(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === "board_update") {
          // Only update from global board state if we don't have an assigned event
          if (!assignedEvent?.event) {
            setBoardState(message.data as DisplayBoardState);
          }
        }
        
        if (message.type === "device_registered") {
          const data = message.data as DeviceRegistration;
          setDeviceInfo(data);
          console.log(`Device registered: ${data.deviceName} (${data.deviceId})`);
          
          // If there's already an assigned event, fetch it
          if (data.assignedEventId) {
            fetch(`/api/events/${data.assignedEventId}`)
              .then(res => res.json())
              .then(eventData => {
                setAssignedEvent({ event: eventData, meet: boardState.meet });
                console.log(`Loaded assigned event: ${eventData.name}`);
              })
              .catch(err => console.error('Failed to load assigned event:', err));
          }
        }
        
        if (message.type === "display_assignment") {
          const { deviceId, eventId, event: eventData, meet: meetData } = message.data;
          if (deviceInfo && deviceId === deviceInfo.deviceId) {
            if (eventId && eventData) {
              setAssignedEvent({ event: eventData, meet: meetData });
              console.log(`Event assigned to this device: ${eventData.name}`);
            } else {
              // Cleared assignment - go back to following global state
              setAssignedEvent(null);
              console.log('Event assignment cleared, following current event');
            }
          }
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

    const heartbeatInterval = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'device_heartbeat' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [registerDevice, deviceInfo?.deviceId, assignedEvent?.event]);

  // Priority: assigned event > global board state > fallback
  const displayEvent = assignedEvent?.event || boardState.currentEvent || (fallbackEvent as EventWithEntries);
  const displayMeet = assignedEvent?.meet || boardState.meet;

  return (
    <div className="bg-background" data-testid="display-board">
      <DisplayBoard
        event={displayEvent}
        meet={displayMeet}
        mode={boardState.mode}
      />
    </div>
  );
}

export default function Display() {
  const params = new URLSearchParams(window.location.search);
  const layoutId = params.get('layoutId');
  const meetId = params.get('meetId');
  const deviceNameParam = params.get('deviceName');
  
  const [deviceName] = useState(() => {
    const stored = sessionStorage.getItem('displayDeviceName');
    if (stored) return stored;
    const name = deviceNameParam || generateDeviceName();
    sessionStorage.setItem('displayDeviceName', name);
    return name;
  });

  // Multi-event mode - ONLY render MultiEventDisplay
  if (layoutId && meetId) {
    return <MultiEventDisplay layoutId={layoutId} meetId={meetId} />;
  }

  // Single-event mode - ONLY render SingleEventDisplay
  return <SingleEventDisplay deviceName={deviceName} meetId={meetId} />;
}
