import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Event, Athlete, Team, Meet, InsertEvent, InsertAthlete, InsertEntry } from "@shared/schema";
import { EventForm } from "@/components/event-form";
import { AthleteForm } from "@/components/athlete-form";
import { TrackResultForm } from "@/components/track-result-form";
import { FieldResultForm } from "@/components/field-result-form";
import { EventList } from "@/components/event-list";
import { AthleteList } from "@/components/athlete-list";
import { AthleteDetailDialog } from "@/components/athlete-detail-dialog";
import { TeamList } from "@/components/team-list";
import { TeamDetailDialog } from "@/components/team-detail-dialog";
import { ConnectionStatus } from "@/components/connection-status";
import { ExportMenu } from "@/components/ExportMenu";
import { TeamScoringConfig } from "@/components/team-scoring-config";
import { TeamStandingsPanel } from "@/components/team-standings-panel";
import { AthleteCheckInPanel } from "@/components/athlete-check-in-panel";
import { SplitRecorderPanel } from "@/components/split-recorder-panel";
import { WindRecorderPanel } from "@/components/wind-recorder-panel";
import { JudgeTokenManager } from "@/components/judge-token-manager";
import { RecordBookManager } from "@/components/record-book-manager";
import { SponsorManager } from "@/components/sponsor-manager";
import { MedalTrackerPanel } from "@/components/medal-tracker-panel";
import { CombinedEventManager } from "@/components/combined-event-manager";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { SocialMediaGenerator } from "@/components/social-media-generator";
import { FinishLynxUploader } from "@/components/finishlynx-uploader";
import { CertificateGenerator } from "@/components/certificate-generator";
import { OverlayControl } from "@/components/overlay-control";
import { WeatherWidget } from "@/components/weather-widget";
import { useMeet } from "@/contexts/MeetContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, CheckCircle2, Monitor, Upload, Database, Trophy, Users, Target, Shield, Award, UserCheck, Timer, Wind, Medal, Star, QrCode, Share2, Cloud } from "lucide-react";
import { Link } from "wouter";

type ImportStatistics = {
  meets: number;
  teams: number;
  divisions: number;
  athletes: number;
  events: number;
  entries: number;
};

export default function Control() {
  const { toast } = useToast();
  const { currentMeetId, setCurrentMeetId, currentMeet } = useMeet();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [athleteDialogOpen, setAthleteDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<ImportStatistics | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all meets for selector
  const { data: allMeets = [] } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  // Fetch events for current meet only
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  // Fetch athletes for current meet only  
  const { data: athletes = [], isLoading: athletesLoading } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes", currentMeetId],
    queryFn: currentMeetId
      ? () => fetch(`/api/athletes?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  // Fetch teams for current meet only
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams", currentMeetId],
    queryFn: currentMeetId
      ? () => fetch(`/api/teams?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
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

  // Import MDB file mutation
  const importMdbMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("mdbFile", file);
      
      const response = await fetch("/api/import/mdb", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Import failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setImportStats(data.statistics);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      
      toast({
        title: "Import successful",
        description: `Imported ${data.statistics.meets} meets, ${data.statistics.teams} teams, ${data.statistics.divisions} divisions, ${data.statistics.athletes} athletes, ${data.statistics.events} events, and ${data.statistics.entries} entries`,
      });
    },
    onError: (error: any) => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast({
        title: "Import failed",
        description: error.message || "Failed to import .mdb file",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportStats(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMdbMutation.mutate(selectedFile);
    }
  };

  const handleAthleteSelect = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setAthleteDialogOpen(true);
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setTeamDialogOpen(true);
  };

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
          <ConnectionStatus />
          {currentMeetId && <ExportMenu meetId={currentMeetId} type="meet" />}
          <Link href="/display">
            <Button variant="outline" className="gap-2" data-testid="button-view-display">
              <Monitor className="w-4 h-4" />
              View Display
            </Button>
          </Link>
        </div>
      </div>

      {/* Meet Selector */}
      {allMeets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Current Meet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[250px]">
                <Select
                  value={currentMeetId || ""}
                  onValueChange={(value) => setCurrentMeetId(value)}
                  data-testid="select-current-meet"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMeets.map((meet) => (
                      <SelectItem key={meet.id} value={meet.id} data-testid={`meet-option-${meet.id}`}>
                        {meet.name} - {meet.location || "No location"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {currentMeet && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid="badge-meet-status">
                    {currentMeet.status || "upcoming"}
                  </Badge>
                  {currentMeet.startDate && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(currentMeet.startDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Meet Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Import Meet Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="mdb-file-input" className="text-sm font-medium mb-2 block">
                Select .mdb file
              </label>
              <Input
                id="mdb-file-input"
                ref={fileInputRef}
                type="file"
                accept=".mdb"
                onChange={handleFileChange}
                disabled={importMdbMutation.isPending}
                data-testid="input-mdb-file"
              />
            </div>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMdbMutation.isPending}
              className="gap-2"
              data-testid="button-import-mdb"
            >
              <Upload className="w-4 h-4" />
              {importMdbMutation.isPending ? "Importing..." : "Import File"}
            </Button>
          </div>

          {importMdbMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading and processing file...</span>
              </div>
              <Progress value={100} className="h-2" data-testid="progress-import" />
            </div>
          )}

          {importStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted rounded-md" data-testid="import-statistics">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-meets">
                  {importStats.meets}
                </div>
                <div className="text-xs text-muted-foreground">Meets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-teams">
                  {importStats.teams}
                </div>
                <div className="text-xs text-muted-foreground">Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-divisions">
                  {importStats.divisions}
                </div>
                <div className="text-xs text-muted-foreground">Divisions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-athletes">
                  {importStats.athletes}
                </div>
                <div className="text-xs text-muted-foreground">Athletes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-events">
                  {importStats.events}
                </div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-entries">
                  {importStats.entries}
                </div>
                <div className="text-xs text-muted-foreground">Entries</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Management */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
              <TabsTrigger value="athletes" data-testid="tab-athletes">Athletes</TabsTrigger>
              <TabsTrigger value="teams" data-testid="tab-teams">Teams</TabsTrigger>
              <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
              <TabsTrigger value="more" data-testid="tab-more">More</TabsTrigger>
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
                <AthleteList 
                  athletes={athletes} 
                  onSelectAthlete={handleAthleteSelect}
                />
              )}
            </TabsContent>

            <TabsContent value="teams" className="space-y-4">
              {teamsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading teams...
                </div>
              ) : (
                <TeamList 
                  teams={teams} 
                  onSelectTeam={handleTeamSelect}
                />
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

            <TabsContent value="more" className="space-y-4">
              <Tabs defaultValue="scoring">
                <TabsList className="grid w-full grid-cols-4 gap-1">
                  <TabsTrigger value="scoring">Scoring</TabsTrigger>
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="officials">Officials</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>

                <TabsContent value="scoring" className="space-y-4">
                  {!currentMeetId ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Award className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          Select a Meet First
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Choose a meet to configure team scoring
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <TeamScoringConfig meetId={currentMeetId} />
                      <TeamStandingsPanel meetId={currentMeetId} />
                      <MedalTrackerPanel />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="tools" className="space-y-4">
                  <QRCodeGenerator />
                  <SocialMediaGenerator />
                  <CertificateGenerator />
                  <WeatherWidget />
                  <OverlayControl />
                </TabsContent>

                <TabsContent value="officials" className="space-y-4">
                  <AthleteCheckInPanel />
                  <JudgeTokenManager />
                  <RecordBookManager />
                </TabsContent>

                <TabsContent value="media" className="space-y-4">
                  <SplitRecorderPanel />
                  <WindRecorderPanel />
                  <FinishLynxUploader />
                  <SponsorManager />
                  <CombinedEventManager />
                </TabsContent>
              </Tabs>
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

      {/* Athlete Detail Dialog */}
      <AthleteDetailDialog
        athlete={selectedAthlete}
        open={athleteDialogOpen}
        onOpenChange={setAthleteDialogOpen}
      />

      {/* Team Detail Dialog */}
      <TeamDetailDialog
        team={selectedTeam}
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
      />
    </div>
  );
}
