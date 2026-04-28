import { useState, useEffect, useRef } from "react";
import { getLogoEffectStyle } from "@/lib/logoEffects";

interface RecordEntry {
  place: string;
  name: string;
  lastName: string;
  affiliation: string;
  team: string;
  time: string;
  mark: string;
  eventType: string;
  gender: string;
  bookName: string;
  bookScope: string;
  scopeColor: string;
  date: string;
  eventNumber: number;
  eventName?: string;
}

interface MeetRecordsBoardProps {
  title: string;
  entries: RecordEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  pagingSize: number;
  pagingInterval: number;
  maxPages: number;
  primaryColor?: string;
  secondaryColor?: string;
}

// Format raw event type to display name
function formatEventType(eventType: string): string {
  if (!eventType) return '';
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Scope label mapping
const SCOPE_LABELS: Record<string, string> = {
  meet: 'MEET RECORD',
  facility: 'FACILITY RECORD',
  national: 'NATIONAL RECORD',
  international: 'INTL RECORD',
  conference: 'CONF RECORD',
  custom: 'RECORD',
};

const SCOPE_SHORT: Record<string, string> = {
  meet: 'MR',
  facility: 'FR',
  national: 'NR',
  international: 'IR',
  conference: 'CR',
  custom: 'R',
};

export function MeetRecordsBoard({
  title,
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  pagingSize,
  pagingInterval,
  maxPages,
  primaryColor,
  secondaryColor,
}: MeetRecordsBoardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const linesPerPage = Math.max(1, pagingSize || 8);
  const totalPages = Math.ceil(entries.length / linesPerPage);
  const effectiveMaxPages = maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

  // Auto-paging
  useEffect(() => {
    if (effectiveMaxPages <= 1) {
      setCurrentPage(0);
      return;
    }

    setCurrentPage(prev => (prev >= effectiveMaxPages ? 0 : prev));

    const intervalMs = (pagingInterval || 8) * 1000;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % effectiveMaxPages);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [effectiveMaxPages, pagingInterval]);

  const startIndex = currentPage * linesPerPage;
  const pageEntries = entries.slice(startIndex, startIndex + linesPerPage);

  const accentColor = primaryColor || '#0088DC';

  // Gender label
  const getGenderPrefix = (gender: string) => {
    switch (gender) {
      case 'M': return "Men's";
      case 'F':
      case 'W': return "Women's";
      default: return '';
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background: '#000000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 120%, ${accentColor}59 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, ${accentColor}33 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, ${accentColor}33 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <div className="flex items-center gap-6">
            {meetLogoUrl && (
              <img
                src={meetLogoUrl}
                alt={meetName || ''}
                className="h-16 object-contain"
                style={getLogoEffectStyle(meetLogoEffect)}
              />
            )}
            <div>
              <h1
                className="text-white font-bold uppercase leading-tight"
                style={{
                  fontSize: 'clamp(28px, 4vw, 56px)',
                  letterSpacing: '0.03em',
                }}
              >
                {title || 'Meet Records'}
              </h1>
              {meetName && (
                <p className="text-white/50" style={{ fontSize: 'clamp(14px, 1.8vw, 24px)' }}>
                  {meetName}
                </p>
              )}
            </div>
          </div>
          {effectiveMaxPages > 1 && (
            <span className="text-white/40" style={{ fontSize: 'clamp(14px, 1.5vw, 20px)' }}>
              Page {currentPage + 1} of {effectiveMaxPages}
            </span>
          )}
        </div>

        {/* Accent divider */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}99 50%, transparent 100%)`,
          }}
        />

        {/* Column headers */}
        <div
          className="flex items-center px-8 py-2"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(30, 40, 50, 0.8) 20%, rgba(30, 40, 50, 0.8) 80%, transparent 100%)',
          }}
        >
          <span className="text-white/50 font-bold uppercase flex-1" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Event
          </span>
          <span className="text-white/50 font-bold uppercase w-24 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Type
          </span>
          <span className="text-white/50 font-bold uppercase w-48 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Record Holder
          </span>
          <span className="text-white/50 font-bold uppercase w-40 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Team
          </span>
          <span className="text-white/50 font-bold uppercase w-32 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Mark
          </span>
          <span className="text-white/50 font-bold uppercase w-16 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Year
          </span>
        </div>

        {/* Divider */}
        <div
          className="h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}66 50%, transparent 100%)`,
          }}
        />

        {/* Record rows */}
        <div className="flex-1 flex flex-col">
          {pageEntries.map((entry, index) => {
            const genderPrefix = getGenderPrefix(entry.gender);
            const eventDisplay = entry.eventName || `${genderPrefix} ${formatEventType(entry.eventType)}`.trim();
            const scopeLabel = SCOPE_SHORT[entry.bookScope] || entry.bookScope?.charAt(0).toUpperCase() || '?';

            return (
              <div
                key={`${startIndex + index}`}
                className="flex items-center px-8 flex-1"
                style={{
                  background: index % 2 === 0
                    ? 'rgba(255,255,255,0.03)'
                    : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Event name with gender */}
                <div className="flex-1 min-w-0 pr-3">
                  <span
                    className="text-white font-semibold uppercase truncate block"
                    style={{
                      fontSize: 'clamp(14px, 2vw, 30px)',
                      fontWeight: 700,
                    }}
                  >
                    {eventDisplay}
                  </span>
                </div>

                {/* Scope badge — larger and more prominent */}
                <span
                  className="shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-md mr-3 font-black uppercase"
                  style={{
                    backgroundColor: `${entry.scopeColor}33`,
                    color: entry.scopeColor,
                    border: `2px solid ${entry.scopeColor}66`,
                    fontSize: 'clamp(12px, 1.5vw, 20px)',
                    minWidth: '4.5rem',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                  }}
                >
                  {scopeLabel}
                </span>

                {/* Athlete name */}
                <span
                  className="text-white font-semibold uppercase truncate text-center shrink-0"
                  style={{
                    width: '12rem',
                    fontSize: 'clamp(14px, 2vw, 28px)',
                    fontWeight: 600,
                  }}
                >
                  {entry.name}
                </span>

                {/* Team */}
                <span
                  className="text-white/60 text-center shrink-0 truncate"
                  style={{
                    width: '10rem',
                    fontSize: 'clamp(14px, 1.8vw, 26px)',
                  }}
                >
                  {entry.team || entry.affiliation}
                </span>

                {/* Performance / Mark */}
                <span
                  className="font-bold tabular-nums text-center shrink-0"
                  style={{
                    width: '8rem',
                    fontSize: 'clamp(16px, 2.2vw, 32px)',
                    fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
                    color: '#FFD700',
                  }}
                >
                  {entry.mark || entry.time}
                </span>

                {/* Year */}
                <span
                  className="text-white/40 text-center shrink-0"
                  style={{
                    width: '4rem',
                    fontSize: 'clamp(12px, 1.5vw, 22px)',
                  }}
                >
                  {entry.date}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer divider */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}99 50%, transparent 100%)`,
          }}
        />

        {/* Footer */}
        <div className="flex items-center justify-center px-8 py-3">
          <span className="text-gray-500" style={{ fontSize: 'clamp(14px, 1.5vw, 22px)' }}>
            {entries.length} Records
          </span>
        </div>
      </div>
    </div>
  );
}
