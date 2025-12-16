import { useState, useEffect, useMemo } from "react";
import { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";
import { isTrackEvent as checkIsTrackEvent } from "@shared/event-catalog";
import { EventHeader } from "../shared";
import { 
  formatResult, 
  getTeamColor, 
  getPodiumColor,
  generateAttemptHeaders
} from "../utils";
import { Trophy, ChevronRight } from "lucide-react";

interface ScrollingResultsBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
  resultsPerPage?: number;
  scrollIntervalMs?: number;
}

function determineDisplayMode(event: EventWithEntries): 'track' | 'field' {
  const firstEntry = event.entries.find(e => e.resultType);
  
  if (firstEntry) {
    return firstEntry.resultType === 'time' ? 'track' : 'field';
  }
  
  return checkIsTrackEvent(event.eventType) ? 'track' : 'field';
}

export function ScrollingResultsBoard({ 
  event, 
  meet, 
  mode,
  resultsPerPage = 5,
  scrollIntervalMs = 5000
}: ScrollingResultsBoardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const displayMode = determineDisplayMode(event);
  const showTrackResults = displayMode === 'track';
  
  const sortedResults = useMemo(() => {
    return [...event.entries].sort((a, b) => {
      const aPos = a.finalPlace ?? 999;
      const bPos = b.finalPlace ?? 999;
      return aPos - bPos;
    });
  }, [event.entries]);
  
  const totalPages = Math.ceil(sortedResults.length / resultsPerPage);
  
  // Reset page when event changes or when entries change significantly
  useEffect(() => {
    setCurrentPage(0);
  }, [event.id, sortedResults.length]);
  
  // Ensure currentPage is within bounds
  const safeCurrentPage = Math.min(currentPage, Math.max(0, totalPages - 1));
  
  const currentPageResults = useMemo(() => {
    const startIndex = safeCurrentPage * resultsPerPage;
    return sortedResults.slice(startIndex, startIndex + resultsPerPage);
  }, [sortedResults, safeCurrentPage, resultsPerPage]);
  
  useEffect(() => {
    if (totalPages <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, scrollIntervalMs);
    
    return () => clearInterval(timer);
  }, [totalPages, scrollIntervalMs]);

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] relative overflow-hidden">
      {meet?.logoUrl && (
        <img
          src={meet.logoUrl}
          alt="Meet logo"
          className="absolute top-8 right-8 max-w-[120px] max-h-[80px] z-10"
          data-testid="img-meet-logo"
        />
      )}

      <div className="flex flex-col h-screen">
        <EventHeader event={event} meet={meet} mode="results" />
        
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <Trophy className="w-10 h-10 text-[hsl(var(--display-accent))]" />
          <span className="font-stadium text-[36px] font-[700] text-[hsl(var(--display-accent))]">
            FINAL RESULTS
          </span>
        </div>

        <div className="flex-1 p-8 relative">
          <div 
            className="animate-fade-in"
            key={safeCurrentPage}
          >
            {showTrackResults ? (
              <TrackResultsPage results={currentPageResults} />
            ) : (
              <FieldResultsPage results={currentPageResults} />
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4">
            <div className="flex gap-3">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    idx === safeCurrentPage 
                      ? "bg-[hsl(var(--display-accent))] scale-125" 
                      : "bg-[hsl(var(--display-muted))] opacity-50"
                  }`}
                  data-testid={`page-indicator-${idx}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-[hsl(var(--display-muted))] text-[24px] font-stadium">
              <span>Page {safeCurrentPage + 1} of {totalPages}</span>
              <ChevronRight className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackResultsPage({ results }: { results: EntryWithDetails[] }) {
  return (
    <div className="space-y-6">
      {results.map((result, index) => {
        const position = result.finalPlace ?? 0;
        const isLeader = position === 1;
        const isPodium = position <= 3;
        const rowBg = isLeader
          ? "bg-[hsl(var(--display-accent))]/12"
          : index % 2 === 0
          ? "bg-[hsl(var(--display-border))]/20"
          : "";
        const athleteName = result.athlete 
          ? `${result.athlete.firstName} ${result.athlete.lastName}`
          : "Unknown Athlete";

        return (
          <div
            key={result.id}
            className={`h-[120px] flex items-center gap-6 ${rowBg} animate-slide-in-right`}
            style={{ animationDelay: `${index * 100}ms` }}
            data-testid={`result-row-${result.id}`}
          >
            <div className="relative w-[100px] h-full flex items-center justify-center">
              <div
                className="absolute left-0 top-0 bottom-0 w-[12px]"
                style={{
                  backgroundColor: getTeamColor(result.team?.name),
                }}
              />
              <div className="text-[72px] font-stadium-numbers font-[900] text-[hsl(var(--display-muted))] leading-none">
                {result.finalLane || "-"}
              </div>
            </div>

            {isPodium && (
              <div
                className={`w-[80px] h-[80px] rounded-full flex items-center justify-center font-stadium-numbers text-[52px] font-[900] text-[hsl(var(--display-bg))] ${
                  isLeader ? 'animate-[pulse_600ms_ease-in-out_infinite]' : ''
                }`}
                style={{ backgroundColor: getPodiumColor(position) }}
                data-testid={`text-position-${result.id}`}
              >
                {position}
              </div>
            )}
            {!isPodium && (
              <div
                className="w-[80px] h-[80px] rounded-full border-4 border-[hsl(var(--display-muted))] flex items-center justify-center font-stadium-numbers text-[52px] font-[900] text-[hsl(var(--display-muted))]"
                data-testid={`text-position-${result.id}`}
              >
                {position}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-4 mb-1">
                <h2
                  className="font-stadium text-[52px] font-[700] text-[hsl(var(--display-fg))] leading-none"
                  data-testid={`text-athlete-name-${result.id}`}
                >
                  {athleteName}
                </h2>
                {result.isDisqualified && (
                  <span className="text-[40px] font-[700] text-[hsl(var(--display-warning))]">
                    DQ
                  </span>
                )}
              </div>
              {result.team && (
                <p className="text-[32px] text-[hsl(var(--display-muted))] leading-none whitespace-nowrap truncate">
                  {result.team.name}
                </p>
              )}
            </div>

            <div className="text-right">
              <div
                className="font-stadium-numbers text-[96px] font-[900] text-[hsl(var(--display-fg))] leading-none"
                data-testid={`text-time-${result.id}`}
              >
                {formatResult(result)}
              </div>
              {result.finalWind !== null && result.finalWind !== undefined && (
                <p className="text-[28px] text-[hsl(var(--display-muted))] mt-1 leading-none">
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

function FieldResultsPage({ results }: { results: EntryWithDetails[] }) {
  return (
    <div className="space-y-6">
      {results.map((result, index) => {
        const position = result.finalPlace ?? 0;
        const isLeader = position === 1;
        const isPodium = position <= 3;
        const rowBg = isLeader
          ? "bg-[hsl(var(--display-accent))]/12"
          : index % 2 === 0
          ? "bg-[hsl(var(--display-border))]/20"
          : "";
        const athleteName = result.athlete 
          ? `${result.athlete.firstName} ${result.athlete.lastName}`
          : "Unknown Athlete";

        return (
          <div
            key={result.id}
            className={`h-[120px] flex items-center gap-6 p-4 ${rowBg} animate-slide-in-right`}
            style={{ animationDelay: `${index * 100}ms` }}
            data-testid={`result-row-${result.id}`}
          >
            {isPodium && (
              <div
                className={`w-[80px] h-[80px] rounded-full flex items-center justify-center font-stadium-numbers text-[52px] font-[900] text-[hsl(var(--display-bg))] ${
                  isLeader ? 'animate-[pulse_600ms_ease-in-out_infinite]' : ''
                }`}
                style={{ backgroundColor: getPodiumColor(position) }}
                data-testid={`text-position-${result.id}`}
              >
                {position}
              </div>
            )}
            {!isPodium && (
              <div
                className="w-[80px] h-[80px] rounded-full border-4 border-[hsl(var(--display-muted))] flex items-center justify-center font-stadium-numbers text-[52px] font-[900] text-[hsl(var(--display-muted))]"
                data-testid={`text-position-${result.id}`}
              >
                {position}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-4 mb-1">
                <h2
                  className="font-stadium text-[52px] font-[700] text-[hsl(var(--display-fg))] leading-none"
                  data-testid={`text-athlete-name-${result.id}`}
                >
                  {athleteName}
                </h2>
              </div>
              {result.team && (
                <p className="text-[32px] text-[hsl(var(--display-muted))] leading-none whitespace-nowrap truncate">
                  {result.team.name}
                </p>
              )}
            </div>

            <div className="text-right">
              <div
                className="font-stadium-numbers text-[96px] font-[900] text-[hsl(var(--display-fg))] leading-none"
                data-testid={`text-mark-${result.id}`}
              >
                {formatResult(result)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
