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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <MeetSelector />
          <h1 className="text-lg font-bold tracking-tight">Teams</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {teams.length} teams
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
            <span className="text-sm">Loading teams...</span>
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
