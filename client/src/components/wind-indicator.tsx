import { Wind, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WindReading } from "@shared/schema";

interface WindIndicatorProps {
  reading?: WindReading;
  showLabel?: boolean;
}

export function WindIndicator({ reading, showLabel = true }: WindIndicatorProps) {
  if (!reading) return null;
  
  const variant = reading.isLegal ? "default" : "destructive";
  const speed = reading.windSpeed;
  const displaySpeed = `${speed > 0 ? '+' : ''}${speed.toFixed(1)} m/s`;
  
  return (
    <Badge variant={variant} className="gap-1">
      {reading.isLegal ? (
        <Wind className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {showLabel && <span className="mr-1">Wind:</span>}
      <span className="font-semibold">{displaySpeed}</span>
    </Badge>
  );
}
