import { useState, useEffect } from "react";
import type { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";

interface FieldSideBySideProps {
  event: EventWithEntries;
  meet?: Meet | null;
  leftAthlete?: EntryWithDetails;
  rightAthlete?: EntryWithDetails;
  liveTime?: string;
}

export function FieldSideBySide({ event, meet, leftAthlete, rightAthlete, liveTime }: FieldSideBySideProps) {
  const [clock, setClock] = useState<string>("");
  const entries = event.entries.slice(0, 2);
  const left = leftAthlete || entries[0];
  const right = rightAthlete || entries[1];

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

  const formatMark = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '--';
    const meters = mark / 100;
    return `${meters.toFixed(2)}m`;
  };

  const getAttemptNumber = (entry: EntryWithDetails | undefined): number => {
    if (!entry?.attempts) return 1;
    return entry.attempts.length + 1;
  };

  const renderAthletePanel = (entry: EntryWithDetails | undefined, side: 'left' | 'right') => {
    if (!entry) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600" style={{ fontSize: '48px' }}>No athlete</p>
        </div>
      );
    }

    const athleteName = `${entry.athlete?.firstName || ''} ${entry.athlete?.lastName || ''}`.trim() || 'Unknown';
    const teamName = entry.team?.name || '';
    const place = entry.finalPlace || '--';
    const attemptNum = getAttemptNumber(entry);
    const photoUrl = entry.athlete?.photoUrl;
    const teamLogo = entry.team?.logoUrl;
    const bestMark = formatMark(entry.finalMark);

    return (
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: side === 'left' 
              ? 'radial-gradient(ellipse 100% 80% at 20% 80%, rgba(0, 150, 255, 0.3) 0%, transparent 60%)'
              : 'radial-gradient(ellipse 100% 80% at 80% 80%, rgba(0, 150, 255, 0.3) 0%, transparent 60%)'
          }}
        />

        <div className="relative z-10 flex-1 flex flex-col">
          {photoUrl && (
            <div className="h-2/5 relative">
              <img 
                src={photoUrl} 
                alt={athleteName}
                className="w-full h-full object-cover object-top"
              />
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.9) 100%)'
                }}
              />
            </div>
          )}

          <div className={`${photoUrl ? 'flex-1' : 'h-full'} flex flex-col justify-center px-8 py-6`}>
            <div className="flex items-center gap-6 mb-4">
              {teamLogo && (
                <img 
                  src={teamLogo} 
                  alt="" 
                  className="h-20 w-20 object-contain"
                />
              )}
              <div>
                <h3 
                  className="text-white font-bold leading-tight uppercase"
                  style={{ fontSize: '56px', fontWeight: 700 }}
                >
                  {athleteName}
                </h3>
                
                <p 
                  className="text-gray-400 uppercase tracking-wider"
                  style={{ fontSize: '32px', fontWeight: 600 }}
                >
                  {teamName}
                </p>
              </div>
            </div>

            <div className="h-1 bg-gradient-to-r from-cyan-500/60 via-cyan-500/30 to-transparent mb-6" />

            <div className="flex gap-12">
              <div>
                <span 
                  className="text-gray-500 uppercase tracking-wider block mb-1"
                  style={{ fontSize: '24px' }}
                >
                  Place
                </span>
                <span 
                  className="text-white font-black"
                  style={{ fontSize: '72px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {place}
                </span>
              </div>

              <div>
                <span 
                  className="text-gray-500 uppercase tracking-wider block mb-1"
                  style={{ fontSize: '24px' }}
                >
                  Attempt
                </span>
                <span 
                  className="text-white font-bold"
                  style={{ fontSize: '72px', fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {attemptNum}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <span 
                className="text-gray-500 uppercase tracking-wider block mb-1"
                style={{ fontSize: '24px' }}
              >
                Best Mark
              </span>
              <span 
                className="text-yellow-400 font-black tabular-nums"
                style={{ 
                  fontSize: '80px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  textShadow: '0 0 30px rgba(255, 200, 0, 0.3)'
                }}
              >
                {bestMark}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col" 
      style={{ 
        backgroundColor: '#000000',
        fontFamily: "'Barlow Semi Condensed', sans-serif" 
      }}
    >
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-6">
          {meet?.logoUrl && (
            <img 
              src={meet.logoUrl} 
              alt={meet.name} 
              className="h-16 object-contain"
            />
          )}
          <h1 
            className="text-white font-bold uppercase"
            style={{ fontSize: '48px', fontWeight: 700 }}
          >
            {event.name || event.eventName || ''}
          </h1>
        </div>
        <span 
          className="text-white font-bold tabular-nums"
          style={{ fontSize: '48px', fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {liveTime || clock}
        </span>
      </div>

      <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

      <div className="flex-1 flex">
        {renderAthletePanel(left, 'left')}
        
        <div className="w-1 bg-gradient-to-b from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />
        
        {renderAthletePanel(right, 'right')}
      </div>

      <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

      <div className="flex items-center justify-center px-8 py-3">
        <span 
          className="text-gray-600"
          style={{ fontSize: '24px' }}
        >
          {meet?.name || ''}
        </span>
      </div>
    </div>
  );
}
