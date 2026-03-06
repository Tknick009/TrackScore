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

export function RecordBoard({
  eventName,
  recordLabel,
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
}: RecordBoardProps) {
  const winner = entries[0];
  if (!winner) return null;

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col relative"
      style={{
        background: '#000000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Background glow — matches BigBoard blue radial gradient from bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 120%, rgba(0, 150, 255, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(0, 120, 220, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0, 120, 220, 0.2) 0%, transparent 50%)
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

          {/* Record Label — large gold headline */}
          <div
            className="font-black uppercase tracking-[0.2em] leading-none text-center"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              color: '#FFD700',
              textShadow: '0 0 40px rgba(255,215,0,0.4), 0 0 80px rgba(255,215,0,0.2)',
            }}
          >
            {recordLabel}
          </div>
        </div>

        {/* Cyan gradient divider — matches BigBoard */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

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

        {/* Cyan gradient divider */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        {/* ===== WINNER SECTION: BigBoard-style row layout ===== */}
        <div className="flex-1 flex flex-col justify-center px-8">
          <div
            className="flex items-center relative rounded-lg overflow-hidden"
            style={{
              background: `radial-gradient(ellipse 120% 100% at 5% 50%, 
                rgba(0, 150, 255, 0.5) 0%, 
                rgba(0, 120, 200, 0.3) 20%,
                rgba(0, 80, 160, 0.15) 40%,
                rgba(0, 40, 80, 0.08) 60%,
                transparent 80%
              )`,
              borderTop: '2px solid rgba(0, 200, 255, 0.3)',
              borderBottom: '2px solid rgba(0, 200, 255, 0.3)',
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
                  border: '3px solid rgba(0, 200, 255, 0.4)',
                  boxShadow: '0 0 30px rgba(0, 150, 255, 0.2)',
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

            {/* Mark / Time — large, gold accent */}
            <div className="shrink-0 text-right">
              <div
                className="font-black tabular-nums"
                style={{
                  fontSize: 'clamp(48px, 7vw, 96px)',
                  fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
                  color: '#FFD700',
                  textShadow: '0 0 20px rgba(255,215,0,0.3)',
                }}
              >
                {winner.mark || winner.time}
              </div>
            </div>
          </div>
        </div>

        {/* Cyan gradient divider */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

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
