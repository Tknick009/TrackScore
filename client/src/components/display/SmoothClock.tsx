import { memo, useRef, useEffect } from "react";

// Parse a clock time string like "12.3", "1:05.7", "1:05" into total seconds (float).
export function parseClockTimeToSeconds(timeStr: string): number {
  if (!timeStr) return NaN;
  const cleaned = timeStr.trim();
  if (!cleaned) return NaN;
  
  const parts = cleaned.split(':');
  if (parts.length === 1) {
    return parseFloat(parts[0]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  } else if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return NaN;
}

// Format total seconds back to a display string.
export function formatSecondsToClockDisplay(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0.0';
  
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const wholeSeconds = Math.floor(secs);
  const tenths = Math.floor((secs - wholeSeconds) * 10);
  
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`;
  } else if (mins > 0) {
    return `${mins}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`;
  } else {
    return `${wholeSeconds}.${tenths}`;
  }
}

// Smooth clock display with requestAnimationFrame interpolation.
// Receives server ticks (~10/second via FinishLynx) and interpolates at 60fps between them
// so the tenths digit rolls smoothly. Uses direct DOM mutations (no React re-renders).
export const SmoothClock = memo(function SmoothClock({ 
  serverTime, 
  clockSubscribersRef,
  fontSize,
  color,
  fontFamily,
  className,
  extraStyle,
}: { 
  serverTime: string | null | undefined;
  clockSubscribersRef?: React.RefObject<Set<(time: string, command?: string) => void>>;
  fontSize?: string;
  color?: string;
  fontFamily?: string;
  className?: string;
  extraStyle?: React.CSSProperties;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  
  const lastServerSecondsRef = useRef<number>(0);
  const lastTickTsRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const rafIdRef = useRef<number>(0);
  const lastDisplayedRef = useRef<string>('');
  
  const loopRef = useRef<() => void>();
  loopRef.current = () => {
    if (!isRunningRef.current) return;
    
    const now = performance.now();
    const elapsed = (now - lastTickTsRef.current) / 1000;
    const interpolated = lastServerSecondsRef.current + elapsed;
    const display = formatSecondsToClockDisplay(interpolated);
    
    if (display !== lastDisplayedRef.current) {
      lastDisplayedRef.current = display;
      if (spanRef.current) {
        spanRef.current.textContent = display;
      }
    }
    
    rafIdRef.current = requestAnimationFrame(loopRef.current!);
  };
  
  useEffect(() => {
    const subscribers = clockSubscribersRef?.current;
    if (!subscribers) return;
    
    const handleClockUpdate = (time: string, command?: string) => {
      const seconds = parseClockTimeToSeconds(time);
      
      if (command === 'stop' && !isNaN(seconds) && seconds > 0) {
        isRunningRef.current = false;
        cancelAnimationFrame(rafIdRef.current);
        lastServerSecondsRef.current = seconds;
        const display = formatSecondsToClockDisplay(seconds);
        lastDisplayedRef.current = display;
        if (spanRef.current) {
          spanRef.current.textContent = display;
        }
        return;
      }
      
      if (!isNaN(seconds) && seconds > 0) {
        const now = performance.now();
        if (isRunningRef.current && lastTickTsRef.current > 0) {
          const currentInterpolated = lastServerSecondsRef.current +
            (now - lastTickTsRef.current) / 1000;
          lastServerSecondsRef.current = Math.max(seconds, currentInterpolated);
        } else {
          lastServerSecondsRef.current = seconds;
        }
        lastTickTsRef.current = now;
        
        if (!isRunningRef.current) {
          isRunningRef.current = true;
          rafIdRef.current = requestAnimationFrame(loopRef.current!);
        }
      } else if (time === '' || time === '0' || time === '0.0' || time === '0:00' || time === '0:00.0') {
        isRunningRef.current = false;
        cancelAnimationFrame(rafIdRef.current);
        lastServerSecondsRef.current = 0;
        lastDisplayedRef.current = '0.0';
        if (spanRef.current) {
          spanRef.current.textContent = '0.0';
        }
      } else if (time) {
        isRunningRef.current = false;
        cancelAnimationFrame(rafIdRef.current);
        lastDisplayedRef.current = time;
        if (spanRef.current) {
          spanRef.current.textContent = time;
        }
      }
    };
    
    subscribers.add(handleClockUpdate);
    return () => {
      subscribers.delete(handleClockUpdate);
      isRunningRef.current = false;
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [clockSubscribersRef]);
  
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);
  
  return (
    <span 
      ref={spanRef}
      className={className || "font-stadium-numbers font-[900]"}
      style={{ 
        fontSize: fontSize || '48px',
        color: color || 'inherit',
        fontFamily: fontFamily || 'inherit',
        ...extraStyle,
      }}
    >
      {serverTime || "0.0"}
    </span>
  );
});
