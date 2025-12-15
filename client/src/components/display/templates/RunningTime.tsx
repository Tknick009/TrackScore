import { useState, useEffect } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";

interface RunningTimeProps {
  event?: EventWithEntries | null;
  meet?: Meet | null;
  liveTime?: string;
}

export function RunningTime({ event, meet, liveTime }: RunningTimeProps) {
  const [elapsedTime, setElapsedTime] = useState<string>("0:00.00");
  const [clock, setClock] = useState<string>("");

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

  useEffect(() => {
    if (liveTime) {
      setElapsedTime(liveTime);
    }
  }, [liveTime]);

  const displayTime = liveTime || elapsedTime;
  const eventName = event?.name || event?.eventName || (event ? `${event.gender === 'M' ? 'Men' : 'Women'} ${event.eventType}` : 'Running Time');
  const status = event?.status === 'completed' ? 'FINAL' : event?.status === 'in_progress' ? 'IN PROGRESS' : liveTime ? 'IN PROGRESS' : 'SCHEDULED';

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col" 
      style={{ 
        backgroundColor: '#000000',
        fontFamily: "'Barlow Semi Condensed', sans-serif" 
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 80%, rgba(0, 150, 255, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0, 120, 220, 0.2) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <div className="flex items-center gap-6">
            {meet?.logoUrl && (
              <img 
                src={meet.logoUrl} 
                alt={meet.name} 
                className="h-20 object-contain"
              />
            )}
            <h1 
              className="text-white font-bold leading-none uppercase"
              style={{ fontSize: '64px', fontWeight: 700 }}
            >
              {eventName}
            </h1>
          </div>
          
          <div className="text-right">
            <span 
              className="text-gray-400 font-semibold tabular-nums"
              style={{ fontSize: '36px' }}
            >
              {clock}
            </span>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div 
          className="flex items-center justify-center px-6 py-3"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 140, 220, 0.4) 20%, rgba(0, 140, 220, 0.4) 80%, transparent 100%)'
          }}
        >
          <span 
            className="text-white font-bold uppercase tracking-wider"
            style={{ fontSize: '48px', fontWeight: 700 }}
          >
            {status}
          </span>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div className="flex-1 flex items-center justify-center">
          <span 
            className="text-white font-black tabular-nums leading-none"
            style={{ 
              fontSize: '200px', 
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '-0.02em',
              textShadow: '0 0 60px rgba(0, 150, 255, 0.4)'
            }}
          >
            {displayTime}
          </span>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div className="flex items-center justify-center px-8 py-4">
          <span 
            className="text-gray-500 font-semibold"
            style={{ fontSize: '32px' }}
          >
            {meet?.name || ''}
          </span>
        </div>
      </div>
    </div>
  );
}
