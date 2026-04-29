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
  accentColor?: string;
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

// Format name as "F. LASTNAME"
function formatName(entry: RecordEntry): string {
  if (entry.firstName && entry.lastName) {
    return `${entry.firstName.charAt(0)}. ${entry.lastName}`.toUpperCase();
  }
  // Fallback: try to parse from full name
  const parts = entry.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts.slice(1).join(' ');
    return `${first.charAt(0)}. ${last}`.toUpperCase();
  }
  return entry.name.toUpperCase();
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
  accentColor,
}: RecordBoardProps) {
  const winner = entries[0];
  if (!winner) return null;

  const primary = primaryColor || '#0088DC';
  const secondary = secondaryColor || '#FFD700';
  const accent = accentColor || secondary || '#FFD700';
  const tag = recordTag || deriveTag(recordLabel);
  const displayName = formatName(winner);

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

  return (
    <div
      className="w-full h-full overflow-hidden flex flex-col relative"
      style={{
        containerType: 'size',
        background: `linear-gradient(135deg, ${pDeep} 0%, ${primary} 35%, ${pDark} 65%, ${pDeep} 100%)`,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Diagonal stripes texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)`,
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
          height: '2px',
          background: `linear-gradient(90deg, transparent 5%, ${accent}66 30%, ${accent}66 70%, transparent 95%)`,
        }}
      />
      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: '2px',
          background: `linear-gradient(90deg, transparent 5%, ${accent}66 30%, ${accent}66 70%, transparent 95%)`,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-[3%]">

        {/* Event name — top line, prominent */}
        <div
          className="text-center uppercase font-bold tracking-wider w-full"
          style={{
            fontSize: '4.5cqw',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '1cqh',
          }}
        >
          {eventName}
        </div>

        {/* Accent line under header — fades at edges */}
        <div
          className="w-[70%] pointer-events-none"
          style={{
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${accent} 80%, transparent 100%)`,
            marginBottom: '2cqh',
          }}
        />

        {/* ATHLETE NAME — First Initial. Last Name, hero text */}
        <div
          className="text-center uppercase font-black leading-[0.9] w-full"
          style={{
            fontSize: '14cqw',
            color: '#ffffff',
            textShadow: '0 1px 8px rgba(0,0,0,0.6)',
            marginBottom: '1.5cqh',
          }}
        >
          {displayName}
        </div>

        {/* Team/affiliation + record label line */}
        <div
          className="flex items-center justify-center w-full"
          style={{ gap: '1.5cqw', marginBottom: '2.5cqh' }}
        >
          {/* Affiliation logo in team line */}
          {winner.teamLogoUrl && (
            <img
              src={winner.teamLogoUrl}
              alt=""
              style={{
                height: '5cqw',
                width: '5cqw',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
              }}
            />
          )}
          <span
            className="uppercase font-bold tracking-wide"
            style={{
              fontSize: '4cqw',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {winner.affiliation || winner.team}
          </span>
          <span
            className="uppercase font-black"
            style={{
              fontSize: '4cqw',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            -
          </span>
          <span
            className="uppercase font-black"
            style={{
              fontSize: '4cqw',
              color: accent,
              textShadow: `0 0 6px ${accent}44`,
            }}
          >
            {recordLabel}
          </span>
        </div>

        {/* LOGO + TIME / MARK + TAG — side by side */}
        <div className="flex items-stretch justify-center" style={{ gap: '2cqw' }}>
          {/* Affiliation logo — left of time */}
          {winner.teamLogoUrl && (
            <div
              className="flex items-center justify-center rounded overflow-hidden"
              style={{
                width: '10cqw',
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
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                }}
              />
            </div>
          )}
          <div
            className="font-black tabular-nums"
            style={{
              fontSize: '10cqw',
              fontFamily: "'Bebas Neue', 'Inter', sans-serif",
              color: '#ffffff',
              lineHeight: 1,
              textShadow: '0 1px 8px rgba(0,0,0,0.4)',
            }}
          >
            {winner.mark || winner.time}
          </div>
          <div
            className="font-black uppercase rounded flex items-center justify-center"
            style={{
              fontSize: '8.5cqw',
              fontFamily: "'Bebas Neue', 'Inter', sans-serif",
              color: '#fff',
              background: accent,
              boxShadow: `0 0 10px ${accent}66`,
              lineHeight: 1,
              padding: '0 2cqw',
            }}
          >
            {tag}
          </div>
        </div>
      </div>
    </div>
  );
}
