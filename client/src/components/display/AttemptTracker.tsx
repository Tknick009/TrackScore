import { cn } from "@/lib/utils";

interface AttemptTrackerProps {
  attempts: Array<{
    result: 'made' | 'fault' | 'pass' | null;
    mark?: string | null;
  }>;
  maxAttempts?: number;
  size?: 'small' | 'medium' | 'large';
  orientation?: 'horizontal' | 'vertical';
  showMarks?: boolean;
  className?: string;
}

export function AttemptTracker({ 
  attempts, 
  maxAttempts = 6, 
  size = 'medium', 
  orientation = 'horizontal',
  showMarks = false,
  className 
}: AttemptTrackerProps) {
  const sizeConfig = {
    small: {
      markerSize: 'h-6 w-6',
      fontSize: 'text-sm',
      markFontSize: 'text-xs',
      gap: 'gap-1.5',
      markMarginTop: 'mt-0.5'
    },
    medium: {
      markerSize: 'h-10 w-10',
      fontSize: 'text-lg',
      markFontSize: 'text-sm',
      gap: 'gap-2',
      markMarginTop: 'mt-1'
    },
    large: {
      markerSize: 'h-14 w-14',
      fontSize: 'text-2xl',
      markFontSize: 'text-base',
      gap: 'gap-3',
      markMarginTop: 'mt-1.5'
    }
  };

  const config = sizeConfig[size];

  return (
    <div 
      className={cn(
        'flex',
        config.gap,
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
      data-testid="attempt-tracker"
    >
      {Array.from({ length: maxAttempts }).map((_, index) => {
        const attempt = attempts[index];
        
        return (
          <div 
            key={index}
            className="flex flex-col items-center"
            data-testid={`attempt-wrapper-${index + 1}`}
          >
            {/* Attempt Marker Circle */}
            <div 
              className={cn(
                'flex items-center justify-center rounded-full border-2 font-stadium-numbers font-[900]',
                config.markerSize,
                config.fontSize,
                // Made - Green
                attempt && attempt.result === 'made' && 'bg-green-600 border-green-700 text-white',
                // Fault - Red
                attempt && attempt.result === 'fault' && 'bg-red-600 border-red-700 text-white',
                // Pass - Yellow/Amber
                attempt && attempt.result === 'pass' && 'bg-yellow-500 border-yellow-600 text-[hsl(var(--display-bg))]',
                // Not taken yet - Muted gray
                (!attempt || attempt.result === null) && 'bg-[hsl(var(--display-bg))] border-[hsl(var(--display-muted))]/40 text-[hsl(var(--display-muted))]'
              )}
              data-testid={`attempt-marker-${index + 1}`}
            >
              {attempt && attempt.result === 'made' && '✓'}
              {attempt && attempt.result === 'fault' && 'X'}
              {attempt && attempt.result === 'pass' && 'P'}
              {(!attempt || attempt.result === null) && '—'}
            </div>
            
            {/* Optional mark display below */}
            {showMarks && attempt?.mark && (
              <div 
                className={cn(
                  'font-stadium-numbers font-[700] text-[hsl(var(--display-fg))]',
                  config.markFontSize,
                  config.markMarginTop
                )}
                data-testid={`attempt-mark-${index + 1}`}
              >
                {attempt.mark}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
