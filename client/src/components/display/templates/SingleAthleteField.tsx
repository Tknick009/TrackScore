import { useState, useEffect } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";
import { PictureBoardTransition } from "../PictureBoardTransition";

type EntryWithAthlete = EventWithEntries['entries'][number];

interface SingleAthleteFieldProps {
  event: EventWithEntries;
  meet?: Meet | null;
  focusIndex?: number;
  pagingInterval?: number;
  enableTransition?: boolean;
}

export function SingleAthleteField({ 
  event, 
  meet, 
  focusIndex = 0,
  pagingInterval = 5,
  enableTransition = true,
}: SingleAthleteFieldProps) {
  const sortedEntries = [...(event.entries || [])].sort((a, b) => {
    if (a.finalPlace && b.finalPlace) return a.finalPlace - b.finalPlace;
    if (a.finalPlace) return -1;
    if (b.finalPlace) return 1;
    return ((a as any).order || 0) - ((b as any).order || 0);
  });

  const currentEntry = sortedEntries[focusIndex] || null;

  if (enableTransition) {
    return (
      <PictureBoardTransition
        currentEntry={currentEntry}
        meet={meet}
      >
        {(entry, isRevealed) => (
          <SingleAthleteFieldContent
            event={event}
            meet={meet}
            athlete={entry}
            isRevealed={isRevealed}
          />
        )}
      </PictureBoardTransition>
    );
  }

  return (
    <SingleAthleteFieldContent
      event={event}
      meet={meet}
      athlete={currentEntry}
      isRevealed={true}
    />
  );
}

interface SingleAthleteFieldContentProps {
  event: EventWithEntries;
  meet?: Meet | null;
  athlete: EntryWithAthlete | null;
  isRevealed: boolean;
}

function SingleAthleteFieldContent({ event, meet, athlete, isRevealed }: SingleAthleteFieldContentProps) {
  const [clock, setClock] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setClock(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatMark = (mark: number | null | undefined): string => {
    if (mark === null || mark === undefined) return '--';
    const meters = mark / 1000;
    return meters.toFixed(2) + 'm';
  };

  const formatAttempt = (attempt: any): string => {
    if (!attempt) return '-';
    if (attempt.mark) return formatMark(attempt.mark);
    if (attempt.status === 'foul' || attempt.status === 'X') return 'X';
    if (attempt.status === 'pass' || attempt.status === 'P') return 'P';
    return '-';
  };

  const status = event.status === 'completed' ? 'FINAL' : 'LIVE';

  if (!athlete) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center"
        style={{ 
          backgroundColor: '#000000',
          fontFamily: "'Barlow Semi Condensed', sans-serif" 
        }}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(0, 150, 255, 0.3) 0%, transparent 60%)',
          }}
        />
        <span className="text-white text-4xl font-bold relative z-10">WAITING...</span>
      </div>
    );
  }

  const athleteName = athlete.athlete 
    ? `${athlete.athlete.lastName?.toUpperCase() || ''}`
    : 'ATHLETE';
  
  const teamName = (athlete.athlete as any)?.teamName || (athlete.athlete as any)?.team?.name || '';
  const recordTags: string[] = (athlete as any).recordTags || [];
  const attempts = (athlete as any).attempts || [];
  const currentAttempt = attempts.length;
  const maxAttempts = 6;

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ 
        backgroundColor: '#000000',
        fontFamily: "'Barlow Semi Condensed', sans-serif" 
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(0, 150, 255, 0.35) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-between p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span 
              className="text-cyan-400 font-bold"
              style={{ fontSize: '24px' }}
            >
              {event.eventNumber ? `E${event.eventNumber}` : ''}
            </span>
            <span 
              className="text-white/60 uppercase"
              style={{ fontSize: '18px' }}
            >
              {status}
            </span>
          </div>
          <span 
            className="text-white/80 font-bold tabular-nums"
            style={{ fontSize: '20px', fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {clock}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-4">
            {athlete.finalPlace && (
              <span 
                className="text-yellow-400 font-black"
                style={{ fontSize: '72px', fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {athlete.finalPlace}
              </span>
            )}
            <div className="flex flex-col items-center">
              <span 
                className="text-white font-bold uppercase tracking-wide text-center"
                style={{ fontSize: '48px', fontWeight: 800 }}
              >
                {athleteName}
              </span>
              {teamName && (
                <span 
                  className="text-cyan-300/80 uppercase"
                  style={{ fontSize: '24px' }}
                >
                  {teamName}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="flex items-baseline gap-2">
              <span 
                className="text-white font-black tabular-nums"
                style={{ 
                  fontSize: '64px', 
                  fontFamily: "'Bebas Neue', sans-serif",
                  textShadow: '0 0 20px rgba(0, 200, 255, 0.5)'
                }}
              >
                {formatMark(athlete.finalMark)}
              </span>
              {recordTags.length > 0 && (
                <div className="flex gap-1">
                  {recordTags.map((tag) => (
                    <span
                      key={tag}
                      className="font-bold uppercase px-2 py-0.5 rounded"
                      style={{
                        fontSize: '18px',
                        backgroundColor: tag.includes('MR') || tag.includes('FR') ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 200, 255, 0.2)',
                        color: tag.includes('MR') || tag.includes('FR') ? '#ffd700' : '#00e5ff',
                        border: `1px solid ${tag.includes('MR') || tag.includes('FR') ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 200, 255, 0.4)'}`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-1">
              {Array.from({ length: maxAttempts }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-8 h-8 flex items-center justify-center rounded ${
                    i < currentAttempt 
                      ? 'bg-cyan-500/30 border border-cyan-400/50' 
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  <span 
                    className={`font-bold ${
                      attempts[i]?.status === 'foul' || attempts[i]?.status === 'X'
                        ? 'text-red-400'
                        : attempts[i]?.mark
                          ? 'text-green-400'
                          : 'text-white/50'
                    }`}
                    style={{ fontSize: '14px' }}
                  >
                    {formatAttempt(attempts[i])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0" />
      </div>
    </div>
  );
}
