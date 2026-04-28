import { Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RecordCheck } from "@shared/schema";

interface RecordIndicatorProps {
  checks: RecordCheck[];
  showDetails?: boolean;
}

export function RecordIndicator({ checks, showDetails = false }: RecordIndicatorProps) {
  const recordBreaks = checks.filter(c => c.isRecord);
  const ties = checks.filter(c => c.isTied);
  
  if (recordBreaks.length === 0 && ties.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {recordBreaks.map(check => (
        <Badge key={check.recordId} variant="default" className="gap-1 animate-pulse">
          <Trophy className="h-3 w-3" />
          NEW {check.recordBookName.toUpperCase()} RECORD!
          {showDetails && ` (${check.margin})`}
        </Badge>
      ))}
      {ties.map(check => (
        <Badge key={check.recordId} variant="secondary" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          TIED {check.recordBookName} RECORD
        </Badge>
      ))}
    </div>
  );
}
