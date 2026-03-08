import { useState, useEffect, useMemo, useRef } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";
import { getLogoEffectStyle } from "@/lib/logoEffects";

interface BigBoardProps {
  event: EventWithEntries;
  meet?: Meet | null;
  liveTime?: string;
  pagingSize?: number;
  pagingIntervalMs?: number;
}

export function BigBoard({ event, meet, liveTime }: BigBoardProps) {
  const [clock, setClock] = useState<string>("");
  const [fadeIn, setFadeIn] = useState(true);
  const [displayedEntries, setDisplayedEntries] = useState<any[]>([]);
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

  // Helper to check if an entry is DNS, FS, or Scratch (dimmed to 50% opacity, not hidden)
  const isDimmedEntry = (entry: any) => {
    const time = String(entry.time || entry.finalMark || '').toUpperCase().trim();
    const place = String(entry.place || entry.finalPlace || '').toUpperCase().trim();
    return time === 'DNS' || place === 'DNS' || time === 'FS' || place === 'FS' 
      || time === 'SCR' || place === 'SCR' || entry.isScratched === true;
  };

  const sortedEntries = useMemo(() => {
    // Keep ALL entries visible — DNS/FS/Scratch render at 50% opacity
    // Parse place values to numbers for reliable sorting
    return [...(displayedEntries || [])].sort((a, b) => {
      const placeA = typeof a.finalPlace === 'number' ? a.finalPlace : parseInt(String(a.finalPlace));
      const placeB = typeof b.finalPlace === 'number' ? b.finalPlace : parseInt(String(b.finalPlace));
      const hasPlaceA = !isNaN(placeA) && placeA > 0;
      const hasPlaceB = !isNaN(placeB) && placeB > 0;
      
      if (hasPlaceA && hasPlaceB) return placeA - placeB;
      if (hasPlaceA) return -1;
      if (hasPlaceB) return 1;
      return (a.finalLane || 0) - (b.finalLane || 0);
    });
  }, [displayedEntries]);

  const isRelay = event.eventType?.toLowerCase().includes('relay');
  const isCompleted = event.status === 'completed';
  const isStartList = event.status === 'scheduled' || event.status === 'upcoming';
  // Use roundName from liveEventData if available (e.g., "Prelims", "Semis", "Finals")
  const roundName = (event as any).roundName;
  const status = roundName 
    ? roundName.toUpperCase() 
    : (isCompleted ? 'FINAL' : event.status === 'in_progress' ? 'IN PROGRESS' : 'SCHEDULED');
  
  // Wind display - handle both numeric and string wind values
  const windReading = (event as any).wind ?? event.entries?.[0]?.finalWind;
  const windDisplay = (() => {
    if (windReading === null || windReading === undefined) return 'WIND: nwi';
    if (typeof windReading === 'string') {
      const trimmed = windReading.trim();
      return trimmed ? `WIND: ${trimmed}` : 'WIND: nwi';
    }
    return `WIND: ${windReading > 0 ? '+' : ''}${windReading.toFixed(1)}`;
  })();

  // Format time - handles both string times from live data ("10.23", "1:45.67") 
  // and numeric times from database (seconds — HyTek MDB stores as seconds)
  // Round UP to nearest hundredth (track & field rule: 8.315 → 8.32)
  const ceilHundredths = (val: number): number => Math.ceil(val * 100 - 1e-9) / 100;

  const formatTime = (mark: any): string => {
    if (mark === null || mark === undefined || mark === '') return '';
    // If it's already a string (from live FinishLynx data), return as-is
    if (typeof mark === 'string') {
      const trimmed = mark.trim();
      return trimmed;
    }
    // Numeric value from database — HyTek stores times in seconds (e.g. 10.23, 128.59)
    if (typeof mark === 'number') {
      if (mark >= 60) {
        const minutes = Math.floor(mark / 60);
        const seconds = ceilHundredths(mark % 60).toFixed(2);
        return `${minutes}:${seconds.padStart(5, '0')}`;
      }
      return ceilHundredths(mark).toFixed(2);
    }
    return String(mark);
  };

  // Get latest split - handles both array splits (database) and string splits (live data)
  const getLatestSplit = (entry: any): string => {
    // Live data has lastSplit or cumulativeSplit as strings
    if (entry.lastSplit) {
      const split = String(entry.lastSplit).trim();
      if (split !== '') return split;
    }
    if (entry.cumulativeSplit) {
      const split = String(entry.cumulativeSplit).trim();
      if (split !== '') return split;
    }
    // Database data has splits array
    if (entry.splits && entry.splits.length > 0) {
      const lastSplit = entry.splits[entry.splits.length - 1];
      return formatTime(lastSplit?.splitTime);
    }
    return '';
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
                style={getLogoEffectStyle(meet.logoEffect)}
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
          {sortedEntries.map((entry, index) => {
            const teamLogo = entry.team?.logoUrl;
            const displayName = isRelay 
              ? entry.team?.name || 'Unknown Team'
              : `${entry.athlete?.lastName || ''}`;
            // Use pre-formatted performance string from server (enrichEntry) when available,
            // otherwise format the raw numeric finalMark
            const finalTime = entry.performance || formatTime(entry.finalMark);
            const splitTime = getLatestSplit(entry);
            
            // Parse place for display
            const placeVal = typeof entry.finalPlace === 'number' ? entry.finalPlace : parseInt(String(entry.finalPlace));
            const hasPlace = !isNaN(placeVal) && placeVal > 0;
            
            // Opacity: DNS/FS/Scratch = 50%, no data yet = 50%, has data = 100%
            const dimmed = isDimmedEntry(entry);
            const hasResultData = finalTime !== '' || splitTime !== '';
            let rowOpacity = 1;
            if (dimmed) {
              rowOpacity = 0.5;
            } else if (isStartList) {
              rowOpacity = 1; // Start list: filled rows at full opacity
            } else if (!isCompleted && !hasResultData) {
              rowOpacity = 0.5; // Running: no split/time yet = dimmed
            } else if (isCompleted && !hasResultData) {
              rowOpacity = 0.5; // Results: no time yet = dimmed
            }

            return (
              <div key={entry.id || index} className="relative flex-1 min-h-0" style={{ opacity: rowOpacity, transition: 'opacity 0.3s ease-in-out' }}>
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
                    {/* Place/Rank — show place when results are in, lane when not */}
                    <span 
                      className="text-white font-black w-20 text-center shrink-0"
                      style={{ fontSize: '56px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {hasPlace ? placeVal : (entry.finalLane || index + 1)}
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

                    {/* Q/q Qualifier Badge */}
                    {(entry as any).qualifier && (
                      <span
                        className="font-bold shrink-0 rounded"
                        style={{
                          fontSize: '36px',
                          padding: '2px 10px',
                          backgroundColor: (entry as any).qualifier === 'Q' ? 'rgba(21, 128, 61, 0.35)' : 'rgba(30, 64, 175, 0.35)',
                          color: (entry as any).qualifier === 'Q' ? '#4ade80' : '#60a5fa',
                          border: `1px solid ${(entry as any).qualifier === 'Q' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(96, 165, 250, 0.5)'}`,
                          minWidth: '44px',
                          textAlign: 'center' as const,
                        }}
                      >
                        {(entry as any).qualifier}
                      </span>
                    )}

                    {/* Record/Best Tags */}
                    {((entry as any).recordTags || []).length > 0 && (
                      <div className="flex gap-1 shrink-0 ml-3">
                        {((entry as any).recordTags as string[]).map((tag: string) => (
                          <span
                            key={tag}
                            className="font-bold uppercase rounded"
                            style={{
                              fontSize: '0.3em',
                              padding: '0.15em 0.4em',
                              backgroundColor: tag.includes('MR') || tag.includes('FR') ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 200, 255, 0.2)',
                              color: tag.includes('MR') || tag.includes('FR') ? '#ffd700' : '#00e5ff',
                              border: `1px solid ${tag.includes('MR') || tag.includes('FR') ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 200, 255, 0.4)'}`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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
