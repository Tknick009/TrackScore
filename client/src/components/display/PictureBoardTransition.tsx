import { useState, useEffect, useRef, useCallback } from "react";
import type { EventWithEntries, Meet } from "@shared/schema";

type EntryWithAthlete = EventWithEntries['entries'][number];

interface PictureBoardTransitionProps {
  currentEntry: EntryWithAthlete | null;
  meet?: Meet | null;
  children: (entry: EntryWithAthlete | null, isRevealed: boolean) => React.ReactNode;
}

type AnimationPhase = 'idle' | 'curtain' | 'split' | 'reveal' | 'content';

function extractDominantColor(imgElement: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#1e3a8a');
        return;
      }

      const size = 50;
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(imgElement, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 128) continue;

        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];

        if (pr > 240 && pg > 240 && pb > 240) continue;
        if (pr < 15 && pg < 15 && pb < 15) continue;

        r += pr;
        g += pg;
        b += pb;
        count++;
      }

      if (count === 0) {
        resolve('#1e3a8a');
        return;
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      const max = Math.max(r, g, b);
      if (max < 60) {
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 40);
        b = Math.min(255, b + 40);
      }

      resolve(`rgb(${r}, ${g}, ${b})`);
    } catch (e) {
      resolve('#1e3a8a');
    }
  });
}

export function PictureBoardTransition({
  currentEntry,
  meet,
  children,
}: PictureBoardTransitionProps) {
  const [displayedEntry, setDisplayedEntry] = useState<EntryWithAthlete | null>(currentEntry);
  const [phase, setPhase] = useState<AnimationPhase>('content');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [extractedColor, setExtractedColor] = useState<string>('#1e3a8a');
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const previousAthleteIdRef = useRef<string | null>(null);
  const colorCacheRef = useRef<Map<string, string>>(new Map());

  const getTeamLogo = (entry: EntryWithAthlete | null): string | null => {
    if (!entry) return null;
    const athlete = (entry as any).athlete;
    if (!athlete) return null;
    const teamCode = athlete.teamCode || athlete.team?.code || athlete.team?.teamCode;
    if (teamCode) {
      return `/logos/NCAA/${teamCode}.png`;
    }
    return null;
  };

  const teamLogo = getTeamLogo(currentEntry);
  const fallbackLogo = meet?.logoUrl;
  const displayLogo = teamLogo || fallbackLogo;
  const teamColor = extractedColor;

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

  const extractColorFromLogo = useCallback(async (logoUrl: string): Promise<string> => {
    if (colorCacheRef.current.has(logoUrl)) {
      return colorCacheRef.current.get(logoUrl)!;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const color = await extractDominantColor(img);
        colorCacheRef.current.set(logoUrl, color);
        resolve(color);
      };
      img.onerror = () => {
        resolve(meet?.primaryColor || '#1e3a8a');
      };
      img.src = logoUrl;
    });
  }, [meet?.primaryColor]);

  useEffect(() => {
    const currentAthleteId = currentEntry?.athleteId || currentEntry?.id || null;
    const newTeamLogo = getTeamLogo(currentEntry);
    
    if (isFirstLoad) {
      setIsFirstLoad(false);
      setDisplayedEntry(currentEntry);
      previousAthleteIdRef.current = currentAthleteId;
      setPhase('content');
      
      if (newTeamLogo) {
        extractColorFromLogo(newTeamLogo).then(setExtractedColor);
      } else if (meet?.primaryColor) {
        setExtractedColor(meet.primaryColor);
      }
      return;
    }

    if (currentAthleteId !== previousAthleteIdRef.current) {
      previousAthleteIdRef.current = currentAthleteId;
      
      if (currentEntry) {
        if (newTeamLogo) {
          extractColorFromLogo(newTeamLogo).then((color) => {
            setExtractedColor(color);
            runTransition(currentEntry);
          });
        } else {
          setExtractedColor(meet?.primaryColor || '#1e3a8a');
          runTransition(currentEntry);
        }
      } else {
        setDisplayedEntry(null);
        setPhase('content');
      }
    } else {
      setDisplayedEntry(currentEntry);
    }
  }, [currentEntry, isFirstLoad, runTransition, extractColorFromLogo, meet?.primaryColor]);

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
        {displayLogo ? (
          <img 
            src={displayLogo} 
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
          {displayLogo ? (
            <img 
              src={displayLogo} 
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
          {displayLogo ? (
            <img 
              src={displayLogo} 
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
