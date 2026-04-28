import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LiveTimerProps {
  mode: 'countdown' | 'stopwatch' | 'static';
  time: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  running?: boolean;
  showMillis?: boolean;
  className?: string;
}

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function formatTime(ms: number, showMillis: boolean): string {
  const totalSeconds = Math.floor(ms / 1000);
  const millis = Math.floor((ms % 1000) / 10);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  } else if (minutes > 0) {
    return showMillis
      ? `${minutes}:${pad(seconds)}.${pad(millis)}`
      : `${minutes}:${pad(seconds)}`;
  } else {
    return showMillis
      ? `${seconds}.${pad(millis)}`
      : `${seconds}`;
  }
}

export function LiveTimer({
  mode,
  time,
  label,
  size = 'medium',
  running = false,
  showMillis = false,
  className
}: LiveTimerProps) {
  const [currentTime, setCurrentTime] = useState(time);

  useEffect(() => {
    setCurrentTime(time);
  }, [time]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      if (mode === 'stopwatch') {
        setCurrentTime(t => t + 10);
      } else if (mode === 'countdown') {
        setCurrentTime(t => Math.max(0, t - 10));
      }
    }, 10);

    return () => clearInterval(interval);
  }, [running, mode]);

  const formattedTime = formatTime(currentTime, showMillis);
  const isCountdownWarning = mode === 'countdown' && currentTime < 30000 && currentTime > 0;

  const sizeConfig = {
    small: {
      labelSize: 'text-sm',
      timerSize: 'text-5xl',
      dotSize: 'h-2 w-2',
      labelMargin: 'mb-1',
      dotMargin: 'mt-1',
    },
    medium: {
      labelSize: 'text-xl',
      timerSize: 'text-8xl',
      dotSize: 'h-3 w-3',
      labelMargin: 'mb-2',
      dotMargin: 'mt-2',
    },
    large: {
      labelSize: 'text-3xl',
      timerSize: 'text-9xl',
      dotSize: 'h-4 w-4',
      labelMargin: 'mb-3',
      dotMargin: 'mt-3',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center justify-center', className)} data-testid="live-timer-container">
      {label && (
        <div
          className={cn(
            'text-[hsl(var(--display-muted))] font-stadium uppercase tracking-wide',
            config.labelSize,
            config.labelMargin
          )}
          data-testid="live-timer-label"
        >
          {label}
        </div>
      )}

      <div
        className={cn(
          'font-stadium-numbers font-[900] tabular-nums leading-none',
          config.timerSize,
          isCountdownWarning
            ? 'text-red-500 animate-pulse'
            : 'text-[hsl(var(--display-fg))]'
        )}
        data-testid="live-timer-display"
      >
        {formattedTime}
      </div>

      {running && mode === 'stopwatch' && (
        <div
          className={cn(
            'rounded-full bg-red-500 animate-pulse',
            config.dotSize,
            config.dotMargin
          )}
          data-testid="live-timer-running-indicator"
        />
      )}
    </div>
  );
}
