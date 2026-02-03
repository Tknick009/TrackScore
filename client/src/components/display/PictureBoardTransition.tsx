import { useState, useEffect, useRef, useCallback } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";

type EntryWithAthlete = EventWithEntries['entries'][number];

interface PictureBoardTransitionProps {
  currentEntry: EntryWithAthlete | null;
  meet?: Meet | null;
  teamColor?: string;
  teamLogo?: string | null;
  children: (entry: EntryWithAthlete | null, isRevealed: boolean) => React.ReactNode;
}

type AnimationPhase = 'idle' | 'curtain' | 'split' | 'reveal' | 'content';

export function PictureBoardTransition({
  currentEntry,
  meet,
  teamColor: propTeamColor,
  teamLogo: propTeamLogo,
  children,
}: PictureBoardTransitionProps) {
  const [displayedEntry, setDisplayedEntry] = useState<EntryWithAthlete | null>(currentEntry);
  const [phase, setPhase] = useState<AnimationPhase>('content');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const previousAthleteIdRef = useRef<string | null>(null);

  const teamColor = propTeamColor || meet?.primaryColor || '#1e3a8a';
  const teamLogo = propTeamLogo || meet?.logoUrl;

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const runTransition = useCallback((newEntry: EntryWithAthlete | null) => {
    clearTimeouts();

    setPhase('curtain');

    timeoutsRef.current.push(setTimeout(() => {
      setPhase('split');
      setDisplayedEntry(newEntry);

      timeoutsRef.current.push(setTimeout(() => {
        setPhase('reveal');

        timeoutsRef.current.push(setTimeout(() => {
          setPhase('content');
        }, 300));
      }, 50));
    }, 500));
  }, [clearTimeouts]);

  useEffect(() => {
    const currentAthleteId = currentEntry?.athleteId || currentEntry?.id || null;
    
    if (isFirstLoad) {
      setIsFirstLoad(false);
      setDisplayedEntry(currentEntry);
      previousAthleteIdRef.current = currentAthleteId;
      setPhase('content');
      return;
    }

    if (currentAthleteId !== previousAthleteIdRef.current) {
      previousAthleteIdRef.current = currentAthleteId;
      if (currentEntry) {
        runTransition(currentEntry);
      } else {
        setDisplayedEntry(null);
        setPhase('content');
      }
    } else {
      setDisplayedEntry(currentEntry);
    }
  }, [currentEntry, isFirstLoad, runTransition]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  const isRevealed = phase === 'content' || phase === 'reveal';

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{ opacity: isRevealed ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
      >
        {children(displayedEntry, isRevealed)}
      </div>

      <div
        className="absolute inset-0 z-20 flex items-center justify-center"
        style={{
          backgroundColor: teamColor,
          transform: phase === 'curtain' ? 'translateX(0)' : 'translateX(100%)',
          transition: phase === 'curtain' ? 'transform 0.5s ease-out' : 'none',
        }}
      >
        {teamLogo ? (
          <img 
            src={teamLogo} 
            alt="Team Logo" 
            className="max-h-[70%] max-w-[70%] object-contain"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))' }}
          />
        ) : (
          <div 
            className="text-white text-4xl font-bold"
            style={{ fontFamily: "'Oswald', sans-serif", textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            {meet?.name || 'ATHLETICS'}
          </div>
        )}
      </div>

      <div
        className="absolute top-0 left-0 w-1/2 h-full z-30 flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: teamColor,
          opacity: phase === 'split' || phase === 'reveal' ? 1 : 0,
          transform: phase === 'reveal' || phase === 'content' ? 'translateX(-100%)' : 'translateX(0)',
          transition: phase === 'reveal' || phase === 'content' ? 'transform 0.6s ease-in-out' : 'none',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {teamLogo ? (
            <img 
              src={teamLogo} 
              alt="Team Logo" 
              className="max-h-[70%] object-contain"
              style={{ 
                height: '140px',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))' 
              }}
            />
          ) : (
            <div 
              className="text-white text-2xl font-bold whitespace-nowrap"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {meet?.name || 'ATHLETICS'}
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute top-0 right-0 w-1/2 h-full z-30 flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: teamColor,
          opacity: phase === 'split' || phase === 'reveal' ? 1 : 0,
          transform: phase === 'reveal' || phase === 'content' ? 'translateX(100%)' : 'translateX(0)',
          transition: phase === 'reveal' || phase === 'content' ? 'transform 0.6s ease-in-out' : 'none',
        }}
      >
        <div style={{ position: 'absolute', right: '50%', transform: 'translateX(50%)' }}>
          {teamLogo ? (
            <img 
              src={teamLogo} 
              alt="Team Logo" 
              className="max-h-[70%] object-contain"
              style={{ 
                height: '140px',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))' 
              }}
            />
          ) : (
            <div 
              className="text-white text-2xl font-bold whitespace-nowrap"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {meet?.name || 'ATHLETICS'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
