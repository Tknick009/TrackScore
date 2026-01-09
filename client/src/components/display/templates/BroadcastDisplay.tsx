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
  
  const results = (liveEventData?.entries || []).filter(
    (entry) => entry.place && entry.name && (entry.time || entry.mark)
  );
  
  const firstPlace = results.length > 0 ? results[0] : null;
  const remainingResults = results.slice(1);
  const totalPages = Math.ceil(remainingResults.length / 5);
  
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
    return entry.name || 'Unknown';
  };
  
  const getPlaceColor = (place: string) => {
    const num = parseInt(place);
    if (num === 1) return 'text-yellow-600';
    if (num === 2) return 'text-gray-500';
    if (num === 3) return 'text-orange-600';
    return 'text-black';
  };
  
  const eventName = liveEventData?.eventName || '';
  const heatInfo = liveEventData?.heat && liveEventData?.totalHeats 
    ? `Heat ${liveEventData.heat} of ${liveEventData.totalHeats}`
    : '';

  const currentPageResults = remainingResults.slice(pageIndex * 5, (pageIndex + 1) * 5);

  const renderResultRow = (entry: ResultEntry, index: number) => (
    <div key={`${entry.place}-${index}`} className="flex items-center gap-4 py-1">
      <span className={`text-3xl font-bold w-16 text-right ${getPlaceColor(entry.place || '')}`}>
        {formatPlace(entry.place || '')}
      </span>
      <span className="text-2xl font-semibold flex-1 text-black">
        {formatName(entry)}
      </span>
      {entry.affiliation && (
        <span className="text-lg text-gray-600 w-32 truncate">
          {entry.affiliation}
        </span>
      )}
      <span className="text-2xl font-bold text-black w-32 text-right">
        {entry.time || entry.mark || ''}
      </span>
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ fontFamily: "'Oswald', sans-serif", backgroundColor: 'transparent' }}>
      <div className="absolute inset-x-0 bottom-0 h-auto min-h-[200px] py-4 px-6 mx-4 mb-4 bg-white/95 rounded-lg" style={{ border: '1px solid rgba(200, 200, 200, 0.5)' }}>
        <div className="flex gap-8 h-full">
          <div className="flex items-center gap-4 flex-shrink-0">
            {meet?.logoUrl && (
              <div className="h-20 w-24 flex items-center justify-center">
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
                  <div className="text-lg font-bold uppercase tracking-wide text-black">
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
          
          <div className="flex-1 overflow-hidden">
            {firstPlace && (
              <div className="flex items-center gap-4 py-2 border-b-2 border-gray-200 mb-2">
                <span className={`text-4xl font-bold w-20 text-right ${getPlaceColor(firstPlace.place || '')}`}>
                  {formatPlace(firstPlace.place || '')}
                </span>
                <span className="text-3xl font-bold flex-1 text-black">
                  {formatName(firstPlace)}
                </span>
                {firstPlace.affiliation && (
                  <span className="text-xl text-gray-600 w-40 truncate">
                    {firstPlace.affiliation}
                  </span>
                )}
                <span className="text-3xl font-bold text-black w-36 text-right">
                  {firstPlace.time || firstPlace.mark || ''}
                </span>
              </div>
            )}
            
            <AnimatePresence mode="wait">
              {currentPageResults.length > 0 ? (
                <motion.div
                  key={pageIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-1"
                >
                  {currentPageResults.map((entry, idx) => renderResultRow(entry, idx))}
                </motion.div>
              ) : !firstPlace ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-full"
                >
                  <span className="text-2xl text-gray-500">
                    {eventName ? `${eventName} - Waiting for results...` : 'Waiting for results...'}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            
            {totalPages > 1 && (
              <div className="absolute bottom-2 right-6 text-sm text-gray-400">
                Page {pageIndex + 1} of {totalPages}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
