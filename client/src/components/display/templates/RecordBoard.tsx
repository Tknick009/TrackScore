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
  primaryColor = '#FFD700',
  secondaryColor = '#1a1a2e',
}: RecordBoardProps) {
  const winner = entries[0];
  if (!winner) return null;

  const accentColor = primaryColor;
  const bgColor = secondaryColor;

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center relative"
      style={{
        background: `radial-gradient(ellipse 90% 70% at center, ${bgColor} 0%, #0a0a0a 100%)`,
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Animated gold accent lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg, transparent 0%, rgba(255,215,0,0.03) 40%, rgba(255,215,0,0.06) 50%, rgba(255,215,0,0.03) 60%, transparent 100%)
          `,
        }}
      />

      {/* Top decorative bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent 10%, ${accentColor} 50%, transparent 90%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[85%] gap-6">
        {/* Meet logo */}
        {meetLogoUrl && (
          <img
            src={meetLogoUrl}
            alt={meetName || ''}
            className="h-20 object-contain mb-2"
            style={getLogoEffectStyle(meetLogoEffect)}
          />
        )}

        {/* Record Label - the big headline */}
        <div className="text-center">
          <div
            className="font-black uppercase tracking-[0.2em] leading-none"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              color: accentColor,
              textShadow: `0 0 40px ${accentColor}66, 0 0 80px ${accentColor}33`,
            }}
          >
            {recordLabel}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full max-w-xl h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}88 50%, transparent 100%)`,
          }}
        />

        {/* Event name */}
        <div
          className="text-white/70 uppercase tracking-[0.15em] font-semibold text-center"
          style={{ fontSize: 'clamp(20px, 3vw, 36px)' }}
        >
          {eventName}
        </div>

        {/* Winner card */}
        <div
          className="flex items-center gap-8 px-12 py-8 rounded-2xl w-full max-w-4xl"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
            border: `1px solid ${accentColor}44`,
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Headshot */}
          {winner.headshotUrl && (
            <div
              className="shrink-0 rounded-xl overflow-hidden"
              style={{
                width: '140px',
                height: '170px',
                border: `3px solid ${accentColor}66`,
                boxShadow: `0 0 30px ${accentColor}33`,
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
              className="text-white font-bold leading-tight truncate"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
            >
              {winner.name}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {winner.teamLogoUrl && (
                <img
                  src={winner.teamLogoUrl}
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              )}
              <span
                className="text-white/50 font-medium uppercase tracking-wider"
                style={{ fontSize: 'clamp(18px, 2.5vw, 28px)' }}
              >
                {winner.affiliation || winner.team}
              </span>
            </div>
          </div>

          {/* Mark / Time */}
          <div className="shrink-0 text-right">
            <div
              className="font-black tabular-nums"
              style={{
                fontSize: 'clamp(44px, 6vw, 80px)',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: accentColor,
                textShadow: `0 0 20px ${accentColor}44`,
              }}
            >
              {winner.mark || winner.time}
            </div>
          </div>
        </div>

        {/* Meet name footer */}
        <div
          className="text-white/25 uppercase tracking-[0.1em] font-medium mt-4"
          style={{ fontSize: 'clamp(14px, 1.5vw, 20px)' }}
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
