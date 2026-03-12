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
}: MeetRecordsBoardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const linesPerPage = Math.max(1, pagingSize || 8);
  const totalPages = Math.ceil(entries.length / linesPerPage);
  const effectiveMaxPages = maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

  // Auto-paging
  useEffect(() => {
    if (effectiveMaxPages <= 1) return;
    const intervalMs = (pagingInterval || 8) * 1000;
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
  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'M': return 'M';
      case 'F':
      case 'W': return 'W';
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

        {/* Cyan gradient divider */}
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

        {/* Column headers */}
        <div
          className="flex items-center px-8 py-2"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(30, 40, 50, 0.8) 20%, rgba(30, 40, 50, 0.8) 80%, transparent 100%)',
          }}
        >
          <span className="text-white/50 font-bold uppercase w-16 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Event
          </span>
          <span className="text-white/50 font-bold uppercase flex-1" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
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
        <div className="h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />

        {/* Record rows */}
        <div className="flex-1 flex flex-col">
          {pageEntries.map((entry, index) => {
            const genderLabel = getGenderLabel(entry.gender);

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
                {/* Event type + gender */}
                <div className="shrink-0 text-center" style={{ width: '4rem' }}>
                  <span
                    className="font-bold uppercase"
                    style={{
                      fontSize: 'clamp(14px, 1.8vw, 24px)',
                      color: accentColor,
                    }}
                  >
                    {entry.eventType?.replace(/_/g, ' ')}
                  </span>
                  {genderLabel && (
                    <span
                      className="ml-1 text-white/40 font-medium"
                      style={{ fontSize: 'clamp(10px, 1.2vw, 16px)' }}
                    >
                      {genderLabel}
                    </span>
                  )}
                </div>

                {/* Scope badge */}
                <span
                  className="shrink-0 inline-block px-2 py-0.5 rounded mr-3 text-xs font-bold uppercase"
                  style={{
                    backgroundColor: `${entry.scopeColor}22`,
                    color: entry.scopeColor,
                    border: `1px solid ${entry.scopeColor}44`,
                    fontSize: 'clamp(8px, 1vw, 14px)',
                    minWidth: '3rem',
                    textAlign: 'center',
                  }}
                >
                  {entry.bookScope === 'meet' ? 'MR' :
                   entry.bookScope === 'facility' ? 'FR' :
                   entry.bookScope === 'national' ? 'CR' :
                   entry.bookScope === 'international' ? 'IR' :
                   entry.bookScope?.charAt(0).toUpperCase() || '?'}
                </span>

                {/* Athlete name */}
                <span
                  className="text-white font-semibold uppercase truncate flex-1"
                  style={{
                    fontSize: 'clamp(16px, 2.5vw, 36px)',
                    fontWeight: 700,
                  }}
                >
                  {entry.name}
                </span>

                {/* Team */}
                <span
                  className="text-white/60 text-center shrink-0 truncate"
                  style={{
                    width: '10rem',
                    fontSize: 'clamp(14px, 2vw, 28px)',
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
        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />

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
