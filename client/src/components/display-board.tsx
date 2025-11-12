import { EventWithResults, Meet } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";

interface DisplayBoardProps {
  event?: EventWithResults;
  meet?: Meet;
  mode: "live" | "results" | "schedule" | "standings";
}

export function DisplayBoard({ event, meet, mode }: DisplayBoardProps) {
  if (!event) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-16">
        <div className="text-center">
          <Trophy className="w-32 h-32 text-muted-foreground mx-auto mb-8" />
          <h1 className="text-5xl font-display font-bold text-foreground mb-4">
            Track & Field Scoreboard
          </h1>
          <p className="text-2xl text-muted-foreground">
            Waiting for event data...
          </p>
        </div>
      </div>
    );
  }

  // Check if this is a track or field event
  const isTrackEvent = event.results[0]?.trackResult !== undefined;

  return (
    <div className="h-screen w-full bg-background flex flex-col p-8 md:p-16">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-4 border-border">
        <div className="flex-1">
          <h1
            className="text-5xl md:text-6xl font-display font-bold text-foreground mb-3"
            data-testid="text-event-name"
          >
            {event.name}
          </h1>
          <div className="flex items-center gap-4 text-xl md:text-2xl text-muted-foreground">
            <span className="capitalize">{event.gender}</span>
            <span>•</span>
            <span>{event.round}</span>
            {event.heat && event.heat > 1 && (
              <>
                <span>•</span>
                <span>Heat {event.heat}</span>
              </>
            )}
          </div>
        </div>
        {meet?.logoUrl && (
          <img
            src={meet.logoUrl}
            alt="Meet logo"
            className="max-w-[120px] max-h-[80px]"
            data-testid="img-meet-logo"
          />
        )}
        {meet?.name && !meet?.logoUrl && (
          <div className="text-right">
            <p className="text-xl font-semibold">{meet.name}</p>
            {meet.location && (
              <p className="text-muted-foreground">{meet.location}</p>
            )}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-8">
        <Badge
          variant={event.status === "in_progress" ? "default" : "outline"}
          className="text-2xl px-6 py-2 uppercase tracking-wide"
          data-testid="badge-event-status"
        >
          {event.status === "in_progress"
            ? "IN PROGRESS"
            : event.status === "completed"
            ? "OFFICIAL RESULTS"
            : "ON DECK"}
        </Badge>
      </div>

      {/* Results Grid */}
      {isTrackEvent ? (
        <TrackResultsDisplay event={event} />
      ) : (
        <FieldResultsDisplay event={event} />
      )}
    </div>
  );
}

function TrackResultsDisplay({ event }: { event: EventWithResults }) {
  const sortedResults = [...event.results].sort((a, b) => {
    const aPos = a.trackResult?.position ?? 999;
    const bPos = b.trackResult?.position ?? 999;
    return aPos - bPos;
  });

  return (
    <div className="grid grid-cols-1 gap-4">
      {sortedResults.map((result, index) => {
        const isPodium = index < 3;
        const textSize = index === 0 ? "text-6xl" : "text-5xl";

        return (
          <div
            key={result.athlete.id}
            className={`p-6 rounded-md border-2 ${
              isPodium ? "border-primary bg-primary/5" : "border-border"
            } ${index === 0 ? "ring-2 ring-primary" : ""}`}
            data-testid={`result-row-${result.athlete.id}`}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6 flex-1">
                {/* Position */}
                <div
                  className={`${
                    index === 0 ? "text-8xl" : "text-7xl"
                  } font-display font-extrabold text-primary min-w-[100px] text-center`}
                  data-testid={`text-position-${result.athlete.id}`}
                >
                  {result.trackResult?.position}
                </div>

                {/* Lane */}
                {result.trackResult?.lane && (
                  <div className="text-3xl font-semibold text-muted-foreground min-w-[80px]">
                    Lane {result.trackResult.lane}
                  </div>
                )}

                {/* Athlete Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2
                      className={`${textSize} font-display font-semibold text-foreground`}
                      data-testid={`text-athlete-name-${result.athlete.id}`}
                    >
                      {result.athlete.name}
                    </h2>
                    {result.athlete.country && (
                      <img
                        src={`https://flagcdn.com/24x18/${result.athlete.country}.png`}
                        srcSet={`https://flagcdn.com/48x36/${result.athlete.country}.png 2x`}
                        alt={`${result.athlete.country} flag`}
                        className="w-8 h-auto"
                        data-testid={`img-flag-${result.athlete.id}`}
                      />
                    )}
                  </div>
                  {result.athlete.team && (
                    <p className="text-2xl text-muted-foreground">
                      {result.athlete.team}
                    </p>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="text-right">
                <div
                  className={`${
                    index === 0 ? "text-7xl" : "text-6xl"
                  } font-mono font-bold text-foreground`}
                  data-testid={`text-time-${result.athlete.id}`}
                >
                  {result.trackResult?.time?.toFixed(2)}
                </div>
                {result.trackResult?.reaction && (
                  <p className="text-xl text-muted-foreground mt-2">
                    RT: {result.trackResult.reaction.toFixed(3)}
                  </p>
                )}
                {result.trackResult?.isDisqualified && (
                  <Badge variant="destructive" className="mt-2 text-lg">
                    DQ
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldResultsDisplay({ event }: { event: EventWithResults }) {
  const sortedResults = [...event.results].sort((a, b) => {
    const aPos = a.fieldResult?.position ?? 999;
    const bPos = b.fieldResult?.position ?? 999;
    return aPos - bPos;
  });

  return (
    <div className="space-y-4">
      {sortedResults.map((result, index) => {
        const isPodium = index < 3;
        const textSize = index === 0 ? "text-5xl" : "text-4xl";

        return (
          <div
            key={result.athlete.id}
            className={`p-6 rounded-md border-2 ${
              isPodium ? "border-primary bg-primary/5" : "border-border"
            } ${index === 0 ? "ring-2 ring-primary" : ""}`}
            data-testid={`result-row-${result.athlete.id}`}
          >
            <div className="flex items-center justify-between gap-6 mb-4">
              <div className="flex items-center gap-6 flex-1">
                {/* Position with Medal */}
                <div className="flex items-center gap-2">
                  <div
                    className={`${
                      index === 0 ? "text-7xl" : "text-6xl"
                    } font-display font-extrabold text-primary min-w-[80px] text-center`}
                    data-testid={`text-position-${result.athlete.id}`}
                  >
                    {result.fieldResult?.position}
                  </div>
                  {isPodium && <Medal className="w-12 h-12 text-primary" />}
                </div>

                {/* Athlete Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2
                      className={`${textSize} font-display font-semibold text-foreground`}
                      data-testid={`text-athlete-name-${result.athlete.id}`}
                    >
                      {result.athlete.name}
                    </h2>
                    {result.athlete.country && (
                      <img
                        src={`https://flagcdn.com/24x18/${result.athlete.country}.png`}
                        srcSet={`https://flagcdn.com/48x36/${result.athlete.country}.png 2x`}
                        alt={`${result.athlete.country} flag`}
                        className="w-8 h-auto"
                      />
                    )}
                  </div>
                  {result.athlete.team && (
                    <p className="text-xl text-muted-foreground">
                      {result.athlete.team}
                    </p>
                  )}
                </div>
              </div>

              {/* Best Mark */}
              <div className="text-right">
                <div
                  className={`${
                    index === 0 ? "text-7xl" : "text-6xl"
                  } font-mono font-bold text-foreground`}
                  data-testid={`text-best-mark-${result.athlete.id}`}
                >
                  {result.fieldResult?.bestMark?.toFixed(2)}m
                </div>
                {result.fieldResult?.isDisqualified && (
                  <Badge variant="destructive" className="mt-2 text-lg">
                    DQ
                  </Badge>
                )}
              </div>
            </div>

            {/* Attempts */}
            <div className="grid grid-cols-6 gap-2 mt-4 pt-4 border-t">
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const attempt =
                  result.fieldResult?.[`attempt${num}` as keyof typeof result.fieldResult];
                return (
                  <div
                    key={num}
                    className="text-center p-2 bg-muted rounded"
                    data-testid={`attempt-${num}-${result.athlete.id}`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      #{num}
                    </div>
                    <div className="text-lg font-mono font-semibold">
                      {attempt ? `${Number(attempt).toFixed(2)}` : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
