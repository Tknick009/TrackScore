import { useState, useEffect } from "react";
import { EventWithEntries, Meet } from "@shared/schema";

interface RunningTimeProps {
  event: EventWithEntries;
  meet?: Meet;
  liveTime?: string;
}

export function RunningTime({ event, meet, liveTime }: RunningTimeProps) {
  const [elapsedTime, setElapsedTime] = useState<string>("0:00:00.0");
  const [startTime] = useState<number | null>(null);

  useEffect(() => {
    if (liveTime) {
      setElapsedTime(liveTime);
      return;
    }

    if (startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const tenths = Math.floor((elapsed % 1000) / 100);
        setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [startTime, liveTime]);

  const displayTime = liveTime || elapsedTime;

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
      <div className="flex items-center gap-4 px-6 pt-4">
        {meet?.logoUrl && (
          <img 
            src={meet.logoUrl} 
            alt={meet.name} 
            className="h-16 object-contain"
          />
        )}
        <h1 
          className="text-black font-bold leading-none flex-1 text-right"
          style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700 }}
        >
          {event.name || `${event.gender === 'M' ? 'Men' : 'Women'} ${event.eventType}`}
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <span 
          className="text-black font-bold tabular-nums leading-none"
          style={{ 
            fontSize: 'clamp(120px, 25vw, 300px)', 
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: '-0.02em'
          }}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
}
