import { getLogoEffectStyle } from "@/lib/logoEffects";
import { useMemo } from "react";

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

/** Generate deterministic confetti pieces with varied colors, sizes, positions */
function generateConfettiPieces(count: number) {
  const colors = [
    '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DFE6E9', '#FF9FF3', '#54A0FF', '#5F27CD',
    '#00D2D3', '#FF9F43', '#EE5A24', '#A3CB38', '#FDA7DF',
  ];
  const pieces: Array<{
    left: string; delay: string; duration: string; color: string;
    size: number; rotation: number; shape: 'rect' | 'circle';
  }> = [];

  for (let i = 0; i < count; i++) {
    const leftPct = ((i * 7.3 + 3.1) % 100);
    const delaySec = ((i * 0.37 + 0.1) % 5).toFixed(2);
    const durationSec = (3 + (i * 0.29 % 4)).toFixed(2);
    const colorIdx = i % colors.length;
    const size = 6 + (i * 1.3 % 10);
    const rotation = (i * 47) % 360;
    const shape = i % 3 === 0 ? 'circle' as const : 'rect' as const;

    pieces.push({
      left: `${leftPct}%`,
      delay: `${delaySec}s`,
      duration: `${durationSec}s`,
      color: colors[colorIdx],
      size,
      rotation,
      shape,
    });
  }
  return pieces;
}

/** CSS keyframes for confetti — injected once via <style> */
const confettiCSS = `
@keyframes wb-confetti-fall {
  0% {
    transform: translateY(-10vh) rotate(0deg);
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) rotate(720deg);
    opacity: 0;
  }
}
@keyframes wb-confetti-sway {
  0%, 100% { transform: translateX(0px); }
  25% { transform: translateX(15px); }
  75% { transform: translateX(-15px); }
}
`;

export function WinnersBoard({
  eventName,
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
}: WinnersBoardProps) {
  if (!entries || entries.length === 0) return null;

  const winner = entries[0];
  const topEntries = entries.slice(0, 4);

  // Memoize confetti pieces so they stay stable across re-renders
  const confettiPieces = useMemo(() => generateConfettiPieces(60), []);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background: '#000000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Inject confetti keyframe CSS */}
      <style>{confettiCSS}</style>

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

      {/* ===== Confetti layer — behind all content (z-5), above background glow ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
        {confettiPieces.map((piece, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: piece.left,
              top: '-20px',
              width: piece.shape === 'circle' ? piece.size : piece.size * 0.6,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : '2px',
              opacity: 0.85,
              animation: `wb-confetti-fall ${piece.duration} ${piece.delay} linear infinite, wb-confetti-sway 2s ${piece.delay} ease-in-out infinite`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative flex-1 flex flex-col" style={{ zIndex: 10 }}>
        {/* ===== TOP HALF: Winner Hero Section ===== */}
        <div className="relative" style={{ height: '45%' }}>
          {/* Meet name — large italic across the top */}
          <div
            className="absolute top-0 left-0 right-0 z-20 px-4 pt-3"
            style={{ paddingLeft: meetLogoUrl ? '22%' : '3%' }}
          >
            <div
              className="text-white italic leading-tight uppercase"
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
              className="text-white leading-none uppercase"
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
              className="text-white/80 leading-tight mt-1 uppercase"
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
                className="text-white leading-tight tabular-nums"
                style={{
                  fontSize: 'clamp(28px, 5.5vw, 80px)',
                  fontWeight: 700,
                  fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
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

        {/* Cyan gradient divider — matches BigBoard */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        {/* ===== BOTTOM HALF: Results Table ===== */}
        <div style={{ height: '55%' }} className="flex flex-col">
          {/* Header bar — dark gradient matching BigBoard status bar */}
          <div
            className="flex items-center justify-between px-6"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(30, 40, 50, 0.8) 20%, rgba(30, 40, 50, 0.8) 80%, transparent 100%)',
              height: 'clamp(32px, 5vh, 56px)',
            }}
          >
            <span
              className="text-white font-bold uppercase"
              style={{
                fontSize: 'clamp(16px, 2.8vw, 40px)',
                fontWeight: 700,
                letterSpacing: '0.03em',
              }}
            >
              {eventName}
            </span>
            <span
              className="text-white font-bold uppercase"
              style={{
                fontSize: 'clamp(16px, 2.8vw, 40px)',
                fontWeight: 700,
                letterSpacing: '0.03em',
              }}
            >
              Final
            </span>
          </div>

          {/* Cyan gradient divider */}
          <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

          {/* Result rows — dark gradient backgrounds with blue glow accents like BigBoard */}
          <div className="flex-1 flex flex-col">
            {topEntries.map((entry, index) => {
              // Podium colors for place indicator
              const podiumColors: Record<number, string> = {
                1: '#FFD700',
                2: '#C0C0C0',
                3: '#CD7F32',
              };
              const placeColor = podiumColors[entry.position] || '#FFFFFF';

              return (
                <div
                  key={index}
                  className="flex-1 flex items-center relative"
                  style={{
                    background: `radial-gradient(ellipse 120% 100% at 5% 50%, 
                      rgba(0, 150, 255, 0.5) 0%, 
                      rgba(0, 120, 200, 0.3) 20%,
                      rgba(0, 80, 160, 0.15) 40%,
                      rgba(0, 40, 80, 0.08) 60%,
                      transparent 80%
                    )`,
                    borderBottom: '2px solid rgba(0, 200, 255, 0.3)',
                    paddingLeft: 'clamp(8px, 2vw, 24px)',
                    paddingRight: 'clamp(8px, 2vw, 24px)',
                  }}
                >
                  {/* Place number */}
                  <span
                    className="font-black tabular-nums shrink-0"
                    style={{
                      fontSize: 'clamp(28px, 5vw, 64px)',
                      fontFamily: "'Bebas Neue', sans-serif",
                      color: placeColor,
                      width: 'clamp(40px, 4vw, 70px)',
                      textAlign: 'center',
                      textShadow: entry.position <= 3 ? `0 0 12px ${placeColor}44` : 'none',
                    }}
                  >
                    {entry.position}
                  </span>

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
                    className="text-white uppercase truncate"
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
                    className="text-white/70 text-center flex-1 uppercase truncate"
                    style={{
                      fontSize: 'clamp(20px, 4vw, 58px)',
                      fontWeight: 700,
                    }}
                  >
                    {entry.affiliation || entry.team}
                  </div>

                  {/* Mark — right-aligned, bold */}
                  <div
                    className="text-white text-right shrink-0 tabular-nums"
                    style={{
                      fontSize: 'clamp(26px, 5vw, 72px)',
                      fontWeight: 800,
                      fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
                      minWidth: '16%',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {entry.mark || entry.time}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cyan gradient divider at bottom of results */}
          <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

          {/* Footer — meet name */}
          <div className="flex items-center justify-center px-8 py-3">
            <span
              className="text-gray-500"
              style={{ fontSize: '28px' }}
            >
              {meetName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
