import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Timer, Target, AlertCircle } from "lucide-react";

function getEventStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return <Badge className="bg-green-600 text-white">Live</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    default:
      return <Badge variant="outline">Scheduled</Badge>;
  }
}

function isTrackEvent(eventType: string): boolean {
  const trackEvents = [
    "100m", "200m", "400m", "800m", "1500m", "3000m", "5000m", "10000m",
    "100m_hurdles", "110m_hurdles", "400m_hurdles", "3000m_steeplechase",
    "4x100m_relay", "4x400m_relay", "4x800m_relay"
  ];
  return trackEvents.some(t => eventType.toLowerCase().includes(t.replace('_', '')));
}

export default function Schedule() {
  const { currentMeetId, currentMeet } = useMeet();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.eventDate ? String(a.eventDate) : '';
    const dateB = b.eventDate ? String(b.eventDate) : '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = a.eventTime || '';
    const timeB = b.eventTime || '';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return (a.eventNumber || 0) - (b.eventNumber || 0);
  });

  const eventsByDate = sortedEvents.reduce((acc, event) => {
    const date = event.eventDate ? String(event.eventDate) : 'Unscheduled';
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

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
              Choose a meet to view the event schedule
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
          <h1 className="text-xl font-semibold">Event Schedule</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {events.length} events
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-8">
            Loading schedule...
          </div>
        ) : events.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Events Scheduled</h2>
              <p className="text-muted-foreground">
                Import data from HyTek or add events manually.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {Object.entries(eventsByDate).map(([date, dateEvents]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">
                    {date === 'Unscheduled' 
                      ? 'Unscheduled Events' 
                      : new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                    }
                  </h2>
                  <Badge variant="secondary">{dateEvents.length}</Badge>
                </div>
                <div className="space-y-2">
                  {dateEvents.map((event) => (
                    <Card key={event.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {isTrackEvent(event.eventType) ? (
                              <Timer className="w-5 h-5 text-muted-foreground shrink-0" />
                            ) : (
                              <Target className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{event.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {event.eventTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.eventTime}
                                  </span>
                                )}
                                {event.eventNumber && (
                                  <span>Event #{event.eventNumber}</span>
                                )}
                                <span className="capitalize">{event.gender}</span>
                              </div>
                            </div>
                          </div>
                          {getEventStatusBadge(event.status)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
