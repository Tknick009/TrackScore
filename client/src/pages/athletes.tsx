import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Athlete } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { AthleteList } from "@/components/athlete-list";
import { AthleteDetailDialog } from "@/components/athlete-detail-dialog";
import { AthleteForm } from "@/components/athlete-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Users, Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertAthlete } from "@shared/schema";

export default function Athletes() {
  const { toast } = useToast();
  const { currentMeetId, currentMeet } = useMeet();
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: athletes = [], isLoading } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes", currentMeetId],
    queryFn: currentMeetId
      ? () => fetch(`/api/athletes?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const createAthleteMutation = useMutation({
    mutationFn: (data: InsertAthlete) => apiRequest("POST", "/api/athletes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", currentMeetId] });
      toast({ title: "Athlete added", description: "The athlete has been successfully added" });
      setAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding athlete",
        description: error.message || "Failed to add athlete",
        variant: "destructive",
      });
    },
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
              Choose a meet to manage athletes
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
          <h1 className="text-xl font-semibold">Athletes</h1>
          <span className="text-sm text-muted-foreground">
            {athletes.length} registered
          </span>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-athlete">
              <Plus className="w-4 h-4 mr-2" />
              Add Athlete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Athlete</DialogTitle>
            </DialogHeader>
            <AthleteForm
              onSubmit={(data) => createAthleteMutation.mutate({ ...data, meetId: currentMeetId })}
              isPending={createAthleteMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-8">
            Loading athletes...
          </div>
        ) : athletes.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Athletes</h2>
              <p className="text-muted-foreground mb-4">
                Import data from HyTek or add athletes manually.
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Athlete
              </Button>
            </CardContent>
          </Card>
        ) : (
          <AthleteList 
            athletes={athletes} 
            onSelectAthlete={(athlete) => {
              setSelectedAthlete(athlete);
              setDialogOpen(true);
            }} 
          />
        )}
      </div>

      <AthleteDetailDialog
        athlete={selectedAthlete}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
