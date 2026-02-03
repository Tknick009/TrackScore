import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isPast, isToday, isFuture } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Plus, Calendar, Settings, Monitor, Copy, Check, Search, Filter, Trash2, MoreVertical, Cloud, FolderDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { LogIn } from "lucide-react";
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

// Schema for join meet form
const joinMeetFormSchema = z.object({
  meetCode: z.string().min(1, "Meet code is required").toUpperCase(),
});

type JoinMeetFormData = z.infer<typeof joinMeetFormSchema>;

function JoinMeetDialog() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<JoinMeetFormData>({
    resolver: zodResolver(joinMeetFormSchema),
    defaultValues: {
      meetCode: "",
    },
  });

  const joinMeetMutation = useMutation({
    mutationFn: async (data: JoinMeetFormData) => {
      const response = await fetch(`/api/meets/code/${data.meetCode.toUpperCase()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Meet not found");
      }
      return await response.json();
    },
    onSuccess: (meet: Meet) => {
      toast({
        title: "Meet joined",
        description: `Connected to ${meet.name}`,
      });
      setOpen(false);
      form.reset();
      // Navigate to the control interface for this meet
      setLocation(`/control/${meet.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Meet not found",
        description: error.message || "Please check the meet code and try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JoinMeetFormData) => {
    joinMeetMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" data-testid="button-join-meet">
          <LogIn className="w-4 h-4 mr-2" />
          Join Meet
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-join-meet">
        <DialogHeader>
          <DialogTitle>Join Existing Meet</DialogTitle>
          <DialogDescription>
            Enter the meet code to connect to an existing meet. The meet data, logo, and settings will be pulled from the central server.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="meetCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meet Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., ABC123"
                      className="uppercase font-mono text-lg tracking-wider"
                      data-testid="input-meet-code"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                data-testid="button-cancel-join-meet"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={joinMeetMutation.isPending}
                data-testid="button-submit-join-meet"
              >
                {joinMeetMutation.isPending ? "Joining..." : "Join Meet"}
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
      className="flex items-center gap-4 px-4 py-3 hover-elevate rounded-md border-b last:border-b-0" 
      data-testid={`row-meet-${meet.id}`}
    >
      {/* Date column */}
      <div className="flex-shrink-0 w-20 text-center">
        <div className="text-lg font-semibold text-foreground">{format(meetDate, "MMM d")}</div>
        <div className="text-xs text-muted-foreground">{format(meetDate, "yyyy")}</div>
      </div>
      
      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/control/${meet.id}`}>
            <span className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer" data-testid={`text-meet-name-${meet.id}`}>
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

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No meets yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create your first track and field meet or join an existing one using a meet code. You'll be able to manage events, 
          record results, and broadcast live to display boards.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <JoinMeetDialog />
          <CreateMeetDialog />
          <Link href="/cloud-sync">
            <Button variant="outline" size="lg" data-testid="button-cloud-sync">
              <Cloud className="w-4 h-4 mr-2" />
              Download from Cloud
            </Button>
          </Link>
          <Link href="/load-meet">
            <Button variant="outline" size="lg" data-testid="button-load-meet">
              <FolderDown className="w-4 h-4 mr-2" />
              Load from Package
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
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="heading-meets-list">
                Track & Field Meets
              </h1>
              <p className="text-muted-foreground">
                Manage your track and field competitions with professional scoreboard control
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <JoinMeetDialog />
              <CreateMeetDialog />
              <Link href="/cloud-sync">
                <Button variant="outline" size="lg" data-testid="button-cloud-sync-header">
                  <Cloud className="w-4 h-4 mr-2" />
                  Download from Cloud
                </Button>
              </Link>
              <Link href="/load-meet">
                <Button variant="outline" size="lg" data-testid="button-load-meet-header">
                  <FolderDown className="w-4 h-4 mr-2" />
                  Load from Package
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {meets && meets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-total-meets">
                    {stats.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Meets</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary" data-testid="stat-active-meets">
                    {stats.active}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Today</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-upcoming-meets">
                    {stats.upcoming}
                  </div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-muted-foreground" data-testid="stat-past-meets">
                    {stats.past}
                  </div>
                  <div className="text-sm text-muted-foreground">Past</div>
                </CardContent>
              </Card>
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
