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
  recordTag?: string;
  entries: RecordEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

// Derive a short tag from the full record label if no explicit tag is given
function deriveTag(label: string): string {
  const map: Record<string, string> = {
    'Meet Record': 'MR',
    'Facility Record': 'FR',
    'Conference Record': 'CR',
    'School Record': 'SR',
    'National Record': 'NR',
    'All-Time Record': 'ATR',
    'World Record': 'WR',
    'High School Record': 'HSR',
  };
  if (map[label]) return map[label];
  return label.split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('');
}

export function RecordBoard({
  eventName,
  recordLabel,
  recordTag,
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
  const tag = recordTag || deriveTag(recordLabel);

  // Curtain-style background colors (matches meet logo curtain)
  const shadeColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, Math.floor(((num >> 16) & 0xff) * (1 + amount))));
    const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 0xff) * (1 + amount))));
    const b = Math.max(0, Math.min(255, Math.floor((num & 0xff) * (1 + amount))));
    return `rgb(${r},${g},${b})`;
  };
  const pDark = shadeColor(primary, -0.25);
  const pDeep = shadeColor(primary, -0.45);
  const accent = secondary || '#FFD700';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col relative"
      style={{
        background: `linear-gradient(135deg, ${pDeep} 0%, ${primary} 35%, ${pDark} 65%, ${pDeep} 100%)`,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Diagonal stripes texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)`,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.35) 100%)',
        }}
      />
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: '3px',
          background: `linear-gradient(90deg, transparent 5%, ${accent}66 30%, ${accent}66 70%, transparent 95%)`,
        }}
      />
      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: '3px',
          background: `linear-gradient(90deg, transparent 5%, ${accent}66 30%, ${accent}66 70%, transparent 95%)`,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-[5%]">

        {/* Event name — top line, prominent */}
        <div
          className="text-center uppercase font-bold tracking-wider w-full"
          style={{
            fontSize: 'clamp(20px, 4.5vw, 52px)',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 'clamp(8px, 2vh, 20px)',
          }}
        >
          {eventName}
        </div>

        {/* ATHLETE NAME — the hero, biggest text */}
        <div
          className="text-center uppercase font-black leading-[0.9] w-full"
          style={{
            fontSize: 'clamp(48px, 12vw, 160px)',
            color: '#ffffff',
            textShadow: '0 2px 20px rgba(0,0,0,0.6)',
            marginBottom: 'clamp(4px, 1.5vh, 16px)',
          }}
        >
          {winner.name}
        </div>

        {/* Team/affiliation + record label line */}
        <div
          className="flex items-center justify-center gap-3 w-full"
          style={{ marginBottom: 'clamp(12px, 3vh, 32px)' }}
        >
          {/* Affiliation logo */}
          {winner.teamLogoUrl && (
            <img
              src={winner.teamLogoUrl}
              alt=""
              style={{
                height: 'clamp(28px, 5vw, 56px)',
                width: 'clamp(28px, 5vw, 56px)',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
              }}
            />
          )}
          <span
            className="uppercase font-bold tracking-wide"
            style={{
              fontSize: 'clamp(20px, 4.5vw, 44px)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {winner.affiliation || winner.team}
          </span>
          <span
            className="uppercase font-black"
            style={{
              fontSize: 'clamp(20px, 4.5vw, 44px)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            -
          </span>
          <span
            className="uppercase font-black"
            style={{
              fontSize: 'clamp(20px, 4.5vw, 44px)',
              color: primary,
              textShadow: `0 0 12px ${primary}44`,
            }}
          >
            {recordLabel}
          </span>
        </div>

        {/* LOGO + TIME / MARK + TAG — side by side, logo and tag match height of time */}
        <div className="flex items-stretch justify-center gap-4">
          {/* Affiliation logo — left of time, same height as tag */}
          {winner.teamLogoUrl && (
            <div
              className="flex items-center justify-center rounded overflow-hidden"
              style={{
                width: 'clamp(44px, 10vw, 140px)',
                background: 'rgba(255,255,255,0.08)',
              }}
            >
              <img
                src={winner.teamLogoUrl}
                alt=""
                style={{
                  height: '70%',
                  width: '70%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                }}
              />
            </div>
          )}
          <div
            className="font-black tabular-nums"
            style={{
              fontSize: 'clamp(44px, 10vw, 140px)',
              fontFamily: "'Bebas Neue', 'Inter', sans-serif",
              color: '#ffffff',
              lineHeight: 1,
              textShadow: '0 2px 16px rgba(0,0,0,0.4)',
            }}
          >
            {winner.mark || winner.time}
          </div>
          <div
            className="font-black uppercase rounded flex items-center justify-center px-4"
            style={{
              fontSize: 'clamp(37px, 8.5vw, 119px)',
              fontFamily: "'Bebas Neue', 'Inter', sans-serif",
              color: '#fff',
              background: primary,
              boxShadow: `0 0 20px ${primary}66`,
              lineHeight: 1,
            }}
          >
            {tag}
          </div>
        </div>

        {/* Meet name — bottom, subtle */}
        <div
          className="text-center uppercase font-medium tracking-wider"
          style={{
            fontSize: 'clamp(10px, 2vw, 22px)',
            color: 'rgba(255,255,255,0.35)',
            marginTop: 'clamp(12px, 3vh, 32px)',
          }}
        >
          {meetName}
        </div>
      </div>
    </div>
  );
}
