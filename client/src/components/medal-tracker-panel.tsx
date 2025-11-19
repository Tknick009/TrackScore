import { useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";
import { MedalStandings } from "@/components/medal-standings";

export function MedalTrackerPanel() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  
  const recomputeAllMutation = useMutation({
    mutationFn: async () => 
      apiRequest("POST", `/api/meets/${currentMeetId}/medal-recompute-all`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/meets", currentMeetId, "medal-standings"] 
      });
      toast({ title: "Medals recomputed" });
    }
  });
  
  if (!currentMeetId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Please select a meet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Medal Tracker Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => recomputeAllMutation.mutate()}
            disabled={recomputeAllMutation.isPending}
            data-testid="button-recompute-medals"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recompute All Medals
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Recalculates medals for all completed events in this meet
          </p>
        </CardContent>
      </Card>
      
      <MedalStandings meetId={currentMeetId} showPodium={true} />
    </div>
  );
}
