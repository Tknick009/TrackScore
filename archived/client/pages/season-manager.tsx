import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Season, InsertSeason, Meet } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Calendar, Trophy } from "lucide-react";
import { format } from "date-fns";

export default function SeasonManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [formData, setFormData] = useState<InsertSeason>({
    name: "",
    startDate: new Date(),
    endDate: null,
    isActive: true,
  });

  // Fetch all seasons
  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
  });

  // Fetch all meets
  const { data: allMeets = [] } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  // Create season mutation
  const createSeasonMutation = useMutation({
    mutationFn: (data: InsertSeason) => apiRequest("POST", "/api/seasons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Season created",
        description: "The season has been successfully created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating season",
        description: error.message || "Failed to create season",
        variant: "destructive",
      });
    },
  });

  // Update season mutation
  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSeason> }) =>
      apiRequest("PATCH", `/api/seasons/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setEditingSeason(null);
      resetForm();
      toast({
        title: "Season updated",
        description: "The season has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating season",
        description: error.message || "Failed to update season",
        variant: "destructive",
      });
    },
  });

  // Delete season mutation
  const deleteSeasonMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/seasons/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      toast({
        title: "Season deleted",
        description: "The season has been successfully deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting season",
        description: error.message || "Failed to delete season",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: new Date(),
      endDate: null,
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeason) {
      updateSeasonMutation.mutate({ id: editingSeason.id, data: formData });
    } else {
      createSeasonMutation.mutate(formData);
    }
  };

  const handleEdit = (season: Season) => {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      startDate: season.startDate ? new Date(season.startDate) : new Date(),
      endDate: season.endDate ? new Date(season.endDate) : null,
      isActive: season.isActive ?? true,
    });
  };

  const getMeetsBySeason = (seasonId: number) => {
    return allMeets.filter((meet) => meet.seasonId === seasonId);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Season Management</h1>
          <p className="text-muted-foreground">Organize meets into seasons</p>
        </div>

        <Dialog open={isCreateDialogOpen || editingSeason !== null} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingSeason(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-season">
              <Plus className="mr-2 h-4 w-4" />
              Create Season
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-season-form">
            <DialogHeader>
              <DialogTitle>{editingSeason ? "Edit Season" : "Create New Season"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Season Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 2024-2025 Indoor Season"
                    required
                    data-testid="input-season-name"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                    required
                    data-testid="input-season-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate ? format(formData.endDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : null })}
                    data-testid="input-season-end-date"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    data-testid="checkbox-season-active"
                  />
                  <Label htmlFor="isActive">Active Season</Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" data-testid="button-save-season">
                  {editingSeason ? "Update" : "Create"} Season
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {seasonsLoading ? (
        <div className="text-center py-8">Loading seasons...</div>
      ) : seasons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No seasons created yet. Create your first season to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {seasons.map((season) => {
            const seasonMeets = getMeetsBySeason(season.id);
            return (
              <Card key={season.id} data-testid={`card-season-${season.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {season.name}
                        {season.isActive && (
                          <Badge variant="default" data-testid={`badge-active-${season.id}`}>Active</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(season.startDate), "MMM d, yyyy")} - {season.endDate ? format(new Date(season.endDate), "MMM d, yyyy") : "Ongoing"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(season)}
                        data-testid={`button-edit-season-${season.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this season?")) {
                            deleteSeasonMutation.mutate(season.id);
                          }
                        }}
                        data-testid={`button-delete-season-${season.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {seasonMeets.length} {seasonMeets.length === 1 ? "meet" : "meets"}
                    </span>
                  </div>
                  {seasonMeets.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {seasonMeets.map((meet) => (
                        <div key={meet.id} className="flex items-center justify-between p-2 bg-muted rounded" data-testid={`meet-item-${meet.id}`}>
                          <span className="text-sm">{meet.name}</span>
                          <Badge variant="outline" data-testid={`badge-meet-status-${meet.id}`}>{meet.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
