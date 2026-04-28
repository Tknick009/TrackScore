import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Cloud, Download, CheckCircle, AlertCircle, Loader2, ArrowLeft, Users, Calendar, Layout, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MeetPreview {
  meet: {
    id: string;
    name: string;
    location: string;
    startDate: string;
    meetCode: string;
    logoUrl?: string;
  };
  stats: {
    events: number;
    athletes: number;
    teams: number;
    divisions: number;
    layoutScenes: number;
    sceneMappings: number;
  };
}

interface SyncResult {
  success: boolean;
  meetName?: string;
  meetId?: string;
  stats?: {
    events: number;
    athletes: number;
    teams: number;
    layoutScenes: number;
    sceneMappings: number;
  };
  error?: string;
}

export default function CloudSyncPage() {
  const [, setLocation] = useLocation();
  const [cloudUrl, setCloudUrl] = useState("");
  const [meetCode, setMeetCode] = useState("");
  const [preview, setPreview] = useState<MeetPreview | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cloud-sync/preview", {
        cloudUrl: cloudUrl.trim(),
        meetCode: meetCode.trim().toUpperCase(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPreview(data);
      setSyncResult(null);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cloud-sync/download", {
        cloudUrl: cloudUrl.trim(),
        meetCode: meetCode.trim().toUpperCase(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSyncResult(data);
    },
    onError: (error: any) => {
      setSyncResult({
        success: false,
        error: error.message || "Failed to download meet",
      });
    },
  });

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    previewMutation.mutate();
  };

  const handleDownload = () => {
    downloadMutation.mutate();
  };

  const resetForm = () => {
    setPreview(null);
    setSyncResult(null);
    setCloudUrl("");
    setMeetCode("");
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Meets
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Cloud className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Download Meet from Cloud</CardTitle>
              <CardDescription>
                Connect to your cloud server and download a meet with all its data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!syncResult?.success && (
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cloudUrl">Cloud Server URL</Label>
                <Input
                  id="cloudUrl"
                  type="url"
                  placeholder="https://your-server.ngrok.io"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  disabled={previewMutation.isPending || downloadMutation.isPending}
                  data-testid="input-cloud-url"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the URL of your cloud server (Ngrok or Replit)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetCode">Meet Code</Label>
                <Input
                  id="meetCode"
                  placeholder="ABC123"
                  value={meetCode}
                  onChange={(e) => setMeetCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  disabled={previewMutation.isPending || downloadMutation.isPending}
                  data-testid="input-meet-code"
                />
                <p className="text-sm text-muted-foreground">
                  The 6-character code shown on your meet in the cloud
                </p>
              </div>

              {previewMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {(previewMutation.error as any).message || "Failed to connect to cloud server"}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={!cloudUrl || !meetCode || previewMutation.isPending}
                className="w-full"
                data-testid="button-preview"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 mr-2" />
                    Preview Meet
                  </>
                )}
              </Button>
            </form>
          )}

          {preview && !syncResult?.success && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-4">
                {preview.meet.logoUrl && (
                  <img
                    src={`${cloudUrl}${preview.meet.logoUrl}`}
                    alt="Meet logo"
                    className="w-16 h-16 object-contain rounded-lg bg-muted"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{preview.meet.name}</h3>
                  <p className="text-muted-foreground">{preview.meet.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(preview.meet.startDate).toLocaleDateString()}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {preview.meet.meetCode}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{preview.stats.events}</p>
                    <p className="text-xs text-muted-foreground">Events</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{preview.stats.athletes}</p>
                    <p className="text-xs text-muted-foreground">Athletes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{preview.stats.teams}</p>
                    <p className="text-xs text-muted-foreground">Teams</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Layout className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{preview.stats.layoutScenes}</p>
                    <p className="text-xs text-muted-foreground">Layouts</p>
                  </div>
                </div>
              </div>

              {downloadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Downloading meet data...</span>
                  </div>
                  <Progress value={50} className="w-full" />
                </div>
              )}

              {syncResult?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Download Failed</AlertTitle>
                  <AlertDescription>{syncResult.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={downloadMutation.isPending}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={downloadMutation.isPending}
                  className="flex-1"
                  data-testid="button-download"
                >
                  {downloadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Meet
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {syncResult?.success && (
            <div className="space-y-4 pt-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  Download Complete!
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {syncResult.meetName} has been downloaded successfully.
                </AlertDescription>
              </Alert>

              {syncResult.stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{syncResult.stats.events} events</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{syncResult.stats.athletes} athletes</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{syncResult.stats.teams} teams</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{syncResult.stats.layoutScenes} layouts</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                  data-testid="button-download-another"
                >
                  Download Another
                </Button>
                <Button
                  onClick={() => setLocation(`/control/${syncResult.meetId}`)}
                  className="flex-1"
                  data-testid="button-go-to-meet"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Go to Meet
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
