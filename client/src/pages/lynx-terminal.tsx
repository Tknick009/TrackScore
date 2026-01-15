import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Pause, Play } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  type: string;
  data: string;
  raw: string;
}

export default function LynxTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addLog("system", "WebSocket connected", "");
      };

      ws.onmessage = (event) => {
        if (isPaused) return;
        
        try {
          const data = JSON.parse(event.data);
          const type = data.type || "unknown";
          
          // Format the data nicely
          let displayData = "";
          if (type === "start_list" && data.data?.entries) {
            const entries = data.data.entries;
            displayData = `Event ${data.data.eventNumber} Heat ${data.data.heat}: ${entries.length} entries\n`;
            entries.forEach((e: any, i: number) => {
              displayData += `  Line ${i+1}: Lane=${e.lane || '?'} Bib=${e.bib || '?'} ${e.name || ''}\n`;
            });
          } else if (type === "layout_command") {
            displayData = `Layout: ${data.data?.layoutName}`;
          } else if (type === "clock_update") {
            displayData = `Clock: ${data.data?.time}`;
          } else {
            displayData = JSON.stringify(data.data || data, null, 2);
          }
          
          addLog(type, displayData, JSON.stringify(data));
        } catch (e) {
          addLog("raw", event.data, event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        addLog("system", "WebSocket disconnected, reconnecting...", "");
        setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addLog = (type: string, data: string, raw: string) => {
    if (isPaused) return;
    
    const entry: LogEntry = {
      id: ++logIdRef.current,
      timestamp: new Date().toLocaleTimeString(),
      type,
      data,
      raw
    };
    
    setLogs(prev => {
      const newLogs = [...prev, entry];
      // Keep last 500 entries
      if (newLogs.length > 500) {
        return newLogs.slice(-500);
      }
      return newLogs;
    });
  };

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "start_list": return "bg-green-500";
      case "layout_command": return "bg-yellow-500";
      case "clock_update": return "bg-blue-500";
      case "system": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="h-screen flex flex-col p-4 bg-black text-green-400 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Lynx Data Terminal</h1>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <span className="text-sm text-gray-400">{logs.length} entries</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isPaused ? "default" : "outline"}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="destructive" onClick={clearLogs}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4 border border-gray-700"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Waiting for data from FinishLynx...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-2 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="text-gray-500">{log.timestamp}</span>
                <span className={`px-2 py-0.5 rounded text-white text-xs ${getTypeColor(log.type)}`}>
                  {log.type}
                </span>
              </div>
              <pre className="text-sm whitespace-pre-wrap text-green-300">{log.data}</pre>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        This terminal shows WebSocket messages after server processing. 
        Check server logs for raw forwarder data.
      </div>
    </div>
  );
}
