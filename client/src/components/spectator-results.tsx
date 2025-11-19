import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSpectator } from "@/contexts/SpectatorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SpectatorResults() {
  const { currentMeetId } = useSpectator();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const { data: events } = useQuery<any[]>({
    queryKey: ["/api/public/meets", currentMeetId, "events"],
    enabled: !!currentMeetId
  });
  
  const { data: results } = useQuery<any>({
    queryKey: ["/api/public/events", selectedEventId, "results"],
    enabled: !!selectedEventId,
    refetchInterval: 5000
  });
  
  const completedEvents = events?.filter(e => 
    e.status === "completed" || e.status === "in_progress"
  ) || [];
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
            <SelectTrigger data-testid="select-event">
              <SelectValue placeholder="Choose an event" />
            </SelectTrigger>
            <SelectContent>
              {completedEvents.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>{results.event.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.results.map((result: any, idx: number) => (
                <div 
                  key={result.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border"
                  data-testid={`result-${idx}`}
                >
                  <div className="w-8 font-bold text-lg">
                    {result.finalPlace || "-"}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{result.athleteName}</div>
                    <div className="text-sm text-muted-foreground">{result.teamName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">
                      {result.finalTime || result.finalMark || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
