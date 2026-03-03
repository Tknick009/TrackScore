import { useState, useEffect } from "react";

interface WinnersEntry {
  position: number;
  firstName: string;
  lastName: string;
  name: string;
  team: string;
  affiliation: string;
  time: string;
  mark: string;
  teamLogoUrl?: string | null;
  headshotUrl?: string | null;
}

interface WinnersBoardProps {
  eventName: string;
  entries: WinnersEntry[];
  meetName?: string;
  meetLogoUrl?: string | null;
}

export function WinnersBoard({ eventName, entries, meetName, meetLogoUrl }: WinnersBoardProps) {
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

  const champion = entries[0];
  const topResults = entries.slice(0, 4);

  if (!champion) {
    return (
      <div 
        className="h-screen w-screen overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: '#000000', fontFamily: "'Barlow Semi Condensed', sans-serif" }}
      >
        <div className="text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Winners Board</h1>
          <p className="text-xl text-gray-400">No results available</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col" 
      style={{ 
        backgroundColor: '#000000',
        fontFamily: "'Barlow Semi Condensed', sans-serif" 
      }}
    >
      {/* Background gradient */}
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
        {/* Champion Section - Top Half */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pt-6">
          {/* Event name header */}
          <div className="flex items-center gap-4 mb-6">
            {meetLogoUrl && (
              <img 
                src={meetLogoUrl} 
                alt="Meet Logo" 
                className="h-12 object-contain"
              />
            )}
            <h2 
              className="text-yellow-400 font-bold uppercase tracking-wider"
              style={{ fontSize: '32px', fontWeight: 700 }}
            >
              {eventName}
            </h2>
          </div>

          {/* Champion display */}
          <div className="flex items-center gap-8 w-full max-w-[90%]">
            {/* Team logo (left) */}
            <div className="w-32 h-32 shrink-0 flex items-center justify-center">
              {champion.teamLogoUrl ? (
                <img 
                  src={champion.teamLogoUrl} 
                  alt={champion.team} 
                  className="max-h-28 max-w-28 object-contain"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-800/50 flex items-center justify-center">
                  <span className="text-gray-500 text-2xl font-bold uppercase">{champion.team.slice(0, 3)}</span>
                </div>
              )}
            </div>

            {/* Champion info (center) */}
            <div className="flex-1 text-center">
              <div 
                className="text-white font-black uppercase leading-none mb-2"
                style={{ fontSize: '72px', fontWeight: 900, fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif" }}
              >
                {champion.firstName} {champion.lastName}
              </div>
              <div 
                className="text-gray-300 font-semibold uppercase mb-3"
                style={{ fontSize: '36px', fontWeight: 600 }}
              >
                {champion.affiliation || champion.team}
              </div>
              <div 
                className="text-yellow-400 font-black tabular-nums"
                style={{ fontSize: '64px', fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif" }}
              >
                {champion.mark || champion.time}
              </div>
            </div>

            {/* Headshot (right) */}
            <div className="w-40 h-40 shrink-0 flex items-center justify-center">
              {champion.headshotUrl ? (
                <img 
                  src={champion.headshotUrl} 
                  alt={champion.name} 
                  className="max-h-36 max-w-36 object-cover rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-800/30 flex items-center justify-center border border-gray-700/30">
                  <span className="text-gray-600 text-5xl font-bold">{(champion.firstName?.[0] || '') + (champion.lastName?.[0] || '')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        {/* Top 4 Results Section - Bottom Half */}
        <div className="flex-1 flex flex-col px-4 py-3 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-6 mb-2">
            <span 
              className="text-gray-400 font-semibold uppercase tracking-wider"
              style={{ fontSize: '24px' }}
            >
              Top {topResults.length} Results
            </span>
            <span 
              className="text-gray-500 tabular-nums"
              style={{ fontSize: '20px' }}
            >
              {clock}
            </span>
          </div>

          {/* Result rows */}
          {topResults.map((entry, index) => (
            <div key={index} className="relative flex-1 min-h-0">
              <div 
                className="absolute inset-0 flex items-center px-6 rounded-sm overflow-hidden"
                style={{
                  background: index === 0
                    ? `radial-gradient(ellipse 120% 100% at 5% 50%, 
                        rgba(255, 215, 0, 0.25) 0%, 
                        rgba(200, 170, 0, 0.15) 20%,
                        rgba(0, 80, 160, 0.2) 40%,
                        rgba(0, 40, 80, 0.1) 60%,
                        transparent 80%
                      )`
                    : `radial-gradient(ellipse 120% 100% at 5% 50%, 
                        rgba(0, 150, 255, 0.55) 0%, 
                        rgba(0, 120, 200, 0.35) 20%,
                        rgba(0, 80, 160, 0.2) 40%,
                        rgba(0, 40, 80, 0.1) 60%,
                        transparent 80%
                      )`,
                }}
              >
                <div className="flex items-center w-full gap-4">
                  {/* Place */}
                  <span 
                    className="text-white font-black w-16 text-center shrink-0"
                    style={{ 
                      fontSize: '56px', 
                      fontWeight: 900, 
                      fontFamily: "'Bebas Neue', sans-serif",
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#FFFFFF',
                    }}
                  >
                    {entry.position}
                  </span>

                  {/* Team logo */}
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    {entry.teamLogoUrl ? (
                      <img 
                        src={entry.teamLogoUrl} 
                        alt="" 
                        className="max-h-12 max-w-12 object-contain"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-700/30" />
                    )}
                  </div>

                  {/* Athlete name */}
                  <span 
                    className="text-white font-bold flex-1 truncate uppercase"
                    style={{ fontSize: '40px', fontWeight: 700 }}
                  >
                    {entry.lastName}{entry.firstName ? `, ${entry.firstName}` : ''}
                  </span>

                  {/* Team code */}
                  <span 
                    className="text-gray-300 font-semibold shrink-0 w-28 text-center uppercase"
                    style={{ fontSize: '32px', fontWeight: 600 }}
                  >
                    {entry.team}
                  </span>

                  {/* Time/Mark */}
                  <span 
                    className="font-bold tabular-nums shrink-0 min-w-[200px] text-right"
                    style={{ 
                      fontSize: '56px', 
                      fontFamily: "'Bebas Neue', sans-serif",
                      color: index === 0 ? '#FFD700' : '#FBBF24',
                    }}
                  >
                    {entry.mark || entry.time}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500/50" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />
        <div className="flex items-center justify-center px-8 py-2">
          <span 
            className="text-gray-500"
            style={{ fontSize: '24px' }}
          >
            {meetName || ''}
          </span>
        </div>
      </div>
    </div>
  );
}
