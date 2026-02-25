import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

type CurtainPhase = 'idle' | 'coverStart' | 'covering' | 'paused' | 'reveal';

export function FieldTransitionRenderer({
  fieldPort,
  curtainColor,
  meetId,
}: {
  fieldPort: number;
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
          }, 750));
        }, 1600));
      }, 650));
    }, 30));
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!ws || !fieldPort) return;

    const handleMessage = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== `field_mode_change_${fieldPort}`) return;

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
        const src = school
          ? `/api/assets/school-logo?name=${encodeURIComponent(school)}`
          : null;

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
              if (teamData?.primaryColor) {
                primary = teamData.primaryColor;
                secondary = teamData.secondaryColor || teamData.primaryColor;
              }
            }
          } catch {
            /* ignore */
          }
        }

        runCurtain(src, primary, secondary);
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

  const leftCoverTransform = isInitial ? 'translateX(100%)' : 'translateX(0)';
  const rightCoverTransform = isInitial ? 'translateX(100%)' : 'translateX(0)';

  const leftTransform = isReveal
    ? 'translateX(-100%)'
    : leftCoverTransform;
  const rightTransform = isReveal
    ? 'translateX(100%)'
    : rightCoverTransform;

  const panelBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '50%',
    background: gradient,
    zIndex: 50,
    overflow: 'hidden',
    transition: panelTransition,
  };

  const leftPanelStyle: React.CSSProperties = {
    ...panelBase,
    left: 0,
    transform: leftTransform,
  };

  const rightPanelStyle: React.CSSProperties = {
    ...panelBase,
    right: 0,
    transform: rightTransform,
  };

  const showLogo = !isReveal && logoSrc;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 50, pointerEvents: 'none' }}>
      <div style={leftPanelStyle} />
      <div style={rightPanelStyle} />
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
