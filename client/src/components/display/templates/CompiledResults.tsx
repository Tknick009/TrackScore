import { EventWithEntries, Meet } from "@shared/schema";

interface CompiledResultsProps {
  event: EventWithEntries;
  meet?: Meet;
}

export function CompiledResults({ event, meet }: CompiledResultsProps) {
  const sortedEntries = [...event.entries].sort((a, b) => {
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
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 30% 120%, rgba(0, 150, 255, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 70% 120%, rgba(0, 150, 255, 0.25) 0%, transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="px-6 pt-6 pb-4">
          <h1 
            className="text-white font-bold leading-none"
            style={{ fontSize: 'clamp(48px, 6vw, 72px)', fontWeight: 700 }}
          >
            {event.name || `${event.gender === 'M' ? 'Men' : 'Women'} ${event.eventType}`}
          </h1>
        </div>

        <div className="h-4 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />

        <div className="flex-1 flex flex-col px-2 py-2 overflow-hidden">
          {sortedEntries.slice(0, 8).map((entry, index) => {
            const teamLogo = entry.team?.logoUrl;
            const athleteName = entry.athlete?.lastName || 'Unknown';
            const teamCode = entry.team?.shortCode || getTeamCode(entry.team?.name);
            const finalTime = formatTime(entry.finalMark);
            const place = entry.finalPlace || index + 1;

            return (
              <div key={entry.id || index} className="relative flex-1 min-h-0">
                <div 
                  className="absolute inset-0 flex items-center px-4"
                  style={{
                    background: `linear-gradient(90deg, 
                      rgba(0, 140, 220, 0.65) 0%, 
                      rgba(0, 160, 255, 0.45) 40%, 
                      rgba(0, 140, 220, 0.25) 80%,
                      transparent 100%
                    )`,
                  }}
                >
                  <div className="flex items-center w-full gap-4">
                    <span 
                      className="text-white font-black w-16 text-center shrink-0"
                      style={{ fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 900 }}
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
                        <div className="w-12 h-12 rounded bg-gray-700/50" />
                      )}
                    </div>

                    <span 
                      className="text-white font-bold flex-1"
                      style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 700 }}
                    >
                      {athleteName}
                    </span>

                    <span 
                      className="text-white font-semibold shrink-0 w-32 text-center"
                      style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 600 }}
                    >
                      {teamCode}
                    </span>

                    <span 
                      className="text-white font-bold tabular-nums shrink-0 min-w-[200px] text-right"
                      style={{ fontSize: 'clamp(40px, 5vw, 72px)', fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {finalTime}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500/40" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
