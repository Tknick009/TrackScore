import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { TeamList } from "@/components/team-list";
import { TeamDetailDialog } from "@/components/team-detail-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Building2 } from "lucide-react";

export default function Teams() {
  const { currentMeetId, currentMeet } = useMeet();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams", currentMeetId],
    queryFn: currentMeetId
      ? () => fetch(`/api/teams?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

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
              Choose a meet to manage teams
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
          <h1 className="text-xl font-semibold">Teams</h1>
          <span className="text-sm text-muted-foreground">
            {teams.length} teams
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-8">
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Teams</h2>
              <p className="text-muted-foreground">
                Import data from HyTek to add teams.
              </p>
            </CardContent>
          </Card>
        ) : (
          <TeamList 
            teams={teams} 
            onSelectTeam={(team) => {
              setSelectedTeam(team);
              setDialogOpen(true);
            }} 
          />
        )}
      </div>

      <TeamDetailDialog
        team={selectedTeam}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
