import { useQuery } from "@tanstack/react-query";
import { useSpectator } from "@/contexts/SpectatorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function SpectatorStandings() {
  const { currentMeetId } = useSpectator();
  
  const { data: teamStandings } = useQuery<any[]>({
    queryKey: ["/api/public/meets", currentMeetId, "team-standings"],
    enabled: !!currentMeetId,
    refetchInterval: 15000
  });
  
  const { data: medalStandings } = useQuery<any[]>({
    queryKey: ["/api/public/meets", currentMeetId, "medal-standings"],
    enabled: !!currentMeetId,
    refetchInterval: 15000
  });
  
  return (
    <Tabs defaultValue="points">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="points">Team Points</TabsTrigger>
        <TabsTrigger value="medals">Medals</TabsTrigger>
      </TabsList>
      
      <TabsContent value="points">
        <Card>
          <CardHeader>
            <CardTitle>Team Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamStandings?.map((team, idx) => (
                <div 
                  key={team.teamId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border"
                  data-testid={`team-${idx}`}
                >
                  <div className="w-8 font-bold">{idx + 1}</div>
                  <div className="flex-1 font-semibold">{team.teamName}</div>
                  <div className="text-xl font-bold">{team.totalPoints} pts</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="medals">
        <Card>
          <CardHeader>
            <CardTitle>Medal Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {medalStandings?.map((team, idx) => (
                <div 
                  key={team.teamId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border"
                  data-testid={`medal-${idx}`}
                >
                  <div className="w-8 font-bold">{idx + 1}</div>
                  <div className="flex-1 font-semibold">{team.teamName}</div>
                  <div className="flex gap-3 text-sm">
                    <span>🥇 {team.gold}</span>
                    <span>🥈 {team.silver}</span>
                    <span>🥉 {team.bronze}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
