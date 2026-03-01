/**
 * Field Events Configuration — EVT directory setup and horizontal event defaults.
 * 
 * This page is now focused solely on server-side configuration:
 * - EVT directory path (FinishLynx integration)
 * - Results directory (LFF export path)
 * - Horizontal event defaults (prelim attempts, finalists, final attempts)
 * - Auto-provisioning sessions from EVT files
 * 
 * All session management, mark entry, and officiating has been consolidated
 * into the Field Command Center (/field-command).
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  FolderOpen,
  Save,
  RefreshCw,
  Target,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

interface EVTConfigData {
  directoryPath: string;
  resultsDirectory?: string;
  horizontalPrelimAttempts?: number;
  horizontalFinalists?: number;
  horizontalFinalAttempts?: number;
}

interface EVTEventSummary {
  eventNumber: number;
  eventName: string;
  athleteCount: number;
}

export default function FieldEventsControl() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [evtDirectoryPath, setEvtDirectoryPath] = useState("");
  const [resultsDirectory, setResultsDirectory] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Horizontal event defaults
  const [horizontalPrelimAttempts, setHorizontalPrelimAttempts] = useState(3);
  const [horizontalFinalists, setHorizontalFinalists] = useState(8);
  const [horizontalFinalAttempts, setHorizontalFinalAttempts] = useState(3);

  const { data: evtConfig, isLoading: configLoading } = useQuery<EVTConfigData>({
    queryKey: ["/api/evt-config"],
    queryFn: () => fetch("/api/evt-config").then(r => r.json()),
    staleTime: 0,
  });

  useEffect(() => {
    if (evtConfig) {
      if (evtConfig.directoryPath && !evtDirectoryPath) {
        setEvtDirectoryPath(evtConfig.directoryPath);
      }
      if (evtConfig.resultsDirectory && !resultsDirectory) {
        setResultsDirectory(evtConfig.resultsDirectory);
      }
      if (evtConfig.horizontalPrelimAttempts !== undefined) {
        setHorizontalPrelimAttempts(evtConfig.horizontalPrelimAttempts);
      }
      if (evtConfig.horizontalFinalists !== undefined) {
        setHorizontalFinalists(evtConfig.horizontalFinalists);
      }
      if (evtConfig.horizontalFinalAttempts !== undefined) {
        setHorizontalFinalAttempts(evtConfig.horizontalFinalAttempts);
      }
    }
  }, [evtConfig]);

  const { data: evtEventsData, refetch: refetchEvtEvents } = useQuery<{ events: EVTEventSummary[] }>({
    queryKey: ["/api/evt-events"],
    queryFn: () => fetch("/api/evt-events").then(r => r.json()),
    enabled: !!evtConfig?.directoryPath,
    refetchInterval: 5000,
  });

  const evtEvents = evtEventsData?.events || [];

  // Auto-provision sessions for all EVT events
  const [hasProvisioned, setHasProvisioned] = useState(false);

  useEffect(() => {
    if (evtEvents.length > 0 && !hasProvisioned) {
      const provisionSessions = async () => {
        try {
          const response = await fetch("/api/evt-events/provision-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (response.ok) {
            const result = await response.json();
            if (result.created > 0) {
              toast({ title: `Created ${result.created} event sessions` });
              queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });
            }
          }
          setHasProvisioned(true);
        } catch (error) {
          console.error("Error provisioning sessions:", error);
        }
      };
      provisionSessions();
    }
  }, [evtEvents.length, hasProvisioned]);

  const handleSaveEvtConfig = async () => {
    setIsSavingConfig(true);
    try {
      const response = await apiRequest("POST", "/api/evt-config", {
        directoryPath: evtDirectoryPath,
        resultsDirectory,
        horizontalPrelimAttempts,
        horizontalFinalists,
        horizontalFinalAttempts,
      });
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/evt-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evt-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/field-sessions"] });

      if (result.updatedSessions > 0) {
        toast({
          title: "Configuration saved",
          description: `Updated ${result.updatedSessions} existing horizontal event session(s) with new defaults.`
        });
      } else {
        toast({ title: "Configuration saved" });
      }
    } catch (error: any) {
      toast({
        title: "Failed to save config",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (configLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
        <span className="text-sm text-muted-foreground">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-page-title">Field Events Configuration</h1>
            <p className="text-sm text-muted-foreground">FinishLynx integration & event defaults</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/field-command")}
          data-testid="button-open-command-center"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Field Command Center
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            FinishLynx EVT Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">EVT Directory Path</Label>
            <div className="flex items-center gap-3">
              <Input
                placeholder="/path/to/lynx/evt/directory"
                value={evtDirectoryPath || evtConfig?.directoryPath || ""}
                onChange={(e) => setEvtDirectoryPath(e.target.value)}
                className="flex-1"
                data-testid="input-evt-directory"
              />
              <Button
                variant="outline"
                onClick={() => refetchEvtEvents()}
                data-testid="button-refresh-evt"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Results Directory (LFF Export Path)</Label>
            <Input
              placeholder="/path/to/results/directory"
              value={resultsDirectory || evtConfig?.resultsDirectory || ""}
              onChange={(e) => setResultsDirectory(e.target.value)}
              className="flex-1"
              data-testid="input-results-directory"
            />
            <p className="text-xs text-muted-foreground mt-1">
              LFF files will be automatically exported to this directory when marks are recorded.
            </p>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Horizontal Event Defaults (Throws &amp; Jumps)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Prelim Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={horizontalPrelimAttempts}
                  onChange={(e) => setHorizontalPrelimAttempts(parseInt(e.target.value) || 3)}
                  className="w-full"
                  data-testid="input-prelim-attempts"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Athletes to Finals</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={horizontalFinalists}
                  onChange={(e) => setHorizontalFinalists(parseInt(e.target.value) || 8)}
                  className="w-full"
                  data-testid="input-finalists"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Finals Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={horizontalFinalAttempts}
                  onChange={(e) => setHorizontalFinalAttempts(parseInt(e.target.value) || 3)}
                  className="w-full"
                  data-testid="input-finals-attempts"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These defaults apply to Long Jump, Triple Jump, Shot Put, Discus, Javelin, Hammer, etc.
              High Jump and Pole Vault are configured manually per session.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveEvtConfig}
              disabled={isSavingConfig}
              data-testid="button-save-evt-config"
            >
              {isSavingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!evtConfig?.directoryPath && evtEvents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configure EVT Directory</h3>
            <p className="text-muted-foreground">
              Set the EVT directory path above to load field events from FinishLynx.
              Once configured, sessions will be auto-provisioned and available in the{" "}
              <button
                className="underline text-primary hover:text-primary/80"
                onClick={() => setLocation("/field-command")}
              >
                Field Command Center
              </button>.
            </p>
          </CardContent>
        </Card>
      )}

      {evtConfig?.directoryPath && evtEvents.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{evtEvents.length} EVT Events Detected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sessions are auto-provisioned. Use the Field Command Center to manage events.
                </p>
              </div>
              <Button onClick={() => setLocation("/field-command")} data-testid="button-go-to-command-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Command Center
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
