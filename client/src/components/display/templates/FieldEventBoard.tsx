import { EventWithEntries, Meet } from "@shared/schema";
import { EventHeader, FieldAthleteCard, FieldAttemptGrid } from "../shared";
import { generateAttemptHeaders } from "../utils";

interface FieldEventBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

export function FieldEventBoard({ event, meet, mode }: FieldEventBoardProps) {
  const sortedResults = [...event.entries].sort((a, b) => {
    const aPos = a.finalPlace ?? 999;
    const bPos = b.finalPlace ?? 999;
    return aPos - bPos;
  });

  const headers = generateAttemptHeaders(sortedResults);

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] relative">
      {meet?.logoUrl && (
        <img
          src={meet.logoUrl}
          alt="Meet logo"
          className="absolute top-8 right-8 max-w-[120px] max-h-[80px] z-10"
          data-testid="img-meet-logo"
        />
      )}

      <div className="flex flex-col">
        <EventHeader event={event} meet={meet} mode={mode} />

        <div className="p-8">
          <div className="space-y-8">
            {sortedResults.map((result, index) => {
              const position = result.finalPlace ?? 0;
              const isLeader = position === 1;
              const isPodium = position <= 3;
              const rowBg = isLeader
                ? "bg-[hsl(var(--display-accent))]/12"
                : index % 2 === 0
                ? "bg-[hsl(var(--display-border))]/20"
                : "";

              return (
                <div
                  key={result.athlete.id}
                  className={`p-6 ${rowBg}`}
                  data-testid={`result-row-${result.athlete.id}`}
                >
                  <div className="grid grid-cols-2 gap-8">
                    <FieldAthleteCard result={result} isLeader={isLeader} isPodium={isPodium} />
                    <FieldAttemptGrid result={result} headers={headers} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
