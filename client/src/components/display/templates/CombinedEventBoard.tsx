import { useQuery } from "@tanstack/react-query";
import { CombinedEventStanding, SelectCombinedEvent } from "@shared/schema";
import { Trophy, Medal, Target } from "lucide-react";

interface CombinedEventBoardProps {
  combinedEventId: number;
  meetId?: string;
  showBreakdown?: boolean;
  maxAthletes?: number;
}

export function CombinedEventBoard({ 
  combinedEventId, 
  showBreakdown = true,
  maxAthletes = 8 
}: CombinedEventBoardProps) {
  const { data: combinedEvent, isLoading: eventLoading } = useQuery<SelectCombinedEvent>({
    queryKey: ['/api/combined-events', combinedEventId],
  });

  const { data: standings = [], isLoading: standingsLoading } = useQuery<CombinedEventStanding[]>({
    queryKey: ['/api/combined-events', combinedEventId, 'standings'],
  });

  if (eventLoading || standingsLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]" data-testid="combined-event-loading">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-[hsl(var(--display-accent))] mx-auto mb-4 animate-pulse" />
          <p className="text-[48px] font-stadium text-[hsl(var(--display-muted))]">
            Loading Combined Event...
          </p>
        </div>
      </div>
    );
  }

  if (!combinedEvent) {
    return (
      <div className="flex items-center justify-center h-full bg-[hsl(var(--display-bg))]" data-testid="combined-event-not-found">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-[hsl(var(--display-warning))] mx-auto mb-4" />
          <p className="text-[48px] font-stadium text-[hsl(var(--display-muted))]">
            Combined Event Not Found
          </p>
        </div>
      </div>
    );
  }

  const displayStandings = standings.slice(0, maxAthletes);
  const eventTypeName = getEventTypeName(combinedEvent.eventType);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--display-bg))] text-[hsl(var(--display-fg))] p-4" data-testid="combined-event-board">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-[hsl(var(--display-accent))]">
        <div className="flex items-center gap-4">
          <Target className="w-16 h-16 text-[hsl(var(--display-accent))]" />
          <div>
            <h1 className="text-[56px] font-stadium font-[900] uppercase tracking-tight leading-none">
              {combinedEvent.name}
            </h1>
            <p className="text-[28px] text-[hsl(var(--display-muted))] font-stadium">
              {eventTypeName} - {combinedEvent.gender === 'M' ? 'Men' : 'Women'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={combinedEvent.status} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid gap-2">
          <div className="grid grid-cols-[80px_1fr_120px_180px] gap-4 px-4 py-2 text-[24px] font-stadium text-[hsl(var(--display-muted))] border-b border-[hsl(var(--display-border))]">
            <div>RANK</div>
            <div>ATHLETE</div>
            <div className="text-center">EVENTS</div>
            <div className="text-right">TOTAL PTS</div>
          </div>

          {displayStandings.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[36px] font-stadium text-[hsl(var(--display-muted))]">
                No athletes registered
              </p>
            </div>
          ) : (
            displayStandings.map((standing, index) => (
              <AthleteRow 
                key={standing.athleteId} 
                standing={standing}
                showBreakdown={showBreakdown}
                isHighlighted={index < 3}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface AthleteRowProps {
  standing: CombinedEventStanding;
  showBreakdown: boolean;
  isHighlighted: boolean;
}

function AthleteRow({ standing, showBreakdown, isHighlighted }: AthleteRowProps) {
  const medalColors: Record<number, string> = {
    1: "text-[#FFD700]",
    2: "text-[#C0C0C0]",
    3: "text-[#CD7F32]"
  };

  return (
    <div 
      className={`
        grid gap-4 px-4 py-3 rounded-lg transition-colors
        ${isHighlighted ? 'bg-[hsl(var(--display-accent)/0.1)] border border-[hsl(var(--display-accent)/0.3)]' : 'bg-[hsl(var(--display-card))]'}
      `}
      data-testid={`combined-standing-${standing.rank}`}
    >
      <div className="grid grid-cols-[80px_1fr_120px_180px] gap-4 items-center">
        <div className="flex items-center justify-center">
          {standing.rank <= 3 ? (
            <Medal className={`w-10 h-10 ${medalColors[standing.rank]}`} />
          ) : (
            <span className="text-[40px] font-stadium font-[900] text-[hsl(var(--display-muted))]">
              {standing.rank}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[36px] font-stadium font-[700] truncate">
            {standing.athleteName}
          </p>
          {standing.teamName && (
            <p className="text-[22px] text-[hsl(var(--display-muted))] whitespace-nowrap truncate">
              {standing.teamName}
            </p>
          )}
        </div>

        <div className="text-center">
          <span className="text-[36px] font-stadium font-[700] text-[hsl(var(--display-accent))]">
            {standing.eventsCompleted}
          </span>
          <span className="text-[24px] text-[hsl(var(--display-muted))]">
            /{getTotalEventsCount(standing)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[48px] font-stadium font-[900] text-[hsl(var(--display-accent))]">
            {standing.totalPoints.toLocaleString()}
          </span>
        </div>
      </div>

      {showBreakdown && standing.breakdown && standing.breakdown.length > 0 && (
        <div className="col-span-full mt-2 ml-[84px]">
          <div className="flex flex-wrap gap-2">
            {standing.breakdown.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 bg-[hsl(var(--display-bg))] px-3 py-1 rounded text-[18px]"
              >
                <span className="font-stadium text-[hsl(var(--display-muted))]">
                  {item.eventName}:
                </span>
                <span className="font-stadium font-[600]">
                  {item.performance}
                </span>
                <span className="font-stadium font-[700] text-[hsl(var(--display-accent))]">
                  ({item.points} pts)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; text: string }> = {
    scheduled: { color: "bg-blue-600", text: "SCHEDULED" },
    in_progress: { color: "bg-green-600 animate-pulse", text: "IN PROGRESS" },
    completed: { color: "bg-gray-600", text: "FINAL" }
  };

  const config = statusConfig[status] || statusConfig.scheduled;

  return (
    <div 
      className={`${config.color} px-6 py-2 rounded-full inline-flex items-center gap-2`}
      data-testid={`status-badge-${status}`}
    >
      <span className="text-[24px] font-stadium font-[700] text-white uppercase tracking-wider">
        {config.text}
      </span>
    </div>
  );
}

function getEventTypeName(eventType: string): string {
  const names: Record<string, string> = {
    decathlon: "Decathlon",
    heptathlon: "Heptathlon",
    indoor_heptathlon: "Indoor Heptathlon",
    indoor_pentathlon: "Indoor Pentathlon",
    outdoor_pentathlon: "Outdoor Pentathlon"
  };
  return names[eventType] || eventType;
}

function getTotalEventsCount(standing: CombinedEventStanding): number {
  if (standing.breakdown && standing.breakdown.length > 0) {
    return standing.breakdown.length;
  }
  return 10;
}

export default CombinedEventBoard;
