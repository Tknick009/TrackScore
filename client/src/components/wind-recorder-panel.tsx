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
import { Wind, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import type { Event, WindReading } from "@shared/schema";
import { isWindAffectedEvent } from "@shared/schema";

export function WindRecorderPanel() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [windSpeed, setWindSpeed] = useState<string>("");
  const [heatNumber, setHeatNumber] = useState<string>("");
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/meets", currentMeetId, "events"],
    enabled: !!currentMeetId
  });
  
  const windAffectedEvents = events?.filter(e => isWindAffectedEvent(e.type));
  
  const { data: readings } = useQuery<WindReading[]>({
    queryKey: ["/api/events", selectedEventId, "wind-readings"],
    enabled: !!selectedEventId
  });
  
  const createReadingMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest(`/api/events/${selectedEventId}/wind-readings`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/events", selectedEventId, "wind-readings"] 
      });
      setWindSpeed("");
      setHeatNumber("");
      toast({ title: "Wind reading recorded" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to record wind reading",
        variant: "destructive"
      });
    }
  });
  
  const deleteReadingMutation = useMutation({
    mutationFn: async (id: string) => 
      apiRequest(`/api/wind-readings/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/events", selectedEventId, "wind-readings"] 
      });
      toast({ title: "Wind reading deleted" });
    }
  });
  
  const handleRecord = () => {
    const speed = parseFloat(windSpeed);
    if (isNaN(speed) || speed < -5.0 || speed > 9.9) {
      toast({ 
        title: "Invalid wind speed", 
        description: "Wind speed must be between -5.0 and +9.9 m/s",
        variant: "destructive"
      });
      return;
    }
    
    createReadingMutation.mutate({
      windSpeed: speed,
      heatNumber: heatNumber ? parseInt(heatNumber) : null,
      source: "manual",
      recorderId: "control-dashboard"
    });
  };
  
  const getWindBadge = (reading: WindReading) => {
    if (reading.isLegal) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Legal
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Illegal
      </Badge>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wind className="h-5 w-5" />
          Wind Speed Recorder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Select wind-affected event" />
              </SelectTrigger>
              <SelectContent>
                {windAffectedEvents?.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedEventId && (
            <>
              <div>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Wind speed (m/s)"
                  value={windSpeed}
                  onChange={e => setWindSpeed(e.target.value)}
                  data-testid="input-wind-speed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Legal: ≤ +2.0 m/s
                </p>
              </div>
              
              <div>
                <Input
                  type="number"
                  placeholder="Heat # (optional)"
                  value={heatNumber}
                  onChange={e => setHeatNumber(e.target.value)}
                  data-testid="input-heat-number"
                />
              </div>
              
              <Button 
                onClick={handleRecord}
                disabled={!windSpeed || createReadingMutation.isPending}
                className="col-span-2"
                data-testid="button-record-wind"
              >
                Record Wind Reading
              </Button>
            </>
          )}
        </div>
        
        {readings && readings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Recent Readings</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wind Speed</TableHead>
                  <TableHead>Heat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map(reading => (
                  <TableRow key={reading.id}>
                    <TableCell className="font-medium">
                      {reading.windSpeed > 0 ? '+' : ''}{reading.windSpeed.toFixed(1)} m/s
                    </TableCell>
                    <TableCell>{reading.heatNumber || '-'}</TableCell>
                    <TableCell>{getWindBadge(reading)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(reading.recordedAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReadingMutation.mutate(reading.id)}
                        data-testid={`button-delete-${reading.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
