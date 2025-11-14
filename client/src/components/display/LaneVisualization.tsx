import { cn } from "@/lib/utils";

interface LaneVisualizationProps {
  lanes: Array<{
    laneNumber: number;
    athlete?: {
      name: string;
      bibNumber?: string | null;
      country?: string | null;
    };
    position?: number;
    place?: number | null;
    time?: string | null;
    reaction?: number | null;
  }>;
  totalLanes?: number;
  showProgress?: boolean;
  showTimes?: boolean;
  size?: 'compact' | 'standard' | 'expanded';
  className?: string;
}

export function LaneVisualization({
  lanes,
  totalLanes = 8,
  showProgress = false,
  showTimes = false,
  size = 'standard',
  className
}: LaneVisualizationProps) {
  const sizeConfig = {
    compact: {
      height: 'h-10',
      laneNumberWidth: 'w-8',
      laneNumberText: 'text-[16px]',
      athleteNameText: 'text-[14px]',
      countryText: 'text-[12px]',
      timeWidth: 'w-20',
      timeText: 'text-[16px]',
      reactionText: 'text-[10px]',
      markerSize: 'h-3 w-3',
    },
    standard: {
      height: 'h-14',
      laneNumberWidth: 'w-10',
      laneNumberText: 'text-[20px]',
      athleteNameText: 'text-[18px]',
      countryText: 'text-[14px]',
      timeWidth: 'w-24',
      timeText: 'text-[20px]',
      reactionText: 'text-[12px]',
      markerSize: 'h-4 w-4',
    },
    expanded: {
      height: 'h-20',
      laneNumberWidth: 'w-12',
      laneNumberText: 'text-[24px]',
      athleteNameText: 'text-[22px]',
      countryText: 'text-[16px]',
      timeWidth: 'w-32',
      timeText: 'text-[24px]',
      reactionText: 'text-[14px]',
      markerSize: 'h-5 w-5',
    },
  };

  const config = sizeConfig[size];

  const allLanes = Array.from({ length: totalLanes }, (_, i) => {
    const laneNum = i + 1;
    return lanes.find(l => l.laneNumber === laneNum) || { laneNumber: laneNum };
  });

  const getPodiumColor = (place: number | null | undefined): string | undefined => {
    if (!place) return undefined;
    switch (place) {
      case 1:
        return '#fbbf24';
      case 2:
        return '#d1d5db';
      case 3:
        return '#fb923c';
      default:
        return undefined;
    }
  };

  return (
    <div className={cn('flex flex-col gap-1', className)} data-testid="lane-visualization">
      {allLanes.map((lane) => {
        const podiumColor = getPodiumColor(lane.place);
        const hasAthlete = !!lane.athlete;

        return (
          <div
            key={lane.laneNumber}
            className={cn(
              'flex items-center gap-2',
              config.height
            )}
            data-testid={`lane-${lane.laneNumber}`}
          >
            {/* Lane number */}
            <div
              className={cn(
                'flex items-center justify-center font-stadium font-[700] bg-[hsl(var(--display-accent))] text-[hsl(var(--display-bg))] rounded-full shrink-0',
                config.laneNumberWidth,
                config.height,
                config.laneNumberText
              )}
              data-testid={`lane-${lane.laneNumber}-number`}
            >
              {lane.laneNumber}
            </div>

            {/* Lane track */}
            <div
              className={cn(
                'flex-1 relative rounded overflow-hidden',
                config.height,
                hasAthlete ? 'bg-[hsl(var(--display-accent))]/20' : 'bg-[hsl(var(--display-border))]/40'
              )}
              data-testid={`lane-${lane.laneNumber}-track`}
            >
              {/* Athlete info */}
              {lane.athlete && (
                <div
                  className={cn(
                    'absolute left-2 top-1/2 -translate-y-1/2 z-10',
                    'flex items-center gap-2 flex-wrap'
                  )}
                >
                  <span
                    className={cn(
                      'font-stadium font-[600] text-[hsl(var(--display-fg))] leading-none',
                      config.athleteNameText
                    )}
                    data-testid={`lane-${lane.laneNumber}-athlete-name`}
                  >
                    {lane.athlete.name}
                  </span>
                  {lane.athlete.country && (
                    <span
                      className={cn(
                        'font-stadium font-[600] text-[hsl(var(--display-muted))] uppercase leading-none',
                        config.countryText
                      )}
                      data-testid={`lane-${lane.laneNumber}-country`}
                    >
                      ({lane.athlete.country})
                    </span>
                  )}
                  {lane.athlete.bibNumber && (
                    <span
                      className={cn(
                        'font-stadium-numbers font-[600] text-[hsl(var(--display-muted))] leading-none',
                        config.countryText
                      )}
                      data-testid={`lane-${lane.laneNumber}-bib`}
                    >
                      #{lane.athlete.bibNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Position marker (for live races) */}
              {showProgress && lane.position !== undefined && lane.position !== null && (
                <div
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow-lg transition-all duration-300 z-20',
                    'bg-blue-500',
                    config.markerSize
                  )}
                  style={{ left: `${Math.max(0, Math.min(100, lane.position))}%` }}
                  data-testid={`lane-${lane.laneNumber}-marker`}
                />
              )}
            </div>

            {/* Time/Place */}
            {showTimes && (
              <div
                className={cn(
                  'shrink-0 text-right',
                  config.timeWidth
                )}
                data-testid={`lane-${lane.laneNumber}-result`}
              >
                {lane.time && (
                  <div
                    className={cn(
                      'font-stadium-numbers font-[900] tabular-nums leading-none',
                      config.timeText
                    )}
                    style={podiumColor ? { color: podiumColor } : undefined}
                    data-testid={`lane-${lane.laneNumber}-time`}
                  >
                    {lane.time}
                  </div>
                )}
                {lane.reaction !== null && lane.reaction !== undefined && size === 'expanded' && (
                  <div
                    className={cn(
                      'font-stadium-numbers text-[hsl(var(--display-muted))] tabular-nums leading-none mt-1',
                      config.reactionText
                    )}
                    data-testid={`lane-${lane.laneNumber}-reaction`}
                  >
                    RT: {lane.reaction.toFixed(3)}
                  </div>
                )}
                {lane.place && (
                  <div
                    className={cn(
                      'font-stadium font-[600] leading-none',
                      size === 'compact' ? 'text-[10px] mt-0.5' : size === 'standard' ? 'text-[12px] mt-1' : 'text-[14px] mt-1'
                    )}
                    style={podiumColor ? { color: podiumColor } : { color: 'hsl(var(--display-muted))' }}
                    data-testid={`lane-${lane.laneNumber}-place`}
                  >
                    {lane.place === 1 ? '1ST' : lane.place === 2 ? '2ND' : lane.place === 3 ? '3RD' : `${lane.place}TH`}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
