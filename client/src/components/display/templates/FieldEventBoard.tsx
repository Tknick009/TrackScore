import { useState, useEffect, useRef, useMemo } from "react";
import { EventWithEntries, Meet, AthleteBest, FieldEventAthlete, FieldEventMark, FieldHeight, Entry, Athlete } from "@shared/schema";
import { EventHeader, FieldAthleteCard, FieldAttemptGrid } from "../shared";
import { generateAttemptHeaders } from "../utils";
import type { HorizontalStanding, VerticalStanding } from "@/lib/fieldStandings";
import { getLogoEffectStyle } from "@/lib/logoEffects";
import { liveDataToEntries, type LiveFieldEventData } from "@/lib/fieldEventAdapter";

interface FieldEventBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
  fieldEventData?: LiveFieldEventData;
}

const athleteBestsCache = new Map<string, Map<string, AthleteBest[]>>();

export function FieldEventBoard({ event, meet, mode, fieldEventData }: FieldEventBoardProps) {
  const [athleteBestsMap, setAthleteBestsMap] = useState<Map<string, AthleteBest[]>>(new Map());
  const lastMeetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!meet?.id) {
      setAthleteBestsMap(new Map());
      return;
    }

    if (meet.id === lastMeetIdRef.current && athleteBestsCache.has(meet.id)) {
      setAthleteBestsMap(athleteBestsCache.get(meet.id)!);
      return;
    }

    lastMeetIdRef.current = meet.id;
    let cancelled = false;

    const fetchBests = async () => {
      try {
        const response = await fetch(`/api/meets/${meet.id}/athlete-bests`);
        if (cancelled) return;
        
        if (response.ok) {
          const bests: AthleteBest[] = await response.json();
          const map = new Map<string, AthleteBest[]>();
          for (const best of bests) {
            const existing = map.get(best.athleteId) || [];
            existing.push(best);
            map.set(best.athleteId, existing);
          }
          athleteBestsCache.set(meet.id, map);
          setAthleteBestsMap(map);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch athlete bests:", error);
        }
      }
    };

    fetchBests();

    return () => {
      cancelled = true;
    };
  }, [meet?.id]);

  const sortedResults = useMemo(() => {
    if (fieldEventData) {
      return liveDataToEntries(fieldEventData);
    }
    return [...event.entries].sort((a, b) => {
      const aPos = a.finalPlace ?? 999;
      const bPos = b.finalPlace ?? 999;
      return aPos - bPos;
    });
  }, [event.entries, fieldEventData]);

  const headers = generateAttemptHeaders(sortedResults);

  const currentAthleteId = fieldEventData?.currentAthleteId;

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] relative">
      {meet?.logoUrl && (
        <img
          src={meet.logoUrl}
          alt="Meet logo"
          className="absolute top-8 right-8 max-w-[120px] max-h-[80px] z-10"
          style={getLogoEffectStyle(meet.logoEffect)}
          data-testid="img-meet-logo"
        />
      )}

      <div className="flex flex-col">
        <EventHeader event={event} meet={meet} mode={mode} />

        <div className="p-8">
          <div className="space-y-8">
            {sortedResults.map((result, index) => {
              const position = result.finalPlace ?? 0;
              const isLeader = position === 1;
              const isPodium = position <= 3;
              const isCurrent = currentAthleteId !== null && 
                currentAthleteId !== undefined && 
                String(result.athlete.id) === String(currentAthleteId);
              
              const rowBg = isCurrent
                ? "bg-[hsl(var(--display-accent))]/25 ring-2 ring-[hsl(var(--display-accent))]"
                : isLeader
                  ? "bg-[hsl(var(--display-accent))]/12"
                  : index % 2 === 0
                    ? "bg-[hsl(var(--display-border))]/20"
                    : "";
              
              const bests = athleteBestsMap.get(result.athlete.id);

              return (
                <div
                  key={result.athlete.id}
                  className={`p-6 ${rowBg} transition-all duration-300`}
                  data-testid={`result-row-${result.athlete.id}`}
                >
                  <div className="grid grid-cols-2 gap-8">
                    <FieldAthleteCard 
                      result={result} 
                      isLeader={isLeader} 
                      isPodium={isPodium} 
                      athleteBests={bests}
                    />
                    <FieldAttemptGrid result={result} headers={headers} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
