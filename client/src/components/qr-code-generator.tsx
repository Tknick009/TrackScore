import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QrCode, Download } from "lucide-react";

export function QRCodeGenerator() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [resourceType, setResourceType] = useState<string>("meet");
  const [resourceId, setResourceId] = useState<string>("");
  const [generatedSlug, setGeneratedSlug] = useState<string | null>(null);
  
  const { data: events } = useQuery<any[]>({
    queryKey: ["/api/events", currentMeetId],
    enabled: !!currentMeetId && resourceType === "event"
  });
  
  const { data: athletes } = useQuery<any[]>({
    queryKey: ["/api/public/meets", currentMeetId, "athletes"],
    enabled: !!currentMeetId && resourceType === "athlete"
  });
  
  const generateMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/qr/generate", "POST", data),
    onSuccess: (data: any) => {
      setGeneratedSlug(data.slug);
      toast({ title: "QR code generated" });
    }
  });
  
  const handleGenerate = () => {
    if (!currentMeetId) {
      toast({ title: "No meet selected", variant: "destructive" });
      return;
    }
    
    if ((resourceType === "event" || resourceType === "athlete") && !resourceId) {
      toast({ title: "Please select a resource", variant: "destructive" });
      return;
    }
    
    generateMutation.mutate({
      resourceType,
      resourceId: resourceType === "meet" ? currentMeetId : resourceId,
      meetId: currentMeetId
    });
  };
  
  const downloadSVG = () => {
    if (!generatedSlug) return;
    window.open(`/api/qr/${generatedSlug}/svg`, '_blank');
  };
  
  const downloadPNG = () => {
    if (!generatedSlug) return;
    const link = document.createElement('a');
    link.href = `/api/qr/${generatedSlug}/png`;
    link.download = `qr-${generatedSlug}.png`;
    link.click();
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Generate QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger data-testid="select-resource-type">
                <SelectValue placeholder="Select resource type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meet">Full Meet</SelectItem>
                <SelectItem value="event">Specific Event</SelectItem>
                <SelectItem value="athlete">Athlete Profile</SelectItem>
                <SelectItem value="standings">Team Standings</SelectItem>
              </SelectContent>
            </Select>
            
            {resourceType === "event" && (
              <Select value={resourceId} onValueChange={setResourceId}>
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
            )}
            
            {resourceType === "athlete" && (
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger data-testid="select-athlete">
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {athletes?.map(athlete => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.firstName} {athlete.lastName} ({athlete.bib})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full"
              data-testid="button-generate"
            >
              Generate QR Code
            </Button>
          </div>
          
          {generatedSlug && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-center">
                <img 
                  src={`/api/qr/${generatedSlug}/png`} 
                  alt="QR Code" 
                  className="w-64 h-64 border rounded-lg"
                  data-testid="img-qr-preview"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={downloadSVG}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-download-svg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download SVG
                </Button>
                <Button
                  onClick={downloadPNG}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-download-png"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
