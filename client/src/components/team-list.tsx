import { useState, useEffect } from "react";
import { Team } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Shield } from "lucide-react";

interface TeamListProps {
  teams: Team[];
  onSelectTeam?: (team: Team) => void;
}

interface NcaaLogoResult {
  teamName: string;
  url: string | null;
}

export function TeamList({ teams, onSelectTeam }: TeamListProps) {
  const [ncaaLogos, setNcaaLogos] = useState<Record<string, string>>({});

  // Fetch NCAA logos for all teams
  useEffect(() => {
    if (teams.length === 0) return;
    
    const teamNames = teams.map(t => t.name).filter(n => n !== 'Unattached');
    if (teamNames.length === 0) return;

    fetch(`/api/ncaa-logos/bulk?names=${encodeURIComponent(teamNames.join(','))}`)
      .then(r => r.json())
      .then((results: NcaaLogoResult[]) => {
        const logoMap: Record<string, string> = {};
        results.forEach(r => {
          if (r.url) {
            logoMap[r.teamName] = r.url;
          }
        });
        setNcaaLogos(logoMap);
      })
      .catch(console.error);
  }, [teams]);

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No teams added yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams ({teams.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
              onClick={() => onSelectTeam?.(team)}
              data-testid={`row-team-${team.id}`}
            >
              <div className="flex items-center gap-3">
                {ncaaLogos[team.name] ? (
                  <div className="h-10 w-10 flex items-center justify-center">
                    <img 
                      src={ncaaLogos[team.name]} 
                      alt={team.name}
                      className="max-h-10 max-w-10 object-contain"
                      data-testid={`img-team-logo-${team.id}`}
                    />
                  </div>
                ) : (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback data-testid={`avatar-fallback-${team.id}`}>
                      {team.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <p className="font-medium" data-testid={`text-team-name-${team.id}`}>
                    {team.name}
                  </p>
                  {team.abbreviation && (
                    <p className="text-sm text-muted-foreground">
                      {team.abbreviation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
