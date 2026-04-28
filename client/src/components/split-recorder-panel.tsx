import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, EntryWithDetails, EntrySplit, EventSplitConfig } from "@shared/schema";

export function SplitRecorderPanel() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [splitTimes, setSplitTimes] = useState<Record<string, string>>({});
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/meets", currentMeetId, "events"],
    enabled: !!currentMeetId
  });
  
  const distanceEvents = events?.filter(e => 
    ["800m", "1500m_run", "3000m_run", "5000m_run", "10000m_run"].includes(e.eventType)
  );
  
  const { data: entries } = useQuery<EntryWithDetails[]>({
    queryKey: ["/api/events", selectedEventId, "entries"],
    enabled: !!selectedEventId
  });
  
  const { data: splitConfig } = useQuery<EventSplitConfig[]>({
    queryKey: ["/api/events", selectedEventId, "splits/config"],
    enabled: !!selectedEventId
  });
  
  const { data: existingSplits } = useQuery<Record<string, EntrySplit[]>>({
    queryKey: ["/api/events", selectedEventId, "splits"],
    enabled: !!selectedEventId
  });
  
  const recordSplitMutation = useMutation({
    mutationFn: async ({ entryId, split }: { entryId: string; split: any }) => 
      apiRequest(`/api/entries/${entryId}/splits`, "POST", split),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "splits"] });
      toast({ title: "Split recorded" });
    }
  });
  
  const handleRecordSplit = (entryId: string, splitIndex: number, config: EventSplitConfig) => {
    const timeStr = splitTimes[`${entryId}-${splitIndex}`];
    if (!timeStr) return;
    
    const [minutes, seconds] = timeStr.split(":").map(parseFloat);
    const elapsedSeconds = minutes * 60 + seconds;
    
    recordSplitMutation.mutate({
      entryId,
      split: {
        splitIndex,
        distanceMeters: config.distanceMeters,
        elapsedSeconds,
        splitConfigId: config.id,
        source: "manual",
        recorderId: "control-dashboard"
      }
    });
    
    setSplitTimes(prev => ({ ...prev, [`${entryId}-${splitIndex}`]: "" }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Split Time Recorder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger data-testid="select-event">
            <SelectValue placeholder="Select distance event" />
          </SelectTrigger>
          <SelectContent>
            {distanceEvents?.map(event => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedEventId && splitConfig && entries && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlete</TableHead>
                <TableHead>Bib</TableHead>
                {splitConfig.map(config => (
                  <TableHead key={config.id}>{config.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.athlete?.firstName} {entry.athlete?.lastName}</TableCell>
                  <TableCell>{entry.athlete?.bibNumber}</TableCell>
                  {splitConfig.map(config => {
                    const existingSplit = existingSplits?.[entry.id]?.find(s => s.splitIndex === config.splitOrder);
                    return (
                      <TableCell key={config.id}>
                        {existingSplit ? (
                          <Badge variant="secondary" data-testid={`badge-split-${entry.id}-${config.splitOrder}`}>
                            {Math.floor(existingSplit.elapsedSeconds / 60)}:{(existingSplit.elapsedSeconds % 60).toFixed(2).padStart(5, '0')}
                          </Badge>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="M:SS.ss"
                              value={splitTimes[`${entry.id}-${config.splitOrder}`] || ""}
                              onChange={e => setSplitTimes(prev => ({
                                ...prev,
                                [`${entry.id}-${config.splitOrder}`]: e.target.value
                              }))}
                              data-testid={`input-split-${entry.id}-${config.splitOrder}`}
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleRecordSplit(entry.id, config.splitOrder, config)}
                              data-testid={`button-record-${entry.id}-${config.splitOrder}`}
                            >
                              Record
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
