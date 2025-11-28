import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Athlete, Team } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, School } from "lucide-react";

interface AthleteListProps {
  athletes: Athlete[];
  onSelectAthlete?: (athlete: Athlete) => void;
}

export function AthleteList({ athletes, onSelectAthlete }: AthleteListProps) {
  const { currentMeetId } = useMeet();

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/teams?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const teamMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach(team => map.set(team.id, team.name));
    return map;
  }, [teams]);

  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      const aNum = a.bibNumber ? parseInt(a.bibNumber, 10) : Infinity;
      const bNum = b.bibNumber ? parseInt(b.bibNumber, 10) : Infinity;
      if (isNaN(aNum) && isNaN(bNum)) return 0;
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });
  }, [athletes]);

  if (athletes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No athletes added yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Athletes ({athletes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedAthletes.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer"
              onClick={() => onSelectAthlete?.(athlete)}
              data-testid={`row-athlete-${athlete.id}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={`${athlete.firstName} ${athlete.lastName}`} />
                  <AvatarFallback data-testid={`avatar-fallback-${athlete.id}`}>
                    {athlete.firstName.charAt(0)}{athlete.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium" data-testid={`text-athlete-name-${athlete.id}`}>
                    {athlete.firstName} {athlete.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    {athlete.teamId && teamMap.get(athlete.teamId) && (
                      <span className="flex items-center gap-1" data-testid={`text-team-${athlete.id}`}>
                        <School className="w-3 h-3" />
                        {teamMap.get(athlete.teamId)}
                      </span>
                    )}
                    {athlete.bibNumber && (
                      <Badge variant="outline" data-testid={`badge-bib-${athlete.id}`}>
                        #{athlete.bibNumber}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
