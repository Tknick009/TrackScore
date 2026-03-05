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
      {/* ===== TOP HALF: Winner Hero Section ===== */}
      <div className="relative" style={{ height: '45%' }}>
        {/* Meet name — large italic across the top */}
        <div
          className="absolute top-0 left-0 right-0 z-20 px-4 pt-3"
          style={{ paddingLeft: meetLogoUrl ? '22%' : '3%' }}
        >
          <div
            className="text-white italic leading-tight"
            style={{
              fontSize: 'clamp(20px, 3.2vw, 48px)',
              fontWeight: 800,
              textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
              letterSpacing: '0.02em',
            }}
          >
            {meetName}
          </div>
        </div>

        {/* Meet logo — top-left, overlapping */}
        {meetLogoUrl && (
          <div
            className="absolute top-1 left-2 z-10"
            style={{ width: '20%', maxWidth: '240px' }}
          >
            <img
              src={meetLogoUrl}
              alt={meetName || ''}
              className="w-full h-auto object-contain drop-shadow-lg"
              style={getLogoEffectStyle(meetLogoEffect)}
            />
          </div>
        )}

        {/* Winner headshot — far right, bottom-aligned, tall */}
        {winner.headshotUrl && (
          <div
            className="absolute right-0 bottom-0 z-10"
            style={{ height: '95%', width: '18%' }}
          >
            <img
              src={winner.headshotUrl}
              alt={winner.name}
              className="h-full w-full object-contain object-bottom"
              style={{
                filter: 'drop-shadow(-4px 0 12px rgba(0,0,0,0.5))',
              }}
            />
          </div>
        )}

        {/* Center content: name, team, mark */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col justify-end pb-2"
          style={{
            top: 0,
            paddingLeft: meetLogoUrl ? '22%' : '3%',
            paddingRight: winner.headshotUrl ? '20%' : '3%',
            paddingTop: 'clamp(40px, 6vh, 70px)',
          }}
        >
          {/* Winner full name — very large, impactful */}
          <div
            className="text-white leading-none"
            style={{
              fontSize: 'clamp(42px, 8vw, 120px)',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textShadow: '2px 3px 6px rgba(0,0,0,0.4)',
              lineHeight: 0.95,
            }}
          >
            {winner.firstName} {winner.lastName}
          </div>

          {/* Winner team / affiliation */}
          <div
            className="text-white leading-tight mt-1"
            style={{
              fontSize: 'clamp(28px, 5.5vw, 80px)',
              fontWeight: 700,
              textShadow: '1px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {winner.affiliation || winner.team}
          </div>

          {/* Winner mark / time + team logo */}
          <div className="flex items-center gap-4">
            <div
              className="text-white leading-tight"
              style={{
                fontSize: 'clamp(28px, 5.5vw, 80px)',
                fontWeight: 700,
                textShadow: '1px 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {winner.mark || winner.time}
            </div>

            {/* Team logo — small square next to mark */}
            {winner.teamLogoUrl && (
              <div
                className="shrink-0"
                style={{
                  width: 'clamp(36px, 5vw, 80px)',
                  height: 'clamp(36px, 5vw, 80px)',
                }}
              >
                <img
                  src={winner.teamLogoUrl}
                  alt=""
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM HALF: Results Table ===== */}
      <div style={{ height: '55%' }} className="flex flex-col">
        {/* Header bar — dark gradient with event name + "Final" */}
        <div
          className="flex items-center justify-between px-6"
          style={{
            background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
            height: 'clamp(32px, 5vh, 56px)',
            borderTop: '3px solid #555',
            borderBottom: '2px solid #1a1a1a',
          }}
        >
          <span
            className="text-white"
            style={{
              fontSize: 'clamp(16px, 2.8vw, 40px)',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {eventName}
          </span>
          <span
            className="text-white"
            style={{
              fontSize: 'clamp(16px, 2.8vw, 40px)',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            Final
          </span>
        </div>

        {/* Result rows — bright blue with white dividers */}
        <div className="flex-1 flex flex-col">
          {topEntries.map((entry, index) => (
            <div
              key={index}
              className="flex-1 flex items-center"
              style={{
                background: primaryColor,
                borderBottom:
                  index < topEntries.length - 1
                    ? '3px solid rgba(255,255,255,0.5)'
                    : 'none',
                paddingLeft: 'clamp(8px, 2vw, 24px)',
                paddingRight: 'clamp(8px, 2vw, 24px)',
              }}
            >
              {/* Team logo */}
              <div
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: 'clamp(36px, 5vw, 80px)',
                  marginRight: 'clamp(4px, 0.5vw, 12px)',
                }}
              >
                {entry.teamLogoUrl && (
                  <img
                    src={entry.teamLogoUrl}
                    alt=""
                    className="object-contain"
                    style={{
                      height: 'clamp(30px, 5vh, 60px)',
                      width: 'clamp(30px, 5vh, 60px)',
                    }}
                  />
                )}
              </div>

              {/* Last name — bold, left-aligned */}
              <div
                className="text-white"
                style={{
                  fontSize: 'clamp(26px, 5vw, 72px)',
                  fontWeight: 800,
                  width: '28%',
                  letterSpacing: '0.01em',
                }}
              >
                {entry.lastName}
              </div>

              {/* Team / affiliation — centered */}
              <div
                className="text-white text-center flex-1"
                style={{
                  fontSize: 'clamp(20px, 4vw, 58px)',
                  fontWeight: 700,
                }}
              >
                {entry.affiliation || entry.team}
              </div>

              {/* Mark — right-aligned, bold */}
              <div
                className="text-white text-right shrink-0"
                style={{
                  fontSize: 'clamp(26px, 5vw, 72px)',
                  fontWeight: 800,
                  fontFamily: "'Barlow Semi Condensed', sans-serif",
                  minWidth: '16%',
                  letterSpacing: '0.02em',
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
