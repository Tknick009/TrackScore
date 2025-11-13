import { EntryWithDetails } from "@shared/schema";
import { Star } from "lucide-react";
import { getPodiumColor, formatResult } from "../utils";

interface FieldAthleteCardProps {
  result: EntryWithDetails;
  isLeader: boolean;
  isPodium: boolean;
}

export function FieldAthleteCard({ result, isLeader, isPodium }: FieldAthleteCardProps) {
  const position = result.finalPlace ?? 0;
  const athleteName = `${result.athlete.firstName} ${result.athlete.lastName}`;
  
  return (
    <div className="flex items-center gap-6">
      {/* Position badge */}
      {isPodium && (
        <div
          className={`w-[96px] h-[96px] rounded-full flex items-center justify-center font-stadium-numbers text-[64px] font-[900] text-[hsl(var(--display-bg))] shrink-0 ${
            isLeader ? 'animate-[pulse_600ms_ease-in-out_infinite]' : ''
          }`}
          style={{ backgroundColor: getPodiumColor(position) }}
          data-testid={`text-position-${result.athlete.id}`}
        >
          {position}
        </div>
      )}
      {!isPodium && (
        <div
          className="w-[96px] h-[96px] rounded-full border-4 border-[hsl(var(--display-muted))] flex items-center justify-center font-stadium-numbers text-[64px] font-[900] text-[hsl(var(--display-muted))] shrink-0"
          data-testid={`text-position-${result.athlete.id}`}
        >
          {position}
        </div>
      )}

      {/* Athlete info */}
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-2">
          <h2
            className="font-stadium text-[64px] font-[700] text-[hsl(var(--display-fg))] leading-none"
            data-testid={`text-athlete-name-${result.athlete.id}`}
          >
            {athleteName}
          </h2>
          {result.isDisqualified && (
            <span className="text-[48px] font-[700] text-[hsl(var(--display-warning))]">
              DQ
            </span>
          )}
        </div>
        {result.team && (
          <p className="text-[40px] text-[hsl(var(--display-muted))] leading-none mb-1">
            {result.team.name}
          </p>
        )}
        {/* Best mark */}
        <div className="flex items-center gap-3 mt-4">
          <div
            className="font-stadium-numbers text-[120px] font-[900] text-[hsl(var(--display-fg))] leading-none animate-slide-in-right"
            data-testid={`text-best-mark-${result.athlete.id}`}
          >
            {formatResult(result)}
          </div>
          {isLeader && (
            <Star className="w-16 h-16 fill-[#FFD700] text-[#FFD700]" />
          )}
        </div>
      </div>
    </div>
  );
}
