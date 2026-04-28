import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Database, RefreshCw, Settings2, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface IngestionSettings {
  meetId: string;
  lynxFilesDirectory: string | null;
  lynxFilesEnabled: boolean;
  hytekMdbPath: string | null;
  hytekMdbEnabled: boolean;
  hytekMdbPollInterval: number | null;
  hytekMdbLastImportAt: string | null;
  hytekMdbLastHash: string | null;
}

interface IngestionStatus {
  lynxFilesWatching: boolean;
  lynxFilesDirectory: string | null;
  hytekMdbPolling: boolean;
  hytekMdbPath: string | null;
  hytekMdbLastCheck: string | null;
  processedFilesCount: number;
}

interface ProcessedFile {
  id: number;
  meetId: string;
  fileName: string;
  fileType: string;
  fileHash: string;
  processedAt: string;
  status: string;
  errorMessage: string | null;
}

interface DataIngestionPanelProps {
  meetId: string;
}

export function DataIngestionPanel({ meetId }: DataIngestionPanelProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [lynxDir, setLynxDir] = useState("");
  const [mdbPath, setMdbPath] = useState("");
  const [lynxEnabled, setLynxEnabled] = useState(false);
  const [mdbEnabled, setMdbEnabled] = useState(false);
  const [pollInterval, setPollInterval] = useState(60);
  const [testingLynx, setTestingLynx] = useState(false);
  const [testingMdb, setTestingMdb] = useState(false);
  const [lynxTestResult, setLynxTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [mdbTestResult, setMdbTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  const { data: settings, isLoading } = useQuery<IngestionSettings>({
    queryKey: ["/api/meets", meetId, "ingestion-settings"],
    queryFn: () => fetch(`/api/meets/${meetId}/ingestion-settings`).then(r => r.json()),
    enabled: !!meetId,
  });

  const { data: status, refetch: refetchStatus } = useQuery<IngestionStatus>({
    queryKey: ["/api/meets", meetId, "ingestion-status"],
    queryFn: () => fetch(`/api/meets/${meetId}/ingestion-status`).then(r => r.json()),
    refetchInterval: 10000,
    enabled: !!meetId,
  });

  const { data: processedFiles } = useQuery<ProcessedFile[]>({
    queryKey: ["/api/meets", meetId, "processed-files"],
    queryFn: () => fetch(`/api/meets/${meetId}/processed-files`).then(r => r.json()),
    enabled: !!meetId,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<IngestionSettings>) => 
      apiRequest("PATCH", `/api/meets/${meetId}/ingestion-settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-status"] });
      setIsEditing(false);
      toast({ title: "Ingestion settings updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startIngestionMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/meets/${meetId}/ingestion-settings/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-status"] });
      toast({ title: "Ingestion started" });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting ingestion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopIngestionMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/meets/${meetId}/ingestion-settings/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-status"] });
      toast({ title: "Ingestion stopped" });
    },
  });

  const importMdbMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/meets/${meetId}/ingestion-settings/import-mdb`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "processed-files"] });
      toast({ 
        title: "HyTek import complete",
        description: `Imported ${data.stats?.athletes || 0} athletes, ${data.stats?.events || 0} events`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error importing HyTek database",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = () => {
    setLynxDir(settings?.lynxFilesDirectory || "");
    setMdbPath(settings?.hytekMdbPath || "");
    setLynxEnabled(settings?.lynxFilesEnabled || false);
    setMdbEnabled(settings?.hytekMdbEnabled || false);
    setPollInterval(settings?.hytekMdbPollInterval || 60);
    setLynxTestResult(null);
    setMdbTestResult(null);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate({
      lynxFilesDirectory: lynxDir || null,
      lynxFilesEnabled: lynxEnabled,
      hytekMdbPath: mdbPath || null,
      hytekMdbEnabled: mdbEnabled,
      hytekMdbPollInterval: pollInterval,
    });
  };

  const testLynxDirectory = async () => {
    setTestingLynx(true);
    setLynxTestResult(null);
    try {
      const res = await fetch(`/api/meets/${meetId}/ingestion-settings/test-lynx-directory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory: lynxDir }),
      });
      const result = await res.json();
      setLynxTestResult(result);
    } catch {
      setLynxTestResult({ valid: false, message: "Failed to test directory" });
    }
    setTestingLynx(false);
  };

  const testMdbPath = async () => {
    setTestingMdb(true);
    setMdbTestResult(null);
    try {
      const res = await fetch(`/api/meets/${meetId}/ingestion-settings/test-mdb-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: mdbPath }),
      });
      const result = await res.json();
      setMdbTestResult(result);
    } catch {
      setMdbTestResult({ valid: false, message: "Failed to test path" });
    }
    setTestingMdb(false);
  };

  const isActive = status?.lynxFilesWatching || status?.hytekMdbPolling;
  const recentFiles = processedFiles?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="w-4 h-4" />
            Data Ingestion
          </CardTitle>
          <CardDescription>
            Auto-import from Lynx files &amp; HyTek database
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge className="bg-green-600 text-white">
              Active
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEdit}
            data-testid="button-ingestion-settings"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-6">
            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Lynx Result Files</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Watch a directory for FinishLynx LIF files and FieldLynx LFF files
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="lynxDir">Directory Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="lynxDir"
                    placeholder="/path/to/lynx/files"
                    value={lynxDir}
                    onChange={(e) => setLynxDir(e.target.value)}
                    data-testid="input-lynx-directory"
                  />
                  <Button
                    variant="outline"
                    onClick={testLynxDirectory}
                    disabled={!lynxDir || testingLynx}
                    data-testid="button-test-lynx-dir"
                  >
                    {testingLynx ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
                {lynxTestResult && (
                  <div className={`flex items-center gap-2 text-sm ${lynxTestResult.valid ? "text-green-600" : "text-destructive"}`}>
                    {lynxTestResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {lynxTestResult.message}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lynxEnabled">Enable File Watching</Label>
                <Switch
                  id="lynxEnabled"
                  checked={lynxEnabled}
                  onCheckedChange={setLynxEnabled}
                  data-testid="switch-lynx-files-enabled"
                />
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" />
                <span className="font-medium">HyTek Database</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Poll a HyTek MDB file for changes and auto-import athletes, events, and entries
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="mdbPath">MDB File Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="mdbPath"
                    placeholder="/path/to/meet.mdb"
                    value={mdbPath}
                    onChange={(e) => setMdbPath(e.target.value)}
                    data-testid="input-mdb-path"
                  />
                  <Button
                    variant="outline"
                    onClick={testMdbPath}
                    disabled={!mdbPath || testingMdb}
                    data-testid="button-test-mdb"
                  >
                    {testingMdb ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                  </Button>
                </div>
                {mdbTestResult && (
                  <div className={`flex items-center gap-2 text-sm ${mdbTestResult.valid ? "text-green-600" : "text-destructive"}`}>
                    {mdbTestResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {mdbTestResult.message}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pollInterval">Poll Interval (seconds)</Label>
                <Input
                  id="pollInterval"
                  type="number"
                  min={10}
                  max={300}
                  value={pollInterval}
                  onChange={(e) => setPollInterval(parseInt(e.target.value) || 60)}
                  data-testid="input-poll-interval"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mdbEnabled">Enable MDB Polling</Label>
                <Switch
                  id="mdbEnabled"
                  checked={mdbEnabled}
                  onCheckedChange={setMdbEnabled}
                  data-testid="switch-mdb-enabled"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-ingestion">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} data-testid="button-save-ingestion">
                {updateSettingsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <FolderOpen className="w-4 h-4 text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Lynx Files</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {settings?.lynxFilesDirectory || "Not configured"}
                  </div>
                </div>
                {settings?.lynxFilesEnabled && status?.lynxFilesWatching ? (
                  <Badge className="bg-green-600 text-white" data-testid="status-lynx-watching">Watching</Badge>
                ) : settings?.lynxFilesEnabled ? (
                  <Badge variant="outline" data-testid="status-lynx-enabled">Enabled</Badge>
                ) : (
                  <Badge variant="secondary" data-testid="status-lynx-disabled">Disabled</Badge>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <Database className="w-4 h-4 text-orange-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">HyTek Database</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {settings?.hytekMdbPath || "Not configured"}
                  </div>
                  {settings?.hytekMdbLastImportAt && (
                    <div className="text-xs text-muted-foreground">
                      Last import: {new Date(settings.hytekMdbLastImportAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {settings?.hytekMdbEnabled && status?.hytekMdbPolling ? (
                  <Badge className="bg-green-600 text-white" data-testid="status-mdb-polling">Polling</Badge>
                ) : settings?.hytekMdbEnabled ? (
                  <Badge variant="outline" data-testid="status-mdb-enabled">Enabled</Badge>
                ) : (
                  <Badge variant="secondary" data-testid="status-mdb-disabled">Disabled</Badge>
                )}
              </div>
            </div>

            {recentFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Recent Files ({status?.processedFilesCount || 0} total)
                </div>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {recentFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                      {file.status === "success" ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-destructive" />
                      )}
                      <span className="truncate flex-1">{file.fileName}</span>
                      <span className="text-muted-foreground">{file.fileType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => stopIngestionMutation.mutate()}
                  disabled={stopIngestionMutation.isPending}
                  data-testid="button-stop-ingestion"
                >
                  Stop Ingestion
                </Button>
              ) : (settings?.lynxFilesEnabled || settings?.hytekMdbEnabled) ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => startIngestionMutation.mutate()}
                  disabled={startIngestionMutation.isPending}
                  data-testid="button-start-ingestion"
                >
                  {startIngestionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Start Ingestion
                </Button>
              ) : null}

              {settings?.hytekMdbPath && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => importMdbMutation.mutate()}
                  disabled={importMdbMutation.isPending}
                  data-testid="button-import-mdb-now"
                >
                  {importMdbMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Import Now
                </Button>
              )}
            </div>

            {!settings?.lynxFilesDirectory && !settings?.hytekMdbPath && (
              <p className="text-xs text-center text-muted-foreground">
                Configure file paths to enable automatic data ingestion.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
