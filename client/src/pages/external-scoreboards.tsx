import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Monitor, Plus, Pencil, Trash2, Play, Square, Send, Loader2 } from "lucide-react";
import type { ExternalScoreboard, InsertExternalScoreboard, FieldEventSession } from "@shared/schema";

const MAX_SCOREBOARDS = 20;

type ScoreboardFormData = {
  name: string;
  lssDirectory: string;
  targetIp: string;
  targetPort: string;
  sessionId: string;
  followDeviceName: string;
};

const emptyFormData: ScoreboardFormData = {
  name: "",
  lssDirectory: "",
  targetIp: "",
  targetPort: "",
  sessionId: "",
  followDeviceName: "",
};

export default function ExternalScoreboards() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScoreboard, setEditingScoreboard] = useState<ExternalScoreboard | null>(null);
  const [deleteScoreboard, setDeleteScoreboard] = useState<ExternalScoreboard | null>(null);
  const [formData, setFormData] = useState<ScoreboardFormData>(emptyFormData);

  const { data: scoreboards = [], isLoading } = useQuery<ExternalScoreboard[]>({
    queryKey: ["/api/external-scoreboards"],
  });

  const { data: fieldSessions = [] } = useQuery<FieldEventSession[]>({
    queryKey: ["/api/field-sessions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertExternalScoreboard) => {
      const response = await apiRequest("POST", "/api/external-scoreboards", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard created successfully" });
      setIsCreateOpen(false);
      setFormData(emptyFormData);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertExternalScoreboard> }) => {
      const response = await apiRequest("PATCH", `/api/external-scoreboards/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard updated successfully" });
      setEditingScoreboard(null);
      setFormData(emptyFormData);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/external-scoreboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard deleted successfully" });
      setDeleteScoreboard(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/external-scoreboards/${id}/start`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard started" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/external-scoreboards/${id}/stop`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Scoreboard stopped" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to stop scoreboard", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/external-scoreboards/${id}/send`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-scoreboards"] });
      toast({ title: "Data sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send data", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setFormData(emptyFormData);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (scoreboard: ExternalScoreboard) => {
    setFormData({
      name: scoreboard.name,
      lssDirectory: scoreboard.lssDirectory || "",
      targetIp: scoreboard.targetIp,
      targetPort: String(scoreboard.targetPort),
      sessionId: scoreboard.sessionId ? String(scoreboard.sessionId) : "",
      followDeviceName: scoreboard.followDeviceName || "",
    });
    setEditingScoreboard(scoreboard);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.targetIp.trim()) {
      toast({ title: "Target IP is required", variant: "destructive" });
      return;
    }
    const port = parseInt(formData.targetPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast({ title: "Target Port must be a valid port number (1-65535)", variant: "destructive" });
      return;
    }

    const payload: InsertExternalScoreboard = {
      name: formData.name.trim(),
      lssDirectory: formData.lssDirectory.trim() || null,
      targetIp: formData.targetIp.trim(),
      targetPort: port,
      sessionId: formData.sessionId ? parseInt(formData.sessionId, 10) : null,
      followDeviceName: formData.followDeviceName.trim() || null,
    };

    if (editingScoreboard) {
      updateMutation.mutate({ id: editingScoreboard.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setEditingScoreboard(null);
    setFormData(emptyFormData);
  };

  const getSessionDisplayName = (sessionId: number | null): string => {
    if (!sessionId) return "None assigned";
    const session = fieldSessions.find((s) => s.id === sessionId);
    if (!session) return "Unknown session";
    if (session.evtEventName) return session.evtEventName;
    return `Session #${session.id}`;
  };

  const isModalOpen = isCreateOpen || editingScoreboard !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const canAddMore = scoreboards.length < MAX_SCOREBOARDS;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">External Scoreboards</h1>
        </div>
        <Button
          onClick={handleOpenCreate}
          disabled={!canAddMore}
          data-testid="button-add-scoreboard"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Scoreboard
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : scoreboards.length === 0 ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                No Scoreboards Configured
              </CardTitle>
              <CardDescription>
                Add an external scoreboard to send field event data to FinishLynx or other display systems.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={handleOpenCreate} data-testid="button-add-first-scoreboard">
                <Plus className="h-4 w-4 mr-2" />
                Add First Scoreboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {!canAddMore && (
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-limit-reached">
                Maximum of {MAX_SCOREBOARDS} scoreboards reached.
              </p>
            )}
            {scoreboards.map((scoreboard) => (
              <Card key={scoreboard.id} data-testid={`card-scoreboard-${scoreboard.id}`}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-name-${scoreboard.id}`}>
                        {scoreboard.name}
                      </span>
                      <Badge
                        variant={scoreboard.isActive ? "default" : "secondary"}
                        data-testid={`badge-status-${scoreboard.id}`}
                      >
                        {scoreboard.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span data-testid={`text-target-${scoreboard.id}`}>
                        {scoreboard.targetIp}:{scoreboard.targetPort}
                      </span>
                      <span className="mx-2">·</span>
                      <span data-testid={`text-session-${scoreboard.id}`}>
                        {getSessionDisplayName(scoreboard.sessionId)}
                      </span>
                      {scoreboard.followDeviceName && (
                        <>
                          <span className="mx-2">·</span>
                          <span data-testid={`text-follow-device-${scoreboard.id}`}>
                            Following: {scoreboard.followDeviceName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(scoreboard)}
                      data-testid={`button-edit-${scoreboard.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {scoreboard.isActive ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => stopMutation.mutate(scoreboard.id)}
                        disabled={stopMutation.isPending}
                        data-testid={`button-stop-${scoreboard.id}`}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startMutation.mutate(scoreboard.id)}
                        disabled={startMutation.isPending}
                        data-testid={`button-start-${scoreboard.id}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => sendMutation.mutate(scoreboard.id)}
                      disabled={sendMutation.isPending}
                      data-testid={`button-send-${scoreboard.id}`}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteScoreboard(scoreboard)}
                      data-testid={`button-delete-${scoreboard.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingScoreboard ? "Edit Scoreboard" : "Add Scoreboard"}
            </DialogTitle>
            <DialogDescription>
              Configure an external scoreboard connection for sending field event data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., High Jump Display"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-scoreboard-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lssDirectory">LSS Directory</Label>
              <Input
                id="lssDirectory"
                placeholder="e.g., /path/to/lss/files"
                value={formData.lssDirectory}
                onChange={(e) => setFormData({ ...formData, lssDirectory: e.target.value })}
                data-testid="input-lss-directory"
              />
              <p className="text-xs text-muted-foreground">
                Optional directory for reading/writing LSS files.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetIp">Target IP *</Label>
                <Input
                  id="targetIp"
                  placeholder="e.g., 192.168.1.100"
                  value={formData.targetIp}
                  onChange={(e) => setFormData({ ...formData, targetIp: e.target.value })}
                  data-testid="input-target-ip"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPort">Target Port *</Label>
                <Input
                  id="targetPort"
                  type="number"
                  placeholder="e.g., 5000"
                  min={1}
                  max={65535}
                  value={formData.targetPort}
                  onChange={(e) => setFormData({ ...formData, targetPort: e.target.value })}
                  data-testid="input-target-port"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionId">Field Event Session</Label>
              <Select
                value={formData.sessionId || "none"}
                onValueChange={(value) => setFormData({ ...formData, sessionId: value === "none" ? "" : value })}
              >
                <SelectTrigger data-testid="select-session">
                  <SelectValue placeholder="Select a session (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" data-testid="select-session-none">
                    None
                  </SelectItem>
                  {fieldSessions.map((session) => (
                    <SelectItem
                      key={session.id}
                      value={String(session.id)}
                      data-testid={`select-session-${session.id}`}
                    >
                      {session.evtEventName || `Session #${session.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followDeviceName">Follow Device (Optional)</Label>
              <Input
                id="followDeviceName"
                placeholder="e.g., Throws"
                value={formData.followDeviceName}
                onChange={(e) => setFormData({ ...formData, followDeviceName: e.target.value })}
                data-testid="input-follow-device"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to receive updates from all devices, or enter a device name to filter
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseModal} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="button-submit">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingScoreboard ? "Save Changes" : "Create Scoreboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteScoreboard !== null} onOpenChange={(open) => !open && setDeleteScoreboard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scoreboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteScoreboard?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScoreboard && deleteMutation.mutate(deleteScoreboard.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
