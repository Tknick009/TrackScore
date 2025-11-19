import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
import type { MedalStanding } from "@shared/schema";

interface MedalStandingsProps {
  meetId: string;
  showPodium?: boolean;
}

export function MedalStandings({ meetId, showPodium = true }: MedalStandingsProps) {
  const { data: standings } = useQuery<MedalStanding[]>({
    queryKey: ["/api/meets", meetId, "medal-standings"],
    refetchInterval: 10000
  });
  
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Medal Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No medals awarded yet</p>
        </CardContent>
      </Card>
    );
  }
  
  const topThree = standings.slice(0, 3);
  
  const getMedalBadge = (type: 'gold' | 'silver' | 'bronze', count: number) => {
    if (count === 0) return <span className="text-muted-foreground">0</span>;
    
    const colors = {
      gold: "bg-yellow-400 text-yellow-900",
      silver: "bg-gray-300 text-gray-900",
      bronze: "bg-amber-600 text-white"
    };
    
    return (
      <Badge className={colors[type]}>
        {count}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-4">
      {showPodium && topThree.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Podium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {topThree.map((team, index) => (
                <div 
                  key={team.teamId}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border"
                  data-testid={`podium-${index + 1}`}
                >
                  <div className="text-4xl font-bold text-muted-foreground">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="text-lg font-semibold text-center">
                    {team.teamName}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-yellow-600">{team.gold}G</span>
                    <span className="text-gray-600">{team.silver}S</span>
                    <span className="text-amber-700">{team.bronze}B</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            Full Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">🥇 Gold</TableHead>
                <TableHead className="text-center">🥈 Silver</TableHead>
                <TableHead className="text-center">🥉 Bronze</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((team, index) => (
                <TableRow 
                  key={team.teamId}
                  className={index < 3 ? "bg-accent/50" : ""}
                  data-testid={`medal-row-${team.teamId}`}
                >
                  <TableCell className="font-semibold">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {team.teamName}
                  </TableCell>
                  <TableCell className="text-center">
                    {getMedalBadge('gold', team.gold)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getMedalBadge('silver', team.silver)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getMedalBadge('bronze', team.bronze)}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {team.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
