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

      // Use a simple color bucketing approach for more vibrant results
      const buckets: Map<string, { r: number; g: number; b: number; count: number }> = new Map();

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 128) continue;

        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];

        // Skip near-white and near-black pixels
        if (pr > 230 && pg > 230 && pb > 230) continue;
        if (pr < 20 && pg < 20 && pb < 20) continue;
        // Skip very grey pixels (low saturation)
        const maxC = Math.max(pr, pg, pb);
        const minC = Math.min(pr, pg, pb);
        if (maxC - minC < 25 && maxC < 200) continue;

        // Bucket by rounding to nearest 32
        const kr = Math.round(pr / 32) * 32;
        const kg = Math.round(pg / 32) * 32;
        const kb = Math.round(pb / 32) * 32;
        const key = `${kr},${kg},${kb}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.r += pr;
          existing.g += pg;
          existing.b += pb;
          existing.count++;
        } else {
          buckets.set(key, { r: pr, g: pg, b: pb, count: 1 });
        }
      }

      if (buckets.size === 0) {
        resolve('#1e3a8a');
        return;
      }

      // Pick the largest bucket
      let best = { r: 30, g: 58, b: 138, count: 0 };
      for (const bucket of buckets.values()) {
        if (bucket.count > best.count) best = bucket;
      }

      let r = Math.round(best.r / best.count);
      let g = Math.round(best.g / best.count);
      let b = Math.round(best.b / best.count);

      // Boost saturation slightly for richer appearance
      const avg = (r + g + b) / 3;
      const satBoost = 1.25;
      r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * satBoost)));
      g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * satBoost)));
      b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * satBoost)));

      // Darken slightly so it works better as a background
      r = Math.round(r * 0.85);
      g = Math.round(g * 0.85);
      b = Math.round(b * 0.85);

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

  // Build a richer gradient from the extracted team color
  const darken = (rgb: string, amt: number) => {
    const m = rgb.match(/(\d+)/g);
    if (!m || m.length < 3) return rgb;
    return `rgb(${Math.max(0, +m[0] - amt)}, ${Math.max(0, +m[1] - amt)}, ${Math.max(0, +m[2] - amt)})`;
  };
  const darkColor = darken(teamColor, 45);
  const panelGradient = `linear-gradient(135deg, ${darkColor} 0%, ${teamColor} 40%, ${teamColor} 60%, ${darkColor} 100%)`;

  // Shared texture overlay styles
  const stripeOverlay: React.CSSProperties = {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: `repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)`,
  };
  const vignetteOverlay: React.CSSProperties = {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.35) 100%)',
  };
  const accentLine = (top: boolean): React.CSSProperties => ({
    position: 'absolute', left: '10%', right: '10%', height: '2px',
    ...(top ? { top: '12%' } : { bottom: '12%' }),
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    pointerEvents: 'none',
  });

  const logoImgShared: React.CSSProperties = {
    filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.55)) drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
    userSelect: 'none',
  };

  const fallbackTextStyle: React.CSSProperties = {
    fontFamily: "'Oswald', 'Impact', sans-serif",
    textShadow: '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
    letterSpacing: '3px',
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Content layer */}
      <div 
        className="absolute inset-0 z-0"
        style={{ opacity: isRevealed ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
      >
        {children(displayedEntry, isRevealed)}
      </div>

      {/* Full curtain — sweeps in from the right */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center"
        style={{
          background: panelGradient,
          transform: phase === 'curtain' ? 'translateX(0)' : 'translateX(100%)',
          transition: phase === 'curtain' ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        <div style={stripeOverlay} />
        <div style={vignetteOverlay} />
        <div style={accentLine(true)} />
        <div style={accentLine(false)} />
        {displayLogo ? (
          <img 
            src={displayLogo} 
            alt="Team Logo" 
            className="max-h-[55%] max-w-[55%] object-contain"
            style={logoImgShared}
          />
        ) : (
          <div 
            className="text-white text-4xl font-bold uppercase"
            style={fallbackTextStyle}
          >
            {meet?.name || 'ATHLETICS'}
          </div>
        )}
      </div>

      {/* Left split panel */}
      <div
        className="absolute top-0 left-0 w-1/2 h-full z-30 overflow-hidden"
        style={{
          background: panelGradient,
          opacity: phase === 'split' || phase === 'reveal' ? 1 : 0,
          transform: phase === 'reveal' || phase === 'content' ? 'translateX(-100%)' : 'translateX(0)',
          transition: phase === 'reveal' || phase === 'content' ? 'transform 0.65s cubic-bezier(0.25, 0, 0.15, 1)' : 'none',
        }}
      >
        <div style={stripeOverlay} />
        <div style={vignetteOverlay} />
        <div style={accentLine(true)} />
        <div style={accentLine(false)} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt="Team Logo" 
              className="object-contain"
              style={{ height: '140px', ...logoImgShared }}
            />
          ) : (
            <div 
              className="text-white text-2xl font-bold whitespace-nowrap uppercase"
              style={fallbackTextStyle}
            >
              {meet?.name || 'ATHLETICS'}
            </div>
          )}
        </div>
      </div>

      {/* Right split panel */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full z-30 overflow-hidden"
        style={{
          background: panelGradient,
          opacity: phase === 'split' || phase === 'reveal' ? 1 : 0,
          transform: phase === 'reveal' || phase === 'content' ? 'translateX(100%)' : 'translateX(0)',
          transition: phase === 'reveal' || phase === 'content' ? 'transform 0.65s cubic-bezier(0.25, 0, 0.15, 1)' : 'none',
        }}
      >
        <div style={stripeOverlay} />
        <div style={vignetteOverlay} />
        <div style={accentLine(true)} />
        <div style={accentLine(false)} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt="Team Logo" 
              className="object-contain"
              style={{ height: '140px', ...logoImgShared }}
            />
          ) : (
            <div 
              className="text-white text-2xl font-bold whitespace-nowrap uppercase"
              style={fallbackTextStyle}
            >
              {meet?.name || 'ATHLETICS'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
