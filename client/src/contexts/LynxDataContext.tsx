import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./WebSocketContext";

export interface LynxEntry {
  line: number;
  place?: string;
  lane?: string;
  bib?: string;
  name?: string;
  affiliation?: string;
  time?: string;
  deltaTime?: string;
  cumulativeSplit?: string;
  lastSplit?: string;
  lapsToGo?: string;
  license?: string;
  reactionTime?: string;
  speed?: string;
  pace?: string;
  bestSplit?: string;
}

export interface LynxHeader {
  status?: string;
  eventName?: string;
  wind?: string;
  eventNumber?: string;
  roundNumber?: string;
  heatNumber?: string;
  startType?: string;
  participantCount?: string;
}

export interface LynxPage {
  mode: 'start_list' | 'running_time' | 'results' | 'idle';
  header: LynxHeader;
  entries: LynxEntry[];
  clock: string;
  clockRunning: boolean;
  wind?: string;
  timestamp: number;
}

interface LynxDataContextType {
  page: LynxPage | null;
  clock: string;
  clockRunning: boolean;
  layoutCommand: string | null;
  isConnected: boolean;
}

const defaultPage: LynxPage = {
  mode: 'idle',
  header: {},
  entries: [],
  clock: '0:00.00',
  clockRunning: false,
  timestamp: 0,
};

const LynxDataContext = createContext<LynxDataContextType>({
  page: null,
  clock: '0:00.00',
  clockRunning: false,
  layoutCommand: null,
  isConnected: false,
});

export function LynxDataProvider({ children }: { children: React.ReactNode }) {
  const ws = useWebSocket();
  const [page, setPage] = useState<LynxPage | null>(null);
  const [clock, setClock] = useState<string>('0:00.00');
  const [clockRunning, setClockRunning] = useState<boolean>(false);
  const [layoutCommand, setLayoutCommand] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!ws) {
      setIsConnected(false);
      return;
    }

    setIsConnected(ws.readyState === WebSocket.OPEN);

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'lynx_page':
            if (message.data) {
              const pageData = message.data as LynxPage;
              setPage(pageData);
              setClock(pageData.clock || '0:00.00');
              setClockRunning(pageData.clockRunning || false);
              console.log('[LynxData] Page update:', pageData.mode, 'entries:', pageData.entries?.length);
            }
            break;

          case 'lynx_clock':
            if (message.data) {
              setClock(message.data.time || '0:00.00');
              setClockRunning(message.data.isRunning || false);
            }
            break;

          case 'layout-command':
            if (message.data?.layout) {
              setLayoutCommand(message.data.layout);
              console.log('[LynxData] Layout command:', message.data.layout);
            }
            break;

          case 'live_time':
            if (message.time) {
              setClock(message.time);
              setClockRunning(true);
            }
            break;
        }
      } catch (error) {
        console.error('[LynxData] Failed to parse message:', error);
      }
    };

    const handleOpen = () => setIsConnected(true);
    const handleClose = () => setIsConnected(false);

    ws.addEventListener('message', handleMessage);
    ws.addEventListener('open', handleOpen);
    ws.addEventListener('close', handleClose);

    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('close', handleClose);
    };
  }, [ws]);

  return (
    <LynxDataContext.Provider value={{ page, clock, clockRunning, layoutCommand, isConnected }}>
      {children}
    </LynxDataContext.Provider>
  );
}

export function useLynxData() {
  return useContext(LynxDataContext);
}

export function useLynxClock() {
  const { clock, clockRunning } = useContext(LynxDataContext);
  return { clock, clockRunning };
}

export function useLynxPage() {
  const { page } = useContext(LynxDataContext);
  return page;
}
