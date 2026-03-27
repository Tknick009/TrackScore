import { useState, useEffect, useRef, useCallback, useMemo } from "react";

type CurtainPhase = 'idle' | 'coverStart' | 'covering' | 'paused' | 'reveal';

// Darken a color by reducing RGB channels
function darkenColor(color: string, amount: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const match = color.match(/(\d+)/g);
  if (match && match.length >= 3) {
    const r = Math.max(0, parseInt(match[0]) - amount);
    const g = Math.max(0, parseInt(match[1]) - amount);
    const b = Math.max(0, parseInt(match[2]) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
}

export function FieldTransitionRenderer({
  curtainColor,
  meetId,
  liveData,
  liveEventDataByPort,
  deviceFieldPort,
  canvasWidth,
  canvasHeight,
}: {
  curtainColor: string;
  meetId?: string;
  // Live data prop — passed from SceneObjectRenderer which gets it from the display device's
  // own WebSocket (registered as a display device). Previously this component listened on the
  // WebSocket context directly, but that's a SEPARATE unregistered connection that never receives
  // field_mode_change messages from the server.
  liveData?: { entries?: any[]; results?: any[] } | null;
  // All field port data keyed by port number
  liveEventDataByPort?: Record<number, { entries?: any[]; results?: any[] }> | null;
  // This device's assigned field port — curtain only fires for THIS port's data
  deviceFieldPort?: number;
  // Canvas dimensions for responsive scaling — the curtain scales text/logo relative to
  // a 1080p reference so it looks correct on P10 (192x96) through BigBoard (1920x1080).
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  const [phase, setPhase] = useState<CurtainPhase>('idle');
  const [primaryColor, setPrimaryColor] = useState<string>(curtainColor);
  const [secondaryColor, setSecondaryColor] = useState<string>(curtainColor);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const prevCalledBibRef = useRef<string>('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const versionRef = useRef(0);
  // Ref that tracks current phase so async team-data fetch can check
  // whether the curtain is still active before updating colors.
  const phaseRef = useRef<CurtainPhase>('idle');

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const runCurtain = useCallback((
    newLogoSrc: string | null,
    primary: string,
    secondary: string,
  ) => {
    clearTimers();
    const version = ++versionRef.current;
    setLogoSrc(newLogoSrc);
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setPhase('coverStart'); phaseRef.current = 'coverStart';

    timersRef.current.push(setTimeout(() => {
      if (versionRef.current !== version) return;
      setPhase('covering'); phaseRef.current = 'covering';

      timersRef.current.push(setTimeout(() => {
        if (versionRef.current !== version) return;
        setPhase('paused'); phaseRef.current = 'paused';

        timersRef.current.push(setTimeout(() => {
          if (versionRef.current !== version) return;
          setPhase('reveal'); phaseRef.current = 'reveal';

          timersRef.current.push(setTimeout(() => {
            if (versionRef.current !== version) return;
            setPhase('idle'); phaseRef.current = 'idle';
          }, 700));
        }, 1000));  // Was 1400ms — reduced to 1000ms for snappier feel
      }, 600));
    }, 30));
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Get the live data for THIS device's assigned field port only.
  // If the device has a specific port assigned, use only that port's data.
  // This prevents the curtain from firing on ALL devices when ANY port updates.
  const mergedLiveData = useMemo(() => {
    const allSources: Array<{ entries?: any[]; results?: any[] }> = [];
    
    // If device has a specific field port, ONLY use that port's data
    if (deviceFieldPort && liveEventDataByPort) {
      const portData = liveEventDataByPort[deviceFieldPort];
      if (portData) allSources.push(portData);
    } else if (liveData) {
      // No specific port assigned — use the global liveData (original behavior)
      allSources.push(liveData);
    }
    
    return allSources;
  }, [liveData, liveEventDataByPort, deviceFieldPort]);

  // React to live data changes — detect when a new athlete is "called up" (entry with no mark).
  // Only scans this device's own field port data so the curtain fires only for the correct event.
  useEffect(() => {
    if (mergedLiveData.length === 0) return;

    // Search all data sources for a called-up athlete
    let calledUp: any = null;
    for (const source of mergedLiveData) {
      const entries: any[] = source.entries || source.results || [];
      const found = entries.find((r: any) => !r.mark || String(r.mark).trim() === '');
      if (found) {
        calledUp = found;
        break;
      }
    }
    if (!calledUp) return;

    const calledId = calledUp.bib
      ? String(calledUp.bib)
      : calledUp.name
      ? String(calledUp.name)
      : '';
    if (!calledId || calledId === prevCalledBibRef.current) return;
    prevCalledBibRef.current = calledId;

    const school = calledUp.affiliation || calledUp.team || '';
    const name = calledUp.name || '';

    // START CURTAIN IMMEDIATELY with default colors — don't wait for HTTP fetch.
    // Previously the curtain waited for team color fetch (1-2s) BEFORE starting,
    // which combined with the 2.7s animation created a perceived 4s delay.
    // Now: curtain starts instantly, team data updates colors mid-animation.
    runCurtain(null, curtainColor, curtainColor);
    
    // Fetch team colors/logo in parallel — update curtain colors if data arrives
    // during the covering or paused phase (before reveal starts).
    if (school) {
      (async () => {
        try {
          const meetParam = meetId
            ? `&meetId=${encodeURIComponent(meetId)}`
            : '';
          const res = await fetch(
            `/api/teams/by-affiliation?name=${encodeURIComponent(school)}${meetParam}`
          );
          if (res.ok) {
            const teamData = await res.json();
            // Only update if curtain is still active (not yet revealing/idle)
            const currentPhase = phaseRef.current;
            if (currentPhase === 'coverStart' || currentPhase === 'covering' || currentPhase === 'paused') {
              if (teamData?.primaryColor) {
                setPrimaryColor(teamData.primaryColor);
                setSecondaryColor(teamData.secondaryColor || teamData.primaryColor);
              }
              if (teamData?.logoUrl) {
                setLogoSrc(teamData.logoUrl);
              }
            }
          }
        } catch {
          /* ignore — curtain already running with default colors */
        }
      })();
    }
  }, [mergedLiveData, curtainColor, meetId, runCurtain]);

  if (phase === 'idle') return null;

  const isCovering = phase === 'covering';
  const isPaused = phase === 'paused';
  const isReveal = phase === 'reveal';
  const isInitial = phase === 'coverStart';

  // Scale factor: sizes are designed for 1080p (1920x1080). Scale proportionally to actual canvas.
  // Use the smaller dimension (height) as the reference since that's the constraining axis.
  const refHeight = 1080;
  const effectiveHeight = canvasHeight || refHeight;
  const s = effectiveHeight / refHeight; // e.g. 96/1080 ≈ 0.089 for P10

  // Rich multi-stop gradient for depth
  const darkPrimary = darkenColor(primaryColor, 40);
  const darkSecondary = darkenColor(secondaryColor, 30);
  const gradient = `linear-gradient(135deg, ${darkPrimary} 0%, ${primaryColor} 35%, ${secondaryColor} 65%, ${darkSecondary} 100%)`;

  const panelTransition = isReveal
    ? 'transform 0.7s cubic-bezier(0.25, 0, 0.15, 1)'
    : isCovering
    ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    : 'none';

  const leftTransform = isReveal
    ? 'translateX(-100%)'
    : isInitial
    ? 'translateX(100%)'
    : 'translateX(0)';

  const rightTransform = isReveal
    ? 'translateX(100%)'
    : isInitial
    ? 'translateX(100%)'
    : 'translateX(0)';

  // Logo fades in during covering, fully visible on pause, fades on reveal
  const logoOpacity = isPaused ? 1 : isCovering ? 0.6 : 0;
  const logoScale = isPaused ? 1 : isCovering ? 0.9 : 0.75;

  const panelBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '50%',
    overflow: 'hidden',
    background: gradient,
    zIndex: 50,
    transition: `${panelTransition}, background 0.3s ease`,
  };

  // Subtle diagonal stripe texture — scale stripe width with display size
  const stripeSize = Math.max(1, Math.round(8 * s));
  const stripeOverlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `repeating-linear-gradient(
      -45deg,
      transparent,
      transparent ${stripeSize}px,
      rgba(255,255,255,0.03) ${stripeSize}px,
      rgba(255,255,255,0.03) ${stripeSize * 2}px
    )`,
    pointerEvents: 'none',
  };

  // Soft vignette for depth
  const vignetteOverlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.35) 100%)',
    pointerEvents: 'none',
  };

  // Thin decorative accent line — scale thickness
  const lineHeight = Math.max(1, Math.round(2 * s));
  const accentLineBase: React.CSSProperties = {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: `${lineHeight}px`,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
    opacity: isPaused ? 1 : 0,
    transition: 'opacity 0.4s ease 0.15s',
    pointerEvents: 'none',
  };

  // Inner container spans full viewport so logo + text appears centered
  const innerContainerBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '200%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    opacity: logoOpacity,
    transform: `scale(${logoScale})`,
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  };

  // Logo as large as possible — fill most of the panel
  const shadowBlur1 = Math.max(1, Math.round(30 * s));
  const shadowBlur2 = Math.max(1, Math.round(8 * s));
  const logoImgStyle: React.CSSProperties = {
    maxHeight: '75%',
    maxWidth: '75%',
    objectFit: 'contain',
    filter: `drop-shadow(0 ${Math.max(1, Math.round(6 * s))}px ${shadowBlur1}px rgba(0,0,0,0.55)) drop-shadow(0 ${Math.max(1, Math.round(2 * s))}px ${shadowBlur2}px rgba(0,0,0,0.3))`,
    userSelect: 'none',
  };


  const hideLogoOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).style.display = 'none';
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 50, pointerEvents: 'none' }}>
      {/* Left panel */}
      <div style={{ ...panelBase, left: 0, transform: leftTransform }}>
        <div style={stripeOverlay} />
        <div style={vignetteOverlay} />
        <div style={{ ...accentLineBase, top: '12%', width: '200%', left: 0 }} />
        <div style={{ ...accentLineBase, bottom: '12%', width: '200%', left: 0 }} />
        <div style={{ ...innerContainerBase, left: 0 }}>
          {logoSrc && <img src={logoSrc} alt="" style={logoImgStyle} onError={hideLogoOnError} />}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ ...panelBase, right: 0, transform: rightTransform }}>
        <div style={stripeOverlay} />
        <div style={vignetteOverlay} />
        <div style={{ ...accentLineBase, top: '12%', width: '200%', right: 0 }} />
        <div style={{ ...accentLineBase, bottom: '12%', width: '200%', right: 0 }} />
        <div style={{ ...innerContainerBase, right: 0 }}>
          {logoSrc && <img src={logoSrc} alt="" style={logoImgStyle} onError={hideLogoOnError} />}
        </div>
      </div>
    </div>
  );
}
