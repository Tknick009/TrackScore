import { EventWithEntries, Meet } from "@shared/schema";
import { FieldAttemptGrid } from "../shared";
import { formatResult, formatSplitTime, generateAttemptHeaders, deriveRoundInfo } from "../utils";
import { getPodiumColor, getTeamColor } from "../utils";
import { isTrackEvent as checkIsTrackEvent } from "@shared/event-catalog";
import { Star } from "lucide-react";

interface SingleResultBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
  athleteId?: string;
}

export function SingleResultBoard({ event, meet, mode, athleteId }: SingleResultBoardProps) {
  const targetResult = athleteId
    ? event.entries.find(e => e.athlete.id === athleteId)
    : [...event.entries].sort((a, b) => {
        const aPos = a.finalPlace ?? 999;
        const bPos = b.finalPlace ?? 999;
        return aPos - bPos;
      })[0];

  if (!targetResult) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center">
        <p className="text-[48px] text-[hsl(var(--display-muted))]">No athlete data available</p>
      </div>
    );
  }

  const athleteName = `${targetResult.athlete.firstName} ${targetResult.athlete.lastName}`;
  const position = targetResult.finalPlace ?? 0;
  const isPodium = position <= 3;
  const podiumColor = getPodiumColor(position);
  const teamColor = getTeamColor(targetResult.team?.name);
  const isTrack = checkIsTrackEvent(event.eventType);
  const roundInfo = deriveRoundInfo(targetResult, event);

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] relative">
      {meet?.logoUrl && (
        <div className="absolute top-8 right-8 z-10">
          <img
            src={meet.logoUrl}
            alt={meet.name}
            className="h-20 w-auto object-contain opacity-80"
            data-testid="img-meet-logo"
          />
        </div>
      )}

      <div className="min-h-[60vh] flex items-center justify-center p-16 relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-2"
          style={{ backgroundColor: teamColor }}
        />

        <div className="text-center max-w-5xl">
          {isPodium && (
            <div
              className="inline-flex items-center justify-center w-[160px] h-[160px] rounded-full mb-8 animate-[pulse_600ms_ease-in-out_infinite]"
              style={{ backgroundColor: podiumColor }}
              data-testid="badge-position"
            >
              <span className="font-stadium-numbers text-[96px] font-[900] text-[hsl(var(--display-bg))]">
                {position}
              </span>
            </div>
          )}
          {!isPodium && (
            <div
              className="inline-flex items-center justify-center w-[160px] h-[160px] rounded-full border-8 border-[hsl(var(--display-muted))] mb-8"
              data-testid="badge-position"
            >
              <span className="font-stadium-numbers text-[96px] font-[900] text-[hsl(var(--display-muted))]">
                {position}
              </span>
            </div>
          )}

          <h1
            className="font-stadium text-[120px] font-[900] text-[hsl(var(--display-fg))] leading-none mb-6"
            data-testid="text-athlete-name"
          >
            {athleteName}
          </h1>

          {targetResult.team && (
            <p className="text-[56px] text-[hsl(var(--display-muted))] mb-8" data-testid="text-team-name">
              {targetResult.team.name}
            </p>
          )}

          <p className="text-[48px] text-[hsl(var(--display-muted))] mb-12" data-testid="text-event-details">
            {event.name}
            {roundInfo.roundLabel && ` • ${roundInfo.roundLabel}`}
            {roundInfo.heat && (roundInfo.totalHeats === 1 ? ' • Final' : ` • Heat ${roundInfo.heat}`)}
          </p>

          <div className="flex items-center justify-center gap-6">
            <div
              className="font-stadium-numbers text-[160px] font-[900] text-[hsl(var(--display-fg))] leading-none animate-slide-in-right"
              data-testid="text-result"
            >
              {formatResult(targetResult)}
            </div>
            {position === 1 && (
              <Star className="w-24 h-24 fill-[#FFD700] text-[#FFD700]" data-testid="icon-winner" />
            )}
          </div>

          {targetResult.finalWind && (
            <p className="text-[40px] text-[hsl(var(--display-muted))] mt-6" data-testid="text-wind">
              Wind: {targetResult.finalWind > 0 ? '+' : ''}{targetResult.finalWind.toFixed(1)}
            </p>
          )}
        </div>
      </div>

      <div className="bg-[hsl(var(--display-bg-elevated))] p-16 border-t-4 border-[hsl(var(--display-accent))]">
        <h2 className="font-stadium text-[64px] font-[700] text-[hsl(var(--display-fg))] mb-12 text-center">
          Performance Breakdown
        </h2>

        {isTrack ? (
          <div className="max-w-4xl mx-auto">
            {targetResult.splits && targetResult.splits.length > 0 ? (
              <div className="space-y-4">
                {targetResult.splits.map((split, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-8 p-6 bg-[hsl(var(--display-bg))] rounded-lg"
                    data-testid={`split-${index + 1}`}
                  >
                    <div>
                      <p className="text-[32px] text-[hsl(var(--display-muted))] mb-2">
                        Split {split.splitNumber}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[24px] text-[hsl(var(--display-muted))] mb-1">Lap Time</p>
                      <p className="font-stadium-numbers text-[48px] font-[700] text-[hsl(var(--display-fg))]">
                        {split.splitTime ? formatSplitTime(split.splitTime) : '–'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[24px] text-[hsl(var(--display-muted))] mb-1">Cumulative</p>
                      <p className="font-stadium-numbers text-[48px] font-[700] text-[hsl(var(--display-accent))]">
                        {split.cumulativeTime ? formatSplitTime(split.cumulativeTime) : '–'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[40px] text-[hsl(var(--display-muted))]">
                No split data available
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {targetResult.splits && targetResult.splits.length > 0 ? (
              <div className="flex justify-center">
                <div className="inline-block">
                  <FieldAttemptGrid
                    result={targetResult}
                    headers={generateAttemptHeaders([targetResult])}
                  />
                </div>
              </div>
            ) : (
              <p className="text-center text-[40px] text-[hsl(var(--display-muted))]">
                No attempt data available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
