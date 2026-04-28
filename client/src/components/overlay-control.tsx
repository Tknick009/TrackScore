import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Copy, Eye, Play, X } from "lucide-react";
import { Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function OverlayControl() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [overlayType, setOverlayType] = useState<string>('lower-third');
  const [eventId, setEventId] = useState<string>('');
  const [athleteId, setAthleteId] = useState<string>('');
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!currentMeetId
  });
  
  const { data: selectedEvent } = useQuery<any>({
    queryKey: ["/api/events", eventId, "with-entries"],
    enabled: !!eventId
  });
  
  const athletes = selectedEvent?.entries?.map((e: any) => e.athlete).filter(Boolean) || [];
  
  const generateUrl = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    if (currentMeetId) params.append('meetId', currentMeetId);
    if (eventId) params.append('eventId', eventId);
    if (athleteId) params.append('athleteId', athleteId);
    
    return `${baseUrl}/overlay/${overlayType}?${params.toString()}`;
  };
  
  const overlayUrl = generateUrl();
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(overlayUrl);
    toast({ title: "URL copied to clipboard" });
  };
  
  const openPreview = () => {
    window.open(overlayUrl, '_blank', 'width=1920,height=1080');
  };
  
  const showOverlayMutation = useMutation({
    mutationFn: async () => {
      // Validation
      if (!currentMeetId) {
        throw new Error("No meet selected");
      }
      
      if ((overlayType === 'scorebug' || overlayType === 'lower-third') && !eventId) {
        throw new Error("Event required for this overlay type");
      }
      
      if ((overlayType === 'lower-third' || overlayType === 'athlete-spotlight') && !athleteId) {
        throw new Error("Athlete required for this overlay type");
      }
      
      return apiRequest("/api/overlay/show", "POST", {
        overlayType,
        config: { meetId: currentMeetId, eventId, athleteId }
      });
    },
    onSuccess: () => {
      toast({ title: "Overlay shown" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    }
  });

  const hideOverlayMutation = useMutation({
    mutationFn: async (overlayType: string) => {
      return apiRequest("/api/overlay/hide", "POST", { overlayType });
    },
    onSuccess: () => {
      toast({ title: "Overlay hidden" });
    }
  });
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Broadcast Overlay Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overlay Type</Label>
            <Select value={overlayType} onValueChange={setOverlayType}>
              <SelectTrigger data-testid="select-overlay-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lower-third">Lower Third (Athlete ID)</SelectItem>
                <SelectItem value="scorebug">Scorebug (Top 3 Results)</SelectItem>
                <SelectItem value="athlete-spotlight">Athlete Spotlight Card</SelectItem>
                <SelectItem value="team-standings">Team Standings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(overlayType === 'lower-third' || overlayType === 'scorebug' || overlayType === 'athlete-spotlight') && (
            <div>
              <Label>Event</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events?.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {(overlayType === 'lower-third' || overlayType === 'athlete-spotlight') && eventId && (
            <div>
              <Label>Athlete</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger data-testid="select-athlete">
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((athlete: any) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.firstName} {athlete.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label>Overlay Control</Label>
            <div className="flex gap-2 mt-1">
              <Button
                onClick={() => showOverlayMutation.mutate()}
                disabled={
                  showOverlayMutation.isPending ||
                  !currentMeetId ||
                  ((overlayType === 'scorebug' || overlayType === 'lower-third') && !eventId) ||
                  ((overlayType === 'lower-third' || overlayType === 'athlete-spotlight') && !athleteId)
                }
                data-testid="button-show-overlay"
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Show Overlay
              </Button>
              <Button
                variant="outline"
                onClick={() => hideOverlayMutation.mutate(overlayType)}
                disabled={hideOverlayMutation.isPending}
                data-testid="button-hide-overlay"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Hide Overlay
              </Button>
            </div>
          </div>
          
          <div>
            <Label>OBS Browser Source URL</Label>
            <div className="flex gap-2 mt-1">
              <Input 
                value={overlayUrl} 
                readOnly 
                className="font-mono text-xs"
                data-testid="input-url"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
                data-testid="button-copy"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={openPreview}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <div className="font-medium">OBS Setup Instructions:</div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Add a new "Browser" source in OBS</li>
              <li>Paste the URL above</li>
              <li>Set Width: 1920, Height: 1080</li>
              <li>Enable "Refresh browser when scene becomes active"</li>
              <li>Overlay updates in real-time automatically</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
