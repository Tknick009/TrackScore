import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Event, Athlete, InsertEvent, InsertAthlete, InsertEntry } from "@shared/schema";
import { EventForm } from "@/components/event-form";
import { AthleteForm } from "@/components/athlete-form";
import { TrackResultForm } from "@/components/track-result-form";
import { FieldResultForm } from "@/components/field-result-form";
import { EventList } from "@/components/event-list";
import { AthleteList } from "@/components/athlete-list";
import { ConnectionStatus } from "@/components/connection-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, CheckCircle2, Monitor } from "lucide-react";
import { Link } from "wouter";

export default function Control() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Check WebSocket connectivity
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const checkConnection = () => {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setWsConnected(true);
        ws.close();
      };
      
      ws.onerror = () => {
        setWsConnected(false);
      };
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch athletes
  const { data: athletes = [], isLoading: athletesLoading } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: InsertEvent) => apiRequest("POST", "/api/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event created",
        description: "The event has been successfully created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating event",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  // Create athlete mutation
  const createAthleteMutation = useMutation({
    mutationFn: (data: InsertAthlete) => apiRequest("POST", "/api/athletes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      toast({
        title: "Athlete added",
        description: "The athlete has been successfully added",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding athlete",
        description: error.message || "Failed to add athlete",
        variant: "destructive",
      });
    },
  });

  // Create entry mutation (unified for both track and field events)
  const createEntryMutation = useMutation({
    mutationFn: (data: InsertEntry) =>
      apiRequest("POST", "/api/entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({
        title: "Result recorded",
        description: "The entry result has been recorded",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording result",
        description: error.message || "Failed to record result",
        variant: "destructive",
      });
    },
  });

  // Update event status mutation
  const updateEventStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/events/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Status updated",
        description: "Event status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update event status",
        variant: "destructive",
      });
    },
  });

  const isTrackEvent = (eventType: string) => {
    return ![
      "high_jump",
      "long_jump",
      "triple_jump",
      "pole_vault",
      "shot_put",
      "discus",
      "javelin",
      "hammer",
    ].includes(eventType);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Control Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage events, athletes, and broadcast results in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus connected={wsConnected} />
          <Link href="/display">
            <Button variant="outline" className="gap-2" data-testid="button-view-display">
              <Monitor className="w-4 h-4" />
              View Display
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Management */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events" data-testid="tab-events">
                Events
              </TabsTrigger>
              <TabsTrigger value="athletes" data-testid="tab-athletes">
                Athletes
              </TabsTrigger>
              <TabsTrigger value="results" data-testid="tab-results">
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              <EventForm
                onSubmit={(data) => createEventMutation.mutate(data)}
                isPending={createEventMutation.isPending}
              />

              <Card>
                <CardHeader>
                  <CardTitle>All Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading events...
                    </div>
                  ) : (
                    <EventList
                      events={events}
                      onSelectEvent={setSelectedEvent}
                      selectedEventId={selectedEvent?.id}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="athletes" className="space-y-4">
              <AthleteForm
                onSubmit={(data) => createAthleteMutation.mutate(data)}
                isPending={createAthleteMutation.isPending}
              />

              {athletesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading athletes...
                </div>
              ) : (
                <AthleteList athletes={athletes} />
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {!selectedEvent ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <PlayCircle className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Select an Event First
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose an event from the Events tab to record results
                    </p>
                  </CardContent>
                </Card>
              ) : isTrackEvent(selectedEvent.eventType) ? (
                <TrackResultForm
                  eventId={selectedEvent.id}
                  athletes={athletes}
                  onSubmit={(data) => createEntryMutation.mutate(data)}
                  isPending={createEntryMutation.isPending}
                />
              ) : (
                <FieldResultForm
                  eventId={selectedEvent.id}
                  athletes={athletes}
                  onSubmit={(data) => createEntryMutation.mutate(data)}
                  isPending={createEntryMutation.isPending}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Selected Event Control */}
        <div className="space-y-4">
          {selectedEvent ? (
            <Card>
              <CardHeader>
                <CardTitle>Event Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {selectedEvent.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Event #{selectedEvent.eventNumber}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedEvent.status.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full gap-2"
                    variant={
                      selectedEvent.status === "in_progress"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      updateEventStatusMutation.mutate({
                        id: selectedEvent.id,
                        status: "in_progress",
                      })
                    }
                    disabled={updateEventStatusMutation.isPending}
                    data-testid="button-start-event"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start Event
                  </Button>

                  <Button
                    className="w-full gap-2"
                    variant={
                      selectedEvent.status === "completed" ? "default" : "outline"
                    }
                    onClick={() =>
                      updateEventStatusMutation.mutate({
                        id: selectedEvent.id,
                        status: "completed",
                      })
                    }
                    disabled={updateEventStatusMutation.isPending}
                    data-testid="button-complete-event"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <PlayCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No event selected
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
