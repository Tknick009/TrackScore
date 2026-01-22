import { useState, useEffect, useMemo } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";

interface BigBoardProps {
  event: EventWithEntries;
  meet?: Meet | null;
  showSplits?: boolean;
  liveTime?: string;
  pagingSize?: number;
  pagingIntervalMs?: number;
  mode?: 'start_list' | 'running_time' | 'results' | string;
}

export function BigBoard({ event, meet, showSplits = false, liveTime, pagingSize = 8, pagingIntervalMs = 5000, mode }: BigBoardProps) {
  const [clock, setClock] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);

  // Wall clock fallback when no live time from FinishLynx
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      setClock(`${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayClock = liveTime || clock;
  
  // Calculate total pages based on entries and paging size
  const totalEntries = event.entries?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pagingSize));
  
  // Auto-page through entries
  useEffect(() => {
    if (totalPages <= 1) {
      setCurrentPage(0);
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, pagingIntervalMs);
    
    return () => clearInterval(interval);
  }, [totalPages, pagingIntervalMs]);

  // Determine display mode from prop or infer from event status
  const displayMode = mode || ((event as any).mode) || (event.status === 'completed' ? 'results' : 'start_list');
  const isStartList = displayMode === 'start_list';
  const isRunningOrResults = displayMode === 'running_time' || displayMode === 'results';

  // IMPORTANT: Don't re-sort entries - they come pre-sorted by line number from FinishLynx
  // The array position IS the display position as determined by FinishLynx paging
  const displayEntries = useMemo(() => {
    return [...(event.entries || [])];
  }, [event.entries]);

  const isRelay = event.eventType?.toLowerCase().includes('relay');
  const status = event.status === 'completed' ? 'FINAL' : event.status === 'in_progress' ? 'IN PROGRESS' : 'SCHEDULED';
  
  // Get wind from event.wind (string from websocket) or entries[0].finalWind (number from database)
  const rawWind = (event as any).wind ?? event.entries?.[0]?.finalWind;
  
  // Parse wind value - only show if it's a valid number
  // Hide for: empty, undefined, null, "NWI", "M/S", or any non-numeric string
  const parseWindValue = (wind: any): number | null => {
    if (wind === null || wind === undefined || wind === '') return null;
    if (typeof wind === 'number') return wind;
    if (typeof wind === 'string') {
      // Skip non-numeric values like "NWI", "M/S", etc.
      const cleaned = wind.replace(/[+\s]/g, '');
      if (!/^-?\d+\.?\d*$/.test(cleaned)) return null;
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };
  
  const windValue = parseWindValue(rawWind);
  // Only display wind if we have a valid numeric value - never show NWI or M/S
  const windDisplay = windValue !== null 
    ? `WIND: ${windValue > 0 ? '+' : ''}${windValue.toFixed(1)}` 
    : null;

  const formatTime = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '';
    const totalSeconds = mark / 1000;
    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    return totalSeconds.toFixed(2);
  };

  const getLatestSplit = (entry: any): string => {
    if (!entry.splits || entry.splits.length === 0) return '';
    const lastSplit = entry.splits[entry.splits.length - 1];
    return formatTime(lastSplit?.splitTime);
  };

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col display-layout" 
      style={{ 
        backgroundColor: '#000000'
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 120%, rgba(0, 150, 255, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(0, 120, 220, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0, 120, 220, 0.2) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-start px-8 pt-6">
          <div className="flex items-center gap-6">
            {meet?.logoUrl && (
              <img 
                src={meet.logoUrl} 
                alt={meet.name} 
                className="h-16 object-contain"
              />
            )}
            <h1 
              className="text-white font-bold leading-none uppercase"
              style={{ fontSize: '64px', fontWeight: 700 }}
            >
              {event.name || event.eventName || ''}
            </h1>
          </div>
          <span 
            className="text-white font-bold tabular-nums"
            style={{ fontSize: '64px', fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {displayClock}
          </span>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0 mt-4" />

        <div 
          className="flex justify-between items-center px-8 py-3"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(30, 40, 50, 0.8) 20%, rgba(30, 40, 50, 0.8) 80%, transparent 100%)'
          }}
        >
          <span 
            className="text-white font-bold uppercase"
            style={{ fontSize: '36px', fontWeight: 700 }}
          >
            {status}
          </span>
          {windDisplay && (
            <span 
              className="text-white font-semibold"
              style={{ fontSize: '36px' }}
            >
              {windDisplay}
            </span>
          )}
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div className="flex-1 flex flex-col px-4 py-3 overflow-hidden">
          {/* Show only entries for current page */}
          {displayEntries.slice(currentPage * pagingSize, (currentPage + 1) * pagingSize).map((entry, index) => {
            const teamLogo = entry.team?.logoUrl;
            const displayName = isRelay 
              ? entry.team?.name || 'Unknown Team'
              : `${entry.athlete?.lastName || ''}`;
            const finalTime = formatTime(entry.finalMark);
            const splitTime = showSplits ? getLatestSplit(entry) : '';

            return (
              <div key={entry.id || index} className="relative flex-1 min-h-0">
                <div 
                  className="absolute inset-0 flex items-center px-6 rounded-sm overflow-hidden"
                  style={{
                    background: `radial-gradient(ellipse 120% 100% at 5% 50%, 
                      rgba(0, 150, 255, 0.6) 0%, 
                      rgba(0, 120, 200, 0.4) 20%,
                      rgba(0, 80, 160, 0.2) 40%,
                      rgba(0, 40, 80, 0.1) 60%,
                      transparent 80%
                    )`,
                  }}
                >
                  <div className="flex items-center w-full gap-6">
                    {/* First column: Lane for start list, Place for running/results */}
                    <span 
                      className="text-white font-black w-20 text-center shrink-0"
                      style={{ fontSize: '56px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {isStartList 
                        ? (entry.finalLane || index + 1)
                        : (entry.finalPlace || '-')
                      }
                    </span>

                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                      {teamLogo ? (
                        <img 
                          src={teamLogo} 
                          alt="" 
                          className="max-h-12 max-w-12 object-contain"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-700/30" />
                      )}
                    </div>

                    <span 
                      className="text-white font-bold flex-1 truncate uppercase"
                      style={{ fontSize: '48px', fontWeight: 700 }}
                    >
                      {displayName}
                    </span>

                    {showSplits && splitTime && (
                      <span 
                        className="text-yellow-400 font-bold tabular-nums shrink-0"
                        style={{ fontSize: '48px', fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {splitTime}
                      </span>
                    )}

                    <span 
                      className="text-white font-bold tabular-nums shrink-0 min-w-[200px] text-right"
                      style={{ fontSize: '56px', fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {finalTime}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500/50" />
              </div>
            );
          })}
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div className="flex items-center justify-center px-8 py-3">
          <span 
            className="text-gray-500"
            style={{ fontSize: '28px' }}
          >
            {meet?.name || ''}
          </span>
        </div>
      </div>
    </div>
  );
}
