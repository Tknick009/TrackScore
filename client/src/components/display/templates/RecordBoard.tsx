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

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col relative"
      style={{
        background: `linear-gradient(180deg, #0a0a0a 0%, ${primary}22 50%, #0a0a0a 100%)`,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Subtle radial glow behind center content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 50%, ${primary}30 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-[5%]">

        {/* Event name — top line, smaller */}
        <div
          className="text-center uppercase font-bold tracking-wider w-full"
          style={{
            fontSize: 'clamp(14px, 3vw, 36px)',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 'clamp(4px, 1vh, 12px)',
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

        {/* Team + Record Tag line */}
        <div
          className="flex items-center justify-center gap-3 w-full"
          style={{ marginBottom: 'clamp(8px, 2vh, 24px)' }}
        >
          <span
            className="uppercase font-semibold tracking-wide"
            style={{
              fontSize: 'clamp(14px, 3vw, 32px)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {winner.affiliation || winner.team}
          </span>
          <span
            className="uppercase font-black"
            style={{
              fontSize: 'clamp(14px, 3vw, 32px)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            -
          </span>
          <span
            className="uppercase font-black"
            style={{
              fontSize: 'clamp(14px, 3vw, 32px)',
              color: secondary,
              textShadow: `0 0 12px ${secondary}44`,
            }}
          >
            {recordLabel}
          </span>
        </div>

        {/* NEW + Tag badge line */}
        <div
          className="flex items-center justify-center gap-3"
          style={{ marginBottom: 'clamp(4px, 1vh, 12px)' }}
        >
          <span
            className="font-black uppercase"
            style={{
              fontSize: 'clamp(16px, 3.5vw, 40px)',
              color: secondary,
              textShadow: `0 0 16px ${secondary}55`,
            }}
          >
            NEW
          </span>
          <span
            className="font-black uppercase px-3 py-0.5 rounded"
            style={{
              fontSize: 'clamp(16px, 3.5vw, 40px)',
              color: '#fff',
              background: primary,
              boxShadow: `0 0 20px ${primary}66`,
            }}
          >
            {tag}
          </span>
        </div>

        {/* TIME / MARK — large, clean white */}
        <div
          className="text-center font-black tabular-nums"
          style={{
            fontSize: 'clamp(56px, 14vw, 180px)',
            fontFamily: "'Bebas Neue', 'Inter', sans-serif",
            color: '#ffffff',
            lineHeight: 1,
            textShadow: '0 2px 16px rgba(0,0,0,0.4)',
          }}
        >
          {winner.mark || winner.time}
        </div>

        {/* Meet name — bottom, subtle */}
        <div
          className="text-center uppercase font-medium tracking-wider"
          style={{
            fontSize: 'clamp(10px, 2vw, 22px)',
            color: 'rgba(255,255,255,0.35)',
            marginTop: 'clamp(8px, 2vh, 24px)',
          }}
        >
          {meetName}
        </div>
      </div>
    </div>
  );
}
