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
  // All field port data — so the curtain triggers on ANY field port, not just the device's primary port
  liveEventDataByPort?: Record<number, { entries?: any[]; results?: any[] }> | null;
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
  // Track all bibs/names we've seen so far to detect newly appeared athletes
  // (needed for vertical events where ALL entries have marks)
  const seenBibsRef = useRef<Set<string>>(new Set());
  // Skip Strategy 2 on the very first data load — seenBibsRef is empty so every
  // entry looks "new", which would cause a spurious curtain animation.
  const initialLoadRef = useRef(true);
  // Cache fetched team colors/logos by school name so subsequent curtain animations
  // for the same school start with the correct color instead of the default blue.
  const teamCacheRef = useRef<Map<string, { primary: string; secondary: string; logo: string | null }>>(new Map());

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
        }, 1000));  // 1000ms pause — snappy feel
      }, 600));
    }, 30));
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Merge all data sources: primary liveData + all port-specific data
  // This ensures the curtain triggers for ANY field port, not just the device's primary port
  const mergedLiveData = useMemo(() => {
    const allSources: Array<{ entries?: any[]; results?: any[] }> = [];
    if (liveData) allSources.push(liveData);
    if (liveEventDataByPort) {
      for (const portData of Object.values(liveEventDataByPort)) {
        if (portData) allSources.push(portData);
      }
    }
    return allSources;
  }, [liveData, liveEventDataByPort]);

  // React to live data changes — detect when a new athlete is "called up".
  // For horizontal events (long jump, shot put): the called-up athlete has no mark yet.
  // For vertical events (high jump, pole vault): ALL entries have marks (the bar height),
  // so we also detect newly appeared bibs/names that weren't in the previous data set.
  useEffect(() => {
    if (mergedLiveData.length === 0) return;

    // Collect all current bibs/names from every data source
    const currentBibs = new Set<string>();
    let calledUp: any = null;

    for (const source of mergedLiveData) {
      const entries: any[] = (source as any).entries || (source as any).results || [];

      for (const r of entries) {
        const id = r.bib ? String(r.bib) : r.name ? String(r.name) : '';
        if (id) currentBibs.add(id);
      }

      // Strategy 1: Horizontal events — find entry with no mark (athlete is "up")
      if (!calledUp) {
        const found = entries.find((r: any) => !r.mark || String(r.mark).trim() === '');
        if (found) calledUp = found;
      }

      // Strategy 2: Vertical events — find a newly appeared bib/name
      // (FieldLynx adds the "up" athlete to the list when their turn starts)
      // Skip on initial load: seenBibsRef is empty so ALL entries look new.
      if (!calledUp && !initialLoadRef.current) {
        for (const r of entries) {
          const id = r.bib ? String(r.bib) : r.name ? String(r.name) : '';
          if (id && !seenBibsRef.current.has(id)) {
            calledUp = r;
            break;
          }
        }
      }
    }

    // Update the seen set for next comparison
    seenBibsRef.current = currentBibs;
    // After first pass, allow Strategy 2 to detect genuinely new bibs
    initialLoadRef.current = false;

    if (!calledUp) return;

    const calledId = calledUp.bib
      ? String(calledUp.bib)
      : calledUp.name
      ? String(calledUp.name)
      : '';
    if (!calledId || calledId === prevCalledBibRef.current) return;
    prevCalledBibRef.current = calledId;

    const school = calledUp.affiliation || calledUp.team || '';

    // Use cached team colors if available — eliminates the blue flash on repeat visits.
    // Falls back to default curtainColor only on first appearance of a school.
    const cached = school ? teamCacheRef.current.get(school) : undefined;
    const startPrimary = cached?.primary || curtainColor;
    const startSecondary = cached?.secondary || curtainColor;
    const startLogo = cached?.logo || null;
    runCurtain(startLogo, startPrimary, startSecondary);

    // Capture current version BEFORE async fetch — used to discard stale responses
    // if a new athlete triggers a curtain before this fetch completes.
    const fetchVersion = versionRef.current;

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
            // Discard stale response if a newer curtain has started
            if (versionRef.current !== fetchVersion) return;
            // Only update if curtain is still active (not yet revealing/idle)
            const currentPhase = phaseRef.current;
            if (currentPhase === 'coverStart' || currentPhase === 'covering' || currentPhase === 'paused') {
                const fetchedPrimary = teamData?.primaryColor || '';
                const fetchedSecondary = teamData?.secondaryColor || fetchedPrimary;
                const fetchedLogo = teamData?.logoUrl || null;
                // Cache for future curtain animations
                if (fetchedPrimary && school) {
                  teamCacheRef.current.set(school, { primary: fetchedPrimary, secondary: fetchedSecondary, logo: fetchedLogo });
                }
                if (fetchedPrimary) {
                  setPrimaryColor(fetchedPrimary);
                  setSecondaryColor(fetchedSecondary);
                }
                if (fetchedLogo) {
                  setLogoSrc(fetchedLogo);
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
