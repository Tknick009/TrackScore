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
import { Wifi, WifiOff, RefreshCw, Settings2, Radio } from "lucide-react";
import type { IngestConfig } from "@shared/schema";

interface PortStatus {
  portType: string;
  port: number;
  connected: boolean;
  lastDataAt?: string;
}

interface LynxConnectionStatus {
  ports: PortStatus[];
}

interface LynxConfigPanelProps {
  meetId: string;
}

interface LynxConfig {
  clockPort: number;
  resultsPort: number;
  startListPort: number;
  fieldPort: number;
  enabled: boolean;
  meetId?: string;
}

export function LynxConfigPanel({ meetId }: LynxConfigPanelProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<LynxConfig>({
    clockPort: 4000,
    resultsPort: 4001,
    startListPort: 4002,
    fieldPort: 4003,
    enabled: false,
  });

  const { data: currentConfig } = useQuery<LynxConfig>({
    queryKey: ["/api/lynx/config", meetId],
    queryFn: () => fetch(`/api/lynx/config/${meetId}`).then(r => r.json()),
    enabled: !!meetId,
  });

  const { data: connectionStatus } = useQuery<LynxConnectionStatus>({
    queryKey: ["/api/lynx/status"],
    refetchInterval: 5000,
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<LynxConfig>) => 
      apiRequest("POST", `/api/lynx/config/${meetId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lynx/config", meetId] });
      setIsEditing(false);
      toast({ title: "Configuration updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/lynx/reconnect/${meetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lynx/status"] });
      toast({ title: "Attempting to reconnect..." });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({
      ...config,
      meetId,
    });
  };

  const displayConfig = currentConfig || config;

  const getPortStatus = (portType: string) => {
    if (!connectionStatus) return null;
    const port = connectionStatus.ports.find(p => p.portType === portType);
    return port;
  };

  const connectedPorts = connectionStatus?.ports.filter(p => p.connected).length || 0;
  const totalPorts = connectionStatus?.ports.length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="w-4 h-4" />
            Lynx Data Ingest
          </CardTitle>
          <CardDescription>
            FinishLynx &amp; FieldLynx scoreboard protocol
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus && (
            <Badge variant={connectedPorts > 0 ? "default" : "outline"} className={connectedPorts > 0 ? "bg-green-600 text-white" : ""}>
              {connectedPorts}/{totalPorts} Connected
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(!isEditing)}
            data-testid="button-lynx-settings"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clockPort">Clock Port</Label>
                <Input
                  id="clockPort"
                  type="number"
                  value={config.clockPort || currentConfig?.clockPort || 4000}
                  onChange={(e) => setConfig({ ...config, clockPort: parseInt(e.target.value) })}
                  data-testid="input-clock-port"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resultsPort">Results Port</Label>
                <Input
                  id="resultsPort"
                  type="number"
                  value={config.resultsPort || currentConfig?.resultsPort || 4001}
                  onChange={(e) => setConfig({ ...config, resultsPort: parseInt(e.target.value) })}
                  data-testid="input-results-port"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startListPort">Start List Port</Label>
                <Input
                  id="startListPort"
                  type="number"
                  value={config.startListPort || currentConfig?.startListPort || 4002}
                  onChange={(e) => setConfig({ ...config, startListPort: parseInt(e.target.value) })}
                  data-testid="input-startlist-port"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldPort">Field Port</Label>
                <Input
                  id="fieldPort"
                  type="number"
                  value={config.fieldPort || currentConfig?.fieldPort || 4003}
                  onChange={(e) => setConfig({ ...config, fieldPort: parseInt(e.target.value) })}
                  data-testid="input-field-port"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enabled">Enable Ingest</Label>
                <p className="text-xs text-muted-foreground">Listen for incoming data</p>
              </div>
              <Switch
                id="enabled"
                checked={config.enabled ?? currentConfig?.enabled ?? false}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                data-testid="switch-lynx-enabled"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-lynx">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateConfigMutation.isPending} data-testid="button-save-lynx">
                Save Configuration
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'clock', label: 'Clock', port: displayConfig.clockPort },
                { type: 'results', label: 'Results', port: displayConfig.resultsPort },
                { type: 'start_list', label: 'Start List', port: displayConfig.startListPort },
                { type: 'field', label: 'Field', port: displayConfig.fieldPort },
              ].map(({ type, label, port }) => {
                const status = getPortStatus(type);
                const isConnected = status?.connected;
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                    data-testid={`status-lynx-${type}`}
                  >
                    {isConnected ? (
                      <Wifi className="w-3 h-3 text-green-500" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-sm flex-1">{label}</span>
                    <span className="text-xs text-muted-foreground">:{port}</span>
                  </div>
                );
              })}
            </div>

            {displayConfig.enabled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => reconnectMutation.mutate()}
                disabled={reconnectMutation.isPending}
                data-testid="button-lynx-reconnect"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${reconnectMutation.isPending ? 'animate-spin' : ''}`} />
                Reconnect
              </Button>
            )}

            {!displayConfig.enabled && (
              <p className="text-xs text-center text-muted-foreground">
                Lynx ingest is disabled. Click settings to enable.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
