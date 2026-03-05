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

const PODIUM_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'rgba(255,215,0,0.15)', border: '#FFD700', text: '#FFD700' },
  2: { bg: 'rgba(192,192,192,0.12)', border: '#C0C0C0', text: '#C0C0C0' },
  3: { bg: 'rgba(205,127,50,0.12)', border: '#CD7F32', text: '#CD7F32' },
  4: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.6)' },
};

export function WinnersBoard({
  eventName,
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  primaryColor = '#0066CC',
  secondaryColor = '#003366',
}: WinnersBoardProps) {
  if (!entries || entries.length === 0) return null;

  const accentColor = primaryColor;

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center relative"
      style={{
        background: `radial-gradient(ellipse 90% 70% at center, ${secondaryColor} 0%, #0a0a0a 100%)`,
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Top decorative bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent 10%, ${accentColor} 50%, transparent 90%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[90%] gap-5">
        {/* Meet logo */}
        {meetLogoUrl && (
          <img
            src={meetLogoUrl}
            alt={meetName || ''}
            className="h-16 object-contain mb-1"
            style={getLogoEffectStyle(meetLogoEffect)}
          />
        )}

        {/* Event name headline */}
        <div className="text-center">
          <div
            className="font-black uppercase tracking-[0.15em] leading-none text-white"
            style={{
              fontSize: 'clamp(32px, 5vw, 64px)',
            }}
          >
            {eventName}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full max-w-2xl h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}88 50%, transparent 100%)`,
          }}
        />

        {/* Winners list */}
        <div className="w-full max-w-5xl space-y-3">
          {entries.slice(0, 4).map((entry, index) => {
            const place = entry.position || index + 1;
            const colors = PODIUM_COLORS[place] || PODIUM_COLORS[4];

            return (
              <div
                key={index}
                className="flex items-center gap-5 px-8 py-5 rounded-xl"
                style={{
                  background: colors.bg,
                  borderLeft: `4px solid ${colors.border}`,
                }}
              >
                {/* Place number */}
                <div
                  className="shrink-0 font-black w-16 text-center"
                  style={{
                    fontSize: 'clamp(36px, 4vw, 60px)',
                    color: colors.text,
                  }}
                >
                  {place}
                </div>

                {/* Headshot */}
                {entry.headshotUrl && (
                  <div
                    className="shrink-0 rounded-lg overflow-hidden"
                    style={{
                      width: '70px',
                      height: '85px',
                      border: `2px solid ${colors.border}44`,
                    }}
                  >
                    <img
                      src={entry.headshotUrl}
                      alt={entry.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Athlete info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-white font-bold leading-tight truncate"
                    style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
                  >
                    {entry.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {entry.teamLogoUrl && (
                      <img
                        src={entry.teamLogoUrl}
                        alt=""
                        className="h-6 w-6 object-contain"
                      />
                    )}
                    <span
                      className="text-white/50 font-medium uppercase tracking-wider"
                      style={{ fontSize: 'clamp(14px, 2vw, 22px)' }}
                    >
                      {entry.affiliation || entry.team}
                    </span>
                  </div>
                </div>

                {/* Mark / Time */}
                <div className="shrink-0 text-right">
                  <div
                    className="font-black tabular-nums"
                    style={{
                      fontSize: 'clamp(28px, 4vw, 52px)',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: colors.text,
                    }}
                  >
                    {entry.mark || entry.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meet name footer */}
        <div
          className="text-white/25 uppercase tracking-[0.1em] font-medium mt-3"
          style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}
        >
          {meetName}
        </div>
      </div>

      {/* Bottom decorative bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent 10%, ${accentColor} 50%, transparent 90%)`,
        }}
      />
    </div>
  );
}
