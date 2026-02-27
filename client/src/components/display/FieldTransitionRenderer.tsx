import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

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
  fieldPort,
  curtainColor,
  meetId,
}: {
  fieldPort?: number;
  curtainColor: string;
  meetId?: string;
}) {
  const ws = useWebSocket();
  const [phase, setPhase] = useState<CurtainPhase>('idle');
  const [primaryColor, setPrimaryColor] = useState<string>(curtainColor);
  const [secondaryColor, setSecondaryColor] = useState<string>(curtainColor);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  const [athleteSchool, setAthleteSchool] = useState<string>('');
  const prevCalledBibRef = useRef<string>('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const versionRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const runCurtain = useCallback((
    newLogoSrc: string | null,
    primary: string,
    secondary: string,
    name: string,
    school: string,
  ) => {
    clearTimers();
    const version = ++versionRef.current;
    setLogoSrc(newLogoSrc);
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setAthleteName(name);
    setAthleteSchool(school);
    setPhase('coverStart');

    timersRef.current.push(setTimeout(() => {
      if (versionRef.current !== version) return;
      setPhase('covering');

      timersRef.current.push(setTimeout(() => {
        if (versionRef.current !== version) return;
        setPhase('paused');

        timersRef.current.push(setTimeout(() => {
          if (versionRef.current !== version) return;
          setPhase('reveal');

          timersRef.current.push(setTimeout(() => {
            if (versionRef.current !== version) return;
            setPhase('idle');
          }, 700));
        }, 1400));
      }, 600));
    }, 30));
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);

        const portMatch = fieldPort && msg.type === `field_mode_change_${fieldPort}`;
        const globalFallback = !fieldPort && msg.type === 'field_mode_change';
        if (!portMatch && !globalFallback) return;

        const results: any[] = msg.data?.results || [];
        const calledUp = results.find((r: any) => !r.mark || String(r.mark).trim() === '');
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

        let logoUrl: string | null = null;
        let primary = curtainColor;
        let secondary = curtainColor;

        if (school) {
          try {
            const meetParam = meetId
              ? `&meetId=${encodeURIComponent(meetId)}`
              : '';
            const res = await fetch(
              `/api/teams/by-affiliation?name=${encodeURIComponent(school)}${meetParam}`
            );
            if (res.ok) {
              const teamData = await res.json();
              if (teamData?.logoUrl) logoUrl = teamData.logoUrl;
              if (teamData?.primaryColor) {
                primary = teamData.primaryColor;
                secondary = teamData.secondaryColor || teamData.primaryColor;
              }
            }
          } catch {
            /* ignore */
          }
        }

        runCurtain(logoUrl, primary, secondary, name, school);
      } catch {
        /* ignore parse errors */
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, fieldPort, curtainColor, meetId, runCurtain]);

  if (phase === 'idle') return null;

  const isCovering = phase === 'covering';
  const isPaused = phase === 'paused';
  const isReveal = phase === 'reveal';
  const isInitial = phase === 'coverStart';

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
    transition: panelTransition,
  };

  // Subtle diagonal stripe texture
  const stripeOverlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 8px,
      rgba(255,255,255,0.03) 8px,
      rgba(255,255,255,0.03) 16px
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

  // Thin decorative accent line
  const accentLineBase: React.CSSProperties = {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: '2px',
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

  const logoImgStyle: React.CSSProperties = {
    maxHeight: '48%',
    maxWidth: '48%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.55)) drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
    userSelect: 'none',
  };

  const nameStyle: React.CSSProperties = {
    color: 'white',
    fontFamily: "'Oswald', 'Impact', sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '3px',
    textShadow: '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
    marginTop: logoSrc ? '16px' : '0',
    opacity: isPaused ? 1 : 0,
    transform: isPaused ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s',
  };

  const schoolStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: "'Oswald', 'Impact', sans-serif",
    fontSize: '16px',
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: '5px',
    marginTop: '4px',
    opacity: isPaused ? 1 : 0,
    transform: isPaused ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s',
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
          {athleteName && <div style={nameStyle}>{athleteName}</div>}
          {athleteSchool && <div style={schoolStyle}>{athleteSchool}</div>}
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
          {athleteName && <div style={nameStyle}>{athleteName}</div>}
          {athleteSchool && <div style={schoolStyle}>{athleteSchool}</div>}
        </div>
      </div>
    </div>
  );
}
