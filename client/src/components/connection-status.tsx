import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff, Database, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWebSocketConnection } from "@/contexts/WebSocketContext";

interface SyncStatus {
  mode: 'edge' | 'cloud';
  cloudUrl: string | null;
  connected: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  error: string | null;
}

export function ConnectionStatus() {
  const { isConnected: wsConnected } = useWebSocketConnection();
  
  const { data: status, isLoading } = useQuery<SyncStatus>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 5000,
  });

  if (isLoading || !status) {
    return (
      <Badge variant="outline" className="gap-1.5" data-testid="badge-connection-loading">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Checking...</span>
      </Badge>
    );
  }

  if (status.mode === 'cloud') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={wsConnected ? "default" : "destructive"}
            className="gap-1.5" 
            data-testid="badge-connection-cloud"
          >
            {wsConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                <Cloud className="h-3 w-3" />
                <span className="animate-pulse">Broadcasting</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Reconnecting...</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Running on cloud server</p>
          <p className="text-xs text-muted-foreground">All data synced automatically</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const isConnected = status.connected;
  const hasPending = status.pendingChanges > 0;
  const hasError = !!status.error;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1.5",
            hasError && "bg-red-500/10 text-red-600 border-red-500/30",
            !hasError && !isConnected && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
            !hasError && isConnected && hasPending && "bg-amber-500/10 text-amber-600 border-amber-500/30",
            !hasError && isConnected && !hasPending && "bg-green-500/10 text-green-600 border-green-500/30"
          )}
          data-testid="badge-connection-edge"
        >
          {hasError ? (
            <CloudOff className="h-3 w-3" />
          ) : isConnected ? (
            hasPending ? (
              <Upload className="h-3 w-3 animate-pulse" />
            ) : (
              <Wifi className="h-3 w-3" />
            )
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <Database className="h-3 w-3" />
          <span>Local{hasPending ? ` (${status.pendingChanges})` : ''}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">
            {hasError ? "Connection Error" : isConnected ? "Connected to Cloud" : "Working Offline"}
          </p>
          {hasError && (
            <p className="text-xs text-red-400">{status.error}</p>
          )}
          {status.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Last sync: {new Date(status.lastSyncAt).toLocaleTimeString()}
            </p>
          )}
          {hasPending && (
            <p className="text-xs text-muted-foreground">
              {status.pendingChanges} changes pending sync
            </p>
          )}
          {!isConnected && (
            <p className="text-xs text-muted-foreground">
              Changes will sync when internet is available
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ConnectionStatusMinimal() {
  const { data: status } = useQuery<SyncStatus>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 10000,
  });

  if (!status) return null;

  if (status.mode === 'cloud') {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="status-minimal-cloud">
        <Cloud className="h-3 w-3 text-blue-500" />
        <span>Cloud</span>
      </div>
    );
  }

  const isConnected = status.connected;
  const hasPending = status.pendingChanges > 0;

  return (
    <div 
      className={cn(
        "flex items-center gap-1 text-xs",
        status.error && "text-red-500",
        !status.error && !isConnected && "text-yellow-500",
        !status.error && isConnected && hasPending && "text-amber-500",
        !status.error && isConnected && !hasPending && "text-green-500"
      )}
      data-testid="status-minimal-edge"
    >
      {isConnected ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <Database className="h-3 w-3" />
      <span>Local</span>
      {hasPending && <span>({status.pendingChanges})</span>}
    </div>
  );
}
