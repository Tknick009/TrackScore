import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Trash2 } from "lucide-react";
import type { JudgeToken, Event } from "@shared/schema";

export function JudgeTokenManager() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [judgeName, setJudgeName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/meets", currentMeetId, "events"],
    enabled: !!currentMeetId
  });
  
  const { data: tokens } = useQuery<JudgeToken[]>({
    queryKey: ["/api/meets", currentMeetId, "judge-tokens"],
    enabled: !!currentMeetId
  });
  
  const createTokenMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/judge-tokens", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/meets", currentMeetId, "judge-tokens"] 
      });
      setJudgeName("");
      setPin("");
      setSelectedEventId("");
      toast({ title: "Judge token created" });
    }
  });
  
  const deleteTokenMutation = useMutation({
    mutationFn: async (id: string) => 
      apiRequest(`/api/judge-tokens/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/meets", currentMeetId, "judge-tokens"] 
      });
      toast({ title: "Judge token deactivated" });
    }
  });
  
  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };
  
  const handleCreate = () => {
    createTokenMutation.mutate({
      meetId: currentMeetId,
      eventId: selectedEventId || null,
      code: generateCode(),
      pin: pin || null,
      judgeName
    });
  };
  
  const copyUrl = (code: string) => {
    const url = `${window.location.origin}/judge?code=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied to clipboard" });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Judge Access Tokens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Judge Name"
            value={judgeName}
            onChange={e => setJudgeName(e.target.value)}
            data-testid="input-judge-name"
          />
          <Input
            placeholder="PIN (optional)"
            value={pin}
            onChange={e => setPin(e.target.value)}
            data-testid="input-pin"
          />
          <select 
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="p-2 border rounded"
            data-testid="select-event"
          >
            <option value="">All Events</option>
            {events?.filter(e => 
              ["shot_put", "discus", "javelin", "hammer", "high_jump", "pole_vault", "long_jump", "triple_jump"].includes(e.eventType)
            ).map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
          <Button 
            onClick={handleCreate}
            disabled={!judgeName || createTokenMutation.isPending}
            data-testid="button-create-token"
          >
            Create Token
          </Button>
        </div>
        
        {tokens && tokens.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judge</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map(token => (
                <TableRow key={token.id}>
                  <TableCell>{token.judgeName}</TableCell>
                  <TableCell className="font-mono">{token.code}</TableCell>
                  <TableCell>
                    {token.eventId ? 
                      events?.find(e => e.id === token.eventId)?.name : 
                      "All Events"}
                  </TableCell>
                  <TableCell>
                    {token.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyUrl(token.code)}
                        data-testid={`button-copy-${token.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTokenMutation.mutate(token.id)}
                        data-testid={`button-delete-${token.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
