import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

type CurtainPhase = 'idle' | 'coverStart' | 'covering' | 'paused' | 'reveal';

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
    secondary: string
  ) => {
    clearTimers();
    const version = ++versionRef.current;
    setLogoSrc(newLogoSrc);
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setPhase('coverStart');

    // 30ms: ensure browser paints the initial (off-screen) position before animating
    timersRef.current.push(setTimeout(() => {
      if (versionRef.current !== version) return;
      setPhase('covering');

      // 650ms cover animation finishes → pause with logo visible
      timersRef.current.push(setTimeout(() => {
        if (versionRef.current !== version) return;
        setPhase('paused');

        // 1600ms pause → open
        timersRef.current.push(setTimeout(() => {
          if (versionRef.current !== version) return;
          setPhase('reveal');

          // 750ms reveal finishes → idle
          timersRef.current.push(setTimeout(() => {
            if (versionRef.current !== version) return;
            setPhase('idle');
          }, 750));
        }, 1600));
      }, 650));
    }, 30));
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);

        // Accept port-specific channel (when fieldPort is configured) OR global channel
        const portMatch = fieldPort && msg.type === `field_mode_change_${fieldPort}`;
        const globalMatch = msg.type === 'field_mode_change';
        if (!portMatch && !globalMatch) return;

        // If both port-specific and global fire, prefer port-specific
        // (global fires first on the same tick, port-specific fires right after)
        // No issue in practice since we debounce by calledId

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
              // Logo URL comes directly from the endpoint now
              if (teamData?.logoUrl) logoUrl = teamData.logoUrl;
              // Team brand colors — fall back to curtainColor if not set
              if (teamData?.primaryColor) {
                primary = teamData.primaryColor;
                secondary = teamData.secondaryColor || teamData.primaryColor;
              }
            }
          } catch {
            /* ignore */
          }
        }

        runCurtain(logoUrl, primary, secondary);
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

  const gradient =
    primaryColor !== secondaryColor
      ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      : primaryColor;

  const panelTransition = isReveal
    ? 'transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)'
    : isCovering
    ? 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)'
    : 'none';

  // Panels start off-screen right (coverStart), sweep left to cover (covering),
  // hold (paused), then split outward (reveal)
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

  const panelBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '50%',
    background: gradient,
    zIndex: 50,
    transition: panelTransition,
  };

  // Only show logo when panels are fully closed
  const showLogo = isPaused && !!logoSrc;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 50, pointerEvents: 'none' }}>
      <div style={{ ...panelBase, left: 0, transform: leftTransform }} />
      <div style={{ ...panelBase, right: 0, transform: rightTransform }} />
      {showLogo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 51,
            pointerEvents: 'none',
          }}
        >
          <img
            src={logoSrc}
            alt=""
            style={{
              maxHeight: '65%',
              maxWidth: '65%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}
