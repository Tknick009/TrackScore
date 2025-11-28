import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Event, Athlete, InsertEntry } from "@shared/schema";
import { TrackResultForm } from "@/components/track-result-form";
import { FieldResultForm } from "@/components/field-result-form";
import { ConnectionStatus } from "@/components/connection-status";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  Monitor,
  Users,
  Timer,
  Target,
  ArrowLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";

function isTrackEvent(eventType: string): boolean {
  const trackEvents = [
    "100m", "200m", "400m", "800m", "1500m", "3000m", "5000m", "10000m",
    "100m_hurdles", "110m_hurdles", "400m_hurdles", "3000m_steeplechase",
    "4x100m_relay", "4x400m_relay", "4x800m_relay"
  ];
  return trackEvents.some(t => eventType.toLowerCase().includes(t.replace('_', '')));
}

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

export default function EventControl() {
  const { toast } = useToast();
  const { currentMeetId } = useMeet();
  const [, params] = useRoute("/control/:meetId/events/:eventId");
  const [, setLocation] = useLocation();
  const eventId = params?.eventId;

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: () => fetch(`/api/events/${eventId}`).then(r => r.json()),
    enabled: !!eventId && !!currentMeetId,
  });

  const eventBelongsToMeet = event && event.meetId === currentMeetId;

  const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes", currentMeetId],
    queryFn: currentMeetId
      ? () => fetch(`/api/athletes?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const { data: allEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const nextScheduledEvent = allEvents
    .filter(e => e.status === "scheduled" && e.id !== eventId)
    .sort((a, b) => (a.eventNumber || 0) - (b.eventNumber || 0))[0];

  const updateEventStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/events/${data.id}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", currentMeetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Event status updated" });
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: InsertEntry) => apiRequest("POST", "/api/entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries", currentMeetId] });
      toast({ title: "Result recorded", description: "The result has been saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording result",
        description: error.message || "Failed to save result",
        variant: "destructive",
      });
    },
  });

  if (eventLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event || !eventBelongsToMeet) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              {!event ? "Event not found" : "This event belongs to a different meet"}
            </p>
            <Button variant="outline" asChild>
              <Link href={`/control/${currentMeetId}/schedule`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Schedule
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/control/${currentMeetId}/schedule`} data-testid="link-back-schedule">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Schedule
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            {isTrackEvent(event.eventType) ? (
              <Timer className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Target className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-semibold">{event.name}</span>
            {getEventStatusBadge(event.status)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <Button variant="outline" size="sm" asChild>
            <Link href="/display" target="_blank" data-testid="link-open-display-header">
              <Monitor className="w-4 h-4 mr-2" />
              Display
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{event.name}</CardTitle>
                  <CardDescription className="flex items-center gap-3 mt-1">
                    {event.eventTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {event.eventTime}
                      </span>
                    )}
                    {event.eventNumber && (
                      <span>Event #{event.eventNumber}</span>
                    )}
                    <span className="capitalize">{event.gender}</span>
                  </CardDescription>
                </div>
                {getEventStatusBadge(event.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.status !== "in_progress" && (
                  <Button
                    onClick={() => updateEventStatusMutation.mutate({ 
                      id: event.id, 
                      status: "in_progress" 
                    })}
                    disabled={updateEventStatusMutation.isPending}
                    data-testid="button-start-event"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    {event.status === "completed" ? "Reopen Event" : "Start Event"}
                  </Button>
                )}
                {event.status === "in_progress" && (
                  <Button
                    onClick={() => updateEventStatusMutation.mutate({ 
                      id: event.id, 
                      status: "completed" 
                    })}
                    disabled={updateEventStatusMutation.isPending}
                    data-testid="button-complete-event"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Event
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Record Results
              </CardTitle>
              <CardDescription>
                {isTrackEvent(event.eventType) 
                  ? "Enter times and positions for track events"
                  : "Enter marks and attempts for field events"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTrackEvent(event.eventType) ? (
                <TrackResultForm
                  eventId={event.id}
                  athletes={athletes}
                  onSubmit={(data) => createEntryMutation.mutate(data)}
                  isPending={createEntryMutation.isPending}
                />
              ) : (
                <FieldResultForm
                  eventId={event.id}
                  athletes={athletes}
                  onSubmit={(data) => createEntryMutation.mutate(data)}
                  isPending={createEntryMutation.isPending}
                />
              )}
            </CardContent>
          </Card>

          {nextScheduledEvent && (
            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Next up:</span>
                    <span className="font-medium">{nextScheduledEvent.name}</span>
                    {nextScheduledEvent.eventNumber && (
                      <Badge variant="outline">#{nextScheduledEvent.eventNumber}</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/control/${currentMeetId}/events/${nextScheduledEvent.id}`} data-testid="link-next-event">
                      Go to Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
