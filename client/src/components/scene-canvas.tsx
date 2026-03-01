import { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { FieldTransitionRenderer } from "@/components/display/FieldTransitionRenderer";
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
import { isHeightEvent } from "@shared/schema";
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
// Memoized to prevent re-renders when parent updates but clock time hasn't changed
const StaticRunningClock = memo(function StaticRunningClock({ 
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
        color: color || 'hsl(var(--display-fg))',
        // GPU-accelerated text rendering for smooth clock updates
        willChange: 'contents',
        contain: 'layout style paint',
      }}
    >
      {serverTime || ""}
    </div>
  );
});

// Robust logo component with proper error handling
// Falls back to 0.png when logo fails to load
const LogoImage = memo(function LogoImage({ logoUrl, objectFit, fallbackUrl }: { logoUrl: string; objectFit: string; fallbackUrl?: string }) {
  const [currentUrl, setCurrentUrl] = useState(logoUrl);
  const fallbackStage = useRef(0); // 0 = original, 1 = fallbackUrl, 2 = 0.png
  
  // Reset when logoUrl prop changes
  useEffect(() => {
    setCurrentUrl(logoUrl);
    fallbackStage.current = 0;
  }, [logoUrl, fallbackUrl]);
  
  const handleError = () => {
    if (fallbackStage.current === 0 && fallbackUrl) {
      // First fallback: try the provided fallback URL (e.g. school logo)
      fallbackStage.current = 1;
      setCurrentUrl(fallbackUrl);
    } else if (fallbackStage.current <= 1 && currentUrl !== '/logos/NCAA/0.png') {
      // Final fallback: generic placeholder
      fallbackStage.current = 2;
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
  liveEventDataByPort?: Record<number, any>;
  liveClockTime?: string | null;
  pagingSize?: number;
  pagingInterval?: number;
  maxPages?: number;
  // For fixed-size displays (P10/P6): target display resolution
  displayWidth?: number;
  displayHeight?: number;
  // Device-level field port — used as fallback for field-transition objects that don't have a port set
  deviceFieldPort?: number;
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

// Fetch records for a specific event type and gender (for record-indicator and text bindings)
function useEventRecords(eventType: string | null | undefined, gender: string | null | undefined) {
  return useQuery<any[]>({
    queryKey: ['/api/records/by-event', eventType, gender],
    queryFn: async () => {
      if (!eventType) return [];
      const g = gender || 'male';
      const res = await fetch(`/api/records/by-event?eventType=${encodeURIComponent(eventType)}&gender=${encodeURIComponent(g)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventType,
    staleTime: 30000,
  });
}

// Fetch athlete bests for a meet (for SB/PB display)
function useAthleteBests(meetId: string | null | undefined) {
  return useQuery<any[]>({
    queryKey: ['/api/meets', meetId, 'athlete-bests'],
    queryFn: async () => {
      if (!meetId) return [];
      const res = await fetch(`/api/meets/${meetId}/athlete-bests`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!meetId,
    staleTime: 30000,
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
  liveClockTime,
  deviceFieldPort,
  liveEventDataByPort
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
  deviceFieldPort?: number;
  liveEventDataByPort?: Record<number, any>;
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

  // Fetch records for display - derive event type from live data
  const liveEventType = liveData?.eventType || '';
  const liveGender = liveData?.gender || '';
  const { data: eventRecords = [] } = useEventRecords(
    (object.objectType === 'record-indicator' || object.objectType === 'text') ? liveEventType : null,
    liveGender
  );

  // Fetch athlete bests for SB/PB display
  const { data: athleteBests = [] } = useAthleteBests(
    (object.objectType === 'text' && meetId) ? meetId : null
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
  
  // Determine content opacity based on display mode:
  // - Start list: filled rows = 100%, empty rows = 50%, DNS/FS/Scratch = 50%
  // - Running time: all rows start at 50%, rows with split data → 100%
  // - Results: all rows start at 50%, rows with a time → 100%
  // - Field modes: always 100% (no timing-based fade)
  let contentFadeOpacity = 1;
  const rawAthleteIndex = dataBinding.athleteIndex;
  const pageOffset = (pageIndex || 0) * (pageSize || 8);
  const athleteIndex = rawAthleteIndex !== undefined ? rawAthleteIndex + pageOffset : undefined;
  const mode = liveData?.mode || '';
  const isResultsMode = mode === 'results' || mode === 'finished';
  const isPreRaceMode = mode === 'armed' || mode === 'start_list' || mode === '';
  const isRunningMode = mode === 'running' || mode === 'running_time';
  // Field event modes always show content — no timing-based fade
  const isFieldMode = mode === 'standings' || mode === 'athlete_up' || mode === 'field_results' || mode === 'multi_field';
  
  if (athleteIndex !== undefined && athleteIndex >= 0 && liveData) {
    const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
    const entry = entries[athleteIndex];
    if (!entry) {
      // Empty row (no athlete data) — dim to 50%
      contentFadeOpacity = 0.5;
    } else if (isFieldMode) {
      // Field events always show at full opacity
      contentFadeOpacity = 1;
    } else {
      // Check if entry is DNS, FS (false start), or Scratch
      const timeStr = String(entry.time || '').toUpperCase().trim();
      const placeStr = String(entry.place || '').toUpperCase().trim();
      const markStr = String(entry.mark || '').toUpperCase().trim();
      const isDNS = timeStr === 'DNS' || placeStr === 'DNS' || markStr === 'DNS';
      const isFS = timeStr === 'FS' || placeStr === 'FS' || markStr === 'FS';
      const isScratch = timeStr === 'SCR' || placeStr === 'SCR' || markStr === 'SCR' 
        || entry.isScratched === true;
      const isDimmedStatus = isDNS || isFS || isScratch;
      
      if (isPreRaceMode) {
        // Start list: filled rows = 100%, DNS/FS/Scratch = 50%
        contentFadeOpacity = isDimmedStatus ? 0.5 : 1;
      } else if (isRunningMode) {
        // Running time: 50% until split data arrives, then 100%
        // DNS/FS/Scratch stay at 50%
        if (isDimmedStatus) {
          contentFadeOpacity = 0.5;
        } else {
          const hasLastSplit = entry.lastSplit && String(entry.lastSplit).trim() !== '';
          const hasCumulativeSplit = entry.cumulativeSplit && String(entry.cumulativeSplit).trim() !== '';
          const hasRunningTime = entry.runningTime && String(entry.runningTime).trim() !== '';
          const hasTimingData = hasLastSplit || hasCumulativeSplit || hasRunningTime;
          contentFadeOpacity = hasTimingData ? 1 : 0.5;
        }
      } else if (isResultsMode) {
        // Results: 50% until they receive a time, then 100%
        // DNS/FS/Scratch stay at 50%
        if (isDimmedStatus) {
          contentFadeOpacity = 0.5;
        } else {
          const hasTime = entry.time && String(entry.time).trim() !== '';
          const hasPlace = entry.place && String(entry.place).trim() !== '' && entry.place !== '--';
          const hasResult = hasTime || hasPlace;
          contentFadeOpacity = hasResult ? 1 : 0.5;
        }
      } else {
        // Any other mode (e.g., track_mode_change): same as running logic
        if (isDimmedStatus) {
          contentFadeOpacity = 0.5;
        } else {
          const hasLastSplit = entry.lastSplit && String(entry.lastSplit).trim() !== '';
          const hasCumulativeSplit = entry.cumulativeSplit && String(entry.cumulativeSplit).trim() !== '';
          const hasTime = entry.time && String(entry.time).trim() !== '';
          const hasRunningTime = entry.runningTime && String(entry.runningTime).trim() !== '';
          const hasPlace = entry.place && String(entry.place).trim() !== '' && entry.place !== '--';
          const hasTimingData = hasLastSplit || hasCumulativeSplit || hasTime || hasRunningTime || hasPlace;
          contentFadeOpacity = hasTimingData ? 1 : 0.5;
        }
      }
    }
  }
  
  // Background/container always stays at full configured opacity
  const baseOpacity = styleConfig.opacity ?? 1;
  const effectiveOpacity = shouldHide ? 0 : baseOpacity;
  
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
    opacity: effectiveOpacity,
    visibility: shouldHide ? 'hidden' : 'visible',
    padding: styleConfig.padding ? `${styleConfig.padding}px` : undefined,
    paddingLeft: styleConfig.paddingLeft ? `${styleConfig.paddingLeft}px` : undefined,
    paddingRight: styleConfig.paddingRight ? `${styleConfig.paddingRight}px` : undefined,
    // Smooth opacity transitions when results come in (50% → 100%)
    transition: 'opacity 0.3s ease-out',
    // GPU acceleration: promote this element to its own compositor layer
    // This prevents layout thrash when sibling elements update
    willChange: 'opacity',
    contain: 'layout style paint',
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
            style={{
              // GPU-accelerated container for smooth clock digit updates
              contain: 'layout style paint',
            }}
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
              style={{ 
                fontSize: headerFontSize,
                // Smooth text transitions when event name changes
                transition: 'opacity 0.2s ease-out',
              }}
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
        let logoFallbackUrl: string | undefined = undefined;
        const logoFieldKey = dataBinding.fieldKey as string | undefined;
        
        if (componentConfig.logoType === "meet") {
          logoUrl = meet?.logoUrl;
        } else if (logoFieldKey === "athlete-photo" && liveData) {
          // Athlete headshot from directory: School_FirstName_LastName.png
          const photoAthleteIndex = (dataBinding.athleteIndex || 0) + pageOffset;
          const photoEntries = Array.isArray(liveData.entries) ? liveData.entries : [];
          const photoEntry = photoEntries.length > photoAthleteIndex ? photoEntries[photoAthleteIndex] : null;
          if (photoEntry) {
            const school = photoEntry.affiliation || photoEntry.team || '';
            let firstName = photoEntry.firstName || '';
            let lastName = photoEntry.lastName || '';
            // Fallback: parse firstName/lastName from full name field (for field events)
            if ((!firstName || !lastName) && photoEntry.name) {
              const fullName = String(photoEntry.name).trim();
              if (fullName.includes(',')) {
                // "Last, First" format
                const parts = fullName.split(',').map((s: string) => s.trim());
                lastName = lastName || parts[0] || '';
                firstName = firstName || parts[1] || '';
              } else {
                // "First Last" format
                const parts = fullName.split(/\s+/);
                firstName = firstName || parts[0] || '';
                lastName = lastName || parts.slice(1).join(' ') || '';
              }
            }
            // Detect relay/medley events — these don't have individual headshots
            const currentEventNameForPhoto = liveData.eventName || '';
            const eventLowerForPhoto = currentEventNameForPhoto.toLowerCase();
            const isRelayOrMedleyPhoto = eventLowerForPhoto.includes('relay') || eventLowerForPhoto.includes('medley');
            
            if (isRelayOrMedleyPhoto) {
              // For relays/medleys, fall back directly to team/affiliation logo
              const teamNameForLogo = photoEntry.name || photoEntry.affiliation || photoEntry.team || '';
              if (teamNameForLogo) {
                logoUrl = `/logos/NCAA/${teamNameForLogo}.png`;
              }
            } else if (school && firstName && lastName) {
              // Individual event — try headshot first
              logoUrl = `/api/meets/${meetId}/headshot?school=${encodeURIComponent(school)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`;
            }
            // Build school logo fallback URL so if headshot is missing, school logo is shown
            // For relays/medleys this serves as a secondary fallback
            const fallbackSchool = school || photoEntry.name || photoEntry.team || '';
            if (fallbackSchool) {
              logoFallbackUrl = `/logos/NCAA/${fallbackSchool}.png`;
            }
          }
        } else if (logoFieldKey === "school-logo" && liveData) {
          const logoAthleteIndex = (dataBinding.athleteIndex || 0) + pageOffset;
          const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
          const firstEntry = entries.length > logoAthleteIndex ? entries[logoAthleteIndex] : null;
          if (firstEntry?.logoUrl) {
            logoUrl = firstEntry.logoUrl;
          } else {
            const currentEventName = liveData.eventName || '';
            const eventNameLower = currentEventName.toLowerCase();
            const isRelayOrMedley = eventNameLower.includes('relay') || eventNameLower.includes('medley');
            const isTeamScoresMode = liveData.mode === 'team_scores';
            const schoolName = isTeamScoresMode
              ? (firstEntry?.name || firstEntry?.lastName || firstEntry?.team)
              : isRelayOrMedley 
                ? (firstEntry?.name || firstEntry?.affiliation || firstEntry?.team)
                : (firstEntry?.affiliation || firstEntry?.team);
            if (schoolName) {
              logoUrl = `/logos/NCAA/${schoolName}.png`;
            }
          }
        } else {
          logoUrl = componentConfig.logoUrl || componentConfig.imageUrl;
        }
        
        if (!logoUrl) {
          return <div className="h-full" />;
        }
        const logoIsAthleteBound = logoFieldKey === 'school-logo' || logoFieldKey === 'athlete-photo';
        return (
          <div style={{ 
            width: '100%', height: '100%',
            opacity: logoIsAthleteBound ? contentFadeOpacity : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}>
            <LogoImage 
              logoUrl={logoUrl} 
              objectFit={componentConfig.objectFit || componentConfig.imageFit || "contain"}
              fallbackUrl={logoFallbackUrl}
            />
          </div>
        );
        
      case "text":
        const fieldKey = dataBinding.fieldKey as string | undefined;
        let textContent = componentConfig.text || componentConfig.textContent || componentConfig.dynamicText;
        
        // Check hideWhenFieldNonNumeric - hide this element if a related field has non-numeric data
        // Useful for hiding "PL:" label when place shows DNF, DNS, DQ, etc.
        if (componentConfig.hideWhenFieldNonNumeric && liveData) {
          const checkFieldKey = componentConfig.hideWhenFieldNonNumeric;
          const hideCheckIdx = (dataBinding.athleteIndex || 0) + pageOffset;
          const entriesForCheck = Array.isArray(liveData.entries) ? liveData.entries : [];
          const entryForCheck = entriesForCheck.length > hideCheckIdx ? entriesForCheck[hideCheckIdx] : null;
          
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
          
          const textAthleteIndex = (dataBinding.athleteIndex || 0) + pageOffset;
          const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
          const firstEntry = entries.length > textAthleteIndex ? entries[textAthleteIndex] : null;
          
          // Format name as "First Initial. Last Name"
          const formatName = (firstName?: string, lastName?: string, fullName?: string) => {
            if (firstName && lastName) {
              return `${firstName.charAt(0)}. ${lastName}`;
            }
            if (fullName) {
              // Check if fullName is in "Last, First" format
              if (fullName.includes(',')) {
                const [last, first] = fullName.split(',').map(s => s.trim());
                if (first && last) {
                  return `${first.charAt(0)}. ${last}`;
                }
              }
              // Otherwise assume "First Last" format
              const parts = fullName.trim().split(/\s+/);
              if (parts.length >= 2) {
                const first = parts[0];
                const last = parts.slice(1).join(' ');
                return `${first.charAt(0)}. ${last}`;
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
          const roundCheckStr = String(liveData.roundName || liveData.round || '').toLowerCase();
          if (entryPlace > 0 && advanceByPlace && !roundCheckStr.includes('final')) {
            if (entryPlace <= advanceByPlace) {
              qualifierStatus = 'Q'; // Qualified by place
            }
            // Note: little 'q' for time qualifiers would need cross-heat comparison
            // and is typically set by the backend or manually
          }
          
          const roundNameStr = String(liveData.roundName || liveData.round || '').toLowerCase();
          const isFinalRound = roundNameStr.includes('final');
          
          let advancementFormula = '';
          if (!isFinalRound && (advanceByPlace || advanceByTime)) {
            const place = advanceByPlace || 0;
            const time = advanceByTime || 0;
            if (place > 0 && time > 0) {
              advancementFormula = `Top ${place} + Next ${time} Times`;
            } else if (place > 0) {
              advancementFormula = `Top ${place}`;
            } else if (time > 0) {
              advancementFormula = `Next ${time} Times`;
            }
          }
          
          // Calculate multi-event points if applicable
          // Check if this is a combined event (isMultiEvent flag) and we have scoring for this event type
          const isMultiEvent = liveData.isMultiEvent === true || liveData.combinedEventType;
          const eventTypeForScoring = liveData.eventType || normalizeEventType(eventName || '');
          const entryGender: Gender = (firstEntry?.gender || liveData.gender || 'M').toString().toUpperCase().charAt(0) as Gender;
          const performance = firstEntry?.time || firstEntry?.mark;
          
          let eventPoints = 0;
          let timeWithPoints = '';
          // Use server-provided eventPoints if available (e.g., from HyTek MDB import)
          if (firstEntry?.eventPoints) {
            eventPoints = typeof firstEntry.eventPoints === 'number' ? firstEntry.eventPoints : parseInt(String(firstEntry.eventPoints)) || 0;
          } else if (isMultiEvent && performance && hasScoring(eventTypeForScoring)) {
            eventPoints = calculateMultiEventPoints(eventTypeForScoring, performance, entryGender);
          }
          
          // Format time with points (e.g., "10.45 = 876 pts")
          if (performance && eventPoints > 0) {
            timeWithPoints = `${performance} = ${eventPoints} pts`;
          }
          
          // Total points - comes from the entry or live data if the backend tracks it
          const totalPoints = firstEntry?.totalPoints || liveData.totalPoints || '';
          
          const isTeamScores = liveData.mode === 'team_scores';
          const eventNameLowerText = eventName.toLowerCase();
          const isRelayOrMedleyText = eventNameLowerText.includes('relay') || eventNameLowerText.includes('medley');
          const displayName = isTeamScores 
            ? (firstEntry?.name || '')
            : isRelayOrMedleyText
              ? (firstEntry?.name || firstEntry?.lastName || '')
              : formatName(firstEntry?.firstName, firstEntry?.lastName, firstEntry?.name);
          
          const schoolDisplay = isRelayOrMedleyText
            ? (firstEntry?.affiliation || firstEntry?.team || '').substring(4).trim()
            : (firstEntry?.affiliation || firstEntry?.team);
          
          const isVerticalEvent = (liveData.eventType && isHeightEvent(liveData.eventType))
            || eventName.toLowerCase().includes('high jump') || eventName.toLowerCase().includes('pole vault');
          let attemptDisplay = '';
          if (isVerticalEvent && firstEntry?.attempts) {
            attemptDisplay = String(firstEntry.attempts);
          } else if (firstEntry?.attemptNumber) {
            attemptDisplay = `Att: ${firstEntry.attemptNumber}`;
          }
          
          // Look up athlete SB/PB from imported bests
          let athleteSB = '';
          let athletePB = '';
          if (firstEntry && athleteBests.length > 0) {
            // Try to match by athleteId if available, or by name
            const entryAthleteId = firstEntry.athleteId;
            const matchingBests = entryAthleteId
              ? athleteBests.filter((b: any) => b.athleteId === entryAthleteId)
              : [];
            
            for (const best of matchingBests) {
              if (best.bestType === 'season' && best.mark) {
                const mark = Number(best.mark);
                if (mark >= 60) {
                  const mins = Math.floor(mark / 60);
                  const secs = mark - mins * 60;
                  athleteSB = `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
                } else {
                  athleteSB = mark.toFixed(2);
                }
              }
              if (best.bestType === 'college' && best.mark) {
                const mark = Number(best.mark);
                if (mark >= 60) {
                  const mins = Math.floor(mark / 60);
                  const secs = mark - mins * 60;
                  athletePB = `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
                } else {
                  athletePB = mark.toFixed(2);
                }
              }
            }
          }
          
          // Look up meet record and facility record for this event
          let meetRecordDisplay = '';
          let facilityRecordDisplay = '';
          let athleteMatchesMR = false;
          let athleteMatchesFR = false;
          if (eventRecords.length > 0) {
            const meetRec = eventRecords.find((r: any) => r.bookScope === 'meet');
            const facRec = eventRecords.find((r: any) => r.bookScope === 'facility');
            if (meetRec) {
              meetRecordDisplay = `MR: ${meetRec.performance} - ${meetRec.athleteName}${meetRec.team ? ` (${meetRec.team})` : ''}`;
              // Check if this athlete IS the meet record holder
              if (firstEntry) {
                const holderName = (meetRec.athleteName || '').toLowerCase();
                const entryLast = (firstEntry.lastName || '').toLowerCase();
                const entryFirst = (firstEntry.firstName || '').toLowerCase();
                const entryName = (firstEntry.name || '').toLowerCase();
                if ((entryLast && holderName.includes(entryLast)) || (entryName && holderName.includes(entryName))) {
                  athleteMatchesMR = true;
                }
              }
            }
            if (facRec) {
              facilityRecordDisplay = `FR: ${facRec.performance} - ${facRec.athleteName}${facRec.team ? ` (${facRec.team})` : ''}`;
              if (firstEntry) {
                const holderName = (facRec.athleteName || '').toLowerCase();
                const entryLast = (firstEntry.lastName || '').toLowerCase();
                const entryFirst = (firstEntry.firstName || '').toLowerCase();
                const entryName = (firstEntry.name || '').toLowerCase();
                if ((entryLast && holderName.includes(entryLast)) || (entryName && holderName.includes(entryName))) {
                  athleteMatchesFR = true;
                }
              }
            }
          }
          
          // Determine single priority record tag: MR > FR > PB > SB
          let recordTag = '';
          if (athleteMatchesMR) {
            recordTag = 'MR';
          } else if (athleteMatchesFR) {
            recordTag = 'FR';
          } else if (athletePB) {
            recordTag = 'PB';
          } else if (athleteSB) {
            recordTag = 'SB';
          }
          
          const fieldMap: Record<string, any> = {
            'event-name': eventName,
            'event-number': liveData.eventNumber,
            'distance': liveData.distance,
            'heat-number': heatDisplay,
            'round': liveData.roundName || liveData.round,
            'round-name': liveData.roundName || '',
            'wind': windDisplay,
            'status': liveData.status,
            'lane': firstEntry?.lane,
            'place': (() => {
              const rawPlace = firstEntry?.place;
              if (rawPlace === undefined || rawPlace === null || rawPlace === '') return rawPlace;
              const placeStr = String(rawPlace).trim();
              // Add "PL: " prefix on all displays except BigBoard (1920+ wide)
              const isBigBoard = canvasWidth >= 1920;
              return isBigBoard ? placeStr : `PL: ${placeStr}`;
            })(),
            'name': displayName,
            'first-name': isTeamScores ? (firstEntry?.name || '') : isRelayOrMedleyText ? '' : firstEntry?.firstName,
            'last-name': isTeamScores ? (firstEntry?.name || '') : isRelayOrMedleyText ? (firstEntry?.name || firstEntry?.lastName || '') : firstEntry?.lastName,
            'name-qualifier': displayName,
            'last-name-qualifier': isTeamScores ? (firstEntry?.name || '') : isRelayOrMedleyText ? (firstEntry?.name || firstEntry?.lastName || '') : firstEntry?.lastName,
            'name-qualifier-badge': qualifierStatus,
            'last-name-qualifier-badge': qualifierStatus,
            'school': schoolDisplay,
            'time': firstEntry?.time || firstEntry?.mark,
            'mark-converted': firstEntry?.markConverted || '',
            'last-split': firstEntry?.lastSplit,
            'cumulative-split': firstEntry?.cumulativeSplit,
            'reaction-time': firstEntry?.reactionTime,
            'bib': firstEntry?.bib,
            'advancement-formula': advancementFormula,
            'qualifier': qualifierStatus,
            'attempt': attemptDisplay,
            'event-points': eventPoints > 0 ? eventPoints : '',
            'total-points': totalPoints,
            'time-with-points': timeWithPoints,
            'total-events-scored': liveData.totalEventsScored != null ? `Events Scored: ${liveData.totalEventsScored}` : '',
            // Season best / Personal best from CSV import
            'season-best': athleteSB,
            'personal-best': athletePB,
            'sb': athleteSB,
            'pb': athletePB,
            // Meet record / Facility record from MDB import
            'meet-record': meetRecordDisplay,
            'facility-record': facilityRecordDisplay,
            // Single priority record tag (MR > FR > PB > SB)
            'record-tag': recordTag,
            // Name with record tag appended (for combined display)
            'name-record-tag': displayName,
            'last-name-record-tag': isTeamScores ? (firstEntry?.name || '') : isRelayOrMedleyText ? (firstEntry?.name || firstEntry?.lastName || '') : firstEntry?.lastName,
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
        
        if (fieldKey === 'team-score-badges' && liveData?.scoredEventNames) {
          const badgeNames: string[] = Array.isArray(liveData.scoredEventNames) ? liveData.scoredEventNames : [];
          const badgeColor = componentConfig.textColor || styleConfig.textColor || "hsl(var(--display-fg))";
          const baseBadgeFontSize = typeof numericTextFontSize === 'number'
            ? Math.max(10, numericTextFontSize * 0.65)
            : 12;
          // Auto-shrink badges to fit on one line: reduce font size based on badge count
          const badgeCount = badgeNames.length;
          const shrinkFactor = badgeCount > 20 ? 0.5 : badgeCount > 15 ? 0.6 : badgeCount > 10 ? 0.7 : badgeCount > 6 ? 0.85 : 1;
          const badgeFontSize = Math.max(6, baseBadgeFontSize * shrinkFactor);
          return (
            <div 
              className="flex items-center h-full px-1"
              style={{ justifyContent, flexWrap: 'nowrap', gap: `${Math.max(1, badgeFontSize * 0.25)}px`, alignContent: 'center', overflow: 'hidden' }}
            >
              {badgeNames.map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded font-semibold whitespace-nowrap"
                  style={{
                    backgroundColor: 'hsl(var(--display-accent) / 0.2)',
                    color: badgeColor,
                    fontSize: `${badgeFontSize}px`,
                    padding: `${Math.max(1, badgeFontSize * 0.15)}px ${Math.max(2, badgeFontSize * 0.3)}px`,
                    lineHeight: 1.2,
                    border: '1px solid hsl(var(--display-accent) / 0.4)',
                    flexShrink: 0,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          );
        }
        
        // Check if this is a name-qualifier field to show badge - only when we have live data
        const isQualifierField = fieldKey === 'name-qualifier' || fieldKey === 'last-name-qualifier';
        // qualifierBadge is set inside the liveData block above, need to track it differently
        let qualifierBadge: string | null = null;
        if (isQualifierField && liveData) {
          const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
          const qualIdx = (dataBinding.athleteIndex || 0) + pageOffset;
          const entry = entries[qualIdx];
          if (entry?.qualifier) {
            qualifierBadge = entry.qualifier;
          } else {
            const advanceByPlace = liveData.advanceByPlace;
            const entryPlace = parseInt(String(entry?.place || '0'));
            const roundStr = String(liveData.roundName || liveData.round || '').toLowerCase();
            if (entryPlace > 0 && advanceByPlace && entryPlace <= advanceByPlace && !roundStr.includes('final')) {
              qualifierBadge = 'Q';
            }
          }
        }
        
        // Check if this is a record-tag field to show the single priority badge (MR > FR > PB > SB)
        const isRecordTagField = fieldKey === 'name-record-tag' || fieldKey === 'last-name-record-tag' || fieldKey === 'record-tag';
        let recordTagBadge: string | null = null;
        if (isRecordTagField && liveData) {
          const entries = Array.isArray(liveData.entries) ? liveData.entries : [];
          const rtIdx = (dataBinding.athleteIndex || 0) + pageOffset;
          const rtEntry = entries[rtIdx];
          
          // Determine the tag for this specific athlete
          // Priority: MR > FR > PB > SB
          let thisMR = false;
          let thisFR = false;
          let thisPB = false;
          let thisSB = false;
          
          // Check MR/FR: does this athlete hold the record?
          if (eventRecords.length > 0 && rtEntry) {
            const meetRec = eventRecords.find((r: any) => r.bookScope === 'meet');
            const facRec = eventRecords.find((r: any) => r.bookScope === 'facility');
            const eLast = (rtEntry.lastName || '').toLowerCase();
            const eName = (rtEntry.name || '').toLowerCase();
            if (meetRec) {
              const h = (meetRec.athleteName || '').toLowerCase();
              if ((eLast && h.includes(eLast)) || (eName && h.includes(eName))) thisMR = true;
            }
            if (facRec) {
              const h = (facRec.athleteName || '').toLowerCase();
              if ((eLast && h.includes(eLast)) || (eName && h.includes(eName))) thisFR = true;
            }
          }
          
          // Check PB/SB from imported bests
          if (rtEntry && athleteBests.length > 0) {
            const aid = rtEntry.athleteId;
            if (aid) {
              const bests = athleteBests.filter((b: any) => b.athleteId === aid);
              for (const b of bests) {
                if (b.bestType === 'college' && b.mark) thisPB = true;
                if (b.bestType === 'season' && b.mark) thisSB = true;
              }
            }
          }
          
          if (thisMR) recordTagBadge = 'MR';
          else if (thisFR) recordTagBadge = 'FR';
          else if (thisPB) recordTagBadge = 'PB';
          else if (thisSB) recordTagBadge = 'SB';
        }
        
        return (
          <div 
            className="flex items-center h-full p-2 overflow-hidden"
            style={{
              justifyContent,
              fontSize: resolvedFontSize,
              fontWeight: componentConfig.fontWeight || (styleConfig as any).fontWeight || "normal",
              color: componentConfig.textColor || styleConfig.textColor || "hsl(var(--display-fg))",
              letterSpacing: '-0.02em',
              opacity: contentFadeOpacity,
              transition: 'opacity 0.3s ease-in-out',
            }}
          >
            {/* Render X/O/P attempt characters with colored backgrounds for vertical events */}
            {fieldKey === 'attempt' && textContent && /^[XxOoPp]+$/.test(textContent) ? (
              <span className="whitespace-nowrap flex gap-1">
                {textContent.toUpperCase().split('').map((ch, ci) => (
                  <span
                    key={ci}
                    className="inline-flex items-center justify-center rounded font-bold"
                    style={{
                      backgroundColor: ch === 'O' ? '#16a34a' : ch === 'X' ? '#dc2626' : '#2563eb',
                      color: '#ffffff',
                      padding: '0.1em 0.35em',
                      minWidth: '1.5em',
                      fontSize: 'inherit',
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            ) : (
              <span className="whitespace-nowrap">{textContent || ""}</span>
            )}
            {qualifierBadge && (
              <span 
                className="ml-6 px-3 py-1 rounded font-bold"
                style={{
                  backgroundColor: qualifierBadge === 'q' ? '#1e40af' : '#15803d',
                  color: '#ffffff',
                  fontSize: `calc(${resolvedFontSize} * 0.75)`,
                }}
              >
                {qualifierBadge}
              </span>
            )}
            {recordTagBadge && (
              <span 
                className="ml-4 px-3 py-1 rounded font-bold"
                style={{
                  backgroundColor: recordTagBadge === 'MR' ? '#b91c1c' 
                    : recordTagBadge === 'FR' ? '#7c3aed' 
                    : recordTagBadge === 'PB' ? '#0369a1' 
                    : '#ca8a04',
                  color: '#ffffff',
                  fontSize: `calc(${resolvedFontSize} * 0.65)`,
                  letterSpacing: '0.05em',
                }}
              >
                {recordTagBadge}
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
                      className="min-w-12 h-12 px-2 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: isValid ? '#16a34a' :
                          isFoul ? '#dc2626' :
                          isPass ? '#2563eb' :
                          'transparent',
                        border: (!isValid && !isFoul && !isPass) ? '2px solid hsl(var(--display-border))' : 'none',
                      }}
                    >
                      <span className="font-stadium-numbers text-sm font-[700]"
                        style={{
                          color: (isValid || isFoul || isPass) ? '#ffffff' : 'hsl(var(--display-fg))',
                        }}
                      >
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
        // Use live records OR fetched event records from database
        const rawRecordsList = liveData?.records || (componentConfig as any).records || [];
        // Merge database records into the display list
        const dbRecordsMapped = eventRecords.map((r: any) => {
          const scope = r.bookScope || '';
          const type = scope === 'meet' ? 'MR' : scope === 'facility' ? 'FR' : 'CR';
          return {
            type,
            mark: r.performance,
            holder: r.athleteName,
            team: r.team,
            year: r.date ? new Date(r.date).getFullYear() : '',
          };
        });
        const recordsList = [...rawRecordsList, ...dbRecordsMapped];
        // Deduplicate by type (keep first occurrence)
        const seenTypes = new Set<string>();
        const uniqueRecords = recordsList.filter((r: any) => {
          if (seenTypes.has(r.type)) return false;
          seenTypes.add(r.type);
          return true;
        });
        const recordPriority: Record<string, number> = { 'WR': 1, 'AR': 2, 'NR': 3, 'CR': 4, 'MR': 5, 'FR': 6, 'PR': 7, 'SB': 8 };
        const sortedRecords = [...uniqueRecords].sort((a: any, b: any) => 
          (recordPriority[a.type] || 99) - (recordPriority[b.type] || 99)
        );
        const topRecord = sortedRecords[0];
        const hasRecords = sortedRecords.length > 0;
        return (
          <div className="h-full bg-[hsl(var(--display-bg))] p-3 flex flex-col items-center justify-center gap-2">
            {hasRecords ? (
              <>
                {sortedRecords.slice(0, 3).map((record: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 ${i === 0 ? '' : 'opacity-80'}`}>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
                      i === 0 ? 'bg-[hsl(var(--display-accent))]' : 'bg-[hsl(var(--display-bg-elevated))]'
                    }`}>
                      {i === 0 && <Trophy className="w-4 h-4 text-[hsl(var(--display-bg))]" />}
                      <span className={`font-stadium text-sm font-[700] ${
                        i === 0 ? 'text-[hsl(var(--display-bg))]' : 'text-[hsl(var(--display-muted))]'
                      }`}>
                        {record.type}
                      </span>
                    </span>
                    {record.mark && (
                      <span className="font-stadium-numbers text-base font-[700] text-[hsl(var(--display-fg))]">
                        {record.mark}
                      </span>
                    )}
                    {record.holder && (
                      <span className="font-stadium text-xs text-[hsl(var(--display-muted))]">
                        {record.holder}{record.year ? ` (${record.year})` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-[hsl(var(--display-muted))] text-center">
                <Trophy className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <p className="text-sm">No records</p>
              </div>
            )}
          </div>
        );
        
      case "field-transition": {
        const ftColor = bgColor !== 'transparent' && bgColor ? bgColor : '#001e57';
        // Pass live data directly — FieldTransitionRenderer now reacts to data changes
        // instead of trying to listen on a WebSocket (which was the wrong WS before)
        return (
          <FieldTransitionRenderer
            curtainColor={ftColor}
            meetId={meetId}
            liveData={liveData}
            liveEventDataByPort={liveEventDataByPort}
            deviceFieldPort={deviceFieldPort}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      }

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
  liveEventDataByPort,
  liveClockTime,
  pagingSize = 8,
  pagingInterval = 5,
  maxPages = 0,
  displayWidth,
  displayHeight,
  deviceFieldPort,
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
  // DNS entries are completely hidden, all others are visible (50% opacity if no timing data)
  //
  // PERFORMANCE: Use a ref to store the previous result and only return a new object
  // if the data actually changed. This prevents cascading re-renders of all child
  // SceneObjectRenderer components when the raw data reference changes but content is the same.
  const prevLiveDataRef = useRef<any>(null);
  const prevLiveDataKeyRef = useRef<string>('');
  
  const liveData = useMemo(() => {
    if (!rawLiveData) {
      prevLiveDataRef.current = null;
      prevLiveDataKeyRef.current = '';
      return rawLiveData;
    }
    
    const entries = rawLiveData.entries || rawLiveData.results || [];
    if (entries.length === 0) return rawLiveData;
    
    const mode = rawLiveData.mode || '';
    const isResults = mode === 'results' || mode === 'finished';
    
    // Keep ALL entries visible (including DNS/FS/Scratch) — they render at 50% opacity
    // instead of being hidden. The SceneObjectRenderer contentFadeOpacity logic handles dimming.
    
    let processedEntries = entries;
    
    if (isResults) {
      // If entries have times but no places, compute places from times
      const hasAnyTime = entries.some((e: any) => e.time && String(e.time).trim() !== '');
      const hasAnyPlace = entries.some((e: any) => e.place && String(e.place).trim() !== '' && /^\d+$/.test(String(e.place).trim()));
      
      let enrichedEntries = entries;
      if (hasAnyTime && !hasAnyPlace) {
        // Parse times and assign places
        const parseTime = (t: string): number => {
          if (!t || t.trim() === '') return Infinity;
          const cleaned = t.trim();
          if (/^[A-Za-z]/.test(cleaned)) return Infinity; // DNS, DNF, DQ, etc.
          if (cleaned.includes(':')) {
            const parts = cleaned.split(':');
            return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
          }
          return parseFloat(cleaned) || Infinity;
        };
        enrichedEntries = [...entries];
        const sorted = enrichedEntries
          .map((e: any, idx: number) => ({ idx, time: parseTime(e.time || '') }))
          .filter(e => e.time !== Infinity)
          .sort((a, b) => a.time - b.time);
        sorted.forEach((item, rank) => {
          enrichedEntries[item.idx] = { ...enrichedEntries[item.idx], place: String(rank + 1) };
        });
      }
      
      processedEntries = [...enrichedEntries].sort((a: any, b: any) => {
        const hasTimeA = a.time && String(a.time).trim() !== '';
        const hasPlaceA = a.place && String(a.place).trim() !== '';
        const hasResultA = hasTimeA || hasPlaceA;
        const hasTimeB = b.time && String(b.time).trim() !== '';
        const hasPlaceB = b.place && String(b.place).trim() !== '';
        const hasResultB = hasTimeB || hasPlaceB;
        if (hasResultA && !hasResultB) return -1;
        if (!hasResultA && hasResultB) return 1;
        if (hasResultA && hasResultB) {
          const placeA = parseInt(a.place) || 999;
          const placeB = parseInt(b.place) || 999;
          return placeA - placeB;
        }
        return 0;
      });
    }
    
    // PERFORMANCE: Create a content fingerprint to detect actual data changes.
    // If the key hasn't changed, return the previous object reference to prevent
    // cascading re-renders down the component tree.
    const contentKey = `${rawLiveData.eventNumber}|${mode}|${processedEntries.length}|${
      processedEntries.map((e: any) => `${e.bib || ''}:${e.time || ''}:${e.place || ''}:${e.mark || ''}`).join(',')
    }`;
    
    if (contentKey === prevLiveDataKeyRef.current && prevLiveDataRef.current) {
      return prevLiveDataRef.current;
    }
    
    const result = {
      ...rawLiveData,
      entries: processedEntries,
    };
    prevLiveDataRef.current = result;
    prevLiveDataKeyRef.current = contentKey;
    return result;
  }, [rawLiveData]);
  
  const totalEntries = useMemo(() => {
    if (!liveData) return 0;
    const entries = liveData.entries || liveData.results || [];
    return entries.length;
  }, [liveData]);
  
  const rawTotalPages = Math.max(1, Math.ceil(totalEntries / pagingSize));
  // maxPages limits how many pages cycle (0 = no limit, show all)
  const totalPages = maxPages > 0 ? Math.min(rawTotalPages, maxPages) : rawTotalPages;
  
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
  
  // Check if we have fixed display dimensions (P10/P6/Custom)
  const isFixedSize = displayWidth !== undefined && displayHeight !== undefined;
  
  if (isFixedSize) {
    // For P10/P6: the scene is designed at the native resolution, render 1:1
    // For Custom: the scene is designed at a larger resolution (e.g. 1920x1080),
    // scale it down to fit within the custom pixel box
    const designWidth = scene.canvasWidth || displayWidth;
    const designHeight = scene.canvasHeight || displayHeight;
    
    // Check if we need scaling (custom display with a scene designed at different resolution)
    const needsScaling = designWidth !== displayWidth || designHeight !== displayHeight;
    
    if (needsScaling) {
      // Scale the design canvas to fit within the fixed pixel box
      const scaleX = displayWidth / designWidth;
      const scaleY = displayHeight / designHeight;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = designWidth * scale;
      const scaledHeight = designHeight * scale;
      const offsetX = (displayWidth - scaledWidth) / 2;
      const offsetY = (displayHeight - scaledHeight) / 2;
      
      return (
        <div 
          className="overflow-hidden display-layout"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: displayWidth,
            height: displayHeight,
            backgroundColor: '#000',
          }}
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
            {sortedObjects.map((obj) => {
              // If object is bound to a specific field port, ONLY show data from that port.
              // Never fall back to global liveData — that would show the wrong event.
              const objectLiveData = obj.dataBinding?.fieldPort
                ? (liveEventDataByPort?.[obj.dataBinding.fieldPort] || null)
                : liveData;
              return (
                <SceneObjectRenderer 
                  key={obj.id} 
                  object={obj} 
                  meetId={meetId}
                  canvasWidth={designWidth}
                  canvasHeight={designHeight}
                  eventNumber={eventNumber}
                  pageIndex={currentPageIndex}
                  pageSize={pagingSize}
                  sharedLatestLiveData={objectLiveData}
                  liveClockTime={liveClockTime}
                  deviceFieldPort={deviceFieldPort}
                  liveEventDataByPort={liveEventDataByPort}
                />
              );
            })}
            
            {sortedObjects.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-[hsl(var(--display-muted))]">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-stadium">Empty</p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // No scaling needed (P10/P6) - render at exact pixel dimensions
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
        {sortedObjects.map((obj) => {
          // If object is bound to a specific field port, ONLY show data from that port.
          // Never fall back to global liveData — that would show the wrong event.
          const objectLiveData = obj.dataBinding?.fieldPort
            ? (liveEventDataByPort?.[obj.dataBinding.fieldPort] || null)
            : liveData;
          return (
            <SceneObjectRenderer 
              key={obj.id} 
              object={obj} 
              meetId={meetId}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              eventNumber={eventNumber}
              pageIndex={currentPageIndex}
              pageSize={pagingSize}
              sharedLatestLiveData={objectLiveData}
              liveClockTime={liveClockTime}
              deviceFieldPort={deviceFieldPort}
              liveEventDataByPort={liveEventDataByPort}
            />
          );
        })}
        
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
        {sortedObjects.map((obj) => {
          // If object is bound to a specific field port, ONLY show data from that port.
          // Never fall back to global liveData — that would show the wrong event.
          const objectLiveData = obj.dataBinding?.fieldPort
            ? (liveEventDataByPort?.[obj.dataBinding.fieldPort] || null)
            : liveData;
          return (
            <SceneObjectRenderer 
              key={obj.id} 
              object={obj} 
              meetId={meetId}
              canvasWidth={designWidth}
              canvasHeight={designHeight}
              eventNumber={eventNumber}
              pageIndex={currentPageIndex}
              pageSize={pagingSize}
              sharedLatestLiveData={objectLiveData}
              liveClockTime={liveClockTime}
              deviceFieldPort={deviceFieldPort}
              liveEventDataByPort={liveEventDataByPort}
            />
          );
        })}
        
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
