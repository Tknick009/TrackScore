import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pause, Play, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface Entry {
  lane?: string;
  bib?: string;
  name?: string;
  team?: string;
  time?: string;
  place?: string;
}

interface StartListData {
  eventNumber: number;
  heat: number;
  entries: Entry[];
  eventName?: string;
  distance?: string;
}

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
  const [currentStartList, setCurrentStartList] = useState<StartListData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const pageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate pages from current start list
  const pages = currentStartList ? 
    Array.from({ length: Math.ceil(currentStartList.entries.length / pageSize) }, (_, i) => 
      currentStartList.entries.slice(i * pageSize, (i + 1) * pageSize)
    ) : [];

  // Auto-cycle through pages
  useEffect(() => {
    if (pages.length > 1) {
      pageIntervalRef.current = setInterval(() => {
        setCurrentPage(prev => (prev + 1) % pages.length);
      }, 4000); // 4 second page interval
    }
    return () => {
      if (pageIntervalRef.current) {
        clearInterval(pageIntervalRef.current);
      }
    };
  }, [pages.length]);

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
          const msg = JSON.parse(event.data);
          const type = msg.type || "unknown";
          
          // Handle start_list - store for paged display
          if (type === "start_list" && msg.data?.entries) {
            setCurrentStartList(msg.data);
            setCurrentPage(0); // Reset to first page on new data
            
            const entries = msg.data.entries;
            let displayData = `Event ${msg.data.eventNumber} Heat ${msg.data.heat}: ${entries.length} entries (SORTED by lane)\n`;
            entries.forEach((e: Entry, i: number) => {
              displayData += `  ${i+1}. Lane ${e.lane || '?'} | Bib ${e.bib || '?'} | ${e.name || ''}\n`;
            });
            addLog(type, displayData, JSON.stringify(msg));
          } else if (type === "layout_command") {
            addLog(type, `Layout: ${msg.data?.layoutName}`, JSON.stringify(msg));
          } else if (type === "clock_update") {
            addLog(type, `Clock: ${msg.data?.time}`, JSON.stringify(msg));
          } else {
            addLog(type, JSON.stringify(msg.data || msg, null, 2), JSON.stringify(msg));
          }
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
      if (newLogs.length > 200) {
        return newLogs.slice(-200);
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
    setCurrentStartList(null);
    setCurrentPage(0);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "start_list": return "bg-green-600";
      case "layout_command": return "bg-yellow-600";
      case "clock_update": return "bg-blue-600";
      case "system": return "bg-purple-600";
      default: return "bg-gray-600";
    }
  };

  const currentPageEntries = pages[currentPage] || [];

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-green-400">Lynx Data Terminal</h1>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Paged Display Preview */}
        <div className="w-1/2 p-4 border-r border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-blue-400">Start List Display (Sorted by Lane)</h2>
            {pages.length > 1 && (
              <Badge variant="outline" className="text-xs">
                Page {currentPage + 1} of {pages.length}
              </Badge>
            )}
          </div>
          
          {currentStartList ? (
            <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-hidden">
              {/* Event Header */}
              <div className="mb-4 pb-2 border-b border-gray-700">
                <div className="text-lg font-bold text-yellow-400">
                  Event {currentStartList.eventNumber} - Heat {currentStartList.heat}
                </div>
                {currentStartList.eventName && (
                  <div className="text-sm text-gray-400">{currentStartList.eventName}</div>
                )}
              </div>

              {/* Animated Page Content */}
              <div className="relative h-[400px] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-left border-b border-gray-700">
                          <th className="py-2 px-2 w-16">Lane</th>
                          <th className="py-2 px-2 w-16">Bib</th>
                          <th className="py-2 px-2">Athlete</th>
                          <th className="py-2 px-2">Team</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPageEntries.map((entry, idx) => (
                          <motion.tr
                            key={`${entry.lane}-${entry.bib}-${idx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-gray-800 hover:bg-gray-800/50"
                          >
                            <td className="py-2 px-2 font-mono text-green-400 font-bold">
                              {entry.lane || '-'}
                            </td>
                            <td className="py-2 px-2 font-mono text-blue-300">
                              {entry.bib || '-'}
                            </td>
                            <td className="py-2 px-2 text-white font-medium truncate max-w-[200px]">
                              {entry.name || '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-400 truncate max-w-[150px]">
                              {entry.team || '-'}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Page Indicators */}
              {pages.length > 1 && (
                <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-gray-700">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentPage 
                          ? 'bg-blue-500 w-6' 
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      data-testid={`page-indicator-${i}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-gray-500 text-center">
                <div className="text-4xl mb-2">📡</div>
                <div>Waiting for start list data...</div>
              </div>
            </div>
          )}

          {/* Page Size Control */}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
            <span>Entries per page:</span>
            {[4, 6, 8, 10].map(size => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(0);
                }}
                className={`px-2 py-1 rounded ${
                  pageSize === size ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                data-testid={`page-size-${size}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Raw Log Stream */}
        <div className="w-1/2 p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-green-400 mb-3">
            WebSocket Messages ({logs.length})
          </h2>
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-auto bg-gray-900 rounded-lg p-3 font-mono text-xs"
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Waiting for data...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="mb-2 pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${getTypeColor(log.type)}`}>
                      {log.type}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-green-300 text-[11px]">{log.data}</pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-800 text-xs text-gray-500 text-center">
        Entries are sorted by lane number on the server before paging. Pages auto-cycle every 4 seconds.
      </div>
    </div>
  );
}
