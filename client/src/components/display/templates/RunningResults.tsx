import { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";

interface RunningResultsProps {
  event: EventWithEntries;
  meet?: Meet;
  athleteEntry?: EntryWithDetails;
}

export function RunningResults({ event, meet, athleteEntry }: RunningResultsProps) {
  const entry = athleteEntry || event.entries[0];
  
  if (!entry) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 text-2xl">No athlete data</p>
      </div>
    );
  }

  const formatTime = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '--';
    const totalSeconds = mark / 1000;
    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    return totalSeconds.toFixed(2);
  };

  const athleteName = `${entry.athlete?.firstName || ''} ${entry.athlete?.lastName || ''}`.trim() || 'Unknown';
  const teamName = entry.team?.name || '';
  const place = entry.finalPlace || '--';
  const time = formatTime(entry.finalMark);
  const photoUrl = entry.athlete?.photoUrl;

  return (
    <div className="h-screen w-screen bg-white overflow-hidden" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
      <div className="h-full flex">
        {photoUrl && (
          <div className="w-1/2 h-full">
            <img 
              src={photoUrl} 
              alt={athleteName}
              className="w-full h-full object-cover object-top"
            />
          </div>
        )}

        <div className={`${photoUrl ? 'w-1/2' : 'w-full'} h-full flex flex-col`}>
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900">
            {meet?.logoUrl && (
              <img 
                src={meet.logoUrl} 
                alt={meet.name} 
                className="h-10 object-contain"
              />
            )}
            <h2 
              className="text-white font-bold flex-1 text-right"
              style={{ fontSize: 'clamp(16px, 2.5vw, 24px)', fontWeight: 700 }}
            >
              {event.name || `${event.gender === 'M' ? 'Men' : 'Women'} ${event.eventType}`}
            </h2>
          </div>

          <div className="flex-1 flex flex-col justify-center px-6 py-4 bg-gray-100">
            <h1 
              className="text-black font-bold leading-tight mb-1"
              style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700 }}
            >
              {athleteName}
            </h1>
            
            <p 
              className="text-gray-600 uppercase tracking-wide mb-4"
              style={{ fontSize: 'clamp(14px, 2vw, 20px)' }}
            >
              {teamName}
            </p>

            <div className="flex items-baseline gap-4">
              <span 
                className="text-gray-700"
                style={{ fontSize: 'clamp(18px, 2.5vw, 28px)' }}
              >
                PL:
              </span>
              <span 
                className="text-black font-bold"
                style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900 }}
              >
                {place}
              </span>
            </div>

            <span 
              className="text-black font-bold tabular-nums"
              style={{ 
                fontSize: 'clamp(40px, 8vw, 80px)', 
                fontFamily: "'Bebas Neue', sans-serif"
              }}
            >
              {time}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
