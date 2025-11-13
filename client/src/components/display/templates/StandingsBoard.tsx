import { EventWithEntries, Meet } from "@shared/schema";
import { EventHeader } from "../shared";
import { getPodiumColor } from "../utils";
import { Award } from "lucide-react";

interface StandingsBoardProps {
  event: EventWithEntries;
  meet?: Meet;
  mode: string;
}

export function StandingsBoard({ event, meet, mode }: StandingsBoardProps) {
  // Aggregate results by team for THIS event
  interface TeamScore {
    teamName: string;
    athletes: number;
    topFinish: number; // Best placement
    gold: number;
    silver: number;
    bronze: number;
    totalPoints: number; // Sum of (positions)
  }

  const scoresByTeam = new Map<string, TeamScore>();

  event.entries.forEach(entry => {
    if (!entry.team || !entry.finalPlace) return;
    
    const teamName = entry.team.name;
    if (!scoresByTeam.has(teamName)) {
      scoresByTeam.set(teamName, {
        teamName,
        athletes: 0,
        topFinish: 999,
        gold: 0,
        silver: 0,
        bronze: 0,
        totalPoints: 0
      });
    }

    const score = scoresByTeam.get(teamName)!;
    score.athletes++;
    score.topFinish = Math.min(score.topFinish, entry.finalPlace);
    score.totalPoints += entry.finalPlace;

    if (entry.finalPlace === 1) score.gold++;
    if (entry.finalPlace === 2) score.silver++;
    if (entry.finalPlace === 3) score.bronze++;
  });

  const teamStandings = Array.from(scoresByTeam.values())
    .sort((a, b) => {
      // Sort by best finish, then total points (lower is better)
      if (a.topFinish !== b.topFinish) return a.topFinish - b.topFinish;
      return a.totalPoints - b.totalPoints;
    });

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--display-bg))]">
      <EventHeader event={event} meet={meet} mode={mode} />
      
      <div className="p-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <Award className="w-16 h-16 text-[hsl(var(--display-accent))]" />
            <h2 className="font-stadium text-[64px] font-[700] text-[hsl(var(--display-fg))]">
              Event Team Standings
            </h2>
          </div>

          {teamStandings.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-[48px] text-[hsl(var(--display-muted))]">
                No team results available yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table header */}
              <div className="grid grid-cols-7 gap-4 p-4 bg-[hsl(var(--display-bg-elevated))] rounded-lg">
                <div className="col-span-2 font-stadium text-[32px] text-[hsl(var(--display-muted))]">
                  TEAM
                </div>
                <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center">
                  ATHLETES
                </div>
                <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center">
                  BEST
                </div>
                <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center">
                  GOLD
                </div>
                <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center">
                  SILVER
                </div>
                <div className="font-stadium text-[32px] text-[hsl(var(--display-muted))] text-center">
                  BRONZE
                </div>
              </div>

              {/* Team rows */}
              {teamStandings.map((team, index) => (
                <div
                  key={team.teamName}
                  className={`grid grid-cols-7 gap-4 p-6 rounded-lg ${
                    index < 3 ? 'bg-[hsl(var(--display-accent))]/10' : 'bg-[hsl(var(--display-border))]/20'
                  }`}
                  data-testid={`team-row-${index}`}
                >
                  <div className="col-span-2 flex items-center gap-4">
                    <div className="font-stadium-numbers text-[48px] font-[700] text-[hsl(var(--display-muted))]">
                      {index + 1}
                    </div>
                    <div className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-fg))]">
                      {team.teamName}
                    </div>
                  </div>
                  <div className="font-stadium-numbers text-[48px] font-[700] text-center text-[hsl(var(--display-fg))]">
                    {team.athletes}
                  </div>
                  <div
                    className="font-stadium-numbers text-[56px] font-[900] text-center"
                    style={{ color: getPodiumColor(team.topFinish) }}
                  >
                    {team.topFinish}
                  </div>
                  <div className="font-stadium-numbers text-[48px] font-[700] text-center" style={{ color: team.gold > 0 ? getPodiumColor(1) : 'hsl(var(--display-muted))' }}>
                    {team.gold}
                  </div>
                  <div className="font-stadium-numbers text-[48px] font-[700] text-center" style={{ color: team.silver > 0 ? getPodiumColor(2) : 'hsl(var(--display-muted))' }}>
                    {team.silver}
                  </div>
                  <div className="font-stadium-numbers text-[48px] font-[700] text-center" style={{ color: team.bronze > 0 ? getPodiumColor(3) : 'hsl(var(--display-muted))' }}>
                    {team.bronze}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
