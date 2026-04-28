import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, X, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VersionInfo {
  version: string;
  date: string;
  releaseNotes: string[];
  edgeMode: boolean;
}

interface EdgeConfig {
  cloudUrl: string;
  edgeId: string;
}

export function UpdateNotification() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: edgeConfig } = useQuery<EdgeConfig>({
    queryKey: ["edge-config"],
    queryFn: async () => {
      const response = await fetch("/api/edge-config");
      if (!response.ok) throw new Error("Failed to fetch edge config");
      return response.json();
    },
  });

  const cloudUrl = edgeConfig?.cloudUrl || "";

  const { data: cloudVersion } = useQuery<VersionInfo | null>({
    queryKey: ["cloud-version", cloudUrl],
    queryFn: async () => {
      if (!cloudUrl) return null;
      const response = await fetch(`${cloudUrl}/api/version`);
      if (!response.ok) throw new Error("Failed to fetch version");
      return response.json();
    },
    enabled: !!cloudUrl,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
  });

  const { data: localVersion } = useQuery<VersionInfo>({
    queryKey: ["local-version"],
    queryFn: async () => {
      const response = await fetch("/api/version");
      if (!response.ok) throw new Error("Failed to fetch version");
      return response.json();
    },
  });

  const isEdgeMode = localVersion?.edgeMode ?? false;
  const hasUpdate = cloudVersion && localVersion && cloudVersion.version !== localVersion.version;
  const isNewerVersion = hasUpdate && compareVersions(cloudVersion.version, localVersion.version) > 0;

  if (dismissed || !isEdgeMode || !isNewerVersion) {
    return null;
  }

  return (
    <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="flex items-center justify-between">
        <span>Update Available: v{cloudVersion?.version}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            data-testid="button-expand-release-notes"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-update"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertTitle>
      <AlertDescription>
        <p className="text-sm text-muted-foreground">
          You are running v{localVersion?.version}. A newer version is available from the cloud.
        </p>
        {expanded && cloudVersion?.releaseNotes && (
          <div className="mt-2">
            <p className="text-sm font-medium">What's new:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {cloudVersion.releaseNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`${cloudUrl}`, "_blank")}
            data-testid="button-view-cloud"
          >
            <Download className="h-4 w-4 mr-2" />
            View Cloud Version
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            Run <code className="bg-muted px-1 rounded">git pull && npm install</code> to update
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}
