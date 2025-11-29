import { EntryWithDetails } from "@shared/schema";
import { getEventDescriptor } from "@shared/event-catalog";
import { getUnitSuffix, formatAttemptHeaderLabel } from "../utils";
import { calculateFieldEventPoints, Gender } from "@shared/combined-scoring";

interface FieldAttemptGridProps {
  result: EntryWithDetails;
  headers: string[];
  isCombinedEvent?: boolean;
  combinedEventGender?: Gender;
}

export function FieldAttemptGrid({ result, headers, isCombinedEvent = false, combinedEventGender }: FieldAttemptGridProps) {
  const descriptor = getEventDescriptor(result.event?.eventType || '');
  const attemptMap = new Map<string, NonNullable<typeof result.splits>[number]>();
  
  result.splits?.forEach(split => {
    const key = `default-${split.splitIndex}`;
    attemptMap.set(key, split);
  });

  const bestMark = result.finalMark;
  
  // Calculate points for the best mark in combined events
  let bestMarkPoints: number | null = null;
  if (isCombinedEvent && bestMark && bestMark > 0 && result.event?.eventType) {
    const gender = combinedEventGender || (result.athlete?.gender === 'M' ? 'M' : 'F');
    bestMarkPoints = calculateFieldEventPoints(result.event.eventType, bestMark, gender);
  }

  return (
    <div>
      {/* Attempt headers */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>
        {headers.map((headerKey) => (
          <div key={headerKey} className="text-center text-[24px] text-[hsl(var(--display-muted))]">
            {formatAttemptHeaderLabel(headerKey)}
          </div>
        ))}
      </div>

      {/* Attempts grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>
        {headers.map((headerKey, index) => {
          const split = attemptMap.get(headerKey);
          const attemptValue = split?.distanceMeters;
          const isFoul = attemptValue === null && split !== undefined;
          const isBest = attemptValue !== null && attemptValue !== undefined && bestMark !== null && bestMark !== undefined && Math.abs(attemptValue - bestMark) < 0.001;
          
          const formattedValue = attemptValue !== null && attemptValue !== undefined
            ? `${attemptValue.toFixed(descriptor.precision)}${getUnitSuffix(result.resultType)}`
            : null;

          return (
            <div
              key={headerKey}
              className="w-[88px] h-[88px] flex items-center justify-center rounded-md border-2 border-[hsl(var(--display-border))]"
              data-testid={`attempt-${index + 1}-${result.athlete.id}`}
            >
              {isFoul ? (
                <div className="bg-[hsl(var(--display-warning))] px-3 py-1 rounded font-stadium-numbers text-[32px] font-[900] text-[hsl(var(--display-bg))] leading-none">
                  X
                </div>
              ) : formattedValue !== null ? (
                <div className={`px-2 py-1 rounded font-stadium-numbers leading-none flex flex-col items-center ${
                  isBest
                    ? 'bg-[hsl(var(--display-success))] text-[hsl(var(--display-bg))]'
                    : 'text-[hsl(var(--display-fg))]'
                }`}>
                  <span className="text-[32px] font-[900]">{formattedValue}</span>
                  {isBest && bestMarkPoints !== null && bestMarkPoints > 0 && (
                    <span className="text-[18px] font-[700] opacity-90">
                      {bestMarkPoints} pts
                    </span>
                  )}
                </div>
              ) : (
                <div className="font-stadium-numbers text-[32px] font-[900] text-[hsl(var(--display-muted))] leading-none">
                  –
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
