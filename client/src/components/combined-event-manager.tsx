import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, RefreshCw } from "lucide-react";
import { CombinedEventLeaderboard } from "@/components/combined-event-leaderboard";
import type { SelectCombinedEvent, InsertCombinedEvent } from "@shared/schema";

export function CombinedEventManager() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<InsertCombinedEvent>>({});
  
  const { data: combinedEvents } = useQuery<SelectCombinedEvent[]>({
    queryKey: ["/api/meets", currentMeetId, "combined-events"],
    enabled: !!currentMeetId
  });
  
  const createEventMutation = useMutation({
    mutationFn: async (event: InsertCombinedEvent) => 
      apiRequest("/api/combined-events", "POST", event),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/meets", currentMeetId, "combined-events"] 
      });
      setNewEvent({});
      toast({ title: "Combined event created" });
    }
  });
  
  const recomputeMutation = useMutation({
    mutationFn: async (id: number) => 
      apiRequest(`/api/combined-events/${id}/recompute`, "POST", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/combined-events", selectedEventId, "standings"] 
      });
      toast({ title: "Totals recomputed" });
    }
  });
  
  const handleCreate = () => {
    if (!currentMeetId || !newEvent.name || !newEvent.eventType || !newEvent.gender) {
      toast({ 
        title: "Missing fields",
        variant: "destructive"
      });
      return;
    }
    
    createEventMutation.mutate({
      meetId: currentMeetId,
      name: newEvent.name,
      eventType: newEvent.eventType,
      gender: newEvent.gender,
      status: "scheduled"
    } as InsertCombinedEvent);
  };
  
  if (!currentMeetId) {
    return <div className="text-muted-foreground">Please select a meet</div>;
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Combined Event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Event Name (e.g., Men's Decathlon)"
              value={newEvent.name || ""}
              onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
              data-testid="input-name"
            />
            <Select
              value={newEvent.eventType || ""}
              onValueChange={v => setNewEvent({ ...newEvent, eventType: v })}
            >
              <SelectTrigger data-testid="select-type">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decathlon">Decathlon</SelectItem>
                <SelectItem value="heptathlon">Heptathlon</SelectItem>
                <SelectItem value="pentathlon">Pentathlon</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={newEvent.gender || ""}
              onValueChange={v => setNewEvent({ ...newEvent, gender: v })}
            >
              <SelectTrigger data-testid="select-gender">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Men</SelectItem>
                <SelectItem value="W">Women</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleCreate}
            disabled={createEventMutation.isPending}
            data-testid="button-create"
          >
            Create Event
          </Button>
        </CardContent>
      </Card>
      
      {combinedEvents && combinedEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Combined Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select 
              value={selectedEventId?.toString() || ""} 
              onValueChange={v => setSelectedEventId(parseInt(v))}
            >
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Select combined event" />
              </SelectTrigger>
              <SelectContent>
                {combinedEvents.map(event => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedEventId && (
              <Button
                onClick={() => recomputeMutation.mutate(selectedEventId)}
                disabled={recomputeMutation.isPending}
                data-testid="button-recompute"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recompute Totals
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {selectedEventId && (
        <CombinedEventLeaderboard combinedEventId={selectedEventId} />
      )}
    </div>
  );
}
