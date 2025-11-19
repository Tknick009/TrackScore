import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Award, Download } from "lucide-react";

export function CertificateGenerator() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  
  const { data: events } = useQuery<any[]>({
    queryKey: ["/api/events", currentMeetId],
    enabled: !!currentMeetId
  });
  
  const { data: selectedEvent } = useQuery<any>({
    queryKey: ["/api/events", selectedEventId, "entries"],
    enabled: !!selectedEventId
  });
  
  const completedEvents = events?.filter(e => e.status === "completed") || [];
  
  const podiumAthletes = selectedEvent?.entries
    ?.filter((e: any) => e.finalPlace && e.finalPlace >= 1 && e.finalPlace <= 3 && e.athlete)
    .sort((a: any, b: any) => (a.finalPlace || 0) - (b.finalPlace || 0)) || [];
  
  const handleSingleDownload = async () => {
    if (!selectedEventId || !selectedAthleteId) {
      toast({ title: "Select event and athlete", variant: "destructive" });
      return;
    }
    
    try {
      const response = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId, athleteId: selectedAthleteId })
      });
      
      if (!response.ok) throw new Error("Generation failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'certificate.pdf';
      link.click();
      
      toast({ title: "Certificate downloaded" });
    } catch (error) {
      toast({ title: "Failed to generate", variant: "destructive" });
    }
  };
  
  const handleBulkDownload = async () => {
    if (!selectedEventId) {
      toast({ title: "Select an event", variant: "destructive" });
      return;
    }
    
    try {
      const response = await fetch("/api/certificates/bulk-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId })
      });
      
      if (!response.ok) throw new Error("Generation failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'certificates.zip';
      link.click();
      
      toast({ title: "Certificates downloaded" });
    } catch (error) {
      toast({ title: "Failed to generate", variant: "destructive" });
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificate Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v); setSelectedAthleteId(""); }}>
            <SelectTrigger data-testid="select-event">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {completedEvents.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {podiumAthletes.length > 0 && (
            <div className="space-y-2">
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger data-testid="select-athlete">
                  <SelectValue placeholder="Select athlete (podium only)" />
                </SelectTrigger>
                <SelectContent>
                  {podiumAthletes.map((entry: any) => (
                    <SelectItem key={entry.athlete.id} value={entry.athlete.id}>
                      {entry.finalPlace}. {entry.athlete.firstName} {entry.athlete.lastName} - {entry.finalTime || entry.finalMark}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSingleDownload}
                  disabled={!selectedAthleteId}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-single"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Single
                </Button>
                <Button
                  onClick={handleBulkDownload}
                  className="flex-1"
                  data-testid="button-bulk"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All ({podiumAthletes.length})
                </Button>
              </div>
            </div>
          )}
          
          {selectedEventId && podiumAthletes.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No podium finishers (1st-3rd place) found for this event
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
