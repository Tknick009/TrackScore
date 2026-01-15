import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pause, Play } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  type: string;
  data: string;
  seqNum?: number;
}

interface RawLogEntry {
  id: number;
  timestamp: string;
  portType: string;
  seqNum?: number;
  data: string;
}

export default function LynxTerminal() {
  const [rawLogs, setRawLogs] = useState<RawLogEntry[]>([]);
  const [processedLogs, setProcessedLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const rawScrollRef = useRef<HTMLDivElement>(null);
  const processedScrollRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const lastRawIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Poll for raw forwarder data
  useEffect(() => {
    const pollRawLogs = async () => {
      if (isPaused) return;
      try {
        const res = await fetch(`/api/lynx/raw-log?since=${lastRawIdRef.current}`);
        const data = await res.json();
        if (data.entries && data.entries.length > 0) {
          setRawLogs(prev => {
            const newLogs = [...prev, ...data.entries];
            if (newLogs.length > 500) return newLogs.slice(-500);
            return newLogs;
          });
          lastRawIdRef.current = data.lastId;
        }
      } catch (e) {
        // ignore
      }
    };

    const interval = setInterval(pollRawLogs, 200);
    return () => clearInterval(interval);
  }, [isPaused]);

  // WebSocket for processed data
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addProcessedLog("system", "Connected", "");
      };

      ws.onmessage = (event) => {
        if (isPaused) return;
        
        try {
          const data = JSON.parse(event.data);
          const type = data.type || "unknown";
          
          // Skip clock updates for cleaner view
          if (type === "clock_update") return;
          
          let displayData = "";
          if (type === "start_list" && data.data?.entries) {
            const entries = data.data.entries;
            displayData = `E${data.data.eventNumber} H${data.data.heat}: ${entries.length} entries\n`;
            entries.forEach((e: any, i: number) => {
              displayData += `  L${i+1}: Lane=${e.lane||'?'} ${e.name?.substring(0,15)||''}\n`;
            });
          } else if (type === "layout_command") {
            displayData = `Layout: ${data.data?.layoutName}`;
          } else {
            displayData = JSON.stringify(data.data || data).substring(0, 200);
          }
          
          addProcessedLog(type, displayData, "");
        } catch (e) {
          addProcessedLog("raw", event.data.substring(0, 200), "");
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 2000);
      };

      ws.onerror = () => setIsConnected(false);
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  const addProcessedLog = (type: string, data: string, raw: string) => {
    if (isPaused) return;
    setProcessedLogs(prev => {
      const newLogs = [...prev, {
        id: ++logIdRef.current,
        timestamp: new Date().toLocaleTimeString(),
        type,
        data,
      }];
      if (newLogs.length > 500) return newLogs.slice(-500);
      return newLogs;
    });
  };

  // Auto-scroll
  useEffect(() => {
    if (!isPaused && rawScrollRef.current) {
      rawScrollRef.current.scrollTop = rawScrollRef.current.scrollHeight;
    }
  }, [rawLogs, isPaused]);

  useEffect(() => {
    if (!isPaused && processedScrollRef.current) {
      processedScrollRef.current.scrollTop = processedScrollRef.current.scrollHeight;
    }
  }, [processedLogs, isPaused]);

  const clearLogs = () => {
    setRawLogs([]);
    setProcessedLogs([]);
  };

  const getTypeColor = (type: string) => {
    if (type.includes("start_list") || type === "results") return "text-green-400";
    if (type.includes("layout") || type.includes("Command")) return "text-yellow-400";
    if (type === "clock") return "text-blue-400";
    if (type === "system") return "text-purple-400";
    return "text-gray-400";
  };

  const formatRawData = (data: string) => {
    // Detect type for coloring
    if (data.includes("Command=LayoutDraw")) return { type: "layout", text: data };
    if (data.includes('"T":"S"')) return { type: "start_list", text: data };
    if (data.includes('"T":"T"') || data.includes('"t":')) return { type: "clock", text: data };
    return { type: "other", text: data };
  };

  return (
    <div className="h-screen flex flex-col p-2 bg-gray-950 text-green-400 font-mono text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Lynx Debug Terminal</h1>
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? "WS Connected" : "Disconnected"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isPaused ? "default" : "outline"}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="destructive" onClick={clearLogs}>
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-2 overflow-hidden">
        {/* Left: Raw Forwarder Data */}
        <div className="flex-1 flex flex-col border border-gray-700 rounded">
          <div className="bg-gray-800 px-2 py-1 border-b border-gray-700 flex justify-between">
            <span className="font-bold text-orange-400">RAW FROM FORWARDER</span>
            <span className="text-gray-500">{rawLogs.length} entries</span>
          </div>
          <div 
            ref={rawScrollRef}
            className="flex-1 overflow-auto p-2 bg-gray-900"
          >
            {rawLogs.length === 0 ? (
              <div className="text-gray-600 text-center py-4">Waiting for forwarder data...</div>
            ) : (
              rawLogs.map((log) => {
                const formatted = formatRawData(log.data);
                return (
                  <div key={log.id} className="mb-1 border-b border-gray-800 pb-1">
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>#{log.seqNum || '?'}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-blue-400">{log.portType}</span>
                    </div>
                    <pre className={`whitespace-pre-wrap break-all ${getTypeColor(formatted.type)}`}>
                      {formatted.text}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Processed WebSocket Output */}
        <div className="flex-1 flex flex-col border border-gray-700 rounded">
          <div className="bg-gray-800 px-2 py-1 border-b border-gray-700 flex justify-between">
            <span className="font-bold text-cyan-400">PROCESSED (WebSocket)</span>
            <span className="text-gray-500">{processedLogs.length} entries</span>
          </div>
          <div 
            ref={processedScrollRef}
            className="flex-1 overflow-auto p-2 bg-gray-900"
          >
            {processedLogs.length === 0 ? (
              <div className="text-gray-600 text-center py-4">Waiting for processed data...</div>
            ) : (
              processedLogs.map((log) => (
                <div key={log.id} className="mb-1 border-b border-gray-800 pb-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>{log.timestamp}</span>
                    <span className={getTypeColor(log.type)}>{log.type}</span>
                  </div>
                  <pre className={`whitespace-pre-wrap ${getTypeColor(log.type)}`}>
                    {log.data}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 text-gray-600 text-center">
        LEFT = Raw data exactly as received from forwarder | RIGHT = After server processing
      </div>
    </div>
  );
}
