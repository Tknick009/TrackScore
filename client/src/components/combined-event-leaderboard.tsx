import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { CombinedEventStanding } from "@shared/schema";

interface CombinedEventLeaderboardProps {
  combinedEventId: number;
}

export function CombinedEventLeaderboard({ combinedEventId }: CombinedEventLeaderboardProps) {
  const { data: standings } = useQuery<CombinedEventStanding[]>({
    queryKey: ["/api/combined-events", combinedEventId, "standings"],
    refetchInterval: 15000
  });
  
  if (!standings || standings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No standings available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Combined Event Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Athlete</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">Events</TableHead>
              <TableHead className="text-right font-semibold">Total Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((standing) => (
              <TableRow key={standing.athleteId} className={standing.rank <= 3 ? "bg-accent/50" : ""}>
                <TableCell className="font-semibold">
                  {standing.rank === 1 && "🥇"}
                  {standing.rank === 2 && "🥈"}
                  {standing.rank === 3 && "🥉"}
                  {standing.rank > 3 && standing.rank}
                </TableCell>
                <TableCell className="font-medium">{standing.athleteName}</TableCell>
                <TableCell>{standing.teamName || "-"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{standing.eventsCompleted} completed</Badge>
                </TableCell>
                <TableCell className="text-right text-lg font-bold">
                  {standing.totalPoints} pts
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
