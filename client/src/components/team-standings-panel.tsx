import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TeamStandingsEntry, WSMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trophy, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TeamStandingsPanelProps {
  meetId: string;
}

export function TeamStandingsPanel({ meetId }: TeamStandingsPanelProps) {
  const { toast } = useToast();
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [topN, setTopN] = useState<number>(5);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Fetch team standings with filters in queryKey for proper caching
  const { data: standings = [], isLoading } = useQuery<TeamStandingsEntry[]>({
    queryKey: ["/api/meets", meetId, "scoring", "standings", { gender: genderFilter, division: divisionFilter, topN }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (genderFilter && genderFilter !== 'all') params.append('gender', genderFilter);
      if (divisionFilter && divisionFilter !== 'all') params.append('division', divisionFilter);
      if (topN) params.append('topN', topN.toString());
      
      const response = await fetch(`/api/meets/${meetId}/scoring/standings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch standings');
      return response.json();
    },
    enabled: !!meetId,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected for team scoring");
    };

    websocket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        if (message.type === "team_scoring_update" && message.meetId === meetId) {
          // Invalidate ALL standings queries for this meet, regardless of filters
          queryClient.invalidateQueries({ 
            queryKey: ['/api/meets', meetId, 'scoring', 'standings'],
            exact: false // Match any query starting with this key
          });
          
          toast({
            title: "Standings Updated",
            description: "Team scores have been recalculated",
          });
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [meetId]);

  // Recalculate scoring mutation
  const recalculateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/meets/${meetId}/scoring/recalculate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/meets", meetId, "scoring", "standings"],
        exact: false // Match any query starting with this key
      });
      toast({
        title: "Recalculation complete",
        description: "Team scores have been recalculated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error recalculating scores",
        description: error.message || "Failed to recalculate team scores",
        variant: "destructive",
      });
    },
  });

  const toggleTeamExpanded = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Team Standings
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="gap-2"
            data-testid="button-recalculate"
          >
            <RefreshCw className={`w-4 h-4 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
            {recalculateMutation.isPending ? "Recalculating..." : "Recalculate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="gender-filter" className="text-sm font-medium">
              Gender:
            </label>
            <Select
              value={genderFilter}
              onValueChange={setGenderFilter}
              data-testid="select-gender-filter"
            >
              <SelectTrigger id="gender-filter" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-gender-all">All</SelectItem>
                <SelectItem value="M" data-testid="filter-gender-men">Men</SelectItem>
                <SelectItem value="F" data-testid="filter-gender-women">Women</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="division-filter" className="text-sm font-medium">
              Division:
            </label>
            <Select
              value={divisionFilter}
              onValueChange={setDivisionFilter}
              data-testid="select-division-filter"
            >
              <SelectTrigger id="division-filter" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-division-all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="top-n-select" className="text-sm font-medium">
              Show Top:
            </label>
            <Select
              value={topN.toString()}
              onValueChange={(value) => setTopN(parseInt(value))}
              data-testid="select-top-n"
            >
              <SelectTrigger id="top-n-select" className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5" data-testid="top-n-5">5 Teams</SelectItem>
                <SelectItem value="10" data-testid="top-n-10">10 Teams</SelectItem>
                <SelectItem value="20" data-testid="top-n-20">20 Teams</SelectItem>
                <SelectItem value="999" data-testid="top-n-all">All Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Standings Table */}
        {isLoading ? (
          <div className="text-muted-foreground" data-testid="loading-standings">
            Loading standings...
          </div>
        ) : standings.length === 0 ? (
          <div className="text-muted-foreground text-center py-8" data-testid="no-standings">
            No team standings available yet.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]" data-testid="header-rank">Rank</TableHead>
                  <TableHead data-testid="header-team">Team</TableHead>
                  <TableHead className="text-right" data-testid="header-points">Total Points</TableHead>
                  <TableHead className="text-right" data-testid="header-events">Events</TableHead>
                  <TableHead className="w-[60px]" data-testid="header-details"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((standing) => (
                  <Collapsible
                    key={standing.teamId}
                    open={expandedTeams.has(standing.teamId)}
                    onOpenChange={() => toggleTeamExpanded(standing.teamId)}
                    asChild
                  >
                    <>
                      <TableRow data-testid={`standing-row-${standing.teamId}`}>
                        <TableCell>
                          <Badge
                            variant={standing.rank <= 3 ? "default" : "outline"}
                            data-testid={`rank-${standing.teamId}`}
                          >
                            {standing.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`team-name-${standing.teamId}`}>
                          {standing.teamName}
                        </TableCell>
                        <TableCell className="text-right font-bold" data-testid={`total-points-${standing.teamId}`}>
                          {standing.totalPoints.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`event-count-${standing.teamId}`}>
                          {standing.eventCount}
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              data-testid={`button-expand-${standing.teamId}`}
                            >
                              {expandedTeams.has(standing.teamId) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/50">
                            <div className="p-4 space-y-2" data-testid={`breakdown-${standing.teamId}`}>
                              <h4 className="font-semibold text-sm">Event Breakdown</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {standing.eventBreakdown.map((event) => (
                                  <div
                                    key={event.eventId}
                                    className="text-sm"
                                    data-testid={`event-${standing.teamId}-${event.eventId}`}
                                  >
                                    <span className="text-muted-foreground">{event.eventName}:</span>{" "}
                                    <span className="font-medium">{event.points.toFixed(1)} pts</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
