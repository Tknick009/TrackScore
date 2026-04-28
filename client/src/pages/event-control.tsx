import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Event, EntryWithDetails, isTimeEvent } from "@shared/schema";
import { ConnectionStatus } from "@/components/connection-status";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Radio,
  Eye,
  AlertCircle,
  FastForward
} from "lucide-react";
import { Link, useRoute } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


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

function formatMark(mark: number | string | null | undefined, resultType: string): string {
  if (mark === null || mark === undefined) return "—";
  
  // Handle string marks (already formatted)
  if (typeof mark === "string") {
    return mark;
  }
  
  if (resultType === "time") {
    const totalSeconds = mark;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
    }
    return seconds.toFixed(2);
  }
  
  return mark.toFixed(2) + "m";
}

function formatWind(wind: number | null | undefined): string {
  if (wind === null || wind === undefined) return "";
  const prefix = wind >= 0 ? "+" : "";
  return `(${prefix}${wind.toFixed(1)})`;
}

export default function EventControl() {
  const { toast } = useToast();
  const { currentMeetId } = useMeet();
  const [, params] = useRoute("/control/:meetId/events/:eventId");
  const eventId = params?.eventId;

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: () => fetch(`/api/events/${eventId}`).then(r => r.json()),
    enabled: !!eventId && !!currentMeetId,
  });

  const eventBelongsToMeet = event && event.meetId === currentMeetId;

  const { data: eventEntries = [], isLoading: entriesLoading } = useQuery<EntryWithDetails[]>({
    queryKey: ["/api/entries/event", eventId, "details"],
    queryFn: () => fetch(`/api/entries/event/${eventId}/details`).then(r => r.json()),
    enabled: !!eventId && eventBelongsToMeet,
    refetchInterval: 5000,
  });

  const { data: allEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const { data: currentBroadcastEvent } = useQuery<Event | null>({
    queryKey: ["/api/events/current"],
  });

  const isCurrentlyBroadcasting = currentBroadcastEvent?.id === eventId;

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

  const setCurrentEventMutation = useMutation({
    mutationFn: (eventId: string) =>
      apiRequest("POST", `/api/events/${eventId}/set-current`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries/event", eventId, "details"] });
      toast({ title: "Broadcasting to displays", description: "This event is now shown on all display boards" });
    },
  });

  const [advanceByPlace, setAdvanceByPlace] = useState<number | null>(null);
  const [advanceByTime, setAdvanceByTime] = useState<number | null>(null);

  useEffect(() => {
    if (event) {
      setAdvanceByPlace(event.advanceByPlace ?? null);
      setAdvanceByTime(event.advanceByTime ?? null);
    }
  }, [event?.id, event?.advanceByPlace, event?.advanceByTime]);

  const updateAdvancementMutation = useMutation({
    mutationFn: (data: { advanceByPlace: number | null; advanceByTime: number | null }) =>
      apiRequest("PATCH", `/api/events/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", currentMeetId] });
      toast({ title: "Advancement formula updated" });
    },
  });

  const handleSaveAdvancement = () => {
    updateAdvancementMutation.mutate({
      advanceByPlace: advanceByPlace || null,
      advanceByTime: advanceByTime || null,
    });
  };

  const advancementFormula = (advanceByPlace || advanceByTime)
    ? `${advanceByPlace || 0}+${advanceByTime || 0}`
    : null;

  const sortedEntries = useMemo(() => {
    return [...eventEntries].sort((a, b) => {
      const aPlace = a.finalPlace || a.semifinalPlace || a.quarterfinalPlace || a.preliminaryPlace || 999;
      const bPlace = b.finalPlace || b.semifinalPlace || b.quarterfinalPlace || b.preliminaryPlace || 999;
      if (aPlace !== bPlace) return aPlace - bPlace;
      
      const aMark = a.finalMark || a.semifinalMark || a.quarterfinalMark || a.preliminaryMark || 0;
      const bMark = b.finalMark || b.semifinalMark || b.quarterfinalMark || b.preliminaryMark || 0;
      
      if (a.resultType === "time") {
        return aMark - bMark;
      }
      return bMark - aMark;
    });
  }, [eventEntries]);

  const hasResults = sortedEntries.some(e => 
    e.preliminaryMark || e.quarterfinalMark || e.semifinalMark || e.finalMark
  );

  const isTrack = event ? isTimeEvent(event.eventType) : false;

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
            {isTrack ? (
              <Timer className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Target className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-semibold">{event.name}</span>
            {getEventStatusBadge(event.status)}
            {isCurrentlyBroadcasting && (
              <Badge className="bg-red-600 text-white animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                On Air
              </Badge>
            )}
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
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Status Control
                </CardTitle>
                <CardDescription>
                  Manage event status for scoring and displays
                </CardDescription>
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
                <div className="mt-4 text-sm text-muted-foreground">
                  {event.status === "scheduled" && "Event is scheduled. Start it when athletes are ready."}
                  {event.status === "in_progress" && "Event is live. Results are being recorded."}
                  {event.status === "completed" && "Event is finished. Results are locked for scoring."}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Display Control
                </CardTitle>
                <CardDescription>
                  Control what appears on the display boards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setCurrentEventMutation.mutate(event.id)}
                  disabled={setCurrentEventMutation.isPending || isCurrentlyBroadcasting}
                  variant={isCurrentlyBroadcasting ? "secondary" : "default"}
                  className="w-full"
                  data-testid="button-broadcast-event"
                >
                  {isCurrentlyBroadcasting ? (
                    <>
                      <Radio className="w-4 h-4 mr-2" />
                      Currently Broadcasting
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4 mr-2" />
                      Broadcast to Displays
                    </>
                  )}
                </Button>
                <div className="mt-4 text-sm text-muted-foreground">
                  {isCurrentlyBroadcasting 
                    ? "This event is currently shown on all connected display boards."
                    : "Click to show this event on all display boards."}
                </div>
              </CardContent>
            </Card>
          </div>

          {isTrack && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FastForward className="w-5 h-5" />
                  Advancement Formula
                  {advancementFormula && (
                    <Badge variant="outline" className="ml-2">{advancementFormula}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure how athletes advance to the next round (Q = by place, q = by time)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advanceByPlace">Advance by Place (Q)</Label>
                    <Input
                      id="advanceByPlace"
                      type="number"
                      min="0"
                      placeholder="e.g., 3"
                      value={advanceByPlace ?? ""}
                      onChange={(e) => setAdvanceByPlace(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-advance-by-place"
                    />
                    <p className="text-xs text-muted-foreground">Top finishers per heat that automatically qualify</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advanceByTime">Advance by Time (q)</Label>
                    <Input
                      id="advanceByTime"
                      type="number"
                      min="0"
                      placeholder="e.g., 2"
                      value={advanceByTime ?? ""}
                      onChange={(e) => setAdvanceByTime(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-advance-by-time"
                    />
                    <p className="text-xs text-muted-foreground">Additional fastest times across all heats</p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveAdvancement}
                  disabled={updateAdvancementMutation.isPending}
                  className="mt-4"
                  data-testid="button-save-advancement"
                >
                  {updateAdvancementMutation.isPending ? "Saving..." : "Save Advancement"}
                </Button>
                {advancementFormula && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Formula: {advancementFormula}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Top {advanceByPlace || 0} per heat advance with <span className="font-bold">Q</span>, 
                      plus next {advanceByTime || 0} fastest times advance with <span className="font-bold">q</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Results Verification
                  </CardTitle>
                  <CardDescription>
                    {hasResults 
                      ? "Review results as they sync from timing systems"
                      : "Waiting for results from FinishLynx/FieldLynx"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {sortedEntries.length} entries
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedEntries.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No athletes entered in this event</p>
                  <p className="text-sm mt-1">Import data from HyTek to populate entries</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Place</TableHead>
                        {isTrack && <TableHead className="w-16">Lane</TableHead>}
                        <TableHead>Athlete</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-right">
                          {isTrack ? "Time" : "Mark"}
                        </TableHead>
                        {isTrack && <TableHead className="w-20">Wind</TableHead>}
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEntries.map((entry) => {
                        const place = entry.finalPlace || entry.semifinalPlace || entry.quarterfinalPlace || entry.preliminaryPlace;
                        const mark = entry.finalMark || entry.semifinalMark || entry.quarterfinalMark || entry.preliminaryMark;
                        const wind = entry.finalWind || entry.semifinalWind || entry.quarterfinalWind || entry.preliminaryWind;
                        const lane = entry.finalLane || entry.semifinalLane || entry.quarterfinalLane || entry.preliminaryLane;
                        
                        return (
                          <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                            <TableCell className="font-mono font-bold">
                              {place || "—"}
                            </TableCell>
                            {isTrack && (
                              <TableCell className="font-mono">
                                {lane || "—"}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="font-medium">
                                {entry.athlete?.firstName} {entry.athlete?.lastName}
                              </div>
                              {entry.athlete?.bibNumber && (
                                <div className="text-xs text-muted-foreground">
                                  #{entry.athlete.bibNumber}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.team?.name || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatMark(mark, entry.resultType)}
                            </TableCell>
                            {isTrack && (
                              <TableCell className="font-mono text-muted-foreground">
                                {formatWind(wind)}
                              </TableCell>
                            )}
                            <TableCell>
                              {entry.isDisqualified ? (
                                <Badge variant="destructive">DQ</Badge>
                              ) : entry.isScratched ? (
                                <Badge variant="secondary">SCR</Badge>
                              ) : mark ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Recorded
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {!hasResults && sortedEntries.length > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Waiting for timing data</p>
                    <p className="mt-1">
                      Results will appear here automatically as they sync from FinishLynx, FieldLynx, or HyTek.
                      This view refreshes every 5 seconds.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {event.eventTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {event.eventTime}
                </span>
              )}
              {event.eventNumber && (
                <span>Event #{event.eventNumber}</span>
              )}
            </div>
            
            {nextScheduledEvent && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/control/${currentMeetId}/events/${nextScheduledEvent.id}`} data-testid="link-next-event">
                  Next: {nextScheduledEvent.name}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
