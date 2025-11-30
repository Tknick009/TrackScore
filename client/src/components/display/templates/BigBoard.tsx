import { useState, useEffect } from "react";
import { EventWithEntries, Meet } from "@shared/schema";

interface BigBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  showSplits?: boolean;
  liveTime?: string;
}

export function BigBoard({ event, meet, showSplits = false, liveTime }: BigBoardProps) {
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

  const displayClock = liveTime || clock;

  const sortedEntries = [...event.entries].sort((a, b) => {
    if (a.finalPlace && b.finalPlace) return a.finalPlace - b.finalPlace;
    if (a.finalPlace) return -1;
    if (b.finalPlace) return 1;
    return (a.finalLane || 0) - (b.finalLane || 0);
  });

  const isRelay = event.eventType?.toLowerCase().includes('relay');
  const status = event.status === 'completed' ? 'FINAL' : event.status === 'in_progress' ? 'IN PROGRESS' : 'SCHEDULED';
  const windReading = event.entries[0]?.finalWind;
  const windDisplay = windReading !== null && windReading !== undefined 
    ? `WIND: ${windReading > 0 ? '+' : ''}${windReading.toFixed(1)}` 
    : 'WIND: nwi';

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

  const getLatestSplit = (entry: any): string => {
    if (!entry.splits || entry.splits.length === 0) return '';
    const lastSplit = entry.splits[entry.splits.length - 1];
    return formatTime(lastSplit?.splitTime);
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(0, 150, 255, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 80% 50% at 70% 100%, rgba(0, 150, 255, 0.3) 0%, transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-start px-6 pt-4">
          <h1 
            className="text-white font-bold leading-none"
            style={{ fontSize: 'clamp(48px, 6vw, 72px)', fontWeight: 700 }}
          >
            {event.name || `${event.gender === 'M' ? 'Men' : 'Women'} ${event.eventType}`}
          </h1>
          <span 
            className="text-white font-bold tabular-nums"
            style={{ fontSize: 'clamp(48px, 6vw, 72px)', fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {displayClock}
          </span>
        </div>

        <div className="flex justify-between items-center px-6 py-2 bg-zinc-900/80">
          <span 
            className="text-white font-bold uppercase"
            style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}
          >
            {status}
          </span>
          <span 
            className="text-white font-semibold"
            style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}
          >
            {windDisplay}
          </span>
        </div>

        <div className="flex-1 flex flex-col px-4 py-2 overflow-hidden">
          {sortedEntries.slice(0, 8).map((entry, index) => {
            const teamLogo = entry.team?.logoUrl;
            const displayName = isRelay 
              ? entry.team?.name || 'Unknown Team'
              : `${entry.athlete?.lastName || ''}`;
            const finalTime = formatTime(entry.finalMark);
            const splitTime = showSplits ? getLatestSplit(entry) : '';

            return (
              <div key={entry.id || index} className="relative flex-1 min-h-0">
                <div 
                  className="absolute inset-0 flex items-center px-4"
                  style={{
                    background: `linear-gradient(90deg, 
                      rgba(0, 140, 220, 0.7) 0%, 
                      rgba(0, 160, 255, 0.5) 30%, 
                      rgba(0, 140, 220, 0.3) 70%,
                      transparent 100%
                    )`,
                  }}
                >
                  <div className="flex items-center w-full gap-4">
                    <span 
                      className="text-white font-bold w-16 text-center shrink-0"
                      style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 900 }}
                    >
                      {entry.finalLane || index + 1}
                    </span>

                    {teamLogo && (
                      <img 
                        src={teamLogo} 
                        alt="" 
                        className="h-12 w-12 object-contain shrink-0"
                      />
                    )}

                    <span 
                      className="text-white font-bold flex-1 truncate"
                      style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 700 }}
                    >
                      {displayName}
                    </span>

                    {showSplits && splitTime && (
                      <span 
                        className="text-yellow-400 font-bold tabular-nums shrink-0"
                        style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {splitTime}
                      </span>
                    )}

                    <span 
                      className="text-white font-bold tabular-nums shrink-0 min-w-[180px] text-right"
                      style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {finalTime}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400/60" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
