interface WinnerEntry {
  position: number;
  name: string;
  team: string;
  affiliation: string;
  time: string;
  mark: string;
  teamLogoUrl: string | null;
  headshotUrl: string | null;
}

interface WinnersBoardProps {
  eventName: string;
  entries: WinnerEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export function WinnersBoard({
  eventName,
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  primaryColor,
  secondaryColor,
}: WinnersBoardProps) {
  const primary = primaryColor || '#0088DC';
  const secondary = secondaryColor || '#FFD700';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ background: '#000', fontFamily: "'Barlow Semi Condensed', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4" style={{ borderBottom: `3px solid ${primary}` }}>
        {meetLogoUrl && <img src={meetLogoUrl} alt="" className="h-12 object-contain" />}
        <span className="text-white font-bold uppercase text-3xl tracking-wider">{eventName}</span>
        <span className="text-gray-500 text-lg">{meetName}</span>
      </div>

      {/* Entries */}
      <div className="flex-1 flex flex-col justify-center px-8 gap-3">
        {entries.slice(0, 8).map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-3 rounded-lg"
            style={{
              background: i === 0 ? `${primary}33` : 'rgba(255,255,255,0.05)',
              borderLeft: i < 3 ? `4px solid ${i === 0 ? secondary : i === 1 ? '#C0C0C0' : '#CD7F32'}` : '4px solid transparent',
            }}
          >
            <span className="text-white/40 font-bold text-2xl w-10 text-center">{entry.position}</span>
            {entry.teamLogoUrl && <img src={entry.teamLogoUrl} alt="" className="w-10 h-10 object-contain" />}
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-2xl truncate uppercase">{entry.name}</div>
              <div className="text-white/50 text-sm uppercase">{entry.affiliation || entry.team}</div>
            </div>
            <span className="text-white font-mono font-bold text-2xl">{entry.mark || entry.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
