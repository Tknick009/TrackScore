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
  const [tickerIndex, setTickerIndex] = useState(0);
  const [displayClock, setDisplayClock] = useState("00:00:00");
  const tickerRef = useRef<HTMLDivElement>(null);
  
  const results = (liveEventData?.entries || []).filter(
    (entry) => entry.place && entry.name && (entry.time || entry.mark)
  );
  
  useEffect(() => {
    if (liveClockTime) {
      setDisplayClock(liveClockTime);
    }
  }, [liveClockTime]);
  
  useEffect(() => {
    if (results.length === 0) return;
    
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % results.length);
    }, 4000);
    
    return () => clearInterval(interval);
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
    if (num === 1) return 'text-yellow-400';
    if (num === 2) return 'text-gray-300';
    if (num === 3) return 'text-orange-400';
    return 'text-white';
  };
  
  const eventName = liveEventData?.eventName || '';
  const heatInfo = liveEventData?.heat && liveEventData?.totalHeats 
    ? `Heat ${liveEventData.heat} of ${liveEventData.totalHeats}`
    : '';

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        backgroundColor: '#000000',
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-32 flex items-center"
        style={{ 
          background: `linear-gradient(to right, ${meet?.primaryColor || '#1e3a5f'}, ${meet?.secondaryColor || '#0f1f33'})`,
        }}
      >
        <div className="flex items-center h-full w-full px-4 gap-6">
          {meet?.logoUrl && (
            <div className="h-20 w-40 flex-shrink-0 flex items-center justify-center">
              <img 
                src={meet.logoUrl} 
                alt={meet.name || 'Meet Logo'}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          
          <div className="flex-shrink-0 bg-black/30 rounded-lg px-5 py-3">
            <div className="text-4xl font-mono font-bold tracking-wider"
              style={{ color: meet?.textColor || '#FFFFFF' }}
            >
              {displayClock}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <AnimatePresence mode="wait">
              {results.length > 0 ? (
                <motion.div
                  key={tickerIndex}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="flex items-center gap-6 w-full"
                >
                  {eventName && (
                    <div className="flex-shrink-0">
                      <span 
                        className="text-lg font-semibold uppercase tracking-wide"
                        style={{ color: meet?.textColor || '#FFFFFF' }}
                      >
                        {eventName}
                      </span>
                      {heatInfo && (
                        <span 
                          className="text-sm ml-2 opacity-70"
                          style={{ color: meet?.textColor || '#FFFFFF' }}
                        >
                          {heatInfo}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <span className={`text-5xl font-bold ${getPlaceColor(results[tickerIndex]?.place || '')}`}>
                      {formatPlace(results[tickerIndex]?.place || '')}
                    </span>
                    
                    <div className="flex flex-col">
                      <span 
                        className="text-3xl font-bold"
                        style={{ color: meet?.textColor || '#FFFFFF' }}
                      >
                        {formatName(results[tickerIndex])}
                      </span>
                      {results[tickerIndex]?.affiliation && (
                        <span 
                          className="text-base opacity-70"
                          style={{ color: meet?.textColor || '#FFFFFF' }}
                        >
                          {results[tickerIndex].affiliation}
                        </span>
                      )}
                    </div>
                    
                    <span 
                      className="text-4xl font-mono font-bold ml-4"
                      style={{ color: meet?.textColor || '#FFFFFF' }}
                    >
                      {results[tickerIndex]?.time || results[tickerIndex]?.mark || ''}
                    </span>
                  </div>
                  
                  <div 
                    className="ml-auto text-sm opacity-50 flex-shrink-0"
                    style={{ color: meet?.textColor || '#FFFFFF' }}
                  >
                    {tickerIndex + 1} / {results.length}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4"
                >
                  <span 
                    className="text-xl"
                    style={{ color: meet?.textColor || '#FFFFFF' }}
                  >
                    {eventName ? `${eventName} - Waiting for results...` : 'Waiting for results...'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {meet?.name && (
        <div 
          className="absolute top-4 left-4 text-lg font-semibold opacity-70"
          style={{ color: meet?.textColor || '#FFFFFF' }}
        >
          {meet.name}
        </div>
      )}
    </div>
  );
}
