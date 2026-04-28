import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Trash2, Share2 } from "lucide-react";
import type { SocialMediaPost, Event } from "@shared/schema";

export function SocialMediaGenerator() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [postType, setPostType] = useState<string>("event_result");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events", currentMeetId],
    enabled: !!currentMeetId && postType === "event_result"
  });
  
  const { data: posts } = useQuery<SocialMediaPost[]>({
    queryKey: ["/api/social-media/posts"]
  });
  
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (postType === "event_result") {
        return apiRequest("/api/social-media/event-result", "POST", data);
      } else if (postType === "medal_count") {
        return apiRequest("/api/social-media/medal-count", "POST", data);
      } else {
        return apiRequest("/api/social-media/meet-highlight", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/posts"] });
      toast({ title: "Post generated" });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => 
      apiRequest(`/api/social-media/posts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-media/posts"] });
      toast({ title: "Post deleted" });
    }
  });
  
  const handleGenerate = () => {
    if (!currentMeetId) {
      toast({ title: "No meet selected", variant: "destructive" });
      return;
    }
    
    if (postType === "event_result" && !selectedEventId) {
      toast({ title: "Please select an event", variant: "destructive" });
      return;
    }
    
    const data: any = { meetId: currentMeetId };
    if (postType === "event_result") {
      data.eventId = selectedEventId;
    }
    
    generateMutation.mutate(data);
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Generate Social Media Post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger data-testid="select-post-type">
              <SelectValue placeholder="Select post type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event_result">Event Result</SelectItem>
              <SelectItem value="medal_count">Medal Count Update</SelectItem>
              <SelectItem value="meet_highlight">Meet Highlight</SelectItem>
            </SelectContent>
          </Select>
          
          {postType === "event_result" && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events?.filter(e => e.status === "completed").map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
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
            Generate Post
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Generated Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts?.map(post => (
            <div 
              key={post.id}
              className="border rounded-lg p-4 space-y-3"
              data-testid={`post-${post.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Textarea
                    value={post.caption}
                    readOnly
                    className="min-h-32 font-mono text-sm"
                    data-testid={`textarea-caption-${post.id}`}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(post.caption)}
                  data-testid={`button-copy-${post.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Caption
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(post.id)}
                  data-testid={`button-delete-${post.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {(!posts || posts.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No posts generated yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
