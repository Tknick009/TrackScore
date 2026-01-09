import { useState, useEffect } from "react";
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
  
  const rawEntries = liveEventData?.entries || (liveEventData as any)?.results || [];
  const results = rawEntries.filter(
    (entry: ResultEntry) => entry.place && entry.name
  );
  
  const firstPlace = results.length > 0 ? results[0] : null;
  const remainingResults = results.slice(1);
  const totalPages = Math.max(1, Math.ceil(remainingResults.length / 5));
  
  useEffect(() => {
    if (liveClockTime) {
      setDisplayClock(liveClockTime);
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
      return `${entry.firstName} ${entry.lastName}`;
    }
    return entry.name?.trim() || 'Unknown';
  };
  
  const getPlaceColor = (place: string) => {
    const num = parseInt(place);
    if (num === 1) return 'text-yellow-600';
    if (num === 2) return 'text-gray-500';
    if (num === 3) return 'text-orange-600';
    return 'text-black';
  };
  
  const eventName = liveEventData?.eventName || '';
  const heatInfo = liveEventData?.heat && liveEventData?.totalHeats && liveEventData.totalHeats > 1
    ? `Heat ${liveEventData.heat} of ${liveEventData.totalHeats}`
    : '';

  const currentPageResults = remainingResults.slice(pageIndex * 5, (pageIndex + 1) * 5);
  
  while (currentPageResults.length < 5) {
    currentPageResults.push(null as any);
  }

  const renderAthleteColumn = (entry: ResultEntry | null) => {
    if (!entry) {
      return (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-3 bg-gray-50/50 rounded">
          <span className="text-gray-300 text-lg">-</span>
        </div>
      );
    }
    
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-3 py-4 bg-gray-50/50 rounded">
        <span className="text-2xl font-bold text-black text-center truncate w-full">
          {formatName(entry)}
        </span>
        {entry.affiliation && (
          <span className="text-lg text-gray-600 truncate w-full text-center">
            {entry.affiliation}
          </span>
        )}
        <span className={`text-xl font-semibold mt-1 ${getPlaceColor(entry.place || '')}`}>
          {formatPlace(entry.place || '')}
        </span>
        {(entry.time || entry.mark) && (
          <span className="text-2xl font-bold text-black mt-1">
            {entry.time || entry.mark}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ fontFamily: "'Oswald', sans-serif", backgroundColor: 'transparent' }}>
      <div className="absolute inset-x-0 bottom-0 py-4 px-6 mx-4 mb-4 bg-white/95 rounded-lg" style={{ border: '1px solid rgba(200, 200, 200, 0.5)' }}>
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
                    <div className="text-sm text-gray-600">
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
            
            {!firstPlace && results.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-8">
                <span className="text-xl text-gray-500">
                  {eventName ? `${eventName} - Waiting for results...` : 'Waiting for results...'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {totalPages > 1 && (
          <div className="absolute bottom-2 right-6 text-xs text-gray-400">
            {pageIndex + 1} / {totalPages}
          </div>
        )}
      </div>
    </div>
  );
}
