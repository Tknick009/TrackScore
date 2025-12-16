import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
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
import { Trophy, Clock, Users, User, Image, Type, Award, Loader2 } from "lucide-react";

interface SceneDisplayProps {
  sceneId?: string;
}

interface ObjectData {
  event?: EventWithEntries;
  meet?: Meet;
  liveData?: any;
  standings?: any[];
  isLoading?: boolean;
  error?: any;
}

function useSceneObjects(sceneId: string | undefined) {
  return useQuery<SelectLayoutObject[]>({
    queryKey: ["/api/layout-objects", { sceneId }],
    queryFn: async () => {
      if (!sceneId) return [];
      const res = await fetch(`/api/layout-objects?sceneId=${sceneId}`);
      if (!res.ok) throw new Error("Failed to load objects");
      return res.json();
    },
    enabled: !!sceneId,
    staleTime: 5000,
  });
}

function useScene(sceneId: string | undefined) {
  return useQuery<SelectLayoutScene>({
    queryKey: ["/api/layout-scenes", sceneId],
    queryFn: async () => {
      if (!sceneId) throw new Error("No scene ID");
      const res = await fetch(`/api/layout-scenes/${sceneId}`);
      if (!res.ok) throw new Error("Failed to load scene");
      return res.json();
    },
    enabled: !!sceneId,
    staleTime: 10000,
  });
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

function SceneObjectRenderer({ 
  object, 
  meetId,
  canvasWidth,
  canvasHeight,
  eventNumber
}: { 
  object: SelectLayoutObject; 
  meetId?: string;
  canvasWidth: number;
  canvasHeight: number;
  eventNumber?: string;
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
  
  // Use lynxPort from dataBinding, or fallback to eventNumber from URL for auto-mode
  const liveEventKey = lynxPort || eventNumber;
  
  const { data: event, isLoading: eventLoading } = useEventWithEntries(
    dataBinding.sourceType === "events" ? eventId : null
  );
  const { data: meet } = useMeet(meetId);
  
  // Fetch specific live event data if we have an event key
  const { data: specificLiveData } = useLiveEventData(
    dataBinding.sourceType === "live-data" && liveEventKey ? liveEventKey : null
  );
  
  // Fallback: fetch latest live event data if no specific event is provided
  const { data: latestLiveData } = useLatestLiveEventData();
  
  // Use specific data if available, otherwise fall back to latest
  const liveData = dataBinding.sourceType === "live-data" 
    ? (specificLiveData || latestLiveData) 
    : null;
  
  const { data: standings } = useTeamStandings(
    dataBinding.sourceType === "standings" ? meetId : null
  );
  
  const left = (object.x / 100) * canvasWidth;
  const top = (object.y / 100) * canvasHeight;
  const width = (object.width / 100) * canvasWidth;
  const height = (object.height / 100) * canvasHeight;
  
  const objectStyle: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    zIndex: object.zIndex,
    overflow: "hidden",
    backgroundColor: styleConfig.backgroundColor || "transparent",
    borderRadius: styleConfig.borderRadius || "0px",
    opacity: styleConfig.opacity ?? 1,
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
        const boardType = componentConfig.boardType || "live-results";
        if (event.status === "completed" && componentConfig.scrollOnComplete !== false) {
          return <ScrollingResultsBoard event={event} meet={meet} mode="results" />;
        }
        if (boardType === "field-event") {
          return <FieldEventBoard event={event} meet={meet} mode="live" />;
        }
        if (boardType === "live-time") {
          return <LiveTimeBoard event={event} meet={meet} mode="live" />;
        }
        if (boardType === "standings") {
          return <StandingsBoard event={event} meet={meet} mode="live" />;
        }
        return <LiveResultsBoard event={event} meet={meet} mode="live" />;
        
      case "timer":
        return (
          <div 
            className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]"
            style={{ fontSize: componentConfig.fontSize === 'xlarge' ? '96px' : componentConfig.fontSize === 'large' ? '72px' : componentConfig.fontSize === 'medium' ? '48px' : '36px' }}
          >
            <div className="font-stadium-numbers font-[900] text-[hsl(var(--display-fg))]">
              {liveData?.runningTime || "00:00.00"}
            </div>
          </div>
        );
        
      case "event-header":
        return (
          <div className="flex flex-col justify-center h-full p-4 bg-[hsl(var(--display-bg))]">
            <h1 
              className="font-stadium font-[900] text-[hsl(var(--display-fg))] uppercase truncate"
              style={{ fontSize: componentConfig.fontSize === 'xlarge' ? '64px' : componentConfig.fontSize === 'large' ? '48px' : componentConfig.fontSize === 'medium' ? '36px' : '24px' }}
            >
              {event?.name || componentConfig.staticText || componentConfig.textContent || "Event Name"}
            </h1>
            {componentConfig.showStatus && event?.status && (
              <p className="text-[hsl(var(--display-accent))] font-stadium text-lg uppercase">
                {event.status}
              </p>
            )}
          </div>
        );
        
      case "logo":
        const logoUrl = componentConfig.logoType === "meet" 
          ? meet?.logoUrl 
          : (componentConfig.logoUrl || componentConfig.imageUrl);
        if (!logoUrl) {
          return (
            <div className="flex items-center justify-center h-full">
              <Image className="w-12 h-12 text-[hsl(var(--display-muted))] opacity-30" />
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center h-full p-2">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="max-w-full max-h-full object-contain"
              style={{ objectFit: componentConfig.objectFit || componentConfig.imageFit || "contain" }}
            />
          </div>
        );
        
      case "text":
        // Resolve field binding to actual value from live data
        const fieldKey = dataBinding.fieldKey as string | undefined;
        let textContent = componentConfig.text || componentConfig.textContent || componentConfig.dynamicText;
        
        if (fieldKey && liveData) {
          // Build event name from distance/event number
          const eventName = liveData.distance 
            ? `${liveData.distance}m` 
            : `Event ${liveData.eventNumber}`;
          
          // Get first entry for single-athlete fields
          const firstEntry = Array.isArray(liveData.entries) && liveData.entries.length > 0 
            ? liveData.entries[0] 
            : null;
          
          // Map fieldKey to live data value
          const fieldMap: Record<string, any> = {
            'event-name': eventName,
            'event-number': liveData.eventNumber,
            'distance': liveData.distance,
            'heat-number': liveData.heat,
            'round': liveData.round,
            'wind': liveData.wind,
            'status': liveData.status,
            'lane': firstEntry?.lane,
            'place': firstEntry?.place,
            'name': firstEntry?.name,
            'first-name': firstEntry?.firstName,
            'last-name': firstEntry?.lastName,
            'school': firstEntry?.affiliation || firstEntry?.team,
            'time': firstEntry?.time || firstEntry?.mark,
            'last-split': firstEntry?.lastSplit,
            'cumulative-split': firstEntry?.cumulativeSplit,
            'reaction-time': firstEntry?.reactionTime,
            'running-time': liveData.runningTime,
            'bib': firstEntry?.bib,
          };
          const resolvedValue = fieldMap[fieldKey];
          if (resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== '') {
            textContent = String(resolvedValue);
          }
        }
        
        return (
          <div 
            className="flex items-center justify-center h-full p-2"
            style={{
              fontSize: componentConfig.fontSize === 'xlarge' ? '48px' : componentConfig.fontSize === 'large' ? '36px' : componentConfig.fontSize === 'medium' ? '24px' : '18px',
              fontWeight: componentConfig.fontWeight || "normal",
              color: componentConfig.textColor || styleConfig.textColor || "hsl(var(--display-fg))",
              textAlign: componentConfig.textAlign || "center",
            }}
          >
            {textContent || "Label"}
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
                  <div className="flex items-center gap-3">
                    <span className="font-stadium-numbers text-xl font-[700] text-[hsl(var(--display-accent))] w-8">
                      {index + 1}
                    </span>
                    <span className="font-stadium text-lg text-[hsl(var(--display-fg))]">
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
                    <span className="font-stadium text-lg text-[hsl(var(--display-fg))] truncate block">
                      {entry.athlete.firstName} {entry.athlete.lastName}
                    </span>
                    {entry.team && (
                      <span className="text-sm text-[hsl(var(--display-muted))] truncate block">
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
        const windValue = liveData?.wind || event?.entries?.[0]?.finalWind;
        return (
          <div 
            className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))] gap-2"
            style={{ fontSize: componentConfig.fontSize === 'xlarge' ? '48px' : componentConfig.fontSize === 'large' ? '36px' : componentConfig.fontSize === 'medium' ? '28px' : '20px' }}
          >
            <span className="text-[hsl(var(--display-muted))]">Wind:</span>
            <span className="font-stadium-numbers font-[700] text-[hsl(var(--display-fg))]">
              {windValue !== undefined && windValue !== null ? `${windValue > 0 ? '+' : ''}${windValue.toFixed(1)}` : '--.-'} m/s
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
              {athlete.athlete.firstName} {athlete.athlete.lastName}
            </h3>
            {athlete.team && (
              <p className="text-lg text-[hsl(var(--display-muted))]">{athlete.team.name}</p>
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
                    <span className="font-stadium text-sm text-[hsl(var(--display-fg))] truncate max-w-full">
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
        const attempts = liveData?.attempts || event?.entries?.[0]?.attempts || [];
        const maxAttemptCount = componentConfig.maxAttempts || 6;
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
        const recordsList = liveData?.records || componentConfig.records || [];
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

export default function SceneDisplay() {
  const params = useParams();
  const [location] = useLocation();
  
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const sceneId = params.sceneId || urlParams.get("sceneId") || undefined;
  const meetId = urlParams.get("meetId") || undefined;
  const eventNumber = urlParams.get("eventNumber") || undefined;
  
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const { data: scene, isLoading: sceneLoading, error: sceneError } = useScene(sceneId);
  const { data: objects = [], isLoading: objectsLoading } = useSceneObjects(sceneId);
  
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
  
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log("Scene display WebSocket connected");
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "event_update":
          case "board_update":
          case "entry_update":
            if (message.data?.id || message.data?.eventId) {
              const eventId = message.data.id || message.data.eventId || message.data?.currentEvent?.id;
              if (eventId) {
                queryClient.invalidateQueries({
                  queryKey: [`/api/events/${eventId}/entries`],
                });
              }
            }
            break;
            
          case "live_data_update":
            if (message.data?.eventNumber) {
              queryClient.invalidateQueries({
                queryKey: ["/api/live-events", message.data.eventNumber],
              });
            }
            break;
            
          case "standings_update":
            if (meetId) {
              queryClient.invalidateQueries({
                queryKey: [`/api/meets/${meetId}/scoring/standings`],
              });
            }
            break;
            
          case "scene_update":
            if (sceneId) {
              queryClient.invalidateQueries({
                queryKey: ["/api/layout-scenes", sceneId],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/layout-objects", { sceneId }],
              });
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error("Scene display WebSocket error:", error);
    };
    
    websocket.onclose = () => {
      console.log("Scene display WebSocket disconnected");
    };
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [sceneId, meetId]);
  
  if (sceneLoading || objectsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--display-bg))]">
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
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--display-bg))]">
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
  
  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor }}
      data-testid="scene-display"
    >
      <div 
        className="relative w-full h-full"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
        }}
      >
        {sortedObjects.map((obj) => (
          <SceneObjectRenderer 
            key={obj.id} 
            object={obj} 
            meetId={meetId}
            canvasWidth={dimensions.width}
            canvasHeight={dimensions.height}
            eventNumber={eventNumber}
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
