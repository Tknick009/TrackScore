import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

type CurtainPhase = 'idle' | 'curtain' | 'split' | 'reveal';

export function FieldTransitionRenderer({
  fieldPort,
  curtainColor,
}: {
  fieldPort: number;
  curtainColor: string;
}) {
  const { ws } = useWebSocket();
  const [phase, setPhase] = useState<CurtainPhase>('idle');
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const prevCalledBibRef = useRef<string>('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const runCurtain = useCallback((newLogoSrc: string | null) => {
    clearTimers();
    setLogoSrc(newLogoSrc);
    setPhase('curtain');
    timersRef.current.push(setTimeout(() => {
      setPhase('split');
      timersRef.current.push(setTimeout(() => {
        setPhase('reveal');
        timersRef.current.push(setTimeout(() => {
          setPhase('idle');
        }, 500));
      }, 80));
    }, 550));
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!ws || !fieldPort) return;
    const handleMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== `field_mode_change_${fieldPort}`) return;
        const results: any[] = msg.data?.results || [];
        const calledUp = results.find((r: any) => !r.mark || String(r.mark).trim() === '');
        const calledBib = calledUp?.bib ? String(calledUp.bib) : '';
        if (!calledBib || calledBib === prevCalledBibRef.current) return;
        prevCalledBibRef.current = calledBib;
        const school = calledUp?.affiliation || calledUp?.team || '';
        const src = school ? `/api/assets/school-logo?name=${encodeURIComponent(school)}` : null;
        runCurtain(src);
      } catch { /* ignore parse errors */ }
    };
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, fieldPort, runCurtain]);

  const panelBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '50%',
    backgroundColor: curtainColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
    transition: 'transform 0.5s ease-in-out',
  };

  const leftPanelStyle: React.CSSProperties = {
    ...panelBase,
    left: 0,
    transform: phase === 'reveal' || phase === 'idle' ? 'translateX(-100%)' : 'translateX(0)',
  };

  const rightPanelStyle: React.CSSProperties = {
    ...panelBase,
    right: 0,
    transform: phase === 'reveal' || phase === 'idle' ? 'translateX(100%)' : 'translateX(0)',
  };

  const entryCurtainStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: curtainColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
    transform: phase === 'curtain' ? 'translateX(0)' : 'translateX(100%)',
    transition: phase === 'curtain' ? 'transform 0.55s ease-out' : 'none',
  };

  const logoStyle: React.CSSProperties = {
    maxHeight: '70%',
    maxWidth: '70%',
    objectFit: 'contain',
  };

  if (phase === 'idle') return null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 10 }}>
      <div style={entryCurtainStyle}>
        {logoSrc && <img src={logoSrc} style={logoStyle} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
      </div>
      {(phase === 'split' || phase === 'reveal') && (
        <>
          <div style={leftPanelStyle}>
            {logoSrc && <img src={logoSrc} style={logoStyle} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          </div>
          <div style={rightPanelStyle}>
            {logoSrc && <img src={logoSrc} style={logoStyle} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          </div>
        </>
      )}
    </div>
  );
}
