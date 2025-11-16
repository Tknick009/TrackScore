import { Award, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type SelectRecord } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPerformance, isRecordBroken } from "@/utils/recordChecker";

interface RecordComparisonProps {
  record: SelectRecord;
  currentPerformance?: string;
  eventType: string;
}

export function RecordComparison({
  record,
  currentPerformance,
  eventType,
}: RecordComparisonProps) {
  const isNewRecord = currentPerformance
    ? isRecordBroken(eventType, currentPerformance, record.performance)
    : false;

  const parsePerformance = (perf: string): number => {
    perf = perf.trim();
    if (perf.includes(':')) {
      const parts = perf.split(':');
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    }
    return parseFloat(perf.replace(/[^\d.]/g, ''));
  };

  const calculateMargin = (): string => {
    if (!currentPerformance) return "N/A";

    const current = parsePerformance(currentPerformance);
    const existing = parsePerformance(record.performance);
    const difference = Math.abs(current - existing);

    const isTimeBasedEvent = eventType.includes('m') && 
      !eventType.includes('jump') && 
      !eventType.includes('throw') && 
      !eventType.includes('put');

    if (Math.abs(difference) < 0.01) {
      return "Tied";
    }

    if (isTimeBasedEvent) {
      const faster = current < existing;
      return `${difference.toFixed(2)}s ${faster ? 'faster' : 'slower'}`;
    } else {
      const farther = current > existing;
      return `${difference.toFixed(2)}m ${farther ? 'farther' : 'shorter'}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-accent" />
          Record Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Current Record
            </div>
            <div className="text-2xl font-bold" data-testid="text-record-performance">
              {formatPerformance(eventType, record.performance)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {record.athleteName}
              {record.wind && ` (${record.wind})`}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(record.date).toLocaleDateString()}
            </div>
          </div>

          {currentPerformance && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                New Performance
              </div>
              <div className="text-2xl font-bold" data-testid="text-current-performance">
                {formatPerformance(eventType, currentPerformance)}
              </div>
              <div className="mt-2">
                {isNewRecord ? (
                  <Badge variant="default" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    New Record!
                  </Badge>
                ) : calculateMargin() === "Tied" ? (
                  <Badge variant="secondary" className="gap-1">
                    <Minus className="w-3 h-3" />
                    Tied
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Not a Record
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {currentPerformance && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Margin:</span>
              <span className="font-semibold" data-testid="text-margin">
                {calculateMargin()}
              </span>
            </div>
          </div>
        )}

        {record.notes && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-1">Notes</div>
            <div className="text-sm">{record.notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
