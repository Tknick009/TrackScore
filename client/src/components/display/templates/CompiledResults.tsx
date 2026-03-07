import { useState, useEffect } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";
import { getLogoEffectStyle } from "@/lib/logoEffects";

interface CompiledResultsProps {
  event: EventWithEntries;
  meet?: Meet | null;
}

export function CompiledResults({ event, meet }: CompiledResultsProps) {
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

  const sortedEntries = [...(event.entries || [])].sort((a, b) => {
    if (a.finalPlace && b.finalPlace) return a.finalPlace - b.finalPlace;
    if (a.finalPlace) return -1;
    if (b.finalPlace) return 1;
    return 0;
  });

  const formatTime = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '';
    const totalSeconds = mark / 1000;
    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    return totalSeconds.toFixed(2);
  };

  const getTeamCode = (teamName: string | undefined): string => {
    if (!teamName) return '';
    const words = teamName.split(' ');
    if (words.length === 1) return teamName.substring(0, 4).toUpperCase();
    return words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
  };

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
            radial-gradient(ellipse 100% 60% at 50% 120%, rgba(0, 150, 255, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 100%, rgba(0, 120, 220, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0, 120, 220, 0.2) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-center px-8 pt-6 pb-4">
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
          <div className="text-right">
            <span 
              className="text-yellow-400 font-bold uppercase block"
              style={{ fontSize: '36px', fontWeight: 700 }}
            >
              FINAL
            </span>
            <span 
              className="text-gray-400 font-semibold tabular-nums"
              style={{ fontSize: '28px' }}
            >
              {clock}
            </span>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        <div className="flex-1 flex flex-col px-4 py-3 overflow-hidden">
          {sortedEntries.slice(0, 8).map((entry, index) => {
            const teamLogo = entry.team?.logoUrl;
            const athleteName = entry.athlete?.lastName || 'Unknown';
            const teamCode = entry.team?.shortCode || getTeamCode(entry.team?.name);
            const finalTime = formatTime(entry.finalMark);
            const place = entry.finalPlace || index + 1;

            return (
              <div key={entry.id || index} className="relative flex-1 min-h-0">
                <div 
                  className="absolute inset-0 flex items-center px-6 rounded-sm overflow-hidden"
                  style={{
                    background: `radial-gradient(ellipse 120% 100% at 5% 50%, 
                      rgba(0, 150, 255, 0.55) 0%, 
                      rgba(0, 120, 200, 0.35) 20%,
                      rgba(0, 80, 160, 0.2) 40%,
                      rgba(0, 40, 80, 0.1) 60%,
                      transparent 80%
                    )`,
                  }}
                >
                  <div className="flex items-center w-full gap-6">
                    <span 
                      className="text-white font-black w-20 text-center shrink-0"
                      style={{ fontSize: '64px', fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {place}
                    </span>

                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      {teamLogo ? (
                        <img 
                          src={teamLogo} 
                          alt="" 
                          className="max-h-14 max-w-14 object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-700/30" />
                      )}
                    </div>

                    <span 
                      className="text-white font-bold flex-1 truncate uppercase"
                      style={{ fontSize: '48px', fontWeight: 700 }}
                    >
                      {athleteName}
                    </span>

                    <span 
                      className="text-gray-300 font-semibold shrink-0 w-32 text-center uppercase"
                      style={{ fontSize: '40px', fontWeight: 600 }}
                    >
                      {teamCode}
                    </span>

                    <span 
                      className="text-yellow-400 font-bold tabular-nums shrink-0 min-w-[220px] text-right"
                      style={{ fontSize: '64px', fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {finalTime}
                    </span>
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
