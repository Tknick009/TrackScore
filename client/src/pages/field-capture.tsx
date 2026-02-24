import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Circle, Download, Square, Trash2, Wifi } from "lucide-react";

interface CaptureChunk {
  timestamp: string;
  port: number;
  portName: string;
  remoteAddress: string;
  rawHex: string;
  rawAscii: string;
  rawText: string;
  byteLength: number;
}

interface CaptureStatus {
  active: boolean;
  sessionId: string | null;
  startedAt: string | null;
  chunkCount: number;
}

interface CaptureFile {
  name: string;
  size: number;
  created: string;
}

const PORT_COLORS: Record<number, string> = {
  4554: "#f97316",
  4555: "#3b82f6",
  4556: "#a855f7",
  4557: "#22c55e",
  4560: "#ef4444",
  4561: "#f59e0b",
  4562: "#14b8a6",
  4563: "#ec4899",
  4564: "#6366f1",
  4565: "#84cc16",
  4566: "#0ea5e9",
  4567: "#d946ef",
  4568: "#fb923c",
  4569: "#34d399",
  4570: "#a78bfa",
};

function getPortColor(port: number) {
  return PORT_COLORS[port] ?? "#94a3b8";
}

function ChunkRow({ chunk }: { chunk: CaptureChunk }) {
  const [expanded, setExpanded] = useState(false);
  const color = getPortColor(chunk.port);
  const ts = new Date(chunk.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });

  return (
    <div
      className="font-mono text-xs border-b border-border/30 cursor-pointer hover-elevate select-text"
      onClick={() => setExpanded(e => !e)}
      data-testid={`capture-chunk-${chunk.timestamp}`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-muted-foreground w-28 shrink-0">{ts}</span>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-black shrink-0" style={{ backgroundColor: color }}>
          :{chunk.port}
        </span>
        <span className="text-muted-foreground shrink-0 text-[10px]">{chunk.remoteAddress}</span>
        <span className="text-muted-foreground shrink-0 text-[10px]">{chunk.byteLength}B</span>
        <span className="text-green-400 truncate flex-1">{chunk.rawText || chunk.rawAscii}</span>
      </div>
      {expanded && (
        <div className="px-3 pb-2 space-y-1 bg-black/30">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">TEXT</span>
            <span className="text-green-300 break-all">{chunk.rawText}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">ASCII</span>
            <span className="text-yellow-300 break-all">{chunk.rawAscii}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-14 shrink-0">HEX</span>
            <span className="text-blue-300 break-all">{chunk.rawHex}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FieldCapturePage() {
  const ws = useWebSocket();
  const qc = useQueryClient();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [chunks, setChunks] = useState<CaptureChunk[]>([]);
  const [filterPort, setFilterPort] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [seenPorts, setSeenPorts] = useState<Set<number>>(new Set());

  const { data: status } = useQuery<CaptureStatus>({
    queryKey: ["/api/capture/status"],
    refetchInterval: 2000,
  });

  const { data: files } = useQuery<CaptureFile[]>({
    queryKey: ["/api/capture/files"],
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/capture/start"),
    onSuccess: () => {
      setChunks([]);
      setSeenPorts(new Set());
      qc.invalidateQueries({ queryKey: ["/api/capture/status"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/capture/stop"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/capture/status"] });
      qc.invalidateQueries({ queryKey: ["/api/capture/files"] });
    },
  });

  const addChunk = useCallback((chunk: CaptureChunk) => {
    setChunks(prev => {
      const next = [...prev, chunk];
      return next.length > 500 ? next.slice(-500) : next;
    });
    setSeenPorts(prev => {
      if (prev.has(chunk.port)) return prev;
      const next = new Set(prev);
      next.add(chunk.port);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "raw_capture" && msg.data) {
          addChunk(msg.data as CaptureChunk);
        }
      } catch {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws, addChunk]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [chunks, autoScroll]);

  const handleScroll = () => {
    const el = terminalRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const filtered = filterPort === "all" ? chunks : chunks.filter(c => c.port === Number(filterPort));
  const isActive = status?.active ?? false;

  return (
    <div className="h-screen flex flex-col bg-black text-foreground overflow-hidden" data-testid="field-capture-page">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-card/80 shrink-0">
        <div className="flex items-center gap-2">
          <Circle
            className={`w-3 h-3 ${isActive ? "text-red-500 fill-red-500 animate-pulse" : "text-muted-foreground fill-muted-foreground"}`}
          />
          <span className="font-semibold text-sm">Raw TCP Capture</span>
        </div>

        {isActive ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            data-testid="button-stop-capture"
          >
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            data-testid="button-start-capture"
            className="bg-red-600 hover:bg-red-700"
          >
            <Circle className="w-3 h-3 mr-1 fill-current" />
            Start Recording
          </Button>
        )}

        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-muted-foreground">Filter port:</span>
          <Select value={filterPort} onValueChange={setFilterPort}>
            <SelectTrigger className="h-7 w-32 text-xs" data-testid="select-port-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ports</SelectItem>
              {Array.from(seenPorts).sort((a, b) => a - b).map(p => (
                <SelectItem key={p} value={String(p)}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getPortColor(p) }} />
                    :{p}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1.5 ml-2">
          {Array.from(seenPorts).sort((a, b) => a - b).map(p => (
            <Badge
              key={p}
              className="text-[10px] text-black font-bold cursor-pointer"
              style={{ backgroundColor: getPortColor(p) }}
              onClick={() => setFilterPort(String(p))}
              data-testid={`badge-port-${p}`}
            >
              :{p}
            </Badge>
          ))}
          {seenPorts.size === 0 && (
            <span className="text-xs text-muted-foreground">No data yet — waiting for FieldLynx connection</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {status && (
            <span className="text-xs text-muted-foreground font-mono">
              {filtered.length} chunks shown
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setChunks([])}
            data-testid="button-clear-capture"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
          <div className="flex items-center gap-1.5">
            <Wifi className={`w-3 h-3 ${ws ? "text-green-400" : "text-red-400"}`} />
            <span className="text-xs text-muted-foreground">{ws ? "Live" : "Disconnected"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={terminalRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-[#0d1117] text-sm"
          data-testid="capture-terminal"
        >
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Circle className="w-10 h-10" />
              <div className="text-center">
                <p className="font-medium">{isActive ? "Waiting for data..." : "Not recording"}</p>
                <p className="text-xs mt-1">
                  {isActive
                    ? "Connect FieldLynx to ports 4560–4570 and data will appear here"
                    : "Press Start Recording, then trigger FieldLynx to send data"}
                </p>
              </div>
            </div>
          )}
          {filtered.map((chunk, i) => (
            <ChunkRow key={`${chunk.timestamp}-${i}`} chunk={chunk} />
          ))}
        </div>

        {files && files.length > 0 && (
          <div className="w-64 border-l border-border/40 bg-card/30 overflow-y-auto shrink-0">
            <div className="px-3 py-2 border-b border-border/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saved Captures</span>
            </div>
            {files.map(f => (
              <div key={f.name} className="px-3 py-2 border-b border-border/20 hover-elevate">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono truncate text-foreground" data-testid={`file-${f.name}`}>{f.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(f.size / 1024).toFixed(1)} KB · {new Date(f.created).toLocaleString()}
                    </p>
                  </div>
                  <a href={`/api/capture/files/${f.name}`} download={f.name} data-testid={`download-${f.name}`}>
                    <Button size="icon" variant="ghost" className="w-6 h-6 shrink-0">
                      <Download className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!autoScroll && filtered.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button size="sm" onClick={() => {
            setAutoScroll(true);
            if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }} data-testid="button-scroll-bottom">
            Scroll to latest
          </Button>
        </div>
      )}
    </div>
  );
}
