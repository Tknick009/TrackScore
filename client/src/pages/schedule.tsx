import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event, TeamStandingsEntry } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Timer, Target, ArrowUpDown, Edit2, Check, X, Trophy, RefreshCw, Search, Medal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type SortOption = 'time' | 'session' | 'number' | 'name' | 'status';

function formatAdvancementFormula(advanceByPlace: number | null | undefined, advanceByTime: number | null | undefined): string {
  if (!advanceByPlace && !advanceByTime) return '';
  const q = advanceByPlace || 0;
  const t = advanceByTime || 0;
  if (q > 0 && t > 0) {
    return `${q}Q+${t}q`;
  } else if (q > 0) {
    return `${q}Q`;
  } else if (t > 0) {
    return `${t}q`;
  }
  return '';
}

function AdvancementFormulaEditor({ event, meetId }: { event: Event; meetId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [advanceByPlace, setAdvanceByPlace] = useState<string>(event.advanceByPlace?.toString() || '');
  const [advanceByTime, setAdvanceByTime] = useState<string>(event.advanceByTime?.toString() || '');
  const { toast } = useToast();

  // Sync state when event props change
  useEffect(() => {
    setAdvanceByPlace(event.advanceByPlace?.toString() || '');
    setAdvanceByTime(event.advanceByTime?.toString() || '');
  }, [event.advanceByPlace, event.advanceByTime]);

  const updateMutation = useMutation({
    mutationFn: async (data: { advanceByPlace?: number | null; advanceByTime?: number | null }) => {
      return await apiRequest("PATCH", `/api/events/${event.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", meetId] });
      setIsEditing(false);
      toast({ title: "Advancement formula updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const q = advanceByPlace ? parseInt(advanceByPlace, 10) : null;
    const t = advanceByTime ? parseInt(advanceByTime, 10) : null;
    
    // Validate: must be non-negative integers
    if (q !== null && (isNaN(q) || q < 0)) {
      toast({ title: "Invalid Q value", description: "Must be a non-negative number", variant: "destructive" });
      return;
    }
    if (t !== null && (isNaN(t) || t < 0)) {
      toast({ title: "Invalid q value", description: "Must be a non-negative number", variant: "destructive" });
      return;
    }
    
    updateMutation.mutate({
      advanceByPlace: q,
      advanceByTime: t,
    });
  };

  const handleCancel = () => {
    setAdvanceByPlace(event.advanceByPlace?.toString() || '');
    setAdvanceByTime(event.advanceByTime?.toString() || '');
    setIsEditing(false);
  };

  const formula = formatAdvancementFormula(event.advanceByPlace, event.advanceByTime);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="text-xs text-muted-foreground">Advance:</span>
        <Input
          className="w-12"
          placeholder="0"
          type="number"
          min="0"
          value={advanceByPlace}
          onChange={(e) => setAdvanceByPlace(e.target.value)}
          data-testid={`input-advance-place-${event.id}`}
        />
        <span className="text-xs">Q +</span>
        <Input
          className="w-12"
          placeholder="0"
          type="number"
          min="0"
          value={advanceByTime}
          onChange={(e) => setAdvanceByTime(e.target.value)}
          data-testid={`input-advance-time-${event.id}`}
        />
        <span className="text-xs">q</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid={`button-save-advance-${event.id}`}
        >
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          data-testid={`button-cancel-advance-${event.id}`}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="ghost"
      size="sm"
      className="mt-1 text-xs text-muted-foreground"
      onClick={() => setIsEditing(true)}
      data-testid={`button-edit-advance-${event.id}`}
    >
      {formula ? `Advance: ${formula}` : 'Set advancement...'}
      <Edit2 className="h-3 w-3 ml-1" />
    </Button>
  );
}

function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 9999;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'AM' && hours === 12) hours = 0;
  else if (period === 'PM' && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

function getDisplayStatus(event: Event): string {
  if (event.status === "in_progress") return 'live';
  if (event.isScored || event.hytekStatus === 'scored') return 'scored';
  if (event.hytekStatus === 'done') return 'done';
  if (event.hytekStatus === 'seeded') return 'seeded';
  return 'unseeded';
}

function EventStatusBadge({ event }: { event: Event }) {
  const displayStatus = getDisplayStatus(event);

  if (displayStatus === 'live') {
    return <Badge className="bg-green-600 text-white" data-testid={`badge-status-${event.id}`}>Live</Badge>;
  }
  if (displayStatus === 'scored') {
    return <Badge className="bg-pink-500 text-white dark:bg-pink-600" data-testid={`badge-status-${event.id}`}>Scored</Badge>;
  }
  if (displayStatus === 'done') {
    return <Badge className="bg-gray-400 text-white dark:bg-gray-500" data-testid={`badge-status-${event.id}`}>Done</Badge>;
  }
  if (displayStatus === 'seeded') {
    return <Badge className="bg-teal-500 text-white dark:bg-teal-600" data-testid={`badge-status-${event.id}`}>Seeded</Badge>;
  }
  return <Badge variant="outline" className="bg-white text-gray-700 dark:bg-gray-200 dark:text-gray-700" data-testid={`badge-status-${event.id}`}>Unseeded</Badge>;
}

function StandingsTable({ title, standings, gender, meetId }: { 
  title: string; 
  standings: TeamStandingsEntry[]; 
  gender: 'M' | 'W';
  meetId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScores, setEditedScores] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async (overrides: { teamId: string; score: number | null }[]) => {
      await Promise.all(
        overrides.map(({ teamId, score }) =>
          apiRequest("PATCH", `/api/teams/${teamId}/score-override`, { gender, score })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/meets", meetId, "team-standings"] });
      setIsEditing(false);
      setEditedScores({});
      toast({ title: "Scores updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error saving scores", description: err.message, variant: "destructive" });
    },
  });

  const handleStartEdit = () => {
    const scores: Record<string, string> = {};
    for (const team of standings) {
      scores[team.teamId] = String(team.totalPoints);
    }
    setEditedScores(scores);
    setIsEditing(true);
  };

  const handleSave = () => {
    const overrides = standings
      .filter(team => {
        const edited = editedScores[team.teamId];
        return edited !== undefined && Number(edited) !== team.totalPoints;
      })
      .map(team => ({
        teamId: team.teamId,
        score: Number(editedScores[team.teamId]),
      }));
    
    if (overrides.length === 0) {
      setIsEditing(false);
      return;
    }
    saveMutation.mutate(overrides);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedScores({});
  };

  if (standings.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">No scored events yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid={`button-save-scores-${gender}`}
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                data-testid={`button-cancel-scores-${gender}`}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStartEdit}
              data-testid={`button-edit-scores-${gender}`}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium w-10">#</th>
              <th className="text-left px-3 py-2 font-medium">Team</th>
              <th className="text-right px-3 py-2 font-medium w-16">Events</th>
              <th className="text-right px-3 py-2 font-medium w-20">Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => (
              <tr key={team.teamId} className={index % 2 === 0 ? '' : 'bg-muted/20'} data-testid={`row-team-${team.teamId}`}>
                <td className="px-3 py-2 text-muted-foreground">{team.rank}</td>
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`/logos/NCAA/${encodeURIComponent(team.teamName)}.png`} alt={team.teamName} />
                      <AvatarFallback className="text-xs">{team.teamName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{team.teamName}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">{team.eventCount}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.5"
                      className="w-20 text-right ml-auto"
                      value={editedScores[team.teamId] ?? String(team.totalPoints)}
                      onChange={(e) => setEditedScores(prev => ({ ...prev, [team.teamId]: e.target.value }))}
                      data-testid={`input-score-${gender}-${team.teamId}`}
                    />
                  ) : (
                    <span data-testid={`text-score-${gender}-${team.teamId}`}>{team.totalPoints}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    queryFn: currentMeetId 
      ? () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json())
      : undefined,
    enabled: !!currentMeetId,
  });

  const { data: teamStandingsData } = useQuery<{ men: TeamStandingsEntry[]; women: TeamStandingsEntry[] }>({
    queryKey: ["/api/public/meets", currentMeetId, "team-standings"],
    queryFn: () => fetch(`/api/public/meets/${currentMeetId}/team-standings`).then(r => r.json()),
    enabled: !!currentMeetId,
  });

  // Fetch all active records for display on schedule
  type RecordEntry = {
    id: number;
    eventType: string;
    gender: string;
    performance: string;
    athleteName: string;
    team: string | null;
    date: string | null;
    bookName: string;
    bookScope: string;
    bookDisplayOrder: number;
  };
  const { data: allRecords = [] } = useQuery<RecordEntry[]>({
    queryKey: ["/api/records/all"],
    queryFn: () => fetch('/api/records/all').then(r => r.json()),
  });

  // Build a lookup map: eventType+gender -> best record (highest priority only)
  // Priority: lower displayOrder = higher priority. PB > SB when same priority.
  const recordsByEvent = useMemo(() => {
    const map = new Map<string, RecordEntry>();
    for (const rec of allRecords) {
      const key = `${rec.eventType}|${rec.gender}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, rec);
      } else {
        // Lower displayOrder = higher priority
        const recOrder = rec.bookDisplayOrder ?? 99;
        const existingOrder = existing.bookDisplayOrder ?? 99;
        if (recOrder < existingOrder) {
          map.set(key, rec);
        } else if (recOrder === existingOrder) {
          // Same priority: PB scope takes priority over SB scope
          // "meet" scope (PB-like) > "facility" scope (SB-like)
          const isPB = (r: RecordEntry) => r.bookName.toLowerCase().includes('pb') || r.bookName.toLowerCase().includes('personal');
          const isSB = (r: RecordEntry) => r.bookName.toLowerCase().includes('sb') || r.bookName.toLowerCase().includes('season');
          if (isPB(rec) && !isPB(existing)) {
            map.set(key, rec);
          } else if (!isSB(rec) && isSB(existing)) {
            map.set(key, rec);
          }
        }
      }
    }
    return map;
  }, [allRecords]);
  const menStandings = teamStandingsData?.men ?? [];
  const womenStandings = teamStandingsData?.women ?? [];

  const refreshMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/meets/${currentMeetId}/refresh-team-scores`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/meets", currentMeetId, "team-standings"] });
      toast({ title: "Team scores refreshed from HyTek" });
    },
    onError: (err: any) => {
      toast({ title: "Error refreshing scores", description: err.message, variant: "destructive" });
    },
  });

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e => 
      (e.name || '').toLowerCase().includes(q) ||
      (e.eventType || '').toLowerCase().includes(q) ||
      (e.gender || '').toLowerCase().includes(q) ||
      String(e.eventNumber || '').includes(q)
    );
  }, [events, searchQuery]);

  const liveEvents = filteredEvents.filter(e => e.status === "in_progress");
  const scoredEvents = filteredEvents.filter(e => e.status === "completed" || e.isScored || e.hytekStatus === 'scored');
  const doneEvents = filteredEvents.filter(e => !scoredEvents.includes(e) && e.hytekStatus === 'done');
  const seededEvents = filteredEvents.filter(e => !scoredEvents.includes(e) && !doneEvents.includes(e) && e.status !== "in_progress" && e.hytekStatus === 'seeded');
  const unseededEvents = filteredEvents.filter(e => !scoredEvents.includes(e) && !doneEvents.includes(e) && !seededEvents.includes(e) && e.status !== "in_progress");

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      // Always keep live events at top
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;

      switch (sortBy) {
        case 'time':
          // Sort by date first, then time (AM before PM), then event number
          const dateA = a.eventDate ? String(a.eventDate) : '';
          const dateB = b.eventDate ? String(b.eventDate) : '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          const timeMinutesA = parseTimeToMinutes(a.eventTime);
          const timeMinutesB = parseTimeToMinutes(b.eventTime);
          if (timeMinutesA !== timeMinutesB) return timeMinutesA - timeMinutesB;
          return (a.eventNumber || 0) - (b.eventNumber || 0);
        case 'session':
          // Sort by session name (empty sessions last), then event number
          const sessionA = (a as any).sessionName || '';
          const sessionB = (b as any).sessionName || '';
          if (sessionA && !sessionB) return -1;
          if (!sessionA && sessionB) return 1;
          if (sessionA !== sessionB) return sessionA.localeCompare(sessionB);
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
  }, [filteredEvents, sortBy]);

  // Group by date when sorting by time, or by session when sorting by session
  const eventsByGroup = useMemo(() => {
    if (sortBy === 'time') {
      return sortedEvents.reduce((acc, event) => {
        const date = event.eventDate ? String(event.eventDate) : 'Unscheduled';
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
      }, {} as Record<string, Event[]>);
    }
    if (sortBy === 'session') {
      return sortedEvents.reduce((acc, event) => {
        const session = (event as any).sessionName || 'Not In Session';
        if (!acc[session]) acc[session] = [];
        acc[session].push(event);
        return acc;
      }, {} as Record<string, Event[]>);
    }
    return { 'All Events': sortedEvents };
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
      <div className="px-6 py-5 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Event Schedule</h1>
            {liveEvents.length > 0 && (
              <Badge className="bg-green-600 text-white gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {liveEvents.length} Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px] h-9"
                data-testid="input-schedule-search"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] h-9" data-testid="select-schedule-sort">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">By Time</SelectItem>
                <SelectItem value="session">By Session</SelectItem>
                <SelectItem value="number">By Event #</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Status summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            {unseededEvents.length} unseeded
          </Badge>
          <Badge variant="outline" className="text-xs gap-1 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {seededEvents.length} seeded
          </Badge>
          <Badge variant="outline" className="text-xs gap-1 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            {doneEvents.length} done
          </Badge>
          <Badge variant="outline" className="text-xs gap-1 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {scoredEvents.length} scored
          </Badge>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs gap-1">
              {filteredEvents.length} of {events.length} shown
              <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
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
            {Object.entries(eventsByGroup).map(([groupKey, groupEvents]) => (
              <div key={groupKey}>
                {/* Show group headers when sorting by time or session */}
                {(sortBy === 'time' || sortBy === 'session') && (
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold">
                      {sortBy === 'time' ? (
                        groupKey === 'Unscheduled' 
                          ? 'Unscheduled Events' 
                          : new Date(groupKey).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                      ) : (
                        groupKey
                      )}
                    </h2>
                    <Badge variant="secondary">{groupEvents.length}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {groupEvents.map((event: Event) => {
                    const isPrelim = (event.numRounds || 1) > 1;
                    return (
                      <div key={event.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                              {/* Event type icon with color coding */}
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                event.status === 'in_progress' 
                                  ? 'bg-green-500/10 text-green-600' 
                                  : event.status === 'completed'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-primary/5 text-primary/70'
                              }`}>
                                {isTrackEvent(event.eventType) ? (
                                  <Timer className="w-4 h-4" />
                                ) : (
                                  <Target className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate text-sm">{event.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                  {event.eventTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {event.eventTime}
                                    </span>
                                  )}
                                  {event.eventNumber != null && (
                                    <span className="font-mono">#{event.eventNumber}</span>
                                  )}
                                  <span className="capitalize">{event.gender}</span>
                                </div>
                                {/* Record for this event (highest priority only) */}
                                {(() => {
                                  const rec = recordsByEvent.get(`${event.eventType}|${event.gender}`);
                                  if (!rec) return null;
                                  const scopeColors: Record<string, string> = {
                                    meet: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                                    facility: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                                    national: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                                    international: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                                    custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300',
                                  };
                                  const colorClass = scopeColors[rec.bookScope] || scopeColors.custom;
                                  return (
                                    <div className="mt-1">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                                              <Medal className="w-2.5 h-2.5" />
                                              {rec.bookName}: {rec.performance}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            <div className="font-semibold">{rec.bookName}</div>
                                            <div>{rec.athleteName}{rec.team ? ` (${rec.team})` : ''}</div>
                                            <div>{rec.performance}{rec.date ? ` - ${new Date(rec.date).toLocaleDateString()}` : ''}</div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  );
                                })()}
                                {isPrelim && currentMeetId && (
                                  <AdvancementFormulaEditor event={event} meetId={currentMeetId} />
                                )}
                              </div>
                            {/* Status badge only - no action buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {currentMeetId && <EventStatusBadge event={event} />}
                            </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentMeetId && (
          <div className="mt-6 pb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Trophy className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Team Scores</h2>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                data-testid="button-refresh-scores"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh from HyTek
              </Button>
            </div>
            {menStandings.length === 0 && womenStandings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scored events yet. Mark events as scored to see team totals here.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <StandingsTable title="Men's Standings" standings={menStandings} gender="M" meetId={currentMeetId} />
                <StandingsTable title="Women's Standings" standings={womenStandings} gender="W" meetId={currentMeetId} />
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
