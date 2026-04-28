import { getLogoEffectStyle } from "@/lib/logoEffects";

interface RecordEntry {
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

interface RecordBoardProps {
  eventName: string;
  recordLabel: string;
  entries: RecordEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

// Darken a hex color by a percentage (0–1)
function darkenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}

export function RecordBoard({
  eventName,
  recordLabel,
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  primaryColor,
  secondaryColor,
}: RecordBoardProps) {
  const winner = entries[0];
  if (!winner) return null;

  const primary = primaryColor || '#0088DC';
  const secondary = secondaryColor || '#FFD700';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col relative"
      style={{
        background: '#000000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Background glow using meet primary color */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 120%, ${primary}59 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, ${primary}33 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, ${primary}33 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        {/* ===== TOP SECTION: Record headline + event name ===== */}
        <div className="flex flex-col items-center pt-8 pb-4">
          {/* Meet logo */}
          {meetLogoUrl && (
            <img
              src={meetLogoUrl}
              alt={meetName || ''}
              className="h-20 object-contain mb-4"
              style={getLogoEffectStyle(meetLogoEffect)}
            />
          )}

          {/* Record Label — large headline using secondary color */}
          <div
            className="font-black uppercase tracking-[0.2em] leading-none text-center"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              color: secondary,
              textShadow: `0 0 40px ${secondary}66, 0 0 80px ${secondary}33`,
            }}
          >
            {recordLabel}
          </div>
        </div>

        {/* Accent divider using primary color */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primary}99 50%, transparent 100%)`,
          }}
        />

        {/* Event name bar */}
        <div
          className="flex items-center justify-center px-6"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(30, 40, 50, 0.8) 20%, rgba(30, 40, 50, 0.8) 80%, transparent 100%)',
            height: 'clamp(32px, 5vh, 56px)',
          }}
        >
          <span
            className="text-white font-bold uppercase"
            style={{
              fontSize: 'clamp(18px, 3vw, 42px)',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {eventName}
          </span>
        </div>

        {/* Accent divider */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primary}99 50%, transparent 100%)`,
          }}
        />

        {/* ===== WINNER SECTION ===== */}
        <div className="flex-1 flex flex-col justify-center px-8">
          <div
            className="flex items-center relative rounded-lg overflow-hidden"
            style={{
              background: `radial-gradient(ellipse 120% 100% at 5% 50%, 
                ${primary}80 0%, 
                ${primary}4D 20%,
                ${primary}26 40%,
                ${primary}14 60%,
                transparent 80%
              )`,
              borderTop: `2px solid ${primary}4D`,
              borderBottom: `2px solid ${primary}4D`,
              padding: 'clamp(16px, 3vh, 40px) clamp(16px, 2vw, 32px)',
              minHeight: 'clamp(120px, 25vh, 280px)',
            }}
          >
            {/* Headshot */}
            {winner.headshotUrl && (
              <div
                className="shrink-0 rounded-xl overflow-hidden mr-6"
                style={{
                  width: 'clamp(100px, 12vw, 180px)',
                  height: 'clamp(120px, 15vw, 220px)',
                  border: `3px solid ${primary}66`,
                  boxShadow: `0 0 30px ${primary}33`,
                }}
              >
                <img
                  src={winner.headshotUrl}
                  alt={winner.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Athlete info */}
            <div className="flex-1 min-w-0">
              <div
                className="text-white font-bold leading-tight truncate uppercase"
                style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
              >
                {winner.name}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {winner.teamLogoUrl && (
                  <img
                    src={winner.teamLogoUrl}
                    alt=""
                    className="object-contain"
                    style={{
                      height: 'clamp(24px, 3vw, 48px)',
                      width: 'clamp(24px, 3vw, 48px)',
                    }}
                  />
                )}
                <span
                  className="text-white/60 font-medium uppercase tracking-wider"
                  style={{ fontSize: 'clamp(18px, 2.5vw, 32px)' }}
                >
                  {winner.affiliation || winner.team}
                </span>
              </div>
            </div>

            {/* Mark / Time — using secondary color */}
            <div className="shrink-0 text-right">
              <div
                className="font-black tabular-nums"
                style={{
                  fontSize: 'clamp(48px, 7vw, 96px)',
                  fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
                  color: secondary,
                  textShadow: `0 0 20px ${secondary}4D`,
                }}
              >
                {winner.mark || winner.time}
              </div>
            </div>
          </div>
        </div>

        {/* Accent divider */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primary}99 50%, transparent 100%)`,
          }}
        />

        {/* Footer — meet name */}
        <div className="flex items-center justify-center px-8 py-4">
          <span
            className="text-gray-500"
            style={{ fontSize: '28px' }}
          >
            {meetName}
          </span>
        </div>
      </div>
    </div>
  );
}
