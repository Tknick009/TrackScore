import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isPast, isToday, isFuture } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Plus, Calendar, Settings, Monitor, Copy, Check, Search, Filter, Trash2, MoreVertical, FolderDown, FolderSync, RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { insertMeetSchema, type Meet } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Create a schema for the form with only the required fields
const createMeetFormSchema = insertMeetSchema
  .pick({ name: true, location: true, startDate: true })
  .extend({
    name: z.string().min(1, "Name is required"),
    startDate: z.date({ required_error: "Date is required" }),
    location: z.string().optional(),
  });

type CreateMeetFormData = z.infer<typeof createMeetFormSchema>;

function CreateMeetDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateMeetFormData>({
    resolver: zodResolver(createMeetFormSchema),
    defaultValues: {
      name: "",
      location: "",
      startDate: new Date(),
    },
  });

  const createMeetMutation = useMutation({
    mutationFn: async (data: CreateMeetFormData) => {
      const response = await apiRequest("POST", "/api/meets", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({
        title: "Meet created",
        description: "Your meet has been created successfully.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateMeetFormData) => {
    createMeetMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" data-testid="button-create-meet">
          <Plus className="w-4 h-4 mr-2" />
          Create Meet
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-meet">
        <DialogHeader>
          <DialogTitle>Create New Meet</DialogTitle>
          <DialogDescription>
            Add a new track and field meet. A unique meet code will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meet Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Spring Track Championship"
                      data-testid="input-meet-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        data-testid="calendar-meet-date"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City Stadium"
                      data-testid="input-meet-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-create-meet"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMeetMutation.isPending}
                data-testid="button-submit-create-meet"
              >
                {createMeetMutation.isPending ? "Creating..." : "Create Meet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MeetRow({ meet }: { meet: Meet }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const meetDate = new Date(meet.startDate);
  const status = isPast(meetDate) && !isToday(meetDate) ? "past" : isToday(meetDate) ? "active" : "upcoming";

  const deleteMeetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/meets/${meet.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({
        title: "Meet deleted",
        description: `${meet.name} has been deleted`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const copyMeetCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(meet.meetCode);
    setCopied(true);
    toast({
      title: "Meet code copied",
      description: `Code ${meet.meetCode} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-all rounded-lg border-b last:border-b-0 group" 
      data-testid={`row-meet-${meet.id}`}
    >
      {/* Date column */}
      <div className="flex-shrink-0 w-14 text-center">
        <div className="text-sm font-bold text-foreground leading-tight">{format(meetDate, "MMM")}</div>
        <div className="text-2xl font-bold text-foreground leading-tight">{format(meetDate, "d")}</div>
        <div className="text-[10px] text-muted-foreground">{format(meetDate, "yyyy")}</div>
      </div>
      
      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/control/${meet.id}`}>
            <span className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer group-hover:text-primary" data-testid={`text-meet-name-${meet.id}`}>
              {meet.name}
            </span>
          </Link>
          <Badge 
            variant={status === "active" ? "default" : status === "upcoming" ? "secondary" : "outline"}
            className="text-xs"
            data-testid={`badge-status-${meet.id}`}
          >
            {status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="font-mono text-xs">{meet.meetCode}</span>
          {meet.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {meet.location}
            </span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={`/control/${meet.id}`}>
          <Button size="sm" className="gap-1.5" data-testid={`button-go-control-${meet.id}`}>
            <Settings className="w-3.5 h-3.5" />
            Control
          </Button>
        </Link>
        <Link href="/display">
          <Button variant="outline" size="sm" className="gap-1.5" data-testid={`button-view-display-${meet.id}`}>
            <Monitor className="w-3.5 h-3.5" />
            Display
          </Button>
        </Link>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-meet-menu-${meet.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyMeetCode}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Meet
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Meet</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{meet.name}"? This will permanently delete all events, athletes, and results associated with this meet. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMeetMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid={`button-confirm-delete-${meet.id}`}
              >
                {deleteMeetMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function MeetRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
      <div className="flex-shrink-0 w-20 text-center">
        <Skeleton className="h-6 w-12 mx-auto" />
        <Skeleton className="h-3 w-8 mx-auto mt-1" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

function FolderSyncPanel() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: syncConfig, isLoading: configLoading } = useQuery<{
    syncFolderPath: string;
    autoSyncOnBoot: boolean;
    lastSyncTime?: string;
    lastSyncResults?: Array<{
      packageName: string;
      meetName: string;
      meetCode: string;
      action: 'imported' | 'skipped_exists' | 'skipped_error';
      error?: string;
    }>;
  }>({
    queryKey: ['/api/folder-sync/config'],
  });

  // Keep local state in sync with server config when it loads
  useEffect(() => {
    if (syncConfig?.syncFolderPath && folderPath === '') {
      setFolderPath(syncConfig.syncFolderPath);
      setAutoSync(syncConfig.autoSyncOnBoot ?? true);
    }
  }, [syncConfig?.syncFolderPath]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: { syncFolderPath: string; autoSyncOnBoot: boolean }) => {
      const response = await apiRequest('PUT', '/api/folder-sync/config', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folder-sync/config'] });
      toast({ title: 'Sync folder saved', description: `Folder path: ${folderPath}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving config', description: error.message, variant: 'destructive' });
    },
  });

  const syncNowMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      const response = await apiRequest('POST', '/api/folder-sync/sync', { syncFolderPath: folderPath || undefined });
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/meets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folder-sync/config'] });
      if (data.error) {
        toast({ title: 'Sync issue', description: data.error, variant: 'destructive' });
      } else if (data.imported > 0) {
        toast({ title: 'Sync complete', description: `Imported ${data.imported} new meet(s)` });
      } else if (data.skippedExists > 0) {
        toast({ title: 'Sync complete', description: `All ${data.packagesFound} meet(s) already imported` });
      } else if (data.packagesFound > 0) {
        toast({ title: 'Sync complete', description: `All ${data.packagesFound} meet(s) already imported` });
      } else {
        toast({
          title: 'No meet packages found',
          description: `Searched: ${data.syncFolderPath || folderPath}. Make sure exported meet packages (with meet-package.json) are in this folder.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      setIsSyncing(false);
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    if (!folderPath.trim()) {
      toast({ title: 'Error', description: 'Please enter a folder path', variant: 'destructive' });
      return;
    }
    saveConfigMutation.mutate({ syncFolderPath: folderPath.trim(), autoSyncOnBoot: autoSync });
  };

  const lastResults = syncConfig?.lastSyncResults;
  const lastSyncTime = syncConfig?.lastSyncTime;

  return (
    <Card className="border-primary/20">
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <FolderSync className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Folder Sync</h3>
            <p className="text-xs text-muted-foreground">
              {syncConfig?.syncFolderPath
                ? `Syncing from: ${syncConfig.syncFolderPath}`
                : 'Configure a shared folder to auto-sync app updates and meets on boot'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {syncConfig?.syncFolderPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); syncNowMutation.mutate(); }}
              disabled={isSyncing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <CardContent className="pt-0 pb-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sync Folder Path</label>
              <div className="flex gap-2">
                <Input
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="/path/to/shared/meets or C:\\Shared\\Meets"
                  className="flex-1"
                />
                <Button onClick={handleSave} disabled={saveConfigMutation.isPending} size="sm">
                  {saveConfigMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Path to a shared folder (local, network drive, or cloud-synced like OneDrive/Google Drive).
                On startup, the app will pull any updated files (code, configs, meets) from this folder
                before launching the server. Put your TrackScore files here to keep all computers in sync.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-sync"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="auto-sync" className="text-sm">Auto-sync on boot</label>
            </div>
          </div>

          {lastSyncTime && (
            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-2">
                Last sync: {format(new Date(lastSyncTime), 'PPp')}
              </div>
              {lastResults && lastResults.length > 0 && (
                <div className="space-y-1">
                  {lastResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.action === 'imported' && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                      {r.action === 'skipped_exists' && <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                      {r.action === 'skipped_error' && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      <span className="font-medium">{r.meetName}</span>
                      <span className="text-muted-foreground">({r.meetCode})</span>
                      <span className="text-muted-foreground">
                        {r.action === 'imported' && '— imported'}
                        {r.action === 'skipped_exists' && '— already exists'}
                        {r.action === 'skipped_error' && `— error: ${r.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No meets yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create a new meet or load one from your synced packages. You'll be able to manage events, 
          record results, and broadcast live to display boards.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <CreateMeetDialog />
          <Link href="/load-meet">
            <Button variant="outline" size="lg" data-testid="button-load-meet">
              <FolderDown className="w-4 h-4 mr-2" />
              Load Meet
            </Button>
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl">
          <div className="p-4 bg-muted rounded-md">
            <div className="font-semibold mb-1 text-sm">1. Create Meet</div>
            <p className="text-xs text-muted-foreground">Set up your meet with basic details</p>
          </div>
          <div className="p-4 bg-muted rounded-md">
            <div className="font-semibold mb-1 text-sm">2. Upload Data</div>
            <p className="text-xs text-muted-foreground">Import athletes and events from .mdb file</p>
          </div>
          <div className="p-4 bg-muted rounded-md">
            <div className="font-semibold mb-1 text-sm">3. Go Live</div>
            <p className="text-xs text-muted-foreground">Broadcast results to display boards</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MeetsList() {
  const { data: meets, isLoading } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "upcoming" | "past">("all");

  const filteredMeets = useMemo(() => {
    if (!meets) return [];
    
    let filtered = meets;
    
    if (searchQuery) {
      filtered = filtered.filter(meet => 
        meet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meet.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meet.meetCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(meet => {
        const meetDate = new Date(meet.startDate);
        const status = isPast(meetDate) && !isToday(meetDate) ? "past" : isToday(meetDate) ? "active" : "upcoming";
        return status === filterStatus;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [meets, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    if (!meets) return { total: 0, active: 0, upcoming: 0, past: 0 };
    
    return meets.reduce((acc, meet) => {
      const meetDate = new Date(meet.startDate);
      const status = isPast(meetDate) && !isToday(meetDate) ? "past" : isToday(meetDate) ? "active" : "upcoming";
      
      acc.total++;
      if (status === "active") acc.active++;
      else if (status === "upcoming") acc.upcoming++;
      else acc.past++;
      
      return acc;
    }, { total: 0, active: 0, upcoming: 0, past: 0 });
  }, [meets]);

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="heading-meets-list">
                    Track & Field Meets
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Manage competitions and scoreboard control
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <CreateMeetDialog />
              <Link href="/load-meet">
                <Button variant="outline" size="lg" data-testid="button-load-meet-header">
                  <FolderDown className="w-4 h-4 mr-2" />
                  Load Meet
                </Button>
              </Link>
            </div>
          </div>

          {/* Folder Sync Panel */}
          <FolderSyncPanel />

          {/* Stats Cards */}
          {meets && meets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md">
                <div className="text-xs font-medium text-muted-foreground mb-1">Total Meets</div>
                <div className="text-3xl font-bold text-foreground tracking-tight" data-testid="stat-total-meets">
                  {stats.total}
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 shadow-sm transition-all hover:shadow-md">
                <div className="text-xs font-medium text-primary mb-1">Active Today</div>
                <div className="text-3xl font-bold text-primary tracking-tight" data-testid="stat-active-meets">
                  {stats.active}
                </div>
              </div>
              <div className="rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md">
                <div className="text-xs font-medium text-muted-foreground mb-1">Upcoming</div>
                <div className="text-3xl font-bold text-foreground tracking-tight" data-testid="stat-upcoming-meets">
                  {stats.upcoming}
                </div>
              </div>
              <div className="rounded-xl border bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md">
                <div className="text-xs font-medium text-muted-foreground mb-1">Past</div>
                <div className="text-3xl font-bold text-muted-foreground tracking-tight" data-testid="stat-past-meets">
                  {stats.past}
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          {meets && meets.length > 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search meets by name, location, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-meets"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-filter-status">
                    <Filter className="w-4 h-4" />
                    {filterStatus === "all" ? "All Meets" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterStatus("all")} data-testid="filter-all">
                    All Meets
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("active")} data-testid="filter-active">
                    Active Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("upcoming")} data-testid="filter-upcoming">
                    Upcoming
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("past")} data-testid="filter-past">
                    Past
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Meets List */}
        {isLoading ? (
          <Card>
            <div className="divide-y">
              {[...Array(6)].map((_, i) => (
                <MeetRowSkeleton key={i} />
              ))}
            </div>
          </Card>
        ) : meets && meets.length > 0 ? (
          filteredMeets.length > 0 ? (
            <Card data-testid="list-meets">
              <div className="divide-y">
                {filteredMeets.map((meet) => (
                  <MeetRow key={meet.id} meet={meet} />
                ))}
              </div>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No meets found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterStatus("all"); }} data-testid="button-clear-filters">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
