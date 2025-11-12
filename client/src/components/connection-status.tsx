import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <Badge
      variant={connected ? "default" : "destructive"}
      className="gap-1.5"
      data-testid="badge-connection-status"
    >
      {connected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span className="animate-pulse">Broadcasting</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Disconnected</span>
        </>
      )}
    </Badge>
  );
}
