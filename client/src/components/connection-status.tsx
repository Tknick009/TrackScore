import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { useWebSocketConnection } from "@/contexts/WebSocketContext";

export function ConnectionStatus() {
  const { isConnected } = useWebSocketConnection();
  
  return (
    <Badge
      variant={isConnected ? "default" : "destructive"}
      className="gap-1.5"
      data-testid="badge-connection-status"
    >
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span className="animate-pulse">Broadcasting</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Reconnecting...</span>
        </>
      )}
    </Badge>
  );
}
