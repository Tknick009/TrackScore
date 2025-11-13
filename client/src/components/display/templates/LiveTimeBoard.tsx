import { EventWithEntries, Meet } from "@shared/schema";
import { EventHeader } from "../shared";
import { formatSplitTime, calculatePaceDelta } from "../utils/formatting";
import { getTeamColor } from "../utils/colors";

interface LiveTimeBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

export function LiveTimeBoard({ event, meet, mode }: LiveTimeBoardProps) {
  // Empty state - no entries
  if (!event.entries || event.entries.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))]">
        <EventHeader event={event} meet={meet} mode={mode} />
        <div className="flex items-center justify-center p-16 min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <p className="text-[56px] text-[hsl(var(--display-muted))]">
              Waiting for athletes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sort by current position
  const sortedResults = [...event.entries].sort((a, b) => {
    const aPos = a.finalPlace ?? 999;
    const bPos = b.finalPlace ?? 999;
    return aPos - bPos;
  });

  // Determine max splits for table columns (guard against empty with Math.max(..., 1))
  const maxSplits = Math.max(
    1, // minimum 1 column
    ...event.entries.map(e => e.splits?.length || 0)
  );
  
  // For each split, find leader time (guard against undefined)
  const splitLeaders: (number | null)[] = [];
  for (let i = 0; i < maxSplits; i++) {
    const splitTimes = event.entries
      .map(e => e.splits?.[i]?.cumulativeTime)
      .filter(t => t !== null && t !== undefined) as number[];
    splitLeaders[i] = splitTimes.length > 0 ? Math.min(...splitTimes) : null;
  }

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))]">
      <EventHeader event={event} meet={meet} mode={mode} />
      
      <div className="p-8">
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `80px 300px repeat(${maxSplits}, 180px) 180px` }}>
          <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))]" data-testid="header-position">POS</div>
          <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))]" data-testid="header-athlete">ATHLETE</div>
          {Array.from({ length: maxSplits }, (_, i) => (
            <div key={i} className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center" data-testid={`header-split-${i + 1}`}>
              SPLIT {i + 1}
            </div>
          ))}
          <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center" data-testid="header-final">FINAL</div>
        </div>

        {sortedResults.length > 0 && sortedResults.every(r => !r.splits || r.splits.length === 0) && (
          <div className="text-center p-12">
            <p className="text-[48px] text-[hsl(var(--display-muted))]">
              No split data available yet
            </p>
          </div>
        )}

        {sortedResults.map((result) => {
          const position = result.finalPlace ?? '—';
          const athleteName = `${result.athlete.firstName} ${result.athlete.lastName}`;
          const teamColor = getTeamColor(result.team?.name);

          return (
            <div
              key={result.athlete.id}
              className="grid gap-4 py-6 border-b border-[hsl(var(--display-border))]"
              style={{ gridTemplateColumns: `80px 300px repeat(${maxSplits}, 180px) 180px` }}
              data-testid={`row-athlete-${result.athlete.id}`}
            >
              <div className="font-stadium-numbers text-[48px] font-[700] text-[hsl(var(--display-fg))]" data-testid={`text-position-${result.athlete.id}`}>
                {position}
              </div>

              <div className="relative pl-4 border-l-4" style={{ borderColor: teamColor }}>
                <div className="font-stadium text-[40px] font-[700] text-[hsl(var(--display-fg))]" data-testid={`text-athlete-name-${result.athlete.id}`}>
                  {athleteName}
                </div>
                {result.team && (
                  <div className="text-[24px] text-[hsl(var(--display-muted))]" data-testid={`text-team-name-${result.athlete.id}`}>
                    {result.team.name}
                  </div>
                )}
              </div>

              {Array.from({ length: maxSplits }, (_, i) => {
                const split = result.splits?.[i];
                const cumTime = split?.cumulativeTime;
                const splitTime = split?.splitTime;
                const isLeader = cumTime !== null && cumTime !== undefined && cumTime === splitLeaders[i];

                return (
                  <div
                    key={i}
                    className={`text-center p-2 rounded ${isLeader ? 'bg-[hsl(var(--display-success))]/20' : ''}`}
                    data-testid={`cell-split-${result.athlete.id}-${i}`}
                  >
                    {cumTime !== null && cumTime !== undefined ? (
                      <>
                        <div className="font-stadium-numbers text-[36px] font-[700] text-[hsl(var(--display-fg))]" data-testid={`text-cumulative-time-${result.athlete.id}-${i}`}>
                          {formatSplitTime(cumTime)}
                        </div>
                        {splitTime !== null && splitTime !== undefined && (
                          <div className="text-[20px] text-[hsl(var(--display-muted))]" data-testid={`text-split-time-${result.athlete.id}-${i}`}>
                            {formatSplitTime(splitTime)}
                          </div>
                        )}
                        {!isLeader && splitLeaders[i] !== null && (
                          <div className="text-[18px] text-[hsl(var(--display-warning))]" data-testid={`text-pace-delta-${result.athlete.id}-${i}`}>
                            {calculatePaceDelta(cumTime, splitLeaders[i]!)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="font-stadium-numbers text-[36px] font-[700] text-[hsl(var(--display-muted))]">
                        –
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="text-center p-2">
                <div className="font-stadium-numbers text-[48px] font-[900] text-[hsl(var(--display-fg))]" data-testid={`text-final-time-${result.athlete.id}`}>
                  {result.finalMark ? formatSplitTime(result.finalMark) : '–'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
