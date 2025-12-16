import { EventWithEntries, Meet } from "@shared/schema";
import {
  LiveResultsBoard,
  FieldEventBoard,
  LiveTimeBoard,
  SingleResultBoard,
  StandingsBoard,
  ScrollingResultsBoard,
} from "./templates";
import { Trophy, Medal } from "lucide-react";

interface DisplayControllerProps {
  event?: EventWithEntries;
  meet?: Meet;
  mode: "live" | "results" | "schedule" | "standings";
  boardType?: "live-results" | "live-time" | "single-result" | "field-event" | "standings";
  pagingSize?: number;
  pagingInterval?: number;
}

interface BoardTemplateProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

export function DisplayController({ event, meet, mode, boardType = "live-results", pagingSize = 8, pagingInterval = 5 }: DisplayControllerProps) {
  if (!event) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center p-16">
        <div className="text-center">
          <Trophy className="w-32 h-32 text-[hsl(var(--display-accent))] mx-auto mb-8" />
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4">
            Track & Field Scoreboard
          </h1>
          <p className="text-[40px] text-[hsl(var(--display-muted))]">
            Waiting for event data...
          </p>
        </div>
      </div>
    );
  }

  if (!event.entries || event.entries.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center p-16">
        <div className="text-center">
          <Medal className="w-32 h-32 text-[hsl(var(--display-accent))] mx-auto mb-8" />
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4">
            {event.name}
          </h1>
          <p className="text-[40px] text-[hsl(var(--display-muted))]">
            No results available yet
          </p>
        </div>
      </div>
    );
  }

  // When event is completed, use scrolling results board to cycle through all results
  if (event.status === "completed") {
    return <ScrollingResultsBoard event={event} meet={meet} mode="results" resultsPerPage={pagingSize} scrollIntervalMs={pagingInterval * 1000} />;
  }

  const boardTemplates: Record<string, React.ComponentType<BoardTemplateProps>> = {
    "live-results": LiveResultsBoard,
    "live-time": LiveTimeBoard,
    "single-result": SingleResultBoard,
    "field-event": FieldEventBoard,
    "standings": StandingsBoard,
  };

  const BoardTemplate = boardTemplates[boardType] || LiveResultsBoard;

  if (!boardTemplates[boardType]) {
    console.warn(`Unknown board type: ${boardType}, falling back to live-results`);
  }

  return <BoardTemplate event={event} meet={meet} mode={mode} />;
}
