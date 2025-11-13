import { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";
import { Trophy, Medal, Star } from "lucide-react";
import { isTrackEvent as checkIsTrackEvent, getEventDescriptor } from "@shared/event-catalog";

interface DisplayBoardProps {
  event?: EventWithEntries;
  meet?: Meet;
  mode: "live" | "results" | "schedule" | "standings";
}

function getTeamColor(teamName?: string): string {
  if (!teamName) return 'hsl(var(--display-accent))';
  
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 75%, 55%)`;
}

function formatResult(entry: EntryWithDetails): string {
  const value = entry.finalMark;
  
  if (value === null || value === undefined) return '-';
  
  switch (entry.resultType) {
    case 'time':
      return value.toFixed(3);
    case 'distance':
    case 'height':
      return `${value.toFixed(2)}m`;
    case 'points':
      return Math.round(value).toString();
    default:
      return value.toFixed(2);
  }
}

function determineDisplayMode(event: EventWithEntries): 'track' | 'field' {
  const firstEntry = event.entries.find(e => e.resultType);
  
  if (firstEntry) {
    return firstEntry.resultType === 'time' ? 'track' : 'field';
  }
  
  return checkIsTrackEvent(event.eventType) ? 'track' : 'field';
}

export function DisplayBoard({ event, meet, mode }: DisplayBoardProps) {
  if (!event) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center p-16">
        <div className="text-center">
          <Trophy className="w-32 h-32 text-[hsl(var(--display-accent))] mx-auto mb-8" />
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4">
            Track & Field Scoreboard
          </h1>
          <p className="text-[40px] text-[hsl(var(--display-muted))]">
            Waiting for event data...
          </p>
        </div>
      </div>
    );
  }

  if (!event.entries || event.entries.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center p-16">
        <div className="text-center">
          <Medal className="w-32 h-32 text-[hsl(var(--display-accent))] mx-auto mb-8" />
          <h1
            className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4"
            data-testid="text-event-name"
          >
            {event.name}
          </h1>
          <div className="flex items-center gap-4 text-[40px] text-[hsl(var(--display-muted))] justify-center mb-8">
            <span className="capitalize">{event.gender}</span>
          </div>
          <p className="text-[40px] text-[hsl(var(--display-muted))]">
            No results available yet
          </p>
        </div>
      </div>
    );
  }

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
        {/* Header Band - 160px total height */}
        <div className="h-[160px] flex flex-col justify-center px-8 border-b-2 border-[hsl(var(--display-border))]">
          {/* Event Title - 88px */}
          <h1
            className="font-stadium text-[88px] font-[900] text-[hsl(var(--display-fg))] leading-none mb-3"
            data-testid="text-event-name"
          >
            {event.name}
          </h1>
          {/* Metadata - 48px */}
          <div className="flex items-center gap-6 text-[48px] text-[hsl(var(--display-muted))] leading-none">
            <span className="capitalize">{event.gender}</span>
          </div>
        </div>

        {/* Status Bar - 96px height */}
        <div className="h-[96px] flex items-center px-8 border-b-2 border-[hsl(var(--display-border))]">
          <div
            className={`h-[96px] flex items-center justify-center px-12 font-[700] text-[48px] uppercase tracking-wide text-[hsl(var(--display-fg))] ${
              mode === "live" && event.status === "in_progress"
                ? "bg-[hsl(var(--display-success))] animate-[pulse_2s_ease-in-out_infinite]"
                : "bg-[hsl(var(--display-accent))]"
            }`}
            data-testid="badge-event-status"
          >
            {mode === "live" && event.status === "in_progress"
              ? "LIVE"
              : mode === "results" || event.status === "completed"
              ? "OFFICIAL RESULTS"
              : mode === "schedule"
              ? "UPCOMING"
              : "ON DECK"}
          </div>
        </div>

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

  const getPodiumColor = (position: number) => {
    if (position === 1) return "#FFD700";
    if (position === 2) return "#C0C0C0";
    if (position === 3) return "#CD7F32";
    return "hsl(var(--display-muted))";
  };

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
                <p className="text-[40px] text-[hsl(var(--display-muted))] leading-none mb-1">
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

  const getPodiumColor = (position: number) => {
    if (position === 1) return "#FFD700";
    if (position === 2) return "#C0C0C0";
    if (position === 3) return "#CD7F32";
    return "hsl(var(--display-muted))";
  };

  const descriptor = getEventDescriptor(event.eventType);

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
        const bestMark = result.finalMark;
        const athleteName = `${result.athlete.firstName} ${result.athlete.lastName}`;

        return (
          <div
            key={result.athlete.id}
            className={`p-6 ${rowBg}`}
            data-testid={`result-row-${result.athlete.id}`}
          >
            {/* Two-column layout */}
            <div className="grid grid-cols-2 gap-8">
              {/* Left: Athlete info + best mark */}
              <div className="flex items-center gap-6">
                {/* Position badge - 96px circle with leader pulse animation */}
                {isPodium && (
                  <div
                    className={`w-[96px] h-[96px] rounded-full flex items-center justify-center font-stadium-numbers text-[64px] font-[900] text-[hsl(var(--display-bg))] shrink-0 ${
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
                    className="w-[96px] h-[96px] rounded-full border-4 border-[hsl(var(--display-muted))] flex items-center justify-center font-stadium-numbers text-[64px] font-[900] text-[hsl(var(--display-muted))] shrink-0"
                    data-testid={`text-position-${result.athlete.id}`}
                  >
                    {position}
                  </div>
                )}

                {/* Athlete info */}
                <div className="flex-1">
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
                  {result.team && (
                    <p className="text-[40px] text-[hsl(var(--display-muted))] leading-none mb-1">
                      {result.team.name}
                    </p>
                  )}
                  {/* Best mark - 120px Bebas Neue with star icon and slide-in animation */}
                  <div className="flex items-center gap-3 mt-4">
                    <div
                      className="font-stadium-numbers text-[120px] font-[900] text-[hsl(var(--display-fg))] leading-none animate-slide-in-right"
                      data-testid={`text-best-mark-${result.athlete.id}`}
                    >
                      {formatResult(result)}
                    </div>
                    {isLeader && (
                      <Star className="w-16 h-16 fill-[#FFD700] text-[#FFD700]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Right: 6 attempt cards with headers */}
              <div>
                {/* Attempt headers */}
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="text-center text-[24px] text-[hsl(var(--display-muted))]">
                      #{num}
                    </div>
                  ))}
                </div>

                {/* Attempts grid */}
                <div className="grid grid-cols-6 gap-2">
                  {result.splits?.slice(0, 6).map((split, index) => {
                    const attemptValue = split?.distance;
                    const isFoul = attemptValue === null;
                    const isBest = attemptValue !== null && attemptValue !== undefined && bestMark !== null && bestMark !== undefined && Math.abs(attemptValue - bestMark) < 0.001;
                    
                    const formattedValue = attemptValue !== null && attemptValue !== undefined
                      ? `${attemptValue.toFixed(descriptor.precision)}${descriptor.resultUnit === 'meters' ? 'm' : ''}`
                      : null;

                    return (
                      <div
                        key={index}
                        className="w-[88px] h-[88px] flex items-center justify-center rounded-md border-2 border-[hsl(var(--display-border))]"
                        data-testid={`attempt-${index + 1}-${result.athlete.id}`}
                      >
                        {isFoul ? (
                          <div className="bg-[hsl(var(--display-warning))] px-3 py-1 rounded font-stadium-numbers text-[32px] font-[900] text-[hsl(var(--display-bg))] leading-none">
                            X
                          </div>
                        ) : formattedValue !== null ? (
                          <div className={`px-2 py-1 rounded font-stadium-numbers text-[32px] font-[900] leading-none ${
                            isBest
                              ? 'bg-[hsl(var(--display-success))] text-[hsl(var(--display-bg))]'
                              : 'text-[hsl(var(--display-fg))]'
                          }`}>
                            {formattedValue}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
