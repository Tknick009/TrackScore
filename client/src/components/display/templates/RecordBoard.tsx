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

// Darken a hex color by a percentage (0–1)
function darkenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
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
  };
  if (map[label]) return map[label];
  // Abbreviate by taking first letter of each word
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
        {/* ===== TOP SECTION: Record headline + tag badge ===== */}
        <div className="flex flex-col items-center pt-6 pb-3">
          {/* Meet logo */}
          {meetLogoUrl && (
            <img
              src={meetLogoUrl}
              alt={meetName || ''}
              className="h-16 object-contain mb-3"
              style={getLogoEffectStyle(meetLogoEffect)}
            />
          )}

          {/* Record Tag badge */}
          <div
            className="flex items-center justify-center px-6 py-1 rounded-full mb-2"
            style={{
              background: `linear-gradient(135deg, ${secondary}, ${darkenColor(secondary.replace('rgb(', '#').replace(')', ''), 0.3)})`,
              boxShadow: `0 0 30px ${secondary}44`,
            }}
          >
            <span
              className="font-black tracking-wider"
              style={{
                fontSize: 'clamp(20px, 3vw, 40px)',
                color: '#000',
              }}
            >
              {tag}
            </span>
          </div>

          {/* Record Label — full name */}
          <div
            className="font-bold uppercase tracking-[0.15em] leading-none text-center"
            style={{
              fontSize: 'clamp(28px, 4vw, 56px)',
              color: '#ffffff',
              opacity: 0.8,
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
            height: 'clamp(36px, 5vh, 56px)',
          }}
        >
          <span
            className="text-white font-bold uppercase"
            style={{
              fontSize: 'clamp(20px, 3vw, 42px)',
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

        {/* ===== WINNER SECTION — name is the hero ===== */}
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
              padding: 'clamp(20px, 4vh, 48px) clamp(16px, 2vw, 32px)',
              minHeight: 'clamp(140px, 30vh, 320px)',
            }}
          >
            {/* Team logo */}
            {winner.teamLogoUrl && (
              <div
                className="shrink-0 flex items-center justify-center mr-6"
                style={{
                  width: 'clamp(80px, 10vw, 160px)',
                  height: 'clamp(80px, 10vw, 160px)',
                }}
              >
                <img
                  src={winner.teamLogoUrl}
                  alt=""
                  className="w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                />
              </div>
            )}

            {/* Headshot (if no team logo, use headshot) */}
            {!winner.teamLogoUrl && winner.headshotUrl && (
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

            {/* Athlete info — name is the HERO element */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {/* NAME — biggest element on screen */}
              <div
                className="text-white font-black leading-[0.95] uppercase"
                style={{
                  fontSize: 'clamp(56px, 8vw, 120px)',
                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                }}
              >
                {winner.name}
              </div>
              {/* Team/affiliation below */}
              <div
                className="text-white/60 font-medium uppercase tracking-wider mt-2"
                style={{ fontSize: 'clamp(20px, 3vw, 40px)' }}
              >
                {winner.affiliation || winner.team}
              </div>
            </div>

            {/* Mark / Time — plain WHITE, not colored */}
            <div className="shrink-0 text-right flex flex-col items-end justify-center">
              <div
                className="font-black tabular-nums text-white"
                style={{
                  fontSize: 'clamp(48px, 7vw, 96px)',
                  fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
                  textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                }}
              >
                {winner.mark || winner.time}
              </div>
            </div>
          </div>
        </div>

        {/* Footer accent + meet name */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primary}99 50%, transparent 100%)`,
          }}
        />
        <div className="flex items-center justify-center px-8 py-3">
          <span
            className="text-gray-500"
            style={{ fontSize: '24px' }}
          >
            {meetName}
          </span>
        </div>
      </div>
    </div>
  );
}
