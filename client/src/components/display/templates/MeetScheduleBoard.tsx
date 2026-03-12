import { useState, useEffect, useRef } from "react";
import { getLogoEffectStyle } from "@/lib/logoEffects";

interface ScheduleEntry {
  place: string;
  name: string;
  lastName: string;
  affiliation: string;
  team: string;
  time: string;
  mark: string;
  status: string;
  gender: string;
  eventType: string;
  isFieldEvent: boolean;
}

interface MeetScheduleBoardProps {
  title: string;
  entries: ScheduleEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  pagingSize: number;
  pagingInterval: number;
  maxPages: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export function MeetScheduleBoard({
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
}: MeetScheduleBoardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const linesPerPage = Math.max(1, pagingSize || 8);
  const totalPages = Math.ceil(entries.length / linesPerPage);
  const effectiveMaxPages = maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

  // Auto-paging
  useEffect(() => {
    // If entries changed and we no longer have multiple pages, reset to page 0.
    if (effectiveMaxPages <= 1) {
      setCurrentPage(0);
      return;
    }

    // If entries shrank and we're beyond the end, reset.
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

  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return '#22c55e';
      case 'completed': return '#6b7280';
      case 'upcoming':
      default: return '#3b82f6';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'LIVE';
      case 'completed': return 'DONE';
      case 'upcoming':
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
                {title || 'Meet Schedule'}
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
            #
          </span>
          <span className="text-white/50 font-bold uppercase flex-1" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Event
          </span>
          <span className="text-white/50 font-bold uppercase w-32 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Time
          </span>
          <span className="text-white/50 font-bold uppercase w-20 text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}>
            Status
          </span>
        </div>

        {/* Cyan gradient divider */}
        <div className="h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />

        {/* Schedule rows */}
        <div className="flex-1 flex flex-col">
          {pageEntries.map((entry, index) => {
            const isField = entry.isFieldEvent;
            const statusColor = getStatusColor(entry.status);
            const statusLabel = getStatusLabel(entry.status);
            const isLive = entry.status === 'in_progress';
            const isDone = entry.status === 'completed';

            return (
              <div
                key={`${startIndex + index}`}
                className="flex items-center px-8 flex-1"
                style={{
                  background: isLive
                    ? `linear-gradient(90deg, rgba(34,197,94,0.15) 0%, transparent 60%)`
                    : index % 2 === 0
                      ? 'rgba(255,255,255,0.03)'
                      : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  opacity: isDone ? 0.5 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {/* Event number */}
                <span
                  className="font-bold tabular-nums shrink-0 text-center"
                  style={{
                    width: '4rem',
                    fontSize: 'clamp(18px, 2.5vw, 36px)',
                    fontFamily: "'Bebas Neue', 'Barlow Semi Condensed', sans-serif",
                    color: accentColor,
                  }}
                >
                  {entry.place}
                </span>

                {/* Event type icon */}
                <span
                  className="shrink-0 text-center mr-3"
                  style={{
                    fontSize: 'clamp(14px, 1.8vw, 24px)',
                    width: '2rem',
                  }}
                >
                  {isField ? '🏅' : '🏃'}
                </span>

                {/* Event name */}
                <span
                  className="text-white font-semibold uppercase truncate flex-1"
                  style={{
                    fontSize: 'clamp(18px, 2.8vw, 40px)',
                    fontWeight: 700,
                  }}
                >
                  {entry.name}
                </span>

                {/* Time */}
                <span
                  className="text-white/60 tabular-nums text-center shrink-0"
                  style={{
                    width: '8rem',
                    fontSize: 'clamp(16px, 2vw, 28px)',
                  }}
                >
                  {entry.time}
                </span>

                {/* Status badge */}
                <span
                  className="shrink-0 text-center"
                  style={{ width: '5rem' }}
                >
                  {statusLabel && (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase"
                      style={{
                        backgroundColor: `${statusColor}22`,
                        color: statusColor,
                        border: `1px solid ${statusColor}44`,
                        fontSize: 'clamp(10px, 1.2vw, 16px)',
                      }}
                    >
                      {statusLabel}
                    </span>
                  )}
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
            {entries.length} Events
          </span>
        </div>
      </div>
    </div>
  );
}
