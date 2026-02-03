import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { TeamScoringConfig } from "@/components/team-scoring-config";
import { TeamStandingsPanel } from "@/components/team-standings-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Trophy, Settings } from "lucide-react";

export default function Scoring() {
  const { currentMeetId, currentMeet } = useMeet();

  if (!currentMeetId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Select a Meet
            </CardTitle>
            <CardDescription>
              Choose a meet to manage team scoring
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <MeetSelector />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <MeetSelector />
          <h1 className="text-xl font-semibold">Team Scoring</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="standings" className="max-w-4xl mx-auto">
          <TabsList className="mb-4">
            <TabsTrigger value="standings" data-testid="tab-standings">
              <Trophy className="w-4 h-4 mr-2" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="config" data-testid="tab-scoring-config">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <TeamStandingsPanel meetId={currentMeetId} />
          </TabsContent>

          <TabsContent value="config">
            <TeamScoringConfig meetId={currentMeetId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
