import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { SelectLayoutZone, DataBinding, BoardConfig } from "@shared/schema";
import { AthleteCard } from "./AthleteCard";
import { LiveTimer } from "./LiveTimer";
import { LaneVisualization } from "./LaneVisualization";
import { AttemptTracker } from "./AttemptTracker";

interface CompositeDisplayProps {
  layoutId: number;
  className?: string;
}

interface LayoutWithZones {
  layout: {
    id: number;
    name: string;
    aspectRatio: string | null;
    backgroundStyle: string | null;
  };
  zones: SelectLayoutZone[];
}

// Hook to fetch zone-specific data based on data binding
function useZoneData(dataBinding: DataBinding, boardType: string) {
  const bindingType = dataBinding.type;

  // Fetch specific event data
  const { data: eventData } = useQuery({
    queryKey: bindingType === 'event' ? ['/api/events', dataBinding.eventId] : ['disabled'],
    enabled: bindingType === 'event',
  });

  // Fetch current event
  const { data: currentEvent } = useQuery({
    queryKey: bindingType === 'current-event' ? ['/api/events/current'] : ['disabled'],
    enabled: bindingType === 'current-event',
  });

  // Determine base data
  let baseData = null;
  if (bindingType === 'event') baseData = eventData || null;
  else if (bindingType === 'current-event') baseData = currentEvent || null;
  else if (bindingType === 'static') baseData = { content: dataBinding.content };
  else if (bindingType === 'standings') baseData = null; // TODO: Implement standings query

  // Extract athlete IDs for photo fetching
  const athleteIds = React.useMemo(() => {
    if (!baseData) return [];
    if (typeof baseData !== 'object') return [];
    
    const data = baseData as any;
    
    if (boardType === 'athlete-card-grid') {
      return data.athletes?.map((a: any) => a.id).filter(Boolean) || [];
    }
    
    if (boardType === 'athlete-card-single') {
      return data.athlete?.id ? [data.athlete.id] : [];
    }
    
    return [];
  }, [
    JSON.stringify((baseData as any)?.athletes?.map((a: any) => a.id)),
    boardType === 'athlete-card-single' ? (baseData as any)?.athlete?.id : null,
    boardType
  ]);

  // Fetch athlete photos in bulk
  const { data: photosData } = useQuery({
    queryKey: ['/api/athletes/photos/bulk', athleteIds.slice().sort((a: number, b: number) => a - b).join(',')],
    queryFn: async () => {
      if (!athleteIds.length) return [];
      const response = await fetch(`/api/athletes/photos/bulk?ids=${athleteIds.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    },
    enabled: athleteIds.length > 0,
  });

  // Extract team IDs from athlete data
  const teamIds = React.useMemo(() => {
    if (!athleteIds.length) return [];
    if (!baseData) return [];
    if (typeof baseData !== 'object') return [];
    
    const data = baseData as any;
    const athletes = boardType === 'athlete-card-grid' 
      ? data.athletes 
      : (data.athlete ? [data.athlete] : []);
    
    const teamIdSet = new Set<number>(
      athletes
        ?.map((a: any) => a.teamId)
        .filter(Boolean) || []
    );
    return Array.from(teamIdSet);
  }, [
    JSON.stringify((baseData as any)?.athletes?.map((a: any) => a.teamId)),
    boardType === 'athlete-card-single' ? (baseData as any)?.athlete?.teamId : null,
    boardType,
    athleteIds.length
  ]);

  // Fetch team logos in bulk
  const { data: logosData } = useQuery({
    queryKey: ['/api/teams/logos/bulk', [...teamIds].sort((a: number, b: number) => a - b).join(',')],
    queryFn: async () => {
      if (!teamIds.length) return [];
      const response = await fetch(`/api/teams/logos/bulk?ids=${teamIds.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch logos');
      return response.json();
    },
    enabled: teamIds.length > 0,
  });

  // Merge photos and logos into athlete data
  const dataWithPhotosAndLogos = React.useMemo(() => {
    if (!baseData || typeof baseData !== 'object') return baseData;

    // Create lookup maps
    const photoMap = new Map(
      photosData ? (photosData as any[]).map((p: any) => [p.athleteId, p.url]) : []
    );
    const logoMap = new Map(
      logosData ? (logosData as any[]).map((l: any) => [l.teamId, l.url]) : []
    );

    // For athlete-card-grid: map photos and logos to all athletes
    if (boardType === 'athlete-card-grid' && 'athletes' in baseData && Array.isArray(baseData.athletes)) {
      return {
        ...baseData,
        athletes: baseData.athletes.map((athlete: any) => ({
          ...athlete,
          photoUrl: photoMap.get(athlete.id) || null,
          teamLogoUrl: athlete.teamId ? logoMap.get(athlete.teamId) || null : null,
        })),
      };
    }

    // For athlete-card-single: add photo and logo to single athlete
    if (boardType === 'athlete-card-single' && 'athlete' in baseData) {
      const athlete = (baseData as any).athlete;
      if (athlete) {
        return {
          ...baseData,
          athlete: {
            ...athlete,
            photoUrl: photoMap.get(athlete.id) || null,
            teamLogoUrl: athlete.teamId ? logoMap.get(athlete.teamId) || null : null,
          },
        };
      }
    }

    return baseData;
  }, [baseData, photosData, logosData, athleteIds, teamIds, boardType]);

  return dataWithPhotosAndLogos;
}

// Render board content based on board type and configuration
function renderBoardContent(zone: SelectLayoutZone, data: any): React.ReactNode {
  const { boardConfig } = zone;

  switch (zone.boardType) {
    case 'athlete-card-grid': {
      const athletes = data?.athletes || [];
      const config = boardConfig as { boardType: 'athlete-card-grid'; cardSize: 'small' | 'medium' | 'large'; columns: number };

      return (
        <div 
          className={cn('grid gap-2 p-2 h-full w-full')}
          style={{ gridTemplateColumns: `repeat(${config.columns}, 1fr)` }}
          data-testid="athlete-card-grid"
        >
          {athletes.length > 0 ? (
            athletes.map((athlete: any, idx: number) => (
              <AthleteCard
                key={athlete.id || idx}
                athlete={{
                  id: athlete.id || `athlete-${idx}`,
                  name: athlete.name || 'Unknown Athlete',
                  bibNumber: athlete.bibNumber,
                  teamName: athlete.teamName,
                  teamLogoUrl: athlete.teamLogoUrl,
                  country: athlete.country,
                }}
                result={athlete.result}
                photoUrl={athlete.photoUrl}
                size={config.cardSize}
              />
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center text-[hsl(var(--display-muted))] font-stadium">
              No athletes available
            </div>
          )}
        </div>
      );
    }

    case 'athlete-card-single': {
      const athlete = data?.athlete;
      const config = boardConfig as { boardType: 'athlete-card-single'; cardSize: 'small' | 'medium' | 'large' };

      return athlete ? (
        <div className="flex items-center justify-center h-full p-4" data-testid="athlete-card-single">
          <AthleteCard
            athlete={{
              id: athlete.id || 'featured',
              name: athlete.name || 'Featured Athlete',
              bibNumber: athlete.bibNumber,
              teamName: athlete.teamName,
              teamLogoUrl: athlete.teamLogoUrl,
              country: athlete.country,
            }}
            result={athlete.result}
            photoUrl={athlete.photoUrl}
            size={config.cardSize}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-[hsl(var(--display-muted))] font-stadium">
          No athlete selected
        </div>
      );
    }

    case 'live-timer': {
      const config = boardConfig as { boardType: 'live-timer'; mode: 'countdown' | 'stopwatch' | 'static'; size: 'small' | 'medium' | 'large'; showMillis: boolean };

      return (
        <div className="flex items-center justify-center h-full" data-testid="live-timer">
          <LiveTimer
            mode={config.mode}
            time={data?.time || 0}
            running={data?.running || false}
            size={config.size}
            showMillis={config.showMillis}
            label={data?.label}
          />
        </div>
      );
    }

    case 'lane-visualization': {
      const lanes = data?.lanes || [];
      const config = boardConfig as { boardType: 'lane-visualization'; totalLanes: number; showProgress: boolean; showTimes: boolean; size: 'compact' | 'standard' | 'expanded' };

      return lanes.length > 0 ? (
        <div className="p-4 h-full" data-testid="lane-visualization">
          <LaneVisualization
            lanes={lanes}
            totalLanes={config.totalLanes}
            showProgress={config.showProgress}
            showTimes={config.showTimes}
            size={config.size}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-[hsl(var(--display-muted))] font-stadium">
          No lane data available
        </div>
      );
    }

    case 'attempt-tracker': {
      const attempts = data?.attempts || [];
      const config = boardConfig as { boardType: 'attempt-tracker'; size: 'small' | 'medium' | 'large'; showMarks: boolean };

      return attempts.length > 0 ? (
        <div className="flex items-center justify-center h-full p-4" data-testid="attempt-tracker">
          <AttemptTracker
            attempts={attempts}
            maxAttempts={6}
            size={config.size}
            showMarks={config.showMarks}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-[hsl(var(--display-muted))] font-stadium">
          No attempt data available
        </div>
      );
    }

    case 'event-info': {
      const config = boardConfig as { boardType: 'event-info'; fontSize: string };
      const fontSizeClass =
        config.fontSize === 'small' ? 'text-2xl' :
        config.fontSize === 'large' ? 'text-6xl' :
        'text-4xl';

      return (
        <div 
          className={cn(
            'flex flex-col items-center justify-center h-full p-4 text-center',
            fontSizeClass
          )}
          data-testid="event-info"
        >
          <div className="font-stadium text-[hsl(var(--display-fg))]">
            {data?.eventName || 'Event Name'}
          </div>
          {data?.description && (
            <div className="text-base text-muted-foreground mt-2">
              {data.description}
            </div>
          )}
        </div>
      );
    }

    case 'standings-table': {
      const config = boardConfig as { boardType: 'standings-table'; maxRows: number; showPhotos: boolean };
      const standings = data?.standings || [];

      if (!data?.standings || data.standings.length === 0) {
        return (
          <div className="flex items-center justify-center h-full text-[hsl(var(--display-muted))] font-stadium">
            No standings data available
          </div>
        );
      }

      return (
        <div className="p-4 h-full overflow-auto" data-testid="standings-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--display-muted))]">
                <th className="text-left p-2 font-stadium text-[hsl(var(--display-fg))]">Place</th>
                <th className="text-left p-2 font-stadium text-[hsl(var(--display-fg))]">Athlete</th>
                <th className="text-right p-2 font-stadium text-[hsl(var(--display-fg))]">Result</th>
              </tr>
            </thead>
            <tbody>
              {standings.slice(0, config.maxRows).map((entry: any, i: number) => (
                <tr key={i} className="border-b border-[hsl(var(--display-muted))/30]">
                  <td className="p-2 font-stadium text-[hsl(var(--display-fg))]">{entry.place}</td>
                  <td className="p-2 text-[hsl(var(--display-fg))]">{entry.name}</td>
                  <td className="p-2 text-right font-stadium text-[hsl(var(--display-fg))]">{entry.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'logo-banner': {
      const config = boardConfig as { boardType: 'logo-banner'; height: number };
      const logos = data?.logos || [];

      return (
        <div 
          className="flex items-center justify-center gap-4 h-full p-4" 
          style={{ minHeight: `${config.height}px` }}
          data-testid="logo-banner"
        >
          {logos.length > 0 ? (
            logos.map((logo: any, i: number) => (
              <img 
                key={i} 
                src={logo.url} 
                alt={logo.name || `Logo ${i + 1}`} 
                className="h-full object-contain"
              />
            ))
          ) : (
            <div className="text-center text-[hsl(var(--display-muted))] font-stadium">
              Logo Banner
            </div>
          )}
        </div>
      );
    }

    default: {
      // Exhaustive check - TypeScript will error if we missed a board type
      const _exhaustive: never = zone.boardType;
      return (
        <div className="flex items-center justify-center h-full text-[hsl(var(--display-warning))] font-stadium">
          Unknown board type: {_exhaustive}
        </div>
      );
    }
  }
}

// Apply styling presets to zone content
function applyStylePreset(content: React.ReactNode, preset: string | null): React.ReactNode {
  if (!preset || preset === 'none') {
    return content;
  }

  const classMap: Record<string, string> = {
    'gradient-blue': 'gradient-edge-blue',
    'gradient-blue-thick': 'gradient-edge-blue-thick',
    'gradient-blue-glow': 'gradient-edge-blue-glow',
    'accent-yellow': 'accent-box-yellow',
    'accent-yellow-pulse': 'accent-box-yellow-pulse',
    'gradient-yellow-combo': 'gradient-yellow-combo',
  };

  const styleClass = classMap[preset] || '';

  if (!styleClass) {
    return content;
  }

  return (
    <div className={cn(styleClass, 'rounded-lg h-full w-full overflow-hidden')}>
      {content}
    </div>
  );
}

// Individual zone component
interface ZoneProps {
  zone: SelectLayoutZone;
}

function Zone({ zone }: ZoneProps) {
  const dataBinding = zone.dataBinding as DataBinding;
  const zoneData = useZoneData(dataBinding, zone.boardType);

  const boardContent = renderBoardContent(zone, zoneData);
  const styledContent = applyStylePreset(boardContent, zone.stylePreset);

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: `${zone.xPercent}%`,
        top: `${zone.yPercent}%`,
        width: `${zone.widthPercent}%`,
        height: `${zone.heightPercent}%`,
        minWidth: zone.minWidth ? `${zone.minWidth}px` : undefined,
        maxWidth: zone.maxWidth ? `${zone.maxWidth}px` : undefined,
        minHeight: zone.minHeight ? `${zone.minHeight}px` : undefined,
        maxHeight: zone.maxHeight ? `${zone.maxHeight}px` : undefined,
        zIndex: zone.order,
      }}
      data-testid={`zone-${zone.id}`}
    >
      {styledContent}
    </div>
  );
}

// Main CompositeDisplay component
export function CompositeDisplay({ layoutId, className }: CompositeDisplayProps) {
  const { data: layoutData, isLoading, error } = useQuery<LayoutWithZones>({
    queryKey: ['/api/layouts', layoutId, 'with-zones'],
  });

  if (isLoading) {
    return (
      <div 
        className={cn('flex items-center justify-center w-full h-full bg-[hsl(var(--display-bg))]', className)}
        data-testid="composite-display-loading"
      >
        <div className="text-[hsl(var(--display-fg))] font-stadium text-3xl">
          Loading layout...
        </div>
      </div>
    );
  }

  if (error || !layoutData) {
    return (
      <div 
        className={cn('flex items-center justify-center w-full h-full bg-[hsl(var(--display-bg))]', className)}
        data-testid="composite-display-error"
      >
        <div className="text-[hsl(var(--display-warning))] font-stadium text-3xl">
          Layout not found
        </div>
      </div>
    );
  }

  const { layout, zones } = layoutData;

  // Sort zones by order for proper z-index rendering
  const sortedZones = [...zones].sort((a, b) => a.order - b.order);

  return (
    <div
      className={cn('relative w-full h-full bg-[hsl(var(--display-bg))]', className)}
      style={{ aspectRatio: layout.aspectRatio || '16/9' }}
      data-testid="composite-display"
    >
      {sortedZones.map((zone) => (
        <Zone key={zone.id} zone={zone} />
      ))}
    </div>
  );
}
