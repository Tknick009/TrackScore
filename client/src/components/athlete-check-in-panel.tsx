import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Event, EntryWithDetails } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Users, Search } from "lucide-react";

type CheckInStats = {
  total: number;
  checkedIn: number;
  pending: number;
  noShow: number;
};

export function AthleteCheckInPanel() {
  const { toast } = useToast();
  const { currentMeetId } = useMeet();
  const ws = useWebSocket();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [operatorName, setOperatorName] = useState("Admin");

  // Fetch events for current meet only
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/meets", currentMeetId, "events"],
    enabled: !!currentMeetId,
  });

  // Fetch entries for selected event
  const { data: eventWithEntries, isLoading } = useQuery<{ entries: EntryWithDetails[] }>({
    queryKey: selectedEventId ? ["/api/events", selectedEventId, "entries"] : [],
    enabled: !!selectedEventId,
  });

  // Fetch check-in stats
  const { data: stats } = useQuery<CheckInStats>({
    queryKey: ["/api/events", selectedEventId, "check-in-stats"],
    enabled: !!selectedEventId,
  });

  // WebSocket for real-time updates - using shared connection
  useEffect(() => {
    if (!ws || !selectedEventId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        // ONLY process check-in updates, ignore all other message types
        if (message.type !== 'check_in_update') {
          return; // Silently ignore non-check-in messages
        }
        
        // Only process updates for the currently selected event
        if (message.eventId === selectedEventId) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/events', selectedEventId, 'entries'],
            exact: false
          });
          
          queryClient.invalidateQueries({
            queryKey: ['/api/events', selectedEventId, 'check-in-stats']
          });
          
          toast({
            title: "Check-In Updated",
            description: "Athlete status changed",
          });
        }
      } catch (e) {
        // Silently ignore parse errors from other WebSocket messages
        console.debug('Ignoring WebSocket message:', e);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, selectedEventId, toast]);

  // Single check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiRequest("POST", `/api/entries/${entryId}/check-in`, {
        operator: operatorName,
        method: "manual",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "check-in-stats"] });
      toast({
        title: "Checked in",
        description: "Athlete has been checked in successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in athlete",
        variant: "destructive",
      });
    },
  });

  // Bulk check-in mutation
  const bulkCheckInMutation = useMutation({
    mutationFn: (entryIds: string[]) =>
      apiRequest("POST", `/api/events/${selectedEventId}/bulk-check-in`, {
        entryIds,
        operator: operatorName,
        method: "bulk",
      }),
    onSuccess: () => {
      setSelectedEntries(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "check-in-stats"] });
      toast({
        title: "Bulk check-in complete",
        description: "Selected athletes have been checked in",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk check in",
        variant: "destructive",
      });
    },
  });

  const entries = eventWithEntries?.entries || [];

  // Filter entries based on search
  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const athleteName = `${entry.athlete.firstName} ${entry.athlete.lastName}`.toLowerCase();
    const bibNumber = entry.athlete.bibNumber?.toLowerCase() || "";
    return athleteName.includes(searchLower) || bibNumber.includes(searchLower);
  });

  // Toggle selection
  const toggleSelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  // Select all pending
  const selectAllPending = () => {
    const pendingIds = filteredEntries
      .filter((e) => e.checkInStatus === "pending")
      .map((e) => e.id);
    setSelectedEntries(new Set(pendingIds));
  };

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "checked_in":
        return (
          <Badge data-testid={`badge-checked-in`} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Checked In
          </Badge>
        );
      case "no_show":
        return (
          <Badge data-testid={`badge-no-show`} variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            No Show
          </Badge>
        );
      default:
        return (
          <Badge data-testid={`badge-pending`} className="bg-yellow-600 hover:bg-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4" data-testid="athlete-check-in-panel">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-checked-in">
                {stats.checkedIn}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">No Show</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-no-show">
                {stats.noShow}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Athlete Check-In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-64" data-testid="select-event">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} data-testid={`event-option-${event.id}`}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by athlete name or bib number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            <Input
              placeholder="Operator name"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-48"
              data-testid="input-operator"
            />
          </div>

          {selectedEventId && (
            <div className="flex gap-2">
              <Button
                onClick={selectAllPending}
                variant="outline"
                data-testid="button-select-all-pending"
              >
                <Users className="w-4 h-4 mr-2" />
                Select All Pending
              </Button>
              <Button
                onClick={() => bulkCheckInMutation.mutate(Array.from(selectedEntries))}
                disabled={selectedEntries.size === 0 || bulkCheckInMutation.isPending}
                data-testid="button-bulk-check-in"
              >
                Check In Selected ({selectedEntries.size})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Athlete List */}
      {selectedEventId && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading athletes...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No athletes found for this event
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Bib</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-In Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => toggleSelection(entry.id)}
                          disabled={entry.checkInStatus === "checked_in"}
                          data-testid={`checkbox-entry-${entry.id}`}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell data-testid={`bib-${entry.id}`}>
                        {entry.athlete.bibNumber || "-"}
                      </TableCell>
                      <TableCell data-testid={`name-${entry.id}`}>
                        {entry.athlete.firstName} {entry.athlete.lastName}
                      </TableCell>
                      <TableCell data-testid={`team-${entry.id}`}>
                        {entry.team?.name || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.checkInStatus)}</TableCell>
                      <TableCell data-testid={`time-${entry.id}`}>
                        {entry.checkInTime
                          ? new Date(entry.checkInTime).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.checkInStatus !== "checked_in" && (
                          <Button
                            size="sm"
                            onClick={() => checkInMutation.mutate(entry.id)}
                            disabled={checkInMutation.isPending}
                            data-testid={`button-check-in-${entry.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Check In
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
