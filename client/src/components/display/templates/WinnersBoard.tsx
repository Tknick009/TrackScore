import { getLogoEffectStyle } from "@/lib/logoEffects";

interface WinnerEntry {
  position: number;
  firstName: string;
  lastName: string;
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
  primaryColor = '#0088FF',
}: WinnersBoardProps) {
  if (!entries || entries.length === 0) return null;

  const winner = entries[0];
  const topEntries = entries.slice(0, 4);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background: '#000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* ===== TOP HALF: Winner Hero Section (black bg) ===== */}
      <div className="flex-1 relative flex" style={{ minHeight: '45%' }}>
        {/* Meet logo — top-left corner */}
        {meetLogoUrl && (
          <div
            className="absolute top-2 left-2 z-10"
            style={{ width: '18%', maxWidth: '200px' }}
          >
            <img
              src={meetLogoUrl}
              alt={meetName || ''}
              className="w-full h-auto object-contain"
              style={getLogoEffectStyle(meetLogoEffect)}
            />
          </div>
        )}

        {/* Hero content */}
        <div className="flex-1 flex items-stretch">
          {/* Left spacer for logo area */}
          <div style={{ width: meetLogoUrl ? '20%' : '4%' }} />

          {/* Center: Winner details */}
          <div className="flex-1 flex flex-col justify-center py-3">
            {/* Meet name as italic title */}
            <div
              className="text-white font-bold italic leading-tight"
              style={{ fontSize: 'clamp(16px, 2.8vw, 38px)' }}
            >
              {meetName}
            </div>

            {/* Winner full name — very large */}
            <div
              className="text-white font-bold leading-none mt-1"
              style={{ fontSize: 'clamp(36px, 7vw, 96px)' }}
            >
              {winner.firstName} {winner.lastName}
            </div>

            {/* Winner team / affiliation */}
            <div
              className="text-white font-bold leading-tight"
              style={{ fontSize: 'clamp(24px, 5vw, 68px)' }}
            >
              {winner.affiliation || winner.team}
            </div>

            {/* Winner mark / time */}
            <div
              className="text-white font-bold leading-tight"
              style={{ fontSize: 'clamp(24px, 5vw, 68px)' }}
            >
              {winner.mark || winner.time}
            </div>
          </div>

          {/* Right side: Team logo + headshot */}
          <div className="flex items-end gap-2 pr-3 pb-2" style={{ width: '22%' }}>
            {/* Team logo — small square */}
            {winner.teamLogoUrl && (
              <div
                className="shrink-0 self-center"
                style={{
                  width: 'clamp(40px, 5vw, 70px)',
                  height: 'clamp(40px, 5vw, 70px)',
                }}
              >
                <img
                  src={winner.teamLogoUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Winner headshot — bottom-right */}
            {winner.headshotUrl && (
              <div className="flex-1 h-full flex items-end justify-end">
                <img
                  src={winner.headshotUrl}
                  alt={winner.name}
                  className="object-contain object-bottom"
                  style={{ maxHeight: '90%', maxWidth: '100%' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM HALF: Results Table ===== */}
      <div style={{ minHeight: '50%' }} className="flex flex-col">
        {/* Header bar — dark gray with event name (left) + "Final" (right) */}
        <div
          className="flex items-center justify-between px-6 py-2"
          style={{ background: '#333' }}
        >
          <span
            className="text-white font-bold"
            style={{ fontSize: 'clamp(16px, 2.5vw, 34px)' }}
          >
            {eventName}
          </span>
          <span
            className="text-white font-bold"
            style={{ fontSize: 'clamp(16px, 2.5vw, 34px)' }}
          >
            Final
          </span>
        </div>

        {/* Result rows — bright blue with white dividers */}
        <div className="flex-1 flex flex-col">
          {topEntries.map((entry, index) => (
            <div
              key={index}
              className="flex-1 flex items-center px-4"
              style={{
                background: primaryColor,
                borderBottom:
                  index < topEntries.length - 1
                    ? '2px solid rgba(255,255,255,0.4)'
                    : 'none',
              }}
            >
              {/* Team logo */}
              <div
                className="shrink-0 flex items-center justify-center"
                style={{ width: 'clamp(40px, 5vw, 70px)' }}
              >
                {entry.teamLogoUrl && (
                  <img
                    src={entry.teamLogoUrl}
                    alt=""
                    className="object-contain"
                    style={{
                      height: 'clamp(28px, 4vh, 48px)',
                      width: 'clamp(28px, 4vh, 48px)',
                    }}
                  />
                )}
              </div>

              {/* Last name — bold, left-aligned */}
              <div
                className="text-white font-bold"
                style={{
                  fontSize: 'clamp(22px, 4.5vw, 60px)',
                  width: '30%',
                  paddingLeft: '0.5rem',
                }}
              >
                {entry.lastName}
              </div>

              {/* Team / affiliation — centered */}
              <div
                className="text-white font-bold text-center flex-1"
                style={{ fontSize: 'clamp(18px, 3.5vw, 48px)' }}
              >
                {entry.affiliation || entry.team}
              </div>

              {/* Mark — right-aligned */}
              <div
                className="text-white font-bold text-right shrink-0"
                style={{
                  fontSize: 'clamp(22px, 4.5vw, 60px)',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minWidth: '18%',
                }}
              >
                {entry.mark || entry.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
