import { useQuery } from "@tanstack/react-query";
import { useSpectator } from "@/contexts/SpectatorContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";

export function SpectatorSchedule() {
  const { currentMeetId } = useSpectator();
  
  const { data: events, isLoading } = useQuery<any[]>({
    queryKey: ["/api/public/meets", currentMeetId, "events"],
    enabled: !!currentMeetId,
    refetchInterval: 10000
  });
  
  if (isLoading) {
    return <div className="text-center py-8">Loading schedule...</div>;
  }
  
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No events scheduled
        </CardContent>
      </Card>
    );
  }
  
  const getStatusBadge = (status: string) => {
    if (status === "completed") return <Badge variant="default">Completed</Badge>;
    if (status === "in_progress") return <Badge className="bg-green-600">Live</Badge>;
    return <Badge variant="outline">Scheduled</Badge>;
  };
  
  return (
    <div className="space-y-2">
      {events.map(event => (
        <Card key={event.id} data-testid={`event-card-${event.id}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold">{event.name}</h3>
                {event.scheduledTime && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(event.scheduledTime), "h:mm a")}
                  </div>
                )}
              </div>
              <div>{getStatusBadge(event.status)}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
