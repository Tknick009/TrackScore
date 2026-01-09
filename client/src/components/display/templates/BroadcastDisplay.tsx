import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Meet } from "@shared/schema";

interface ResultEntry {
  place?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  affiliation?: string;
  time?: string;
  mark?: string;
  lane?: string;
  bib?: string;
  eventName?: string;
}

interface BroadcastDisplayProps {
  meet?: Meet | null;
  liveClockTime?: string;
  liveEventData?: {
    eventNumber?: number;
    eventName?: string;
    heat?: number;
    totalHeats?: number;
    round?: number;
    entries?: ResultEntry[];
    wind?: string;
    distance?: string;
    mode?: string;
  } | null;
}

export function BroadcastDisplay({ meet, liveClockTime, liveEventData }: BroadcastDisplayProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [displayClock, setDisplayClock] = useState("00:00:00");
  const lastSecondsRef = useRef<number>(-1);
  
  const rawEntries = liveEventData?.entries || (liveEventData as any)?.results || [];
  
  // Debug logging for entries
  useEffect(() => {
    const entriesWithMarks = rawEntries.filter((e: ResultEntry) => e.time || e.mark);
    console.log(`[BroadcastDisplay] rawEntries: ${rawEntries.length}, with marks: ${entriesWithMarks.length}, mode: ${liveEventData?.mode}`);
    if (rawEntries.length > 0 && rawEntries.length <= 3) {
      console.log('[BroadcastDisplay] First entries:', rawEntries.slice(0, 3));
    }
  }, [rawEntries, liveEventData?.mode]);
  const resultsWithTimes = rawEntries.filter(
    (entry: ResultEntry) => entry.place && entry.name && (entry.time || entry.mark)
  );
  const resultsWithPlaces = rawEntries.filter(
    (entry: ResultEntry) => entry.place && entry.name
  );
  
  // Use results with times if available, otherwise show all entries with names for scrolling
  const hasTimesEntered = resultsWithTimes.length > 0;
  const results = hasTimesEntered ? resultsWithPlaces : [];
  // Accept entries with name, firstName/lastName, bib, or lane
  const entriesForScrolling = rawEntries.filter((entry: ResultEntry) => 
    entry.name || entry.firstName || entry.lastName || entry.bib || entry.lane
  );
  
  // Detect ties - find times that appear more than once (to hundredths)
  const getTimeToHundredths = (entry: ResultEntry) => {
    const time = entry.time || entry.mark || '';
    const match = time.match(/^(\d+:\d+\.\d{2})/);
    if (match) return match[1];
    const secMatch = time.match(/^(\d+\.\d{2})/);
    if (secMatch) return secMatch[1];
    return time;
  };
  
  const timeCounts = new Map<string, number>();
  results.forEach((entry: ResultEntry) => {
    const timeHundredths = getTimeToHundredths(entry);
    if (timeHundredths) {
      timeCounts.set(timeHundredths, (timeCounts.get(timeHundredths) || 0) + 1);
    }
  });
  
  const tiedTimes = new Set<string>();
  timeCounts.forEach((count, time) => {
    if (count > 1) tiedTimes.add(time);
  });
  
  const firstPlace = results.length > 0 ? results[0] : null;
  const remainingResults = results.slice(1);
  
  // For scrolling mode (no times), paginate all entries
  const scrollingTotalPages = Math.max(1, Math.ceil(entriesForScrolling.length / 6));
  const totalPages = hasTimesEntered 
    ? Math.max(1, Math.ceil(remainingResults.length / 5))
    : scrollingTotalPages;
  
  // Parse clock string to total seconds
  const parseClockToSeconds = (clock: string): number => {
    const dotIndex = clock.indexOf('.');
    const timeOnly = dotIndex !== -1 ? clock.substring(0, dotIndex) : clock;
    const parts = timeOnly.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  };
  
  useEffect(() => {
    if (liveClockTime) {
      const currentSeconds = parseClockToSeconds(liveClockTime);
      // Only update display if seconds have advanced (monotonic)
      // or if clock was reset (new race started - seconds dropped significantly)
      if (currentSeconds > lastSecondsRef.current || currentSeconds < lastSecondsRef.current - 5) {
        lastSecondsRef.current = currentSeconds;
        const dotIndex = liveClockTime.indexOf('.');
        if (dotIndex !== -1) {
          setDisplayClock(liveClockTime.substring(0, dotIndex));
        } else {
          setDisplayClock(liveClockTime);
        }
      }
    }
  }, [liveClockTime]);
  
  useEffect(() => {
    if (totalPages <= 1) {
      setPageIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [totalPages]);
  
  useEffect(() => {
    setPageIndex(0);
  }, [results.length]);
  
  const formatPlace = (place: string) => {
    const num = parseInt(place);
    if (isNaN(num)) return place;
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return `${num}${suffix}`;
  };
  
  const formatName = (entry: ResultEntry) => {
    if (entry.firstName && entry.lastName) {
      return `${entry.firstName.charAt(0)}. ${entry.lastName}`;
    }
    // Parse "FirstName LastName" format from name field
    const name = entry.name?.trim() || 'Unknown';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      return `${firstName.charAt(0)}. ${lastName}`;
    }
    return name;
  };
  
  const getPlaceColor = (place: string) => {
    const num = parseInt(place);
    if (num === 1) return 'text-yellow-600';
    if (num === 2) return 'text-gray-500';
    if (num === 3) return 'text-orange-600';
    return 'text-black';
  };
  
  // Round time UP to hundredths (e.g., "8:52.024" -> "8:52.03", "9:17.071" -> "9:17.08")
  const formatTimeToHundredths = (timeStr: string) => {
    if (!timeStr) return timeStr;
    
    // Handle MM:SS.xxx format
    const match = timeStr.match(/^(\d+):(\d+)\.(\d+)$/);
    if (match) {
      const mins = match[1];
      const secs = match[2];
      const fraction = match[3];
      // Convert fraction to a decimal and round up to 2 places
      const decimalValue = parseFloat(`0.${fraction}`);
      const roundedUp = Math.ceil(decimalValue * 100) / 100;
      const hundredths = roundedUp.toFixed(2).substring(2);
      return `${mins}:${secs}.${hundredths}`;
    }
    
    // Handle SS.xxx format (seconds only)
    const secMatch = timeStr.match(/^(\d+)\.(\d+)$/);
    if (secMatch) {
      const secs = secMatch[1];
      const fraction = secMatch[2];
      const decimalValue = parseFloat(`0.${fraction}`);
      const roundedUp = Math.ceil(decimalValue * 100) / 100;
      const hundredths = roundedUp.toFixed(2).substring(2);
      return `${secs}.${hundredths}`;
    }
    
    return timeStr;
  };
  
  const eventName = liveEventData?.eventName || '';
  const heatInfo = liveEventData?.heat && liveEventData.heat > 0
    ? `Heat ${liveEventData.heat}`
    : '';

  const currentPageResults = remainingResults.slice(pageIndex * 5, (pageIndex + 1) * 5);
  
  while (currentPageResults.length < 5) {
    currentPageResults.push(null as any);
  }
  
  // For scrolling mode (no times entered yet)
  const currentScrollingEntries = entriesForScrolling.slice(pageIndex * 6, (pageIndex + 1) * 6);
  while (currentScrollingEntries.length < 6) {
    currentScrollingEntries.push(null as any);
  }
  
  const renderScrollingEntry = (entry: ResultEntry | null) => {
    if (!entry) {
      return (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-3">
          <span className="text-gray-300 text-lg">-</span>
        </div>
      );
    }
    
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-start px-1 py-1 uppercase">
        <div className="flex items-center justify-center gap-2 w-full">
          {entry.lane && (
            <span className="text-2xl font-semibold text-gray-600">
              {entry.lane}
            </span>
          )}
          {entry.bib && (
            <span className="text-2xl font-bold text-gray-800 bg-gray-200 px-2 py-0.5 min-w-[3rem] text-center">
              {entry.bib}
            </span>
          )}
          <span className="text-3xl font-bold text-black text-center truncate">
            {formatName(entry)}
          </span>
        </div>
        {entry.affiliation && (
          <span className="text-xl text-gray-600 truncate w-full text-center leading-tight">
            {entry.affiliation}
          </span>
        )}
      </div>
    );
  };

  const renderAthleteColumn = (entry: ResultEntry | null) => {
    if (!entry) {
      return (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-3">
          <span className="text-gray-300 text-lg">-</span>
        </div>
      );
    }
    
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-start px-1 py-1 uppercase">
        <div className="flex items-center justify-center gap-2 w-full">
          <span className={`text-2xl font-semibold ${getPlaceColor(entry.place || '')}`}>
            {entry.place}.
          </span>
          <span className="text-3xl font-bold text-black text-center truncate">
            {formatName(entry)}
          </span>
        </div>
        {entry.affiliation && (
          <span className="text-xl text-gray-600 truncate w-full text-center leading-tight">
            {entry.affiliation}
          </span>
        )}
        {(entry.time || entry.mark) && (() => {
          const fullTime = entry.time || entry.mark || '';
          const timeHundredths = getTimeToHundredths(entry);
          const isTied = tiedTimes.has(timeHundredths) && fullTime.length > timeHundredths.length;
          return (
            <div className="relative flex-shrink-0 overflow-visible">
              <span className="text-3xl font-bold text-black whitespace-nowrap block">
                {formatTimeToHundredths(fullTime)}
              </span>
              {isTied && (
                <span className="absolute left-1/2 -translate-x-1/2 top-full text-lg text-gray-500 whitespace-nowrap">
                  {fullTime}
                </span>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ fontFamily: "'Oswald', sans-serif", backgroundColor: 'white' }}>
      <div className="absolute inset-x-0 bottom-0 py-4 px-6 mx-4 mb-4 bg-white/95" style={{ border: '1px solid rgba(200, 200, 200, 0.5)' }}>
        <div className="flex gap-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            {meet?.logoUrl && (
              <div className="h-32 w-48 flex items-center justify-center">
                <img 
                  src={meet.logoUrl} 
                  alt={meet.name || 'Meet Logo'}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center">
              {eventName && (
                <div className="text-center mb-1">
                  <div className="text-2xl font-bold uppercase tracking-wide text-black">
                    {eventName}
                  </div>
                  {heatInfo && (
                    <div className="text-xl text-gray-600">
                      {heatInfo}
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-5xl font-bold tracking-wider text-black">
                {displayClock}
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex gap-2 overflow-hidden">
            {hasTimesEntered ? (
              <>
                {firstPlace && (
                  <div className="flex-1 min-w-0">
                    {renderAthleteColumn(firstPlace)}
                  </div>
                )}
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pageIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="flex gap-2 flex-[5]"
                  >
                    {currentPageResults.map((entry: ResultEntry | null, idx: number) => (
                      <div key={`col-${pageIndex}-${idx}`} className="flex-1 min-w-0">
                        {renderAthleteColumn(entry)}
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </>
            ) : entriesForScrolling.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={pageIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="flex gap-2 flex-1"
                >
                  {currentScrollingEntries.map((entry: ResultEntry | null, idx: number) => (
                    <div key={`scroll-${pageIndex}-${idx}`} className="flex-1 min-w-0">
                      {renderScrollingEntry(entry)}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <span className="text-xl text-gray-500 uppercase">
                  {eventName ? `${eventName} - Waiting for results...` : 'Waiting for results...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
