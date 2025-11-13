import { EventWithEntries, Meet } from "@shared/schema";
import { Award } from "lucide-react";
import { EventHeader } from "../shared";

interface StandingsBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

export function StandingsBoard({ event, meet, mode }: StandingsBoardProps) {
  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] relative">
      {meet?.logoUrl && (
        <img
          src={meet.logoUrl}
          alt="Meet logo"
          className="absolute top-8 right-8 max-w-[120px] max-h-[80px] z-10"
          data-testid="img-meet-logo"
        />
      )}

      <div className="flex flex-col">
        <EventHeader event={event} meet={meet} mode={mode} />
        
        <div className="flex items-center justify-center p-16 min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <Award className="w-32 h-32 text-[hsl(var(--display-accent))] mx-auto mb-8" />
            <h2 className="font-stadium text-[72px] font-[700] text-[hsl(var(--display-fg))] mb-8">
              Standings Board
            </h2>
            <p className="text-[48px] text-[hsl(var(--display-muted))]">
              Coming Soon
            </p>
            <p className="text-[32px] text-[hsl(var(--display-muted))] mt-4">
              Compiled meet standings and team scores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
