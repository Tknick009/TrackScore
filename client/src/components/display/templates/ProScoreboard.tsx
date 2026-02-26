import { useState, useEffect, useMemo } from "react";
import type { EventWithEntries, Meet, EntryWithDetails } from "@shared/schema";
import { isTrackEvent as checkIsTrackEvent } from "@shared/event-catalog";
import { formatResult, formatTimeValue } from "../utils";
import { getTeamColor, getPodiumColor } from "../utils";

interface ProScoreboardProps {
  event: EventWithEntries;
  meet?: Meet | null;
  liveTime?: string;
  pagingSize?: number;
  pagingIntervalMs?: number;
}

function determineDisplayMode(event: EventWithEntries): 'track' | 'field' {
  const firstEntry = event.entries.find(e => e.resultType);
  if (firstEntry) {
    return firstEntry.resultType === 'time' ? 'track' : 'field';
  }
  return checkIsTrackEvent(event.eventType) ? 'track' : 'field';
}

export function ProScoreboard({ event, meet, liveTime, pagingSize = 8, pagingIntervalMs = 8000 }: ProScoreboardProps) {
  const [clock, setClock] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  const displayMode = determineDisplayMode(event);
  const isCompleted = event.status === 'completed';
  const isLive = event.status === 'in_progress';

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      setClock(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayClock = liveTime || clock;

  // Sort entries
  const sortedEntries = useMemo(() => {
    const isDNS = (entry: EntryWithDetails) => {
      const time = String(entry.finalMark ?? '').toUpperCase().trim();
      const place = String(entry.finalPlace ?? '').toUpperCase().trim();
      return time === 'DNS' || place === 'DNS';
    };
    const valid = (event.entries || []).filter(e => !isDNS(e));
    return [...valid].sort((a, b) => {
      if (a.finalPlace && b.finalPlace) return a.finalPlace - b.finalPlace;
      if (a.finalPlace) return -1;
      if (b.finalPlace) return 1;
      return (a.finalLane || 0) - (b.finalLane || 0);
    });
  }, [event.entries]);

  // Paging
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pagingSize));
  
  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setCurrentPage(prev => (prev + 1) % totalPages);
        setFadeState('in');
      }, 400);
    }, pagingIntervalMs);
    return () => clearInterval(interval);
  }, [totalPages, pagingIntervalMs]);

  const pagedEntries = sortedEntries.slice(
    currentPage * pagingSize,
    (currentPage + 1) * pagingSize
  );

  const isRelay = event.eventType?.toLowerCase().includes('relay');
  const windReading = event.entries?.[0]?.finalWind;
  const windDisplay = windReading !== null && windReading !== undefined
    ? `${windReading > 0 ? '+' : ''}${windReading.toFixed(1)} m/s`
    : null;

  const statusLabel = isCompleted ? 'OFFICIAL RESULTS' : isLive ? 'LIVE' : 'SCHEDULED';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        backgroundColor: '#0a0e1a',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg, rgba(15,25,50,0.9) 0%, rgba(10,14,26,1) 100%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,100,200,0.08) 0%, transparent 70%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col h-full">
        {/* ── Top Bar: Meet info + clock ── */}
        <div className="flex items-center justify-between px-10 pt-5 pb-3">
          <div className="flex items-center gap-5">
            {meet?.logoUrl && (
              <img
                src={meet.logoUrl}
                alt={meet.name || ''}
                className="h-14 object-contain"
              />
            )}
            <div>
              <div
                className="text-white/40 uppercase tracking-[0.15em] font-semibold"
                style={{ fontSize: '18px' }}
              >
                {meet?.name || 'Track & Field'}
              </div>
            </div>
          </div>
          <div
            className="text-white/50 tabular-nums font-medium"
            style={{ fontSize: '28px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {displayClock}
          </div>
        </div>

        {/* ── Event Header ── */}
        <div className="px-10 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1
                className="text-white font-bold leading-[0.95] uppercase tracking-tight"
                style={{ fontSize: '52px' }}
              >
                {event.name || ''}
              </h1>
              {event.gender && (
                <div
                  className="text-white/30 uppercase tracking-wider mt-1"
                  style={{ fontSize: '20px' }}
                >
                  {event.gender}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {windDisplay && (
                <div
                  className="text-white/40 uppercase font-medium"
                  style={{ fontSize: '20px' }}
                >
                  Wind: {windDisplay}
                </div>
              )}
              <div
                className={`px-5 py-1.5 rounded-full font-bold uppercase tracking-wider ${
                  isLive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
                style={{ fontSize: '16px' }}
              >
                {isLive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse" />
                )}
                {statusLabel}
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-10">
          <div
            className="h-[2px]"
            style={{
              background: 'linear-gradient(90deg, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0.15) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* ── Column headers ── */}
        <div className="px-10 py-3">
          <div className="flex items-center text-white/25 uppercase tracking-wider" style={{ fontSize: '14px', fontWeight: 600 }}>
            <div className="w-[80px] text-center">{displayMode === 'track' ? 'Lane' : '#'}</div>
            <div className="w-[60px] text-center">Place</div>
            <div className="flex-1">Athlete</div>
            <div className="w-[200px] text-right">{displayMode === 'track' ? 'Time' : 'Mark'}</div>
          </div>
        </div>

        {/* ── Results rows ── */}
        <div
          className="flex-1 flex flex-col px-10 overflow-hidden"
          style={{
            opacity: fadeState === 'in' ? 1 : 0,
            transition: 'opacity 400ms ease-in-out',
          }}
        >
          {pagedEntries.map((entry, index) => {
            const globalIndex = currentPage * pagingSize + index;
            const position = entry.finalPlace ?? 0;
            const isPodium = position >= 1 && position <= 3;
            const teamName = isRelay
              ? entry.team?.name || ''
              : '';
            const athleteName = isRelay
              ? entry.team?.name || 'Unknown Team'
              : `${entry.athlete?.firstName || ''} ${entry.athlete?.lastName || ''}`.trim();
            const teamDisplay = isRelay ? '' : entry.team?.name || '';
            const teamLogo = (entry.team as Record<string, unknown>)?.logoUrl as string | undefined;

            const resultText = (() => {
              if (entry.finalMark === null || entry.finalMark === undefined) return '';
              if (displayMode === 'track') {
                const val = entry.finalMark;
                if (val >= 60) {
                  const mins = Math.floor(val / 60);
                  const secs = (val % 60).toFixed(2);
                  return `${mins}:${secs.padStart(5, '0')}`;
                }
                return val.toFixed(2);
              }
              return `${entry.finalMark.toFixed(2)}m`;
            })();

            // Status codes
            const notes = (entry as Record<string, unknown>).notes;
            const statusCodes = ['DNF', 'DQ', 'DNS', 'SCR', 'NH', 'NM', 'FOUL', 'FS', 'NT'];
            const statusLabel = notes && statusCodes.includes(String(notes).toUpperCase())
              ? String(notes).toUpperCase()
              : entry.isDisqualified ? 'DQ' : null;

            const rowBg = isPodium
              ? 'rgba(59,130,246,0.06)'
              : globalIndex % 2 === 0
              ? 'rgba(255,255,255,0.02)'
              : 'transparent';

            return (
              <div
                key={entry.id || index}
                className="flex items-center flex-1 min-h-0"
                style={{
                  backgroundColor: rowBg,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {/* Lane / number */}
                <div className="w-[80px] flex items-center justify-center relative">
                  {/* Team color accent line */}
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ backgroundColor: getTeamColor(entry.team?.name) }}
                  />
                  <span
                    className="text-white/30 font-bold tabular-nums"
                    style={{ fontSize: '32px', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {entry.finalLane || globalIndex + 1}
                  </span>
                </div>

                {/* Place badge */}
                <div className="w-[60px] flex items-center justify-center">
                  {position > 0 ? (
                    <div
                      className={`w-[44px] h-[44px] rounded-full flex items-center justify-center font-bold ${
                        isPodium ? 'text-black' : 'text-white/40 border border-white/10'
                      }`}
                      style={{
                        fontSize: '22px',
                        backgroundColor: isPodium ? getPodiumColor(position) : 'transparent',
                        ...(isPodium && position === 1 ? {
                          boxShadow: '0 0 20px rgba(255,215,0,0.3)',
                        } : {}),
                      }}
                    >
                      {position}
                    </div>
                  ) : (
                    <span className="text-white/15" style={{ fontSize: '18px' }}>--</span>
                  )}
                </div>

                {/* Athlete info */}
                <div className="flex-1 flex items-center gap-4 min-w-0 px-3">
                  {teamLogo && (
                    <img
                      src={teamLogo}
                      alt=""
                      className="w-10 h-10 object-contain rounded"
                    />
                  )}
                  <div className="min-w-0">
                    <div
                      className="text-white font-semibold truncate leading-tight"
                      style={{ fontSize: '30px' }}
                    >
                      {athleteName}
                    </div>
                    {teamDisplay && (
                      <div
                        className="text-white/30 truncate leading-tight"
                        style={{ fontSize: '18px' }}
                      >
                        {teamDisplay}
                      </div>
                    )}
                  </div>
                </div>

                {/* Result */}
                <div className="w-[200px] text-right pr-2">
                  {statusLabel ? (
                    <span
                      className="text-amber-400/80 font-bold"
                      style={{ fontSize: '28px' }}
                    >
                      {statusLabel}
                    </span>
                  ) : (
                    <span
                      className="text-white font-bold tabular-nums"
                      style={{
                        fontSize: resultText ? '36px' : '24px',
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      }}
                    >
                      {resultText || '--'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom bar ── */}
        <div className="mx-10">
          <div
            className="h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.15) 50%, transparent 100%)',
            }}
          />
        </div>
        <div className="flex items-center justify-between px-10 py-3">
          <div className="text-white/20" style={{ fontSize: '16px' }}>
            {meet?.name || ''}
            {meet?.location ? ` - ${meet.location}` : ''}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPage ? 'bg-blue-400 scale-125' : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
          )}
          <div className="text-white/20 tabular-nums" style={{ fontSize: '14px' }}>
            {sortedEntries.length} entries
          </div>
        </div>
      </div>
    </div>
  );
}
