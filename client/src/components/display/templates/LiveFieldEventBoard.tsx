import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { FieldEventBoard } from "./FieldEventBoard";
import type { Meet, Event, EventWithEntries, FieldEventAthlete, FieldEventMark, FieldHeight, Entry, Athlete } from "@shared/schema";
import type { HorizontalStanding, VerticalStanding } from "@/lib/fieldStandings";
import { calculateHorizontalStandings, calculateVerticalStandings, isHeightEvent } from "@/lib/fieldStandings";
import type { LiveFieldEventData } from "@/lib/fieldEventAdapter";

interface LiveFieldEventBoardProps {
  sessionId: number;
  event: Event;
  meet?: Meet;
  mode?: string;
}

interface FieldEventUpdateMessage {
  type: 'field_event_update';
  sessionId: number;
  data: {
    athletes: (FieldEventAthlete & { entry?: Entry; athlete?: Athlete })[];
    marks: FieldEventMark[];
    heights?: FieldHeight[];
    currentAthleteId: number | null;
    sessionStatus: string;
    eventType: string;
  };
}

export function LiveFieldEventBoard({ sessionId, event, meet, mode = "live" }: LiveFieldEventBoardProps) {
  const ws = useWebSocket();
  const [fieldEventData, setFieldEventData] = useState<LiveFieldEventData | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const processUpdate = useCallback((data: FieldEventUpdateMessage['data']) => {
    const { athletes, marks, heights, currentAthleteId, sessionStatus, eventType } = data;
    
    const isVertical = eventType === 'vertical' || (heights && heights.length > 0);
    
    let standings: HorizontalStanding[] | VerticalStanding[];
    if (isVertical && heights) {
      standings = calculateVerticalStandings(athletes, marks, heights);
    } else {
      standings = calculateHorizontalStandings(athletes, marks);
    }

    const liveData: LiveFieldEventData = {
      athletes,
      marks,
      heights,
      standings,
      currentAthleteId,
      sessionStatus,
      eventType: isVertical ? 'vertical' : 'horizontal',
    };

    setFieldEventData(liveData);
    setLastUpdate(new Date());
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    if (!ws) {
      setIsConnecting(true);
      return;
    }

    const handleMessage = (messageEvent: MessageEvent) => {
      try {
        const message = JSON.parse(messageEvent.data);
        
        if (message.type === 'field_event_update' && message.sessionId === sessionId) {
          processUpdate(message.update);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.addEventListener('message', handleMessage);

    ws.send(JSON.stringify({
      type: 'subscribe_field_session',
      sessionId,
    }));

    setIsConnecting(true);

    return () => {
      ws.removeEventListener('message', handleMessage);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe_field_session',
          sessionId,
        }));
      }
    };
  }, [ws, sessionId, processUpdate]);

  const placeholderEvent: EventWithEntries = {
    ...event,
    entries: [],
  };

  if (isConnecting && !fieldEventData) {
    return (
      <div 
        className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center"
        data-testid="live-field-connecting"
      >
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[hsl(var(--display-accent))]/20 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--display-accent))]/40 animate-ping" />
            </div>
          </div>
          <p 
            className="text-[hsl(var(--display-text))] font-semibold text-2xl"
            style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}
          >
            Connecting to Field Event...
          </p>
          <p className="text-[hsl(var(--display-text))]/60 mt-2">
            Session ID: {sessionId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <FieldEventBoard
      event={placeholderEvent}
      meet={meet}
      mode={mode}
      fieldEventData={fieldEventData || undefined}
    />
  );
}
