import { useState, useEffect, useRef } from "react";
import type { Meet } from "@shared/schema";
import { formatHeatDisplay } from "@/lib/fieldBindings";

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
  const [displayClock, setDisplayClock] = useState("00:00:00");
  const lastSecondsRef = useRef<number>(-1);
  
  const rawEntries = liveEventData?.entries || (liveEventData as any)?.results || [];
  
  const resultsWithTimes = rawEntries.filter(
    (entry: ResultEntry) => entry.place && entry.name && (entry.time || entry.mark)
  );
  const resultsWithPlaces = rawEntries.filter(
    (entry: ResultEntry) => entry.place && entry.name
  );
  
  const hasTimesEntered = resultsWithTimes.length > 0;
  const results = hasTimesEntered ? resultsWithPlaces : [];
  const entriesForScrolling = rawEntries.filter((entry: ResultEntry) => 
    entry.name || entry.firstName || entry.lastName || entry.bib || entry.lane
  );
  
  useEffect(() => {
    console.log(`[BroadcastDisplay] rawEntries: ${rawEntries.length}, scrolling: ${entriesForScrolling.length}, mode: ${liveEventData?.mode}, hasTimesEntered: ${hasTimesEntered}`);
    if (rawEntries.length > 0) {
      console.log('[BroadcastDisplay] Sample entries:', rawEntries.slice(0, 2).map((e: ResultEntry) => ({
        lane: e.lane, bib: e.bib, name: e.name, affiliation: e.affiliation, time: e.time
      })));
    }
  }, [rawEntries.length, liveEventData?.mode, entriesForScrolling.length, hasTimesEntered]);
  
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
    const name = entry.name?.trim();
    if (name) {
      const parts = name.split(/\s+/);
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return `${firstName.charAt(0)}. ${lastName}`;
      }
      return name;
    }
    if (entry.affiliation) {
      return entry.affiliation;
    }
    if (entry.bib) {
      return `#${entry.bib}`;
    }
    if (entry.lane) {
      return `Lane ${entry.lane}`;
    }
    return '';
  };
  
  const getPlaceColor = (place: string) => {
    const num = parseInt(place);
    if (num === 1) return 'text-yellow-600';
    if (num === 2) return 'text-gray-500';
    if (num === 3) return 'text-orange-600';
    return 'text-black';
  };
  
  const formatTimeToHundredths = (timeStr: string) => {
    if (!timeStr) return timeStr;
    
    const match = timeStr.match(/^(\d+):(\d+)\.(\d+)$/);
    if (match) {
      const mins = match[1];
      const secs = match[2];
      const fraction = match[3];
      const decimalValue = parseFloat(`0.${fraction}`);
      const roundedUp = Math.ceil(decimalValue * 100) / 100;
      const hundredths = roundedUp.toFixed(2).substring(2);
      return `${mins}:${secs}.${hundredths}`;
    }
    
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
  const heatInfo = formatHeatDisplay(liveEventData?.heat, liveEventData?.totalHeats);

  const renderScrollingEntry = (entry: ResultEntry | null) => {
    if (!entry) {
      return (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-3">
          <span className="text-gray-300 text-lg">-</span>
        </div>
      );
    }
    
    const displayName = formatName(entry);
    const hasIndividualName = entry.name || entry.firstName || entry.lastName;
    const showAffiliation = entry.affiliation && hasIndividualName;
    
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-start px-1 py-1 uppercase">
        <div className="flex items-center justify-center gap-2 w-full">
          {entry.lane && (
            <span className="text-2xl font-semibold text-gray-600">
              {entry.lane}
            </span>
          )}
          <span className="text-3xl font-bold text-black text-center truncate">
            {displayName}
          </span>
        </div>
        {showAffiliation && (
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
    
    const displayName = formatName(entry);
    const hasIndividualName = entry.name || entry.firstName || entry.lastName;
    const showAffiliation = entry.affiliation && hasIndividualName;
    
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-start px-1 py-1 uppercase">
        <div className="flex items-center justify-center gap-2 w-full">
          <span className={`text-2xl font-semibold ${getPlaceColor(entry.place || '')}`}>
            {entry.place}.
          </span>
          <span className="text-3xl font-bold text-black text-center truncate">
            {displayName}
          </span>
        </div>
        {showAffiliation && (
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
                
                <div className="flex gap-2 flex-[5]">
                  {remainingResults.map((entry: ResultEntry, idx: number) => (
                    <div key={`col-${idx}`} className="flex-1 min-w-0">
                      {renderAthleteColumn(entry)}
                    </div>
                  ))}
                </div>
              </>
            ) : entriesForScrolling.length > 0 ? (
              <div className="flex gap-2 flex-1">
                {entriesForScrolling.map((entry: ResultEntry, idx: number) => (
                  <div key={`scroll-${idx}`} className="flex-1 min-w-0">
                    {renderScrollingEntry(entry)}
                  </div>
                ))}
              </div>
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
