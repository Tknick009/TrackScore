import { useState, useEffect, useMemo, useRef } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";

interface BigBoardProps {
  event: EventWithEntries;
  meet?: Meet | null;
  liveTime?: string;
  pagingSize?: number;
  pagingIntervalMs?: number;
}

export function BigBoard({ event, meet, liveTime, pagingSize = 8, pagingIntervalMs = 8000 }: BigBoardProps) {
  const [clock, setClock] = useState<string>("");
  const [fadeIn, setFadeIn] = useState(true);
  const [displayedEntries, setDisplayedEntries] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const prevEntriesRef = useRef<string>("");
  
  // Smooth fade transition when entries change
  useEffect(() => {
    const entriesKey = JSON.stringify((event.entries || []).map(e => e.id || e.lane));
    
    // If entries changed significantly (different set of athletes)
    if (entriesKey !== prevEntriesRef.current && prevEntriesRef.current !== "") {
      // Fade out
      setFadeIn(false);
      
      // After fade out, update entries and fade in
      const timer = setTimeout(() => {
        setDisplayedEntries(event.entries || []);
        setFadeIn(true);
      }, 300); // Match CSS transition duration
      
      prevEntriesRef.current = entriesKey;
      return () => clearTimeout(timer);
    } else {
      // First load or same entries - just update without fade
      setDisplayedEntries(event.entries || []);
      prevEntriesRef.current = entriesKey;
    }
  }, [event.entries]);

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

  const sortedEntries = useMemo(() => {
    // Filter out ONLY DNS entries - all others remain visible
    // Entries without timing data will show at reduced opacity (handled in rendering)
    const isDNS = (entry: any) => {
      const time = String(entry.time || entry.finalMark || '').toUpperCase().trim();
      const place = String(entry.place || entry.finalPlace || '').toUpperCase().trim();
      return time === 'DNS' || place === 'DNS';
    };
    
    const nonDNSEntries = (displayedEntries || []).filter((entry: any) => !isDNS(entry));
    
    return [...nonDNSEntries].sort((a, b) => {
      if (a.finalPlace && b.finalPlace) return a.finalPlace - b.finalPlace;
      if (a.finalPlace) return -1;
      if (b.finalPlace) return 1;
      return (a.finalLane || 0) - (b.finalLane || 0);
    });
  }, [displayedEntries]);

  // Calculate total pages and paged entries
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pagingSize));
  
  // Auto-page through entries based on pagingIntervalMs (lines = seconds rule)
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

  // Reset page when entries change significantly
  useEffect(() => {
    setCurrentPage(0);
  }, [sortedEntries.length]);

  // Get current page of entries
  const pagedEntries = useMemo(() => {
    const start = currentPage * pagingSize;
    const end = start + pagingSize;
    return sortedEntries.slice(start, end);
  }, [sortedEntries, currentPage, pagingSize]);

  const isRelay = event.eventType?.toLowerCase().includes('relay');
  const status = event.status === 'completed' ? 'FINAL' : event.status === 'in_progress' ? 'IN PROGRESS' : 'SCHEDULED';
  const windReading = event.entries?.[0]?.finalWind;
  const windDisplay = windReading !== null && windReading !== undefined 
    ? `WIND: ${windReading > 0 ? '+' : ''}${windReading.toFixed(1)}` 
    : 'WIND: nwi';

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
          <span 
            className="text-white font-semibold"
            style={{ fontSize: '36px' }}
          >
            {windDisplay}
          </span>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div 
          className="flex-1 flex flex-col px-4 py-3 overflow-hidden"
          style={{
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 300ms ease-in-out',
          }}
        >
          {pagedEntries.map((entry, index) => {
            const teamLogo = entry.team?.logoUrl;
            const displayName = isRelay 
              ? entry.team?.name || 'Unknown Team'
              : `${entry.athlete?.lastName || ''}`;
            const finalTime = formatTime(entry.finalMark);
            const splitTime = getLatestSplit(entry);

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
                    <span 
                      className="text-white font-black w-20 text-center shrink-0"
                      style={{ fontSize: '56px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {entry.finalLane || index + 1}
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

                    {splitTime && (
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

        <div className="flex items-center justify-between px-8 py-3">
          <span 
            className="text-gray-500"
            style={{ fontSize: '28px' }}
          >
            {meet?.name || ''}
          </span>
          {totalPages > 1 && (
            <span 
              className="text-gray-400 font-semibold"
              style={{ fontSize: '24px' }}
            >
              Page {currentPage + 1} of {totalPages}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
