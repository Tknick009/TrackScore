import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Timer, Target, PlayCircle, RotateCcw, Eye, Loader2, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";

type SortOption = 'time' | 'number' | 'name' | 'status';

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
  const [sortBy, setSortBy] = useState<SortOption>('time');

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const liveEvents = events.filter(e => e.status === "in_progress");
  const scheduledEvents = events.filter(e => e.status === "scheduled");
  const completedEvents = events.filter(e => e.status === "completed");

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // Always keep live events at top
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;

      switch (sortBy) {
        case 'time':
          // Sort by date first, then time, then event number
          const dateA = a.eventDate ? String(a.eventDate) : '';
          const dateB = b.eventDate ? String(b.eventDate) : '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          const timeA = a.eventTime || '';
          const timeB = b.eventTime || '';
          if (timeA !== timeB) return timeA.localeCompare(timeB);
          return (a.eventNumber || 0) - (b.eventNumber || 0);
        case 'number':
          return (a.eventNumber || 0) - (b.eventNumber || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'status':
          // Scheduled first, then completed
          if (a.status === "scheduled" && b.status === "completed") return -1;
          if (b.status === "scheduled" && a.status === "completed") return 1;
          return (a.eventNumber || 0) - (b.eventNumber || 0);
        default:
          return 0;
      }
    });
  }, [events, sortBy]);

  // Group by date only when sorting by time
  const eventsByDate = useMemo(() => {
    if (sortBy !== 'time') {
      return { 'All Events': sortedEvents };
    }
    return sortedEvents.reduce((acc, event) => {
      const date = event.eventDate ? String(event.eventDate) : 'Unscheduled';
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, Event[]>);
  }, [sortedEvents, sortBy]);

  if (!currentMeetId) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Meet Selected</h2>
            <p className="text-muted-foreground mb-4">
              Select a meet to view its schedule and manage events.
            </p>
            <Button asChild>
              <Link href="/">View All Meets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Event Schedule</h1>
          {liveEvents.length > 0 && (
            <Badge className="bg-green-600 text-white gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {liveEvents.length} Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px]" data-testid="select-schedule-sort">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">By Time</SelectItem>
              <SelectItem value="number">By Event #</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{scheduledEvents.length} scheduled</span>
            <span className="text-border">|</span>
            <span>{completedEvents.length} completed</span>
          </div>
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
              <p className="text-muted-foreground mb-4">
                Import data from HyTek or add events manually to get started.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/control/${currentMeetId}/import`}>
                  Import Data
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {Object.entries(eventsByDate).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Only show date headers when sorting by time */}
                {sortBy === 'time' && (
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
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
                )}
                <div className="space-y-2">
                  {dateEvents.map((event) => (
                    <Card key={event.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isTrackEvent(event.eventType) ? (
                              <Timer className="w-5 h-5 text-muted-foreground shrink-0" />
                            ) : (
                              <Target className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{event.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
                          <div className="flex items-center gap-2">
                            {getEventStatusBadge(event.status)}
                            <Button size="sm" asChild data-testid={`button-run-event-${event.id}`}>
                              <Link href={`/control/${currentMeetId}/events/${event.id}`}>
                                {event.status === "in_progress" ? (
                                  <>
                                    <PlayCircle className="w-4 h-4 mr-1" />
                                    Resume
                                  </>
                                ) : event.status === "completed" ? (
                                  <>
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-4 h-4 mr-1" />
                                    Run
                                  </>
                                )}
                              </Link>
                            </Button>
                          </div>
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
