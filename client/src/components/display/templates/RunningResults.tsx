import { useState, useEffect } from "react";
import type { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";
import { getLogoEffectStyle } from "@/lib/logoEffects";

interface RunningResultsProps {
  event: EventWithEntries;
  meet?: Meet | null;
  athleteEntry?: EntryWithDetails;
  liveTime?: string;
}

export function RunningResults({ event, meet, athleteEntry, liveTime }: RunningResultsProps) {
  const [clock, setClock] = useState<string>("");
  const entry = athleteEntry || event.entries[0];

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
  
  if (!entry) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center display-layout"
        style={{ backgroundColor: '#000000' }}
      >
        <p className="text-gray-500" style={{ fontSize: '48px' }}>No athlete data</p>
      </div>
    );
  }

  // Round UP to nearest hundredth (track & field rule: 8.315 → 8.32)
  const ceilHundredths = (val: number): number => Math.ceil(val * 100 - 1e-9) / 100;

  const formatTime = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '--';
    const totalSeconds = mark / 1000;
    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = ceilHundredths(totalSeconds % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    return ceilHundredths(totalSeconds).toFixed(2);
  };

  const athleteName = `${entry.athlete?.firstName || ''} ${entry.athlete?.lastName || ''}`.trim() || 'Unknown';
  const teamName = entry.team?.name || '';
  const place = entry.finalPlace || '--';
  const time = formatTime(entry.finalMark);
  const photoUrl = entry.athlete?.photoUrl;
  const teamLogo = entry.team?.logoUrl;

  return (
    <div 
      className="h-screen w-screen overflow-hidden display-layout" 
      style={{ 
        backgroundColor: '#000000'
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 70% 60%, rgba(0, 150, 255, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 30% 80%, rgba(0, 120, 220, 0.2) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 h-full flex">
        {photoUrl && (
          <div className="w-2/5 h-full relative">
            <img 
              src={photoUrl} 
              alt={athleteName}
              className="w-full h-full object-cover object-top"
            />
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 60%, rgba(0,0,0,0.8) 100%)'
              }}
            />
          </div>
        )}

        <div className={`${photoUrl ? 'w-3/5' : 'w-full'} h-full flex flex-col`}>
          <div className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-6">
              {meet?.logoUrl && (
                <img 
                  src={meet.logoUrl} 
                  alt={meet.name} 
                  className="h-16 object-contain"
                  style={getLogoEffectStyle(meet.logoEffect)}
                />
              )}
              <h2 
                className="text-white font-bold uppercase"
                style={{ fontSize: '48px', fontWeight: 700 }}
              >
                {event.name || event.eventName || ''}
              </h2>
            </div>
            <span 
              className="text-white font-bold tabular-nums"
              style={{ fontSize: '48px', fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {liveTime || clock}
            </span>
          </div>

          <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

          <div className="flex-1 flex flex-col justify-center px-12 py-8">
            <div className="flex items-center gap-8 mb-6">
              {teamLogo && (
                <img 
                  src={teamLogo} 
                  alt="" 
                  className="h-24 w-24 object-contain"
                />
              )}
              <div>
                <h1 
                  className="text-white font-bold leading-tight uppercase"
                  style={{ fontSize: '80px', fontWeight: 700 }}
                >
                  {athleteName}
                </h1>
                
                <p 
                  className="text-gray-400 uppercase tracking-wider whitespace-nowrap truncate"
                  style={{ fontSize: '40px', fontWeight: 600 }}
                >
                  {teamName}
                </p>
              </div>
            </div>

            <div className="h-1 bg-gradient-to-r from-cyan-500/60 via-cyan-500/30 to-transparent mb-8" />

            <div className="flex items-end gap-12">
              <div>
                <span 
                  className="text-gray-500 uppercase tracking-wider block mb-2"
                  style={{ fontSize: '32px' }}
                >
                  Place
                </span>
                <span 
                  className="text-white font-black"
                  style={{ fontSize: '96px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {place}
                </span>
              </div>

              <div className="flex-1">
                <span 
                  className="text-gray-500 uppercase tracking-wider block mb-2"
                  style={{ fontSize: '32px' }}
                >
                  Time
                </span>
                <span 
                  className="text-yellow-400 font-black tabular-nums"
                  style={{ 
                    fontSize: '120px',
                    fontFamily: "'Bebas Neue', sans-serif",
                    textShadow: '0 0 40px rgba(255, 200, 0, 0.3)'
                  }}
                >
                  {time}
                </span>
              </div>
            </div>
          </div>

          <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

          <div className="flex items-center justify-center px-8 py-4">
            <span 
              className="text-gray-600"
              style={{ fontSize: '28px' }}
            >
              {meet?.name || ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
