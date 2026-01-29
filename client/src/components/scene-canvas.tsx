import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { 
  SelectLayoutScene, 
  SelectLayoutObject, 
  EventWithEntries, 
  Meet,
  SceneDataBinding,
  SceneObjectConfig,
  SceneObjectStyle
} from "@shared/schema";
import { 
  LiveResultsBoard, 
  LiveTimeBoard, 
  FieldEventBoard, 
  StandingsBoard,
  ScrollingResultsBoard 
} from "@/components/display/templates";
import { formatHeatDisplay } from "@/lib/fieldBindings";
import { calculateMultiEventPoints, normalizeEventType, hasScoring, type Gender } from "@shared/combined-scoring";
import { Trophy, Clock, Users, User, Image, Type, Award, Loader2 } from "lucide-react";

// Static clock display - shows exactly what FinishLynx sends, no local interpolation
function StaticRunningClock({ 
  serverTime, 
  fontSize,
  color
}: { 
  serverTime: string | null | undefined;
  fontSize?: string;
  color?: string;
}) {
  // Display exactly what FinishLynx sends - no local counting
  return (
    <div 
      className="font-stadium-numbers font-[900]"
      style={{ 
        fontSize: fontSize || '48px',
        color: color || 'hsl(var(--display-fg))'
      }}
    >
      {serverTime || ""}
    </div>
  );
}

// Robust logo component with proper error handling
// Falls back to 0.png when logo fails to load
const LogoImage = memo(function LogoImage({ logoUrl, objectFit }: { logoUrl: string; objectFit: string }) {
  const [currentUrl, setCurrentUrl] = useState(logoUrl);
  const triedFallback = useRef(false);
  
  // Reset when logoUrl prop changes
  useEffect(() => {
    setCurrentUrl(logoUrl);
    triedFallback.current = false;
  }, [logoUrl]);
  
  const handleError = () => {
    // If the original URL failed and we haven't tried fallback yet, use 0.png
    if (!triedFallback.current && currentUrl !== '/logos/NCAA/0.png') {
      triedFallback.current = true;
      setCurrentUrl('/logos/NCAA/0.png');
    }
  };
  
  return (
    <div className="flex items-center justify-center h-full p-2">
      <img 
        src={currentUrl} 
        alt="Logo" 
        className="max-w-full max-h-full object-contain"
        style={{ objectFit: objectFit as any }}
        loading="eager"
        decoding="async"
        onError={handleError}
      />
    </div>
  );
});

export interface SceneCanvasProps {
  sceneId: number;
  scene?: SelectLayoutScene;
  objects?: SelectLayoutObject[];
  meetId?: string;
  eventNumber?: string;
  liveEventData?: any;
  liveClockTime?: string | null;
  pagingSize?: number;
  pagingInterval?: number;
  // For fixed-size displays (P10/P6): target display resolution
  displayWidth?: number;
  displayHeight?: number;
}

function useEventWithEntries(eventId: string | null | undefined) {
  return useQuery<EventWithEntries>({
    queryKey: [`/api/events/${eventId}/entries`],
    enabled: !!eventId,
    staleTime: 2000,
    retry: 2,
  });
}

function useMeet(meetId: string | null | undefined) {
  return useQuery<Meet>({
    queryKey: [`/api/meets/${meetId}`],
    enabled: !!meetId,
    staleTime: 60000,
  });
}

function useLiveEventData(eventNumber: string | number | null | undefined) {
  return useQuery({
    queryKey: ["/api/live-events", eventNumber],
    queryFn: async () => {
      if (!eventNumber) return null;
      const res = await fetch(`/api/live-events/${eventNumber}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!eventNumber,
    staleTime: 500,
    refetchInterval: 1000,
  });
}

function useLatestLiveEventData() {
  return useQuery({
    queryKey: ["/api/live-events/latest"],
    queryFn: async () => {
      const res = await fetch(`/api/live-events`);
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
    staleTime: 500,
    refetchInterval: 1000,
  });
}

function useTeamStandings(meetId: string | null | undefined) {
  return useQuery({
    queryKey: [`/api/meets/${meetId}/scoring/standings`],
    enabled: !!meetId,
    staleTime: 5000,
  });
}

export function SceneObjectRenderer({ 
  object, 
  meetId,
  canvasWidth,
  canvasHeight,
  eventNumber,
  pageIndex = 0,
  pageSize = 8,
  sharedLatestLiveData,
  liveClockTime
}: { 
  object: SelectLayoutObject; 
  meetId?: string;
  canvasWidth: number;
  canvasHeight: number;
  eventNumber?: string;
  pageIndex?: number;
  pageSize?: number;
  sharedLatestLiveData?: any;
  liveClockTime?: string | null;
}) {
  const dataBinding: SceneDataBinding = object.dataBinding || { sourceType: 'static' };
  const componentConfig: SceneObjectConfig = object.config || {};
  const styleConfig: SceneObjectStyle = object.style || {};
  
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  useEffect(() => {
    if (object.objectType === 'clock') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [object.objectType]);
  
  const eventIds = dataBinding.eventIds;
  const eventId = eventIds?.[0];
  const lynxPort = dataBinding.lynxPort;
  
  const liveEventKey = lynxPort || eventNumber;
  
  const { data: event, isLoading: eventLoading } = useEventWithEntries(
    dataBinding.sourceType === "events" ? eventId : null
  );
  const { data: meet } = useMeet(meetId);
  
  // IMPORTANT: Disable REST polling when WebSocket prop (sharedLatestLiveData) is provided
  // This prevents stale REST data from overwriting the correct WebSocket-accumulated entries
  const shouldPollRest = dataBinding.sourceType === "live-data" && liveEventKey && !sharedLatestLiveData;
  
  const { data: specificLiveData } = useLiveEventData(
    shouldPollRest ? liveEventKey : null
  );
  
  // PRIORITY: WebSocket prop (sharedLatestLiveData) > REST polling (specificLiveData)
  // WebSocket receives accumulated entries in correct display order from FinishLynx
  const liveData = sharedLatestLiveData || specificLiveData;
  
  const { data: standings } = useTeamStandings(
    dataBinding.sourceType === "standings" ? meetId : null
  );
  
  const left = (object.x / 100) * canvasWidth;
  const top = (object.y / 100) * canvasHeight;
  const width = (object.width / 100) * canvasWidth;
  const height = (object.height / 100) * canvasHeight;
  
  const borderWidth = styleConfig.borderWidth || 0;
  const borderColor = styleConfig.borderColor || '#ffffff';
  const borderSides = styleConfig.borderSides || ['all'];
  const hasAllBorders = borderSides.includes('all') || borderSides.length === 0;
  
  const borderStyles: React.CSSProperties = {};
  if (borderWidth > 0) {
    if (hasAllBorders) {
      borderStyles.border = `${borderWidth}px solid ${borderColor}`;
    } else {
      if (borderSides.includes('top')) borderStyles.borderTop = `${borderWidth}px solid ${borderColor}`;
      if (borderSides.includes('right')) borderStyles.borderRight = `${borderWidth}px solid ${borderColor}`;
      if (borderSides.includes('bottom')) borderStyles.borderBottom = `${borderWidth}px solid ${borderColor}`;
      if (borderSides.includes('left')) borderStyles.borderLeft = `${borderWidth}px solid ${borderColor}`;
    }
  }
  
  const bgStyle = styleConfig.backgroundStyle || 'solid';
  const bgColor = bgStyle === 'transparent' ? 'transparent' : (styleConfig.backgroundColor || 'transparent');
  
  // Conditional visibility logic based on wind data
  const windValue = liveData?.wind;
  const hasWindData = windValue !== undefined && windValue !== null && windValue !== '';
  // NWI detection: no wind, empty string, or contains "NWI" text
  const windStr = String(windValue || '').toUpperCase().trim();
  const isNWI = !hasWindData || windStr === '' || windStr === 'NWI' || windStr.includes('NWI');
  const conditionalVisibility = componentConfig.conditionalVisibility || 'always';
  
  // Check if object should be hidden based on conditional visibility
  let shouldHide = false;
  if (conditionalVisibility === 'hide-when-no-wind' && !hasWindData) {
    shouldHide = true;
  } else if (conditionalVisibility === 'hide-when-nwi' && isNWI) {
    shouldHide = true;
  }
  
  // Fade entries that don't have timing data yet (25% opacity until first split/time)
  // Only applies to objects bound to an athlete during running_time modes
  let entryHasTimingData = true; // Default to full opacity
  const athleteIndex = dataBinding.athleteIndex;
  const isRunningMode = liveData?.mode === 'running' || liveData?.mode === 'running_time';
  if (athleteIndex !== undefined && athleteIndex >= 0 && liveData && isRunningMode) {
    const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
    const entry = entries[athleteIndex];
    if (entry) {
      // Check if entry has any timing data (splits, time, or running time)
      const hasLastSplit = entry.lastSplit && String(entry.lastSplit).trim() !== '';
      const hasCumulativeSplit = entry.cumulativeSplit && String(entry.cumulativeSplit).trim() !== '';
      const hasTime = entry.time && String(entry.time).trim() !== '';
      const hasRunningTime = entry.runningTime && String(entry.runningTime).trim() !== '';
      entryHasTimingData = hasLastSplit || hasCumulativeSplit || hasTime || hasRunningTime;
    }
  }
  const fadeOpacity = entryHasTimingData ? 1 : 0.25;
  
  const objectStyle: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    zIndex: object.zIndex,
    overflow: "hidden",
    backgroundColor: bgColor,
    borderRadius: styleConfig.borderRadius || "0px",
    opacity: shouldHide ? 0 : ((styleConfig.opacity ?? 1) * fadeOpacity),
    visibility: shouldHide ? 'hidden' : 'visible',
    padding: styleConfig.padding ? `${styleConfig.padding}px` : undefined,
    paddingLeft: styleConfig.paddingLeft ? `${styleConfig.paddingLeft}px` : undefined,
    paddingRight: styleConfig.paddingRight ? `${styleConfig.paddingRight}px` : undefined,
    ...borderStyles,
  };
  
  const renderContent = () => {
    switch (object.objectType) {
      case "results-table":
        if (eventLoading) {
          return (
            <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]">
              <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--display-accent))]" />
            </div>
          );
        }
        if (!event) {
          return (
            <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]">
              <div className="text-center text-[hsl(var(--display-muted))]">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No event data</p>
              </div>
            </div>
          );
        }
        // Override event name with live FinishLynx data - NEVER use database name
        const eventWithLiveName = {
          ...event,
          name: liveData?.eventName || '', // Event name MUST come from FinishLynx only
        };
        const boardType = componentConfig.boardType || "live-results";
        if (eventWithLiveName.status === "completed" && componentConfig.scrollOnComplete !== false) {
          return (
            <ScrollingResultsBoard 
              event={eventWithLiveName} 
              meet={meet} 
              mode="results" 
              resultsPerPage={componentConfig.resultsPerPage || 5}
              scrollIntervalMs={(componentConfig.pageDurationSeconds || 5) * 1000}
            />
          );
        }
        if (boardType === "field-event") {
          return <FieldEventBoard event={eventWithLiveName} meet={meet} mode="live" />;
        }
        if (boardType === "live-time") {
          return <LiveTimeBoard event={eventWithLiveName} meet={meet} mode="live" />;
        }
        if (boardType === "standings") {
          return <StandingsBoard event={eventWithLiveName} meet={meet} mode="live" />;
        }
        return <LiveResultsBoard event={eventWithLiveName} meet={meet} mode="live" />;
        
      case "timer":
        // Use numeric fontSize from style, or fall back to componentConfig string mapping
        const timerNumericSize = styleConfig.fontSize || componentConfig.fontSize;
        const timerFontSize = typeof timerNumericSize === 'number' 
          ? `${timerNumericSize}px` 
          : (timerNumericSize === 'xlarge' ? '96px' : timerNumericSize === 'large' ? '72px' : timerNumericSize === 'medium' ? '48px' : '36px');
        // Only show time from FinishLynx when race is running
        const timerIsRunning = liveData?.mode === 'running' || liveData?.isRunning === true;
        const timerTime = timerIsRunning ? liveData?.runningTime : null;
        return (
          <div 
            className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]"
          >
            <StaticRunningClock 
              serverTime={timerTime}
              fontSize={timerFontSize}
              color="hsl(var(--display-fg))"
            />
          </div>
        );
        
      case "event-header":
        // Use numeric fontSize from style, or fall back to componentConfig string mapping
        const headerNumericSize = styleConfig.fontSize || componentConfig.fontSize;
        const headerFontSize = typeof headerNumericSize === 'number' 
          ? `${headerNumericSize}px` 
          : (headerNumericSize === 'xlarge' ? '64px' : headerNumericSize === 'large' ? '48px' : headerNumericSize === 'medium' ? '36px' : '24px');
        // Get event name exclusively from FinishLynx live data - never from database
        const headerEventName = liveData?.eventName || '';
        // Get status from event or live data
        const headerStatus = event?.status || liveData?.status || liveData?.mode;
        return (
          <div className="flex flex-col justify-center h-full p-4 bg-[hsl(var(--display-bg))]">
            <h1 
              className="font-stadium font-[900] text-[hsl(var(--display-fg))] uppercase"
              style={{ fontSize: headerFontSize }}
            >
              {headerEventName}
            </h1>
            {componentConfig.showStatus && headerStatus && (
              <p className="text-[hsl(var(--display-accent))] font-stadium text-lg uppercase">
                {headerStatus}
              </p>
            )}
          </div>
        );
        
      case "logo":
        let logoUrl: string | null | undefined = null;
        const logoFieldKey = dataBinding.fieldKey as string | undefined;
        
        if (componentConfig.logoType === "meet") {
          logoUrl = meet?.logoUrl;
        } else if (logoFieldKey === "school-logo" && liveData) {
          const athleteIndex = dataBinding.athleteIndex || 0;
          const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
          // FinishLynx sends batched entries - display maps by array position
          // Line 1 = entries[0], Line 2 = entries[1], etc.
          const firstEntry = entries.length > athleteIndex ? entries[athleteIndex] : null;
          // For relay events, use athlete name (contains team name like "Vermont A")
          const currentEventName = liveData.eventName || '';
          const isRelay = currentEventName.toLowerCase().includes('relay');
          const schoolName = isRelay 
            ? (firstEntry?.name || firstEntry?.affiliation || firstEntry?.team)
            : (firstEntry?.affiliation || firstEntry?.team);
          if (schoolName) {
            logoUrl = `/logos/NCAA/${schoolName}.png`;
          }
        } else {
          logoUrl = componentConfig.logoUrl || componentConfig.imageUrl;
        }
        
        if (!logoUrl) {
          // Show empty space instead of placeholder when no logo available
          return <div className="h-full" />;
        }
        return (
          <LogoImage 
            logoUrl={logoUrl} 
            objectFit={componentConfig.objectFit || componentConfig.imageFit || "contain"} 
          />
        );
        
      case "text":
        const fieldKey = dataBinding.fieldKey as string | undefined;
        let textContent = componentConfig.text || componentConfig.textContent || componentConfig.dynamicText;
        
        // Check hideWhenFieldNonNumeric - hide this element if a related field has non-numeric data
        // Useful for hiding "PL:" label when place shows DNF, DNS, DQ, etc.
        if (componentConfig.hideWhenFieldNonNumeric && liveData) {
          const checkFieldKey = componentConfig.hideWhenFieldNonNumeric;
          const athleteIdx = dataBinding.athleteIndex || 0;
          const entriesForCheck = Array.isArray(liveData.entries) ? liveData.entries : [];
          const entryForCheck = entriesForCheck.length > athleteIdx ? entriesForCheck[athleteIdx] : null;
          
          const checkFieldMap: Record<string, any> = {
            'place': entryForCheck?.place,
            'time': entryForCheck?.time || entryForCheck?.mark,
            'lane': entryForCheck?.lane,
            'bib': entryForCheck?.bib,
          };
          const valueToCheck = checkFieldMap[checkFieldKey];
          
          // Hide if value exists and is not a pure number
          if (valueToCheck !== undefined && valueToCheck !== null && valueToCheck !== '') {
            const strValue = String(valueToCheck).trim();
            // Check if it's NOT a number (allows decimals and integers)
            if (!/^[\d.]+$/.test(strValue)) {
              return null; // Hide this element
            }
          }
        }
        
        // Special case: running-time uses smooth clock for jitter-free updates
        // Clock data from port 5556 (liveClockTime) is authoritative - if FinishLynx sends it, display it
        // Also check liveData.runningTime as secondary source when race mode is active
        const isRaceRunning = liveData?.mode === 'running' || liveData?.isRunning === true;
        const clockTime = liveClockTime || (isRaceRunning ? liveData?.runningTime : null);
        if (fieldKey === 'running-time' && clockTime) {
          // Use numeric fontSize from style, or fall back to componentConfig string mapping
          const numericFontSize = styleConfig.fontSize || componentConfig.fontSize;
          const textFontSize = typeof numericFontSize === 'number' 
            ? `${numericFontSize}px` 
            : (numericFontSize === 'xlarge' ? '48px' : numericFontSize === 'large' ? '36px' : numericFontSize === 'medium' ? '24px' : '18px');
          const textAlign = componentConfig.textAlign || styleConfig.textAlign || "center";
          const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
          return (
            <div 
              className="flex items-center h-full p-2 overflow-hidden"
              style={{ justifyContent }}
            >
              <StaticRunningClock 
                serverTime={clockTime}
                fontSize={textFontSize}
                color={componentConfig.textColor || styleConfig.textColor || "hsl(var(--display-fg))"}
              />
            </div>
          );
        }
        
        if (fieldKey && liveData) {
          // Only use actual event name from FinishLynx - no fallbacks
          const eventName = liveData.eventName || '';
          
          const athleteIndex = dataBinding.athleteIndex || 0;
          const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
          // FinishLynx sends batched entries - display maps by array position
          // Line 1 = entries[0], Line 2 = entries[1], etc.
          const firstEntry = entries.length > athleteIndex ? entries[athleteIndex] : null;
          
          // Format name as "First Initial. Last Name"
          const formatName = (firstName?: string, lastName?: string, fullName?: string) => {
            if (firstName && lastName) {
              return `${firstName.charAt(0)}. ${lastName}`;
            }
            if (fullName) {
              const parts = fullName.trim().split(/\s+/);
              if (parts.length >= 2) {
                return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
              }
              return fullName;
            }
            return '';
          };
          
          // Use central formatter for heat display
          const heatDisplay = formatHeatDisplay(liveData.heat, liveData.totalHeats);
          
          // Filter wind - only show if valid numeric data (not NWI or empty)
          // Also strip out "M/S" unit and any other text after the number
          const rawWind = liveData.wind;
          let windStr = String(rawWind || '').trim();
          // Remove M/S, m/s, MS, ms and any trailing text after the number
          windStr = windStr.replace(/\s*[Mm]\/[Ss]\s*/g, '').trim();
          windStr = windStr.replace(/\s*[Mm][Ss]\s*/g, '').trim();
          // Also try to extract just the numeric part (handles any trailing units)
          const numMatch = windStr.match(/^([+-]?\d+[.,]?\d*)/);
          if (numMatch) {
            windStr = numMatch[1];
          }
          const windUpper = windStr.toUpperCase();
          const isValidWind = rawWind !== undefined && rawWind !== null && rawWind !== '' 
            && windUpper !== 'NWI' && !windUpper.includes('NWI') && windStr !== '';
          const windDisplay = isValidWind ? windStr : '';
          
          // Compute qualifier status: Q = qualified by place, q = qualified by time
          const advanceByPlace = liveData.advanceByPlace;
          const advanceByTime = liveData.advanceByTime;
          let qualifierStatus = '';
          const entryPlace = parseInt(String(firstEntry?.place || '0'));
          if (entryPlace > 0 && advanceByPlace) {
            if (entryPlace <= advanceByPlace) {
              qualifierStatus = 'Q'; // Qualified by place
            }
            // Note: little 'q' for time qualifiers would need cross-heat comparison
            // and is typically set by the backend or manually
          }
          
          // Format advancement formula as "X+Y" (e.g., "3+2")
          let advancementFormula = '';
          if (advanceByPlace || advanceByTime) {
            const place = advanceByPlace || 0;
            const time = advanceByTime || 0;
            advancementFormula = time > 0 ? `${place}+${time}` : `${place}`;
          }
          
          // Calculate multi-event points if applicable
          // Check if this is a combined event (isMultiEvent flag) and we have scoring for this event type
          const isMultiEvent = liveData.isMultiEvent === true || liveData.combinedEventType;
          const eventTypeForScoring = liveData.eventType || normalizeEventType(eventName || '');
          const entryGender: Gender = (firstEntry?.gender || liveData.gender || 'M').toString().toUpperCase().charAt(0) as Gender;
          const performance = firstEntry?.time || firstEntry?.mark;
          
          let eventPoints = 0;
          let timeWithPoints = '';
          if (isMultiEvent && performance && hasScoring(eventTypeForScoring)) {
            eventPoints = calculateMultiEventPoints(eventTypeForScoring, performance, entryGender);
          }
          
          // Format time with points (e.g., "10.45 = 876 pts")
          if (performance && eventPoints > 0) {
            timeWithPoints = `${performance} = ${eventPoints} pts`;
          }
          
          // Total points - comes from the entry or live data if the backend tracks it
          const totalPoints = firstEntry?.totalPoints || liveData.totalPoints || '';
          
          const fieldMap: Record<string, any> = {
            'event-name': eventName,
            'event-number': liveData.eventNumber,
            'distance': liveData.distance,
            'heat-number': heatDisplay,
            'round': liveData.round,
            'wind': windDisplay,
            'status': liveData.status,
            'lane': firstEntry?.lane,
            'place': firstEntry?.place,
            'name': formatName(firstEntry?.firstName, firstEntry?.lastName, firstEntry?.name),
            'first-name': firstEntry?.firstName,
            'last-name': firstEntry?.lastName,
            'name-qualifier': formatName(firstEntry?.firstName, firstEntry?.lastName, firstEntry?.name),
            'last-name-qualifier': firstEntry?.lastName,
            'name-qualifier-badge': qualifierStatus,
            'last-name-qualifier-badge': qualifierStatus,
            'school': firstEntry?.affiliation || firstEntry?.team,
            'time': firstEntry?.time || firstEntry?.mark,
            'last-split': firstEntry?.lastSplit,
            'cumulative-split': firstEntry?.cumulativeSplit,
            'reaction-time': firstEntry?.reactionTime,
            'bib': firstEntry?.bib,
            'advancement-formula': advancementFormula,
            'qualifier': qualifierStatus,
            'event-points': eventPoints > 0 ? eventPoints : '',
            'total-points': totalPoints,
            'time-with-points': timeWithPoints,
          };
          const resolvedValue = fieldMap[fieldKey];
          if (resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== '') {
            textContent = String(resolvedValue);
          }
        }
        
        const textAlign = componentConfig.textAlign || styleConfig.textAlign || "center";
        const justifyContent = textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center';
        
        // Use numeric fontSize from style, or fall back to componentConfig string mapping
        const numericTextFontSize = styleConfig.fontSize || componentConfig.fontSize;
        const resolvedFontSize = typeof numericTextFontSize === 'number' 
          ? `${numericTextFontSize}px` 
          : (numericTextFontSize === 'xlarge' ? '48px' : numericTextFontSize === 'large' ? '36px' : numericTextFontSize === 'medium' ? '24px' : '18px');
        
        // Check if this is a name-qualifier field to show badge
        const isQualifierField = fieldKey === 'name-qualifier' || fieldKey === 'last-name-qualifier';
        const qualifierBadge = isQualifierField ? (fieldMap as Record<string, any>)?.[`${fieldKey}-badge`] : null;
        
        return (
          <div 
            className="flex items-center h-full p-2 overflow-hidden"
            style={{
              justifyContent,
              fontSize: resolvedFontSize,
              fontWeight: componentConfig.fontWeight || (styleConfig as any).fontWeight || "normal",
              color: componentConfig.textColor || styleConfig.textColor || "hsl(var(--display-fg))",
              letterSpacing: '-0.02em',
            }}
          >
            <span className="whitespace-nowrap">{textContent || ""}</span>
            {qualifierBadge && (
              <span 
                className="ml-2 px-3 py-1 rounded font-bold"
                style={{
                  backgroundColor: '#22c55e',
                  color: '#166534',
                  fontSize: `calc(${resolvedFontSize} * 0.8)`,
                }}
              >
                {qualifierBadge}
              </span>
            )}
          </div>
        );
        
      case "team-standings":
        if (!standings || !Array.isArray(standings)) {
          return (
            <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]">
              <div className="text-center text-[hsl(var(--display-muted))]">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No standings data</p>
              </div>
            </div>
          );
        }
        const maxTeams = componentConfig.maxTeams || componentConfig.maxRows || 10;
        const displayStandings = standings.slice(0, maxTeams);
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-8 h-8 text-[hsl(var(--display-accent))]" />
              <h2 className="font-stadium text-2xl font-[700] text-[hsl(var(--display-fg))]">
                Team Standings
              </h2>
            </div>
            <div className="space-y-2">
              {displayStandings.map((team: any, index: number) => (
                <div 
                  key={team.teamId || index}
                  className="flex items-center justify-between p-2 rounded bg-[hsl(var(--display-bg-elevated))]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-stadium-numbers text-xl font-[700] text-[hsl(var(--display-accent))] w-8 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-stadium text-lg text-[hsl(var(--display-fg))] whitespace-nowrap">
                      {team.teamName}
                    </span>
                  </div>
                  <span className="font-stadium-numbers text-xl font-[700] text-[hsl(var(--display-fg))]">
                    {team.totalPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
        
      case "athlete-grid":
        if (eventLoading) {
          return (
            <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]">
              <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--display-accent))]" />
            </div>
          );
        }
        if (!event?.entries?.length) {
          return (
            <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]">
              <div className="text-center text-[hsl(var(--display-muted))]">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No athletes</p>
              </div>
            </div>
          );
        }
        const maxAthletes = componentConfig.maxRows || 8;
        const columns = componentConfig.columns || 2;
        const sortedEntries = [...event.entries].sort((a, b) => 
          (a.finalLane ?? 999) - (b.finalLane ?? 999)
        );
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-4 overflow-hidden">
            <div 
              className="grid gap-2 h-full"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {sortedEntries.slice(0, maxAthletes).map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center gap-3 p-2 rounded bg-[hsl(var(--display-bg-elevated))]"
                >
                  <span className="font-stadium-numbers text-xl font-[700] text-[hsl(var(--display-accent))] w-8">
                    {entry.finalLane || "-"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-stadium text-lg text-[hsl(var(--display-fg))] block">
                      {entry.athlete.firstName.charAt(0)}. {entry.athlete.lastName}
                    </span>
                    {entry.team && (
                      <span className="text-sm text-[hsl(var(--display-muted))] whitespace-nowrap block">
                        {entry.team.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "clock":
        const timeString = currentTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        });
        return (
          <div 
            className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]"
            style={{ fontSize: componentConfig.fontSize === 'xlarge' ? '72px' : componentConfig.fontSize === 'large' ? '56px' : componentConfig.fontSize === 'medium' ? '40px' : '28px' }}
          >
            <div className="font-stadium-numbers font-[700] text-[hsl(var(--display-fg))]">
              {timeString}
            </div>
          </div>
        );
        
      case "wind-reading":
        const windReadingRaw = liveData?.wind || event?.entries?.[0]?.finalWind;
        // Strip M/S unit and extract just the numeric part
        let windReadingClean = String(windReadingRaw || '').trim();
        windReadingClean = windReadingClean.replace(/\s*[Mm]\/[Ss]\s*/g, '').trim();
        windReadingClean = windReadingClean.replace(/\s*[Mm][Ss]\s*/g, '').trim();
        // Extract just the numeric part (handles any trailing units)
        const windNumMatch = windReadingClean.match(/^([+-]?\d+[.,]?\d*)/);
        if (windNumMatch) {
          windReadingClean = windNumMatch[1];
        }
        const windReadingUpper = windReadingClean.toUpperCase();
        const isValidWindReading = windReadingRaw !== undefined && windReadingRaw !== null && windReadingRaw !== '' 
          && windReadingUpper !== 'NWI' && !windReadingUpper.includes('NWI') && windReadingClean !== '';
        
        // Hide completely when NWI or no valid wind data
        if (!isValidWindReading) {
          return null;
        }
        
        return (
          <div 
            className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))] gap-2"
            style={{ fontSize: componentConfig.fontSize === 'xlarge' ? '48px' : componentConfig.fontSize === 'large' ? '36px' : componentConfig.fontSize === 'medium' ? '28px' : '20px' }}
          >
            <span className="text-[hsl(var(--display-muted))]">Wind:</span>
            <span className="font-stadium-numbers font-[700] text-[hsl(var(--display-fg))]">
              {windReadingClean}
            </span>
          </div>
        );
        
      case "athlete-card":
        const athlete = event?.entries?.[0];
        if (!athlete) {
          return (
            <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]">
              <User className="w-16 h-16 text-[hsl(var(--display-muted))] opacity-50" />
            </div>
          );
        }
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-4 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[hsl(var(--display-bg-elevated))] flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-[hsl(var(--display-muted))]" />
            </div>
            <h3 className="font-stadium text-2xl font-[700] text-[hsl(var(--display-fg))] text-center">
              {athlete.athlete.firstName.charAt(0)}. {athlete.athlete.lastName}
            </h3>
            {athlete.team && (
              <p className="text-lg text-[hsl(var(--display-muted))] whitespace-nowrap max-w-full">{athlete.team.name}</p>
            )}
            {athlete.finalPlace && (
              <div className="mt-2 px-4 py-1 rounded-full bg-[hsl(var(--display-accent))]">
                <span className="font-stadium-numbers text-xl font-[900] text-[hsl(var(--display-bg))]">
                  #{athlete.finalPlace}
                </span>
              </div>
            )}
          </div>
        );
        
      case "lane-graphic":
        const laneCount = componentConfig.totalLanes || 8;
        const laneEntries = event?.entries || [];
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-4">
            <div className="flex h-full gap-1">
              {Array.from({ length: laneCount }, (_, i) => {
                const laneNum = i + 1;
                const entry = laneEntries.find(e => e.finalLane === laneNum);
                return (
                  <div 
                    key={laneNum}
                    className="flex-1 flex flex-col items-center justify-end bg-[hsl(var(--display-bg-elevated))] rounded-t p-2"
                  >
                    <span className="font-stadium text-sm text-[hsl(var(--display-fg))] max-w-full">
                      {entry ? `${entry.athlete.firstName.charAt(0)}. ${entry.athlete.lastName}` : '-'}
                    </span>
                    <span className="font-stadium-numbers text-lg font-[700] text-[hsl(var(--display-accent))]">
                      {laneNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
        
      case "attempt-tracker":
        const attempts = liveData?.attempts || (event?.entries?.[0] as any)?.attempts || [];
        const maxAttemptCount = (componentConfig as any).maxAttempts || 6;
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-4 flex flex-col justify-center">
            <h3 className="font-stadium text-lg font-[700] text-[hsl(var(--display-fg))] mb-3 text-center">
              Attempts
            </h3>
            <div className="flex justify-center gap-2 flex-wrap">
              {attempts.length === 0 ? (
                Array.from({ length: maxAttemptCount }, (_, i) => (
                  <div 
                    key={i}
                    className="min-w-12 h-12 px-2 rounded border-2 border-[hsl(var(--display-border))] flex items-center justify-center"
                  >
                    <span className="font-stadium-numbers text-lg text-[hsl(var(--display-muted))]">
                      {i + 1}
                    </span>
                  </div>
                ))
              ) : (
                attempts.slice(0, maxAttemptCount).map((attempt: any, i: number) => {
                  const isValid = attempt.valid === true || attempt.status === 'valid' || attempt.status === 'O';
                  const isFoul = attempt.valid === false || attempt.status === 'foul' || attempt.status === 'X';
                  const isPass = attempt.status === 'pass' || attempt.status === 'P';
                  return (
                    <div 
                      key={i}
                      className={`min-w-12 h-12 px-2 rounded flex items-center justify-center ${
                        isValid ? 'bg-[hsl(var(--display-accent))]' : 
                        isFoul ? 'bg-[hsl(var(--display-muted))]' : 
                        isPass ? 'bg-[hsl(var(--display-bg-elevated))]' :
                        'border-2 border-[hsl(var(--display-border))]'
                      }`}
                    >
                      <span className={`font-stadium-numbers text-sm font-[700] ${
                        isValid ? 'text-[hsl(var(--display-bg))]' : 
                        isFoul ? 'text-[hsl(var(--display-bg))]' :
                        'text-[hsl(var(--display-fg))]'
                      }`}>
                        {isValid && attempt.mark ? attempt.mark : 
                         isFoul ? 'X' : 
                         isPass ? 'P' : 
                         (i + 1)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
        
      case "split-times":
        const splitTimes = liveData?.splitTimes || liveData?.splits || [];
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-4 overflow-hidden">
            <h3 className="font-stadium text-lg font-[700] text-[hsl(var(--display-fg))] mb-2">
              Split Times
            </h3>
            {splitTimes.length === 0 ? (
              <div className="text-center text-[hsl(var(--display-muted))] py-4">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No splits available</p>
              </div>
            ) : (
              <div className="space-y-1">
                {splitTimes.map((split: any, i: number) => (
                  <div 
                    key={i}
                    className="flex justify-between items-center p-2 rounded bg-[hsl(var(--display-bg-elevated))]"
                  >
                    <span className="font-stadium text-sm text-[hsl(var(--display-muted))]">
                      {split.splitName || split.distance || `Split ${i + 1}`}
                    </span>
                    <div className="flex gap-4">
                      <span className="font-stadium-numbers text-lg font-[700] text-[hsl(var(--display-fg))]">
                        {split.cumulative || split.time || '--:--.--'}
                      </span>
                      {split.lap && (
                        <span className="font-stadium-numbers text-sm text-[hsl(var(--display-accent))]">
                          ({split.lap})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case "record-indicator":
        const recordsList = liveData?.records || (componentConfig as any).records || [];
        const recordPriority: Record<string, number> = { 'WR': 1, 'AR': 2, 'NR': 3, 'CR': 4, 'MR': 5, 'PR': 6, 'SB': 7 };
        const sortedRecords = [...recordsList].sort((a: any, b: any) => 
          (recordPriority[a.type] || 99) - (recordPriority[b.type] || 99)
        );
        const topRecord = sortedRecords[0];
        const hasRecords = sortedRecords.length > 0;
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-3 flex flex-col items-center justify-center gap-2">
            {hasRecords ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--display-accent))]">
                  <Trophy className="w-5 h-5 text-[hsl(var(--display-bg))]" />
                  <span className="font-stadium text-lg font-[700] text-[hsl(var(--display-bg))]">
                    {topRecord.type || "RECORD"}
                  </span>
                </div>
                {topRecord.mark && (
                  <span className="font-stadium-numbers text-xl font-[700] text-[hsl(var(--display-fg))]">
                    {topRecord.mark}
                  </span>
                )}
                {sortedRecords.length > 1 && (
                  <div className="flex gap-2 mt-1">
                    {sortedRecords.slice(1, 3).map((record: any, i: number) => (
                      <span 
                        key={i}
                        className="px-2 py-1 text-xs rounded bg-[hsl(var(--display-bg-elevated))] text-[hsl(var(--display-muted))]"
                      >
                        {record.type}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[hsl(var(--display-muted))] text-center">
                <Trophy className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <p className="text-sm">No records</p>
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))] border border-dashed border-[hsl(var(--display-muted))]">
            <p className="text-[hsl(var(--display-muted))]">
              Unknown object type: {object.objectType}
            </p>
          </div>
        );
    }
  };
  
  return (
    <div style={objectStyle} data-testid={`scene-object-${object.id}`}>
      {renderContent()}
    </div>
  );
}

function useSceneQuery(sceneId: number | undefined, skip: boolean) {
  return useQuery<SelectLayoutScene>({
    queryKey: ["/api/layout-scenes", sceneId],
    queryFn: async () => {
      if (!sceneId) throw new Error("No scene ID");
      const res = await fetch(`/api/layout-scenes/${sceneId}`);
      if (!res.ok) throw new Error("Failed to load scene");
      return res.json();
    },
    enabled: !!sceneId && !skip,
    staleTime: 10000,
  });
}

function useSceneObjectsQuery(sceneId: number | undefined, skip: boolean) {
  return useQuery<SelectLayoutObject[]>({
    queryKey: ["/api/layout-objects", { sceneId }],
    queryFn: async () => {
      if (!sceneId) return [];
      const res = await fetch(`/api/layout-objects?sceneId=${sceneId}`);
      if (!res.ok) throw new Error("Failed to load objects");
      return res.json();
    },
    enabled: !!sceneId && !skip,
    staleTime: 5000,
  });
}

export function SceneCanvas({
  sceneId,
  scene: propScene,
  objects: propObjects,
  meetId,
  eventNumber,
  liveEventData: propLiveEventData,
  liveClockTime,
  pagingSize = 8,
  pagingInterval = 5,
  displayWidth,
  displayHeight,
}: SceneCanvasProps) {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const skipSceneQuery = !!propScene;
  const skipObjectsQuery = !!propObjects;
  
  const { data: fetchedScene, isLoading: sceneLoading, error: sceneError } = useSceneQuery(sceneId, skipSceneQuery);
  const { data: fetchedObjects = [], isLoading: objectsLoading } = useSceneObjectsQuery(sceneId, skipObjectsQuery);
  
  const scene = propScene || fetchedScene;
  const objects = propObjects || fetchedObjects;
  
  const { data: fetchedLiveEventData } = useLiveEventData(eventNumber);
  const { data: latestLiveEventData } = useLatestLiveEventData();
  
  // Priority: WebSocket prop > REST by eventNumber > REST latest
  const rawLiveData = propLiveEventData || fetchedLiveEventData || latestLiveEventData;
  
  // Use entries in arrival order for start_list (FinishLynx controls display order)
  // Only sort results mode by place
  // For splits mode: hold display until all entries have splits (prevents premature paging)
  const liveData = useMemo(() => {
    if (!rawLiveData) return rawLiveData;
    
    const entries = rawLiveData.entries || rawLiveData.results || [];
    if (entries.length === 0) return rawLiveData;
    
    const mode = rawLiveData.mode || '';
    const isResults = mode === 'results' || mode === 'finished';
    
    // Helper to check if an entry has split data
    // L2G (Laps To Go) > 0 indicates a multi-lap race with splits
    const entrySplitData = (entry: any) => {
      const hasLastSplit = entry.lastSplit && String(entry.lastSplit).trim() !== '';
      const hasCumulativeSplit = entry.cumulativeSplit && String(entry.cumulativeSplit).trim() !== '';
      const hasSplitsArray = entry.splits && Array.isArray(entry.splits) && entry.splits.length > 0;
      const hasLapsToGo = entry.lapsToGo && parseInt(entry.lapsToGo) > 0;
      return hasLastSplit || hasCumulativeSplit || hasSplitsArray || hasLapsToGo;
    };
    
    // Helper to check if an entry is DNS (Did Not Start)
    const isDNS = (entry: any) => {
      const time = String(entry.time || '').toUpperCase().trim();
      const place = String(entry.place || '').toUpperCase().trim();
      const mark = String(entry.mark || '').toUpperCase().trim();
      return time === 'DNS' || place === 'DNS' || mark === 'DNS';
    };
    
    // Filter out DNS entries from all modes
    const nonDNSEntries = entries.filter((entry: any) => !isDNS(entry));
    
    // Detect if we're in "splits mode" by checking if ANY entry has split data
    const hasSplitData = nonDNSEntries.some((entry: any) => entrySplitData(entry));
    
    // Filter entries based on data presence:
    // - In results mode: hide entries without time/place
    // - When split data exists: hide entries without split data (regardless of mode)
    let filteredEntries = nonDNSEntries;
    
    if (isResults) {
      // Results mode: only show entries with time or place
      filteredEntries = nonDNSEntries.filter((entry: any) => {
        const hasTime = entry.time && String(entry.time).trim() !== '';
        const hasPlace = entry.place && String(entry.place).trim() !== '';
        return hasTime || hasPlace;
      });
      // Sort by place
      filteredEntries = [...filteredEntries].sort((a: any, b: any) => {
        const placeA = parseInt(a.place) || 999;
        const placeB = parseInt(b.place) || 999;
        return placeA - placeB;
      });
      return {
        ...rawLiveData,
        entries: filteredEntries,
      };
    }
    
    if (hasSplitData) {
      // Splits mode: show entries with split data OR entries with places (finished athletes)
      // Places come ONLY from FinishLynx - never calculate them
      filteredEntries = nonDNSEntries.filter((entry: any) => {
        const hasSplits = entrySplitData(entry);
        const hasPlace = entry.place && String(entry.place).trim() !== '';
        return hasSplits || hasPlace;
      });
      
      return {
        ...rawLiveData,
        entries: filteredEntries,
      };
    }
    
    // For start_list mode (no splits yet), return entries with DNS filtered out
    return {
      ...rawLiveData,
      entries: nonDNSEntries,
    };
  }, [rawLiveData]);
  
  const totalEntries = useMemo(() => {
    if (!liveData) return 0;
    const entries = liveData.entries || liveData.results || [];
    return entries.length;
  }, [liveData]);
  
  const totalPages = Math.max(1, Math.ceil(totalEntries / pagingSize));
  
  useEffect(() => {
    if (totalPages <= 1 || pagingInterval <= 0) {
      setCurrentPageIndex(0);
      return;
    }
    
    const timer = setInterval(() => {
      setCurrentPageIndex(prev => (prev + 1) % totalPages);
    }, pagingInterval * 1000);
    
    return () => clearInterval(timer);
  }, [totalPages, pagingInterval]);
  
  useEffect(() => {
    if (currentPageIndex >= totalPages) {
      setCurrentPageIndex(0);
    }
  }, [totalPages, currentPageIndex]);
  
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => a.zIndex - b.zIndex);
  }, [objects]);
  
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);
  
  const isLoading = (!skipSceneQuery && sceneLoading) || (!skipObjectsQuery && objectsLoading);
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--display-bg))] display-layout">
        <div className="text-center">
          <Loader2 className="w-24 h-24 animate-spin text-[hsl(var(--display-accent))] mx-auto mb-4" />
          <p className="text-2xl font-stadium text-[hsl(var(--display-muted))]">
            Loading scene...
          </p>
        </div>
      </div>
    );
  }
  
  if (sceneError || !scene) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--display-bg))] display-layout">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-[hsl(var(--display-warning))] mx-auto mb-4" />
          <p className="text-2xl font-stadium text-[hsl(var(--display-fg))] mb-2">
            Scene Not Found
          </p>
          <p className="text-lg text-[hsl(var(--display-muted))]">
            The requested scene could not be loaded
          </p>
        </div>
      </div>
    );
  }
  
  const backgroundColor = scene.backgroundColor || "hsl(var(--display-bg))";
  
  // Check if we have fixed display dimensions (P10/P6)
  const isFixedSize = displayWidth !== undefined && displayHeight !== undefined;
  
  if (isFixedSize) {
    // Fixed-size rendering for P10/P6: exact pixel dimensions at position 0,0
    // No scaling, no centering - just the raw native resolution
    const canvasWidth = displayWidth;
    const canvasHeight = displayHeight;
    
    return (
      <div 
        className="fixed overflow-hidden display-layout"
        style={{ 
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor,
        }}
        data-testid="scene-canvas"
        key={`scene-${sceneId}`}
      >
        {sortedObjects.map((obj) => (
          <SceneObjectRenderer 
            key={obj.id} 
            object={obj} 
            meetId={meetId}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            eventNumber={eventNumber}
            pageIndex={currentPageIndex}
            pageSize={pagingSize}
            sharedLatestLiveData={liveData}
            liveClockTime={liveClockTime}
          />
        ))}
        
        {sortedObjects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-[hsl(var(--display-muted))]">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-stadium">Empty</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Default: Scale scene to fit viewport while maintaining aspect ratio (for BigBoard/desktop)
  const designWidth = scene.canvasWidth || 1920;
  const designHeight = scene.canvasHeight || 1080;
  
  const scaleX = dimensions.width / designWidth;
  const scaleY = dimensions.height / designHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = designWidth * scale;
  const scaledHeight = designHeight * scale;
  const offsetX = (dimensions.width - scaledWidth) / 2;
  const offsetY = (dimensions.height - scaledHeight) / 2;
  
  return (
    <div 
      className="fixed inset-0 overflow-hidden display-layout"
      style={{ backgroundColor: '#000' }}
      data-testid="scene-canvas"
    >
      <div
        key={`scene-${sceneId}`}
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor,
        }}
      >
        {sortedObjects.map((obj) => (
          <SceneObjectRenderer 
            key={obj.id} 
            object={obj} 
            meetId={meetId}
            canvasWidth={designWidth}
            canvasHeight={designHeight}
            eventNumber={eventNumber}
            pageIndex={currentPageIndex}
            pageSize={pagingSize}
            sharedLatestLiveData={liveData}
            liveClockTime={liveClockTime}
          />
        ))}
        
        {sortedObjects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-[hsl(var(--display-muted))]">
              <Trophy className="w-32 h-32 mx-auto mb-8 opacity-30" />
              <p className="text-4xl font-stadium">Empty Scene</p>
              <p className="text-xl mt-4">Add objects in the Scene Editor</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SceneCanvas;
