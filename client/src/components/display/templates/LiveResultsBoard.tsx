import { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";
import { isTrackEvent as checkIsTrackEvent } from "@shared/event-catalog";
import { EventHeader, FieldAthleteCard, FieldAttemptGrid } from "../shared";
import { 
  formatResult, 
  getTeamColor, 
  getPodiumColor,
  generateAttemptHeaders
} from "../utils";

interface LiveResultsBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

function determineDisplayMode(event: EventWithEntries): 'track' | 'field' {
  const firstEntry = event.entries.find(e => e.resultType);
  
  if (firstEntry) {
    return firstEntry.resultType === 'time' ? 'track' : 'field';
  }
  
  return checkIsTrackEvent(event.eventType) ? 'track' : 'field';
}

export function LiveResultsBoard({ event, meet, mode }: LiveResultsBoardProps) {
  const displayMode = determineDisplayMode(event);
  const showTrackResults = displayMode === 'track';

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] relative">
      {/* Meet Logo - Absolute positioned top-right */}
      {meet?.logoUrl && (
        <img
          src={meet.logoUrl}
          alt="Meet logo"
          className="absolute top-8 right-8 max-w-[120px] max-h-[80px] z-10"
          data-testid="img-meet-logo"
        />
      )}

      {/* Three-Band Structure */}
      <div className="flex flex-col">
        <EventHeader event={event} meet={meet} mode={mode} />

        {/* Results Body - 148px per row with 32px gaps */}
        <div className="p-8">
          {showTrackResults ? (
            <TrackResultsDisplay event={event} mode={mode} />
          ) : (
            <FieldResultsDisplay event={event} mode={mode} />
          )}
        </div>
      </div>
    </div>
  );
}

function TrackResultsDisplay({ event, mode }: { event: EventWithEntries; mode: string }) {
  const sortedResults = [...event.entries].sort((a, b) => {
    const aPos = a.finalPlace ?? 999;
    const bPos = b.finalPlace ?? 999;
    return aPos - bPos;
  });

  return (
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
        const athleteName = `${result.athlete.firstName} ${result.athlete.lastName}`;

        return (
          <div
            key={result.athlete.id}
            className={`h-[148px] flex items-center gap-6 ${rowBg}`}
            data-testid={`result-row-${result.athlete.id}`}
          >
            {/* Lane number column with colored bar - 120px width */}
            <div className="relative w-[120px] h-full flex items-center justify-center">
              {/* Vertical colored bar - 16px width with dynamic team color */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[16px]"
                style={{
                  backgroundColor: getTeamColor(result.team?.name),
                }}
              />
              <div className="text-[96px] font-stadium-numbers font-[900] text-[hsl(var(--display-muted))] leading-none">
                {result.finalLane || "-"}
              </div>
            </div>

            {/* Position badge - 96px circle with leader pulse animation */}
            {isPodium && (
              <div
                className={`w-[96px] h-[96px] rounded-full flex items-center justify-center font-stadium-numbers text-[64px] font-[900] text-[hsl(var(--display-bg))] ${
                  isLeader ? 'animate-[pulse_600ms_ease-in-out_infinite]' : ''
                }`}
                style={{ backgroundColor: getPodiumColor(position) }}
                data-testid={`text-position-${result.athlete.id}`}
              >
                {position}
              </div>
            )}
            {!isPodium && (
              <div
                className="w-[96px] h-[96px] rounded-full border-4 border-[hsl(var(--display-muted))] flex items-center justify-center font-stadium-numbers text-[64px] font-[900] text-[hsl(var(--display-muted))]"
                data-testid={`text-position-${result.athlete.id}`}
              >
                {position}
              </div>
            )}

            {/* Athlete block */}
            <div className="flex-1">
              {/* Athlete name - 64px */}
              <div className="flex items-center gap-4 mb-2">
                <h2
                  className="font-stadium text-[64px] font-[700] text-[hsl(var(--display-fg))] leading-none"
                  data-testid={`text-athlete-name-${result.athlete.id}`}
                >
                  {athleteName}
                </h2>
                {result.isDisqualified && (
                  <span className="text-[48px] font-[700] text-[hsl(var(--display-warning))]">
                    DQ
                  </span>
                )}
              </div>
              {/* Team name - 40px */}
              {result.team && (
                <p className="text-[40px] text-[hsl(var(--display-muted))] leading-none mb-1 whitespace-nowrap truncate">
                  {result.team.name}
                </p>
              )}
            </div>

            {/* Time block - right-aligned, 120px Bebas Neue with slide-in animation */}
            <div className="text-right">
              <div
                className="font-stadium-numbers text-[120px] font-[900] text-[hsl(var(--display-fg))] leading-none animate-slide-in-right"
                data-testid={`text-time-${result.athlete.id}`}
              >
                {formatResult(result)}
              </div>
              {/* Wind reading - 36px below */}
              {result.finalWind && (
                <p className="text-[36px] text-[hsl(var(--display-muted))] mt-2 leading-none">
                  Wind: {result.finalWind > 0 ? '+' : ''}{result.finalWind.toFixed(1)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldResultsDisplay({ event, mode }: { event: EventWithEntries; mode: string }) {
  const sortedResults = [...event.entries].sort((a, b) => {
    const aPos = a.finalPlace ?? 999;
    const bPos = b.finalPlace ?? 999;
    return aPos - bPos;
  });

  const headers = generateAttemptHeaders(sortedResults);

  return (
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
  );
}
