import { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";

interface FieldSideBySideProps {
  event: EventWithEntries;
  meet?: Meet;
  leftAthlete?: EntryWithDetails;
  rightAthlete?: EntryWithDetails;
}

export function FieldSideBySide({ event, meet, leftAthlete, rightAthlete }: FieldSideBySideProps) {
  const entries = event.entries.slice(0, 2);
  const left = leftAthlete || entries[0];
  const right = rightAthlete || entries[1];

  const formatMark = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '--';
    const meters = mark / 100;
    return `${meters.toFixed(2)}m`;
  };

  const getAttemptNumber = (entry: EntryWithDetails | undefined): number => {
    if (!entry?.attempts) return 1;
    return entry.attempts.length + 1;
  };

  const renderAthletePanel = (entry: EntryWithDetails | undefined) => {
    if (!entry) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <p className="text-gray-400 text-xl">No athlete</p>
        </div>
      );
    }

    const athleteName = `${entry.athlete?.firstName || ''} ${entry.athlete?.lastName || ''}`.trim() || 'Unknown';
    const teamName = entry.team?.name || '';
    const place = entry.finalPlace || '--';
    const attemptNum = getAttemptNumber(entry);
    const photoUrl = entry.athlete?.photoUrl;
    const teamLogo = entry.team?.logoUrl;

    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-900">
          {meet?.logoUrl && (
            <img 
              src={meet.logoUrl} 
              alt={meet.name} 
              className="h-8 object-contain"
            />
          )}
          <h2 
            className="text-white font-bold flex-1 text-center"
            style={{ fontSize: 'clamp(14px, 2vw, 20px)', fontWeight: 700 }}
          >
            {event.name || `${event.gender === 'M' ? 'Men' : 'Women'} ${event.eventType}`}
          </h2>
        </div>

        <div className="flex-1 flex">
          {photoUrl && (
            <div className="w-1/2">
              <img 
                src={photoUrl} 
                alt={athleteName}
                className="w-full h-full object-cover object-top"
              />
            </div>
          )}

          <div className={`${photoUrl ? 'w-1/2' : 'w-full'} flex flex-col justify-center px-4 py-3`}>
            <h3 
              className="text-black font-bold leading-tight"
              style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700 }}
            >
              {athleteName}
            </h3>
            
            <p 
              className="text-gray-500 text-sm mb-3"
              style={{ fontSize: 'clamp(12px, 1.5vw, 16px)' }}
            >
              {teamName}
            </p>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-600" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>Place:</span>
                <span className="text-black font-bold" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>{place}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>Attempt:</span>
                <span className="text-black font-bold" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>{attemptNum}</span>
              </div>
            </div>

            {teamLogo && (
              <div className="mt-3 flex justify-end">
                <img 
                  src={teamLogo} 
                  alt="" 
                  className="h-12 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex" style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
      {renderAthletePanel(left)}
      <div className="w-1 bg-gray-300" />
      {renderAthletePanel(right)}
    </div>
  );
}
