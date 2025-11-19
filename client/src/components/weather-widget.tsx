import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Cloud, Wind, Droplets, Gauge, RefreshCw } from "lucide-react";
import { useState } from "react";

export function WeatherWidget() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [latitude, setLatitude] = useState("40.7128");
  const [longitude, setLongitude] = useState("-74.0060");
  const [apiKey, setApiKey] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  
  const { data: config } = useQuery<any>({
    queryKey: ["/api/weather/config", currentMeetId],
    enabled: !!currentMeetId
  });
  
  const { data: current, isLoading } = useQuery<any>({
    queryKey: ["/api/weather/current", currentMeetId],
    enabled: !!currentMeetId,
    refetchInterval: 60000 // Re-fetch every minute
  });
  
  const configMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/weather/config", "POST", {
        meetId: currentMeetId,
        provider: "openweathermap",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        apiKey,
        pollingIntervalSec: 300,
        units: "metric"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weather/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weather/current"] });
      toast({ title: "Weather station configured" });
      setShowConfig(false);
    }
  });
  
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/weather/refresh/${currentMeetId}`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weather/current"] });
      toast({ title: "Weather refreshed" });
    }
  });
  
  // Add null guard for wind speed
  const windSpeedDisplay = current?.windSpeedMs != null 
    ? current.windSpeedMs.toFixed(1) 
    : '--';
  
  const windLegal = current && current.windSpeedMs != null && current.windSpeedMs <= 2.0;
  
  // Check if config exists and has API key
  if (!config?.hasApiKey && !showConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather Station</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowConfig(true)} data-testid="button-config">
            Configure Weather Station
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (showConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather Station Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Latitude</Label>
            <Input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="40.7128"
              data-testid="input-latitude"
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-74.0060"
              data-testid="input-longitude"
            />
          </div>
          <div>
            <Label>OpenWeatherMap API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
              data-testid="input-api-key"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => configMutation.mutate()}
              disabled={!latitude || !longitude || !apiKey || configMutation.isPending}
              data-testid="button-save"
            >
              Save & Start Polling
            </Button>
            {config && (
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Current Weather
          </span>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfig(true)}
            >
              Settings
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>Loading weather...</div>}
        {current && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-wind-speed">{windSpeedDisplay} m/s</div>
                  {current.windSpeedMs != null && (
                    <div className={`text-sm ${windLegal ? 'text-green-600' : 'text-red-600'}`} data-testid="text-wind-legal">
                      {windLegal ? 'LEGAL' : 'ILLEGAL'}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold" data-testid="text-temperature">
                  {current.temperatureC != null ? current.temperatureC.toFixed(1) : '--'}°C
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-humidity">{current.humidityPct != null ? current.humidityPct : '--'}% humidity</span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-pressure">{current.pressureHPa != null ? current.pressureHPa : '--'} hPa</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground" data-testid="text-updated">
              Updated: {current.observedAt ? new Date(current.observedAt).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        )}
        {!current && !isLoading && (
          <div className="text-muted-foreground">No weather data available</div>
        )}
      </CardContent>
    </Card>
  );
}
