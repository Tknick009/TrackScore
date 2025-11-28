import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMeet } from '@/contexts/MeetContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  Clock,
  MapPin
} from 'lucide-react';
import type { Event } from '@shared/schema';

interface DisplayDevice {
  id: string;
  meetId: string;
  deviceName: string;
  lastIp: string | null;
  lastSeenAt: string | null;
  assignedEventId: string | null;
  status: string;
  assignedEvent?: Event;
}

export default function DisplayControlPage() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery<DisplayDevice[]>({
    queryKey: ['/api/display-devices/meet', currentMeetId],
    enabled: !!currentMeetId,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: !!currentMeetId,
  });

  const assignEventMutation = useMutation({
    mutationFn: async ({ deviceId, eventId }: { deviceId: string; eventId: string | null }) => {
      return apiRequest('PATCH', `/api/display-devices/${deviceId}/assign-event`, { eventId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/display-devices/meet', currentMeetId] });
      toast({
        title: 'Event assigned',
        description: 'The display device has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest('DELETE', `/api/display-devices/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/display-devices/meet', currentMeetId] });
      setSelectedDeviceId(null);
      toast({
        title: 'Device removed',
        description: 'The display device has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'devices_updated' && data.data?.meetId === currentMeetId) {
          refetchDevices();
        }
      } catch {
      }
    };

    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
    ws.addEventListener('message', handleWebSocketMessage);

    return () => {
      ws.close();
    };
  }, [currentMeetId, refetchDevices]);

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status !== 'online');

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return 'Never';
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Display Device Control</h1>
            <p className="text-muted-foreground">
              Manage connected display boards and assign events to each device
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchDevices()}
            data-testid="button-refresh-devices"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connected Devices</span>
              <Badge variant="outline" data-testid="badge-device-count">
                {onlineDevices.length} online
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {devicesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading devices...
                </div>
              ) : devices.length === 0 ? (
                <div className="py-8 text-center">
                  <Monitor className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No display devices connected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Open a display board and it will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {onlineDevices.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-green-500" />
                        Online
                      </div>
                      {onlineDevices.map(device => (
                        <DeviceListItem
                          key={device.id}
                          device={device}
                          isSelected={selectedDeviceId === device.id}
                          onClick={() => setSelectedDeviceId(device.id)}
                          formatLastSeen={formatLastSeen}
                        />
                      ))}
                    </>
                  )}
                  {offlineDevices.length > 0 && (
                    <>
                      {onlineDevices.length > 0 && <Separator className="my-2" />}
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <WifiOff className="w-3 h-3 text-muted-foreground" />
                        Offline
                      </div>
                      {offlineDevices.map(device => (
                        <DeviceListItem
                          key={device.id}
                          device={device}
                          isSelected={selectedDeviceId === device.id}
                          onClick={() => setSelectedDeviceId(device.id)}
                          formatLastSeen={formatLastSeen}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {selectedDevice ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedDevice.status === 'online' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle data-testid="text-device-name">{selectedDevice.deviceName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={selectedDevice.status === 'online' ? 'default' : 'secondary'}
                            data-testid="badge-device-status"
                          >
                            {selectedDevice.status === 'online' ? 'Online' : 'Offline'}
                          </Badge>
                          {selectedDevice.lastIp && (
                            <span className="text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {selectedDevice.lastIp}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDeviceMutation.mutate(selectedDevice.id)}
                      disabled={deleteDeviceMutation.isPending}
                      data-testid="button-delete-device"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Last seen: {formatLastSeen(selectedDevice.lastSeenAt)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assigned Event</CardTitle>
                  <CardDescription>
                    Select which event this display should show
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedDevice.assignedEventId || 'none'}
                    onValueChange={(value) => {
                      assignEventMutation.mutate({
                        deviceId: selectedDevice.id,
                        eventId: value === 'none' ? null : value,
                      });
                    }}
                    disabled={assignEventMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-assigned-event">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific event (follow current)</SelectItem>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name} - {event.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDevice.assignedEvent && (
                    <div className="mt-4 p-3 rounded-lg bg-muted">
                      <div className="text-sm font-medium">{selectedDevice.assignedEvent.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Status: {selectedDevice.assignedEvent.status}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  Select a device
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a display device from the list to configure it
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DeviceListItemProps {
  device: DisplayDevice;
  isSelected: boolean;
  onClick: () => void;
  formatLastSeen: (lastSeenAt: string | null) => string;
}

function DeviceListItem({ device, isSelected, onClick, formatLastSeen }: DeviceListItemProps) {
  return (
    <button
      className={`w-full text-left p-3 rounded-lg transition-colors hover-elevate ${
        isSelected 
          ? 'bg-accent text-accent-foreground' 
          : 'hover:bg-muted'
      }`}
      onClick={onClick}
      data-testid={`button-device-${device.id}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
          device.status === 'online' 
            ? 'bg-green-500/10 text-green-500' 
            : 'bg-muted text-muted-foreground'
        }`}>
          <Monitor className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{device.deviceName}</div>
          <div className="text-xs text-muted-foreground">
            {device.assignedEvent?.name || 'Following current event'}
          </div>
        </div>
        {device.status === 'online' ? (
          <Wifi className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <span className="text-xs text-muted-foreground">{formatLastSeen(device.lastSeenAt)}</span>
        )}
      </div>
    </button>
  );
}
