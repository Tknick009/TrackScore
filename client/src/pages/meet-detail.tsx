import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, MapPin, Settings, Monitor, ArrowLeft, Hash, Upload, RefreshCw, Users, Trophy, PlayCircle, CheckCircle2, Clock, TrendingUp, Activity, Trash2, AlertTriangle, Image, X } from "lucide-react";
import type { Meet, Event, Athlete } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { ExportMenu } from "@/components/ExportMenu";

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
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      
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
        <Card className="hover-elevate h-full cursor-pointer">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold mb-1">Upload Database</div>
                <div className="text-sm text-muted-foreground">Import .mdb file</div>
              </div>
            </div>
          </CardContent>
        </Card>
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

interface MeetLogoUploadProps {
  meet: Meet;
  meetId: string;
}

function MeetLogoUpload({ meet, meetId }: MeetLogoUploadProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      
      const response = await fetch(`/api/meets/${meetId}/logo`, {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ title: "Logo uploaded successfully" });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meets/${meetId}/logo`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete logo");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ title: "Logo removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or GIF image",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleRemove = () => {
    deleteMutation.mutate();
  };

  return (
    <Card data-testid="card-meet-logo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Meet Logo
        </CardTitle>
        <CardDescription>
          Upload a logo that will appear on display boards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {meet.logoUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img 
                src={meet.logoUrl} 
                alt="Meet logo" 
                className="h-20 object-contain bg-muted rounded-md p-2"
                data-testid="img-meet-logo"
              />
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemove}
                disabled={deleteMutation.isPending}
                data-testid="button-remove-logo"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {previewUrl ? (
              <div className="flex items-center gap-4">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="h-20 object-contain bg-muted rounded-md p-2"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    data-testid="button-confirm-upload"
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    data-testid="button-cancel-upload"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  data-testid="input-logo-file"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Accepted formats: JPEG, PNG, GIF
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

  const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  const stats = useMemo(() => {
    if (!events) return { total: 0, inProgress: 0, completed: 0, scheduled: 0 };
    
    return {
      total: events.length,
      inProgress: events.filter(e => e.status === "in_progress").length,
      completed: events.filter(e => e.status === "completed").length,
      scheduled: events.filter(e => e.status === "scheduled").length,
    };
  }, [events]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.status === "scheduled" && e.eventDate)
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
      .slice(0, 5);
  }, [events]);

  const liveEvents = useMemo(() => {
    return events.filter(e => e.status === "in_progress");
  }, [events]);

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
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-to-meets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Meets
            </Button>
          </Link>
          
          <ExportMenu meetId={meetId} type="meet" />
        </div>

        {/* Meet Title Section */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="heading-meet-name">
            {meet.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-meet-date">
                {format(new Date(meet.startDate), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            {meet.location && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span data-testid="text-meet-location">{meet.location}</span>
                </div>
              </>
            )}
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span className="font-mono" data-testid="text-meet-code">{meet.meetCode}</span>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="stat-total-events">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Events</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="stat-total-athletes">{athletes.length}</div>
                  <div className="text-sm text-muted-foreground">Athletes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="stat-in-progress">{stats.inProgress}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="stat-completed">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/control" className="block">
              <Card className="hover-elevate h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Control Dashboard</div>
                      <div className="text-sm text-muted-foreground">Manage events and results</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/display" className="block">
              <Card className="hover-elevate h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Display Board</div>
                      <div className="text-sm text-muted-foreground">View live scoreboard</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {meetId && (
              <UploadDialog meetId={meetId} />
            )}

            <Card className="hover-elevate h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1 text-muted-foreground">Coming Soon</div>
                    <div className="text-sm text-muted-foreground">Additional features</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Events Status */}
        {liveEvents.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                Live Events
              </CardTitle>
              <CardDescription>Events currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid={`live-event-${event.id}`}>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-primary" data-testid={`badge-event-number-${event.id}`}>
                        #{event.eventNumber}
                      </Badge>
                      <div>
                        <div className="font-semibold" data-testid={`text-event-name-${event.id}`}>{event.name}</div>
                        <div className="text-sm text-muted-foreground">{event.eventType}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-primary text-primary">
                      <PlayCircle className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events Timeline */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Events
              </CardTitle>
              <CardDescription>Next scheduled events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg" data-testid={`upcoming-event-${event.id}`}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-primary text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold" data-testid={`text-upcoming-event-name-${event.id}`}>{event.name}</div>
                      <div className="text-sm text-muted-foreground">{event.eventType}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {event.eventTime || "TBD"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.eventDate && format(new Date(event.eventDate), "MMM d")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
            <CardDescription>Complete list of meet events</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-state-events">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                  Upload a database file to import events and participants, or create events manually in the Control Dashboard.
                </p>
                <div className="flex gap-3 justify-center">
                  {meetId && <UploadDialog meetId={meetId} />}
                  <Link href="/control">
                    <Button variant="outline" data-testid="button-go-to-control-empty">
                      <Settings className="w-4 h-4 mr-2" />
                      Go to Control
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <EventsTable events={events} />
            )}
          </CardContent>
        </Card>

        {/* Meet Logo */}
        {meetId && <MeetLogoUpload meet={meet} meetId={meetId} />}

        {/* Auto-Refresh Settings */}
        {meetId && <AutoRefreshSettings meet={meet} meetId={meetId} />}

        {/* Danger Zone */}
        {meetId && <DangerZone meetId={meetId} />}
      </div>
    </div>
  );
}

interface DangerZoneProps {
  meetId: string;
}

function DangerZone({ meetId }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/meets/${meetId}/reset`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/meets/${meetId}/scoring`] });
      queryClient.invalidateQueries({ queryKey: [`/api/meets/${meetId}/scoring/standings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/meets/${meetId}/themes`] });
      queryClient.invalidateQueries({ queryKey: ["/api/layout-scenes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/display-devices"] });
      
      toast({
        title: "Meet Reset Successfully",
        description: (
          <div className="space-y-1 mt-2">
            <div>Deleted {data.eventsDeleted} events</div>
            <div>Deleted {data.athletesDeleted} athletes</div>
            <div>Deleted {data.teamsDeleted} teams</div>
            <div>Deleted {data.divisionsDeleted} divisions</div>
          </div>
        ),
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset meet data",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-destructive/30" data-testid="card-danger-zone">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Destructive actions that cannot be undone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="space-y-1">
            <div className="font-medium">Reset Meet Data</div>
            <p className="text-sm text-muted-foreground">
              Delete all teams, athletes, events, and results from this meet. The meet itself will be preserved.
            </p>
          </div>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-reset-meet">
                <Trash2 className="w-4 h-4 mr-2" />
                Reset Meet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action cannot be undone. This will permanently delete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All teams and team logos</li>
                    <li>All athletes and athlete photos</li>
                    <li>All events and their entries</li>
                    <li>All results and scoring data</li>
                    <li>All divisions</li>
                  </ul>
                  <p className="font-medium">
                    The meet settings and configuration will be preserved.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-reset"
                >
                  {resetMutation.isPending ? "Resetting..." : "Yes, Reset Meet"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
