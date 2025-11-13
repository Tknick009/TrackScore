import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, MapPin, Settings, Monitor, ArrowLeft, Hash, Upload, RefreshCw } from "lucide-react";
import type { Meet, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

function MeetDetailSkeleton() {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface UploadDialogProps {
  meetId: string;
}

function UploadDialog({ meetId }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("mdbFile", file);
      
      const response = await fetch(`/api/meets/${meetId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "events"] });
      
      const stats = data.statistics;
      toast({
        title: "Import Successful!",
        description: (
          <div className="space-y-1 mt-2">
            <div>✅ {stats.teams} teams imported</div>
            <div>✅ {stats.divisions} divisions imported</div>
            <div>✅ {stats.athletes} athletes imported</div>
            <div>✅ {stats.events} events imported</div>
            <div>✅ {stats.entries} entries imported</div>
          </div>
        ),
      });
      
      setOpen(false);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import database file",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".mdb")) {
        toast({
          title: "Invalid File",
          description: "Please select a .mdb file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-upload-database">
          <Upload className="w-4 h-4 mr-2" />
          Upload Database
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-upload-database">
        <DialogHeader>
          <DialogTitle>Upload Meet Database</DialogTitle>
          <DialogDescription>
            Upload a .mdb file to import teams, athletes, events, and entries for this meet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mdb-file">Database File (.mdb)</Label>
            <Input
              id="mdb-file"
              type="file"
              accept=".mdb"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
              data-testid="input-mdb-file"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-selected-file">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full"
            data-testid="button-start-upload"
          >
            {uploadMutation.isPending ? "Uploading..." : "Start Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventsTable({ events }: { events: Event[] }) {
  const trackEvents = events.filter((e) => {
    const eventType = e.eventType.toLowerCase();
    return !eventType.includes("jump") && !eventType.includes("throw") && !eventType.includes("put");
  });

  const fieldEvents = events.filter((e) => {
    const eventType = e.eventType.toLowerCase();
    return eventType.includes("jump") || eventType.includes("throw") || eventType.includes("put");
  });

  const renderEventsTable = (eventsList: Event[], title: string) => {
    if (eventsList.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" data-testid={`heading-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {title}
        </h3>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead data-testid="header-event-number">Event #</TableHead>
                <TableHead data-testid="header-event-name">Name</TableHead>
                <TableHead data-testid="header-event-type">Type</TableHead>
                <TableHead data-testid="header-event-gender">Gender</TableHead>
                <TableHead data-testid="header-event-distance">Distance</TableHead>
                <TableHead data-testid="header-event-date">Date</TableHead>
                <TableHead data-testid="header-event-time">Time</TableHead>
                <TableHead data-testid="header-event-status">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventsList.map((event) => (
                <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                  <TableCell className="font-medium" data-testid={`cell-event-number-${event.id}`}>
                    {event.eventNumber}
                  </TableCell>
                  <TableCell data-testid={`cell-event-name-${event.id}`}>{event.name}</TableCell>
                  <TableCell data-testid={`cell-event-type-${event.id}`}>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </TableCell>
                  <TableCell data-testid={`cell-event-gender-${event.id}`}>
                    <Badge variant={event.gender === "M" ? "default" : "secondary"}>
                      {event.gender}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`cell-event-distance-${event.id}`}>
                    {event.distance ? `${event.distance}m` : "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-event-date-${event.id}`}>
                    {event.eventDate ? format(new Date(event.eventDate), "MMM d") : "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-event-time-${event.id}`}>
                    {event.eventTime || "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-event-status-${event.id}`}>
                    <Badge
                      variant={
                        event.status === "completed"
                          ? "default"
                          : event.status === "in_progress"
                          ? "default"
                          : "outline"
                      }
                    >
                      {event.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderEventsTable(trackEvents, "Track Events")}
      {renderEventsTable(fieldEvents, "Field Events")}
    </div>
  );
}

interface AutoRefreshSettingsProps {
  meet: Meet;
  meetId: string;
}

function AutoRefreshSettings({ meet, meetId }: AutoRefreshSettingsProps) {
  const { toast } = useToast();
  const [intervalInput, setIntervalInput] = useState<string>(
    meet.refreshInterval?.toString() || "30"
  );

  const updateMeetMutation = useMutation({
    mutationFn: async (data: { autoRefresh?: boolean; refreshInterval?: number }) => {
      return await apiRequest("PATCH", `/api/meets/${meetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ title: "Settings updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const value = parseInt(intervalInput, 10);
    if (isNaN(value) || value < 5 || value > 300) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (value !== meet.refreshInterval) {
        updateMeetMutation.mutate({ refreshInterval: value });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [intervalInput]);

  const handleAutoRefreshToggle = (checked: boolean) => {
    updateMeetMutation.mutate({ autoRefresh: checked });
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIntervalInput(e.target.value);
  };

  const getFileName = (path: string | null) => {
    if (!path) return null;
    return path.split("/").pop() || path;
  };

  return (
    <Card data-testid="card-auto-refresh-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Auto-Refresh Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-refresh-switch" className="text-base">
                Automatically refresh from database file
              </Label>
              <p className="text-sm text-muted-foreground">
                Periodically re-import the uploaded database file to keep results up-to-date
              </p>
            </div>
            <Switch
              id="auto-refresh-switch"
              checked={meet.autoRefresh || false}
              onCheckedChange={handleAutoRefreshToggle}
              disabled={updateMeetMutation.isPending}
              data-testid="switch-auto-refresh"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refresh-interval" className="text-base">
              Refresh interval (seconds)
            </Label>
            <Input
              id="refresh-interval"
              type="number"
              min="5"
              max="300"
              value={intervalInput}
              onChange={handleIntervalChange}
              disabled={!meet.autoRefresh || updateMeetMutation.isPending}
              data-testid="input-refresh-interval"
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              How often to check for updates (minimum 5 seconds, maximum 300 seconds)
            </p>
          </div>

          {meet.mdbPath && (
            <>
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Last updated:</span>
                  <span data-testid="text-last-import">
                    {meet.lastImportAt
                      ? formatDistanceToNow(new Date(meet.lastImportAt), { addSuffix: true })
                      : "Never"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Database file</div>
                <div className="text-sm text-muted-foreground font-mono" data-testid="text-database-filename">
                  {getFileName(meet.mdbPath)}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MeetDetail() {
  const [match, params] = useRoute("/meets/:id");
  const meetId = params?.id;

  const { data: meet, isLoading: meetLoading } = useQuery<Meet>({
    queryKey: ["/api/meets", meetId],
    enabled: !!meetId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/meets", meetId, "events"],
    enabled: !!meetId,
  });

  if (meetLoading) {
    return <MeetDetailSkeleton />;
  }

  if (!meet) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Meet not found</h2>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Meets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-to-meets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Meets
            </Button>
          </Link>
          {meetId && <UploadDialog meetId={meetId} />}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="heading-meet-name">
            {meet.name}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-meet-date">
                {format(new Date(meet.startDate), "MMMM d, yyyy")}
              </span>
            </div>
            {meet.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-meet-location">{meet.location}</span>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meet Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Meet Code</div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span className="font-mono text-lg" data-testid="text-meet-code">
                  {meet.meetCode}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Display boards can use this code to connect to this meet
              </p>
            </div>

            {meet.trackLength && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Track Length</div>
                <span data-testid="text-track-length">{meet.trackLength}m</span>
              </div>
            )}
          </CardContent>
        </Card>

        {meetId && <AutoRefreshSettings meet={meet} meetId={meetId} />}

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-state-events">
                <p className="text-muted-foreground">No events found for this meet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload a database file to import events and participants.
                </p>
              </div>
            ) : (
              <EventsTable events={events} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                Control Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage events, record results, and broadcast live to display boards
              </p>
              <Link href="/control">
                <Button className="w-full" size="lg" data-testid="button-go-to-control">
                  Open Control Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Monitor className="w-6 h-6 text-primary" />
                Display Board
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Full-screen scoreboard for video boards showing live event results
              </p>
              <Link href="/display">
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  data-testid="button-go-to-display"
                >
                  Open Display Board
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
