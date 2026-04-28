import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, X, Minus } from "lucide-react";
import type { Event, EntryWithDetails, FieldAttempt } from "@shared/schema";

export default function JudgePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [judgeCode, setJudgeCode] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [judgeToken, setJudgeToken] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [measurement, setMeasurement] = useState<string>("");
  
  const loginMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("/api/judge/login", "POST", data),
    onSuccess: (data) => {
      setJudgeToken(data.token);
      setLoggedIn(true);
      if (data.token.eventId) {
        setSelectedEventId(data.token.eventId);
      }
      toast({ title: "Logged in successfully" });
    },
    onError: () => {
      toast({ 
        title: "Login failed", 
        description: "Invalid code or PIN",
        variant: "destructive"
      });
    }
  });
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/meets", judgeToken?.meetId, "events"],
    enabled: loggedIn && !!judgeToken?.meetId
  });
  
  const fieldEvents = events?.filter(e => 
    ["shot_put", "discus", "javelin", "hammer", "high_jump", "pole_vault", "long_jump", "triple_jump"].includes(e.eventType)
  );
  
  const { data: entries } = useQuery<EntryWithDetails[]>({
    queryKey: ["/api/events", selectedEventId, "entries"],
    enabled: !!selectedEventId
  });
  
  const { data: attempts } = useQuery<Record<string, FieldAttempt[]>>({
    queryKey: ["/api/events", selectedEventId, "field-attempts"],
    enabled: !!selectedEventId
  });
  
  const recordAttemptMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("/api/field-attempts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/events", selectedEventId, "field-attempts"] 
      });
      setMeasurement("");
      toast({ title: "Attempt recorded" });
    }
  });
  
  const handleLogin = () => {
    loginMutation.mutate({ code: judgeCode.toUpperCase(), pin });
  };
  
  const recordMark = (entryId: string, attemptIndex: number) => {
    const mark = parseFloat(measurement);
    if (isNaN(mark) || mark <= 0) {
      toast({ 
        title: "Invalid measurement",
        variant: "destructive"
      });
      return;
    }
    
    recordAttemptMutation.mutate({
      entryId,
      attemptIndex,
      status: "mark",
      measurement: mark,
      measuredBy: judgeToken?.judgeName || "Judge",
      source: "judge"
    });
  };
  
  const recordFoul = (entryId: string, attemptIndex: number) => {
    recordAttemptMutation.mutate({
      entryId,
      attemptIndex,
      status: "foul",
      measuredBy: judgeToken?.judgeName || "Judge",
      source: "judge"
    });
  };
  
  const recordPass = (entryId: string, attemptIndex: number) => {
    recordAttemptMutation.mutate({
      entryId,
      attemptIndex,
      status: "pass",
      measuredBy: judgeToken?.judgeName || "Judge",
      source: "judge"
    });
  };
  
  const getNextAttemptIndex = (entryId: string): number => {
    const entryAttempts = attempts?.[entryId] || [];
    if (entryAttempts.length === 0) return 1;
    return Math.min(entryAttempts.length + 1, 6);
  };
  
  const getAttemptBadge = (attempt: FieldAttempt | undefined) => {
    if (!attempt) return <Badge variant="outline">-</Badge>;
    
    if (attempt.status === "mark") {
      return <Badge variant="default" className="gap-1">
        <Check className="h-3 w-3" />
        {attempt.measurement?.toFixed(2)}m
      </Badge>;
    }
    if (attempt.status === "foul") {
      return <Badge variant="destructive" className="gap-1">
        <X className="h-3 w-3" />
        Foul
      </Badge>;
    }
    if (attempt.status === "pass") {
      return <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        Pass
      </Badge>;
    }
    return <Badge variant="outline">-</Badge>;
  };
  
  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Judge Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Judge Code (e.g., ABCD1234)"
              value={judgeCode}
              onChange={e => setJudgeCode(e.target.value)}
              data-testid="input-judge-code"
            />
            <Input
              type="password"
              placeholder="PIN (if required)"
              value={pin}
              onChange={e => setPin(e.target.value)}
              data-testid="input-pin"
            />
            <Button 
              onClick={handleLogin}
              disabled={!judgeCode || loginMutation.isPending}
              className="w-full"
              data-testid="button-login"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Field Judge Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <select 
            value={selectedEventId} 
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full p-2 border rounded"
            data-testid="select-event"
          >
            <option value="">Select Event</option>
            {fieldEvents?.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>
      
      {selectedEventId && entries && (
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Bib</TableHead>
                  <TableHead>Next</TableHead>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <TableHead key={i}>{i}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => {
                  const entryAttempts = attempts?.[entry.id] || [];
                  const nextAttempt = getNextAttemptIndex(entry.id);
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.athlete?.firstName} {entry.athlete?.lastName}</TableCell>
                      <TableCell>{entry.athlete?.bibNumber}</TableCell>
                      <TableCell>
                        {nextAttempt <= 6 && (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="meters"
                              value={measurement}
                              onChange={e => setMeasurement(e.target.value)}
                              className="w-24"
                              data-testid={`input-mark-${entry.id}`}
                            />
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                onClick={() => recordMark(entry.id, nextAttempt)}
                                data-testid={`button-mark-${entry.id}`}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => recordFoul(entry.id, nextAttempt)}
                                data-testid={`button-foul-${entry.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => recordPass(entry.id, nextAttempt)}
                                data-testid={`button-pass-${entry.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <TableCell key={i}>
                          {getAttemptBadge(entryAttempts.find(a => a.attemptIndex === i))}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
