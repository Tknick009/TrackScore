import { EventWithEntries, Meet } from "@shared/schema";

interface EventHeaderProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

export function EventHeader({ event, meet, mode }: EventHeaderProps) {
  const getModeLabel = () => {
    if (mode === "live" && event.status === "in_progress") return "LIVE";
    if (mode === "results" || event.status === "completed") return "OFFICIAL RESULTS";
    if (mode === "schedule") return "UPCOMING";
    return "ON DECK";
  };

  return (
    <>
      {/* Header Band - 160px total height */}
      <div className="h-[160px] flex flex-col justify-center px-8 border-b-2 border-[hsl(var(--display-border))]">
        {/* Event Title - 88px */}
        <h1
          className="font-stadium text-[88px] font-[900] text-[hsl(var(--display-fg))] leading-none mb-3"
          data-testid="text-event-name"
        >
          {event.name}
        </h1>
        {/* Metadata - 48px */}
        <div className="flex items-center gap-6 text-[48px] text-[hsl(var(--display-muted))] leading-none">
          <span className="capitalize">{event.gender}</span>
        </div>
      </div>

      {/* Status Bar - 96px height */}
      <div className="h-[96px] flex items-center px-8 border-b-2 border-[hsl(var(--display-border))]">
        <div
          className={`h-[96px] flex items-center justify-center px-12 font-[700] text-[48px] uppercase tracking-wide text-[hsl(var(--display-fg))] ${
            mode === "live" && event.status === "in_progress"
              ? "bg-[hsl(var(--display-success))] animate-[pulse_2s_ease-in-out_infinite]"
              : "bg-[hsl(var(--display-accent))]"
          }`}
          data-testid="badge-event-status"
        >
          {getModeLabel()}
        </div>
      </div>
    </>
  );
}
