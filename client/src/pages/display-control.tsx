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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  Clock,
  MapPin,
  Zap,
  Layout,
  Send,
  ExternalLink,
  QrCode,
  Copy,
  Play,
  List,
  Timer,
  Trophy,
  Database,
  ChevronRight
} from 'lucide-react';
import { DISPLAY_CONTENT_TYPES } from '@shared/layout-templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Event, SelectLayoutScene, SelectSceneTemplateMapping } from '@shared/schema';

interface DisplayDevice {
  id: string;
  meetId: string;
  deviceName: string;
  displayType: string | null;
  currentTemplate: string | null;
  lastIp: string | null;
  lastSeenAt: string | null;
  assignedEventId: string | null;
  status: string;
  assignedEvent?: Event;
}

// Display mode types
type DisplayMode = 'finishlynx' | 'hytek' | 'teamscores';

export default function DisplayControlPage() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({});
  const [qrDialog, setQrDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // New display mode state - tracks which mode is active per device
  const [displayMode, setDisplayMode] = useState<Record<string, DisplayMode>>({});
  // Selected event for Hytek mode
  const [selectedHytekEvent, setSelectedHytekEvent] = useState<Record<string, string>>({});
  // Paging size for Hytek and Team Scores modes (lines = seconds)
  const [pagingLines, setPagingLines] = useState<Record<string, number>>({});

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '';

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

  const sendCommandMutation = useMutation({
    mutationFn: async ({ deviceId, template }: { deviceId: string; template: string }) => {
      return apiRequest('POST', `/api/display-devices/${deviceId}/command`, { template });
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Command sent', description: `Display updated to ${variables.template}` });
      refetchDevices();
    },
    onError: () => {
      toast({ title: 'Failed to send command', variant: 'destructive' });
    }
  });

  // Auto-mode: Query status for selected device
  const { data: autoModeStatus } = useQuery<{ connected: boolean; autoMode: boolean }>({
    queryKey: ['/api/display-devices', selectedDeviceId, 'auto-mode'],
    enabled: !!selectedDeviceId,
    refetchInterval: 5000, // Poll every 5 seconds to keep status updated
  });

  // Auto-mode: Toggle mutation
  const toggleAutoModeMutation = useMutation({
    mutationFn: async ({ deviceId, enabled }: { deviceId: string; enabled: boolean }) => {
      return apiRequest('POST', `/api/display-devices/${deviceId}/auto-mode`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/display-devices', selectedDeviceId, 'auto-mode'] });
      toast({
        title: 'Auto-mode updated',
        description: 'Display auto-switching has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Auto-mode toggle failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Paging: Query settings for selected device
  const { data: pagingSettings } = useQuery<{ pagingSize: number; pagingInterval: number }>({
    queryKey: ['/api/display-devices', selectedDeviceId, 'paging'],
    enabled: !!selectedDeviceId,
  });

  // Paging: Update mutation
  const updatePagingMutation = useMutation({
    mutationFn: async ({ deviceId, pagingSize, pagingInterval }: { deviceId: string; pagingSize: number; pagingInterval: number }) => {
      return apiRequest('PATCH', `/api/display-devices/${deviceId}/paging`, { pagingSize, pagingInterval });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/display-devices', selectedDeviceId, 'paging'] });
      toast({
        title: 'Paging updated',
        description: 'Display paging settings have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Paging update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send Hytek Results mutation
  const sendHytekResultsMutation = useMutation({
    mutationFn: async ({ deviceId, eventId, pagingLines }: { deviceId: string; eventId: string; pagingLines: number }) => {
      const response = await apiRequest('POST', `/api/display-devices/${deviceId}/hytek-results`, { eventId, pagingLines });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.warning ? 'Results sent with warning' : 'Hytek Results sent',
        description: data.warning || `Display is now showing ${data.entryCount || 0} entries.`,
        variant: data.warning ? 'default' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send Hytek Results',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send Team Scores mutation
  const sendTeamScoresMutation = useMutation({
    mutationFn: async ({ deviceId, pagingLines }: { deviceId: string; pagingLines: number }) => {
      const response = await apiRequest('POST', `/api/display-devices/${deviceId}/team-scores`, { pagingLines });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.warning ? 'Scores sent with warning' : 'Team Scores sent',
        description: data.warning || `Display is now showing ${data.teamCount || 0} teams.`,
        variant: data.warning ? 'default' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send Team Scores',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Scene Template Mappings - for assigning custom scenes to display types/modes
  const { data: sceneMappings = [] } = useQuery<SelectSceneTemplateMapping[]>({
    queryKey: [`/api/scene-template-mappings/${currentMeetId}`],
    enabled: !!currentMeetId,
  });

  const { data: layoutScenes = [] } = useQuery<SelectLayoutScene[]>({
    queryKey: [`/api/layout-scenes?meetId=${currentMeetId}`],
    enabled: !!currentMeetId,
  });

  const setMappingMutation = useMutation({
    mutationFn: async ({ displayType, displayMode, sceneId }: { displayType: string; displayMode: string; sceneId: number }) => {
      return apiRequest('POST', '/api/scene-template-mappings', {
        meetId: currentMeetId,
        displayType,
        displayMode,
        sceneId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scene-template-mappings/${currentMeetId}`] });
      toast({
        title: 'Scene mapping saved',
        description: 'The custom scene has been assigned.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save mapping',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/scene-template-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scene-template-mappings/${currentMeetId}`] });
      toast({
        title: 'Scene mapping removed',
        description: 'The custom scene assignment has been cleared.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove mapping',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Display types and modes for the grid
  const displayTypes = ['P10', 'P6', 'BigBoard'] as const;
  const displayModes = [
    'start_list', 
    'running_time', 
    'track_results', 
    'multi_track',
    'field_results_vertical',
    'field_results_horizontal',
    'field_standings', 
    'multi_field_vertical',
    'multi_field_horizontal',
    'team_scores',
  ] as const;
  
  const displayModeLabels: Record<string, string> = {
    start_list: 'Start List',
    running_time: 'Running Time',
    track_results: 'Track Results',
    multi_track: 'Multi-Event Track',
    field_results_vertical: 'Field Vertical (HJ/PV)',
    field_results_horizontal: 'Field Horizontal (LJ/SP)',
    field_standings: 'Field Standings',
    multi_field_vertical: 'Multi-Event Vertical',
    multi_field_horizontal: 'Multi-Event Horizontal',
    team_scores: 'Team Scores',
  };

  // Helper to find mapping for a specific cell
  const getMappingForCell = (displayType: string, displayMode: string) => {
    return sceneMappings.find(m => m.displayType === displayType && m.displayMode === displayMode);
  };

  // Template selection helpers
  const getTemplatesForDevice = (displayType: string | null) => {
    const type = (displayType || 'P10').toLowerCase();
    return DISPLAY_CONTENT_TYPES.map(c => ({
      id: `${type}-${c.id}`,
      name: c.name
    }));
  };

  const sendCommand = (device: DisplayDevice, template: string) => {
    if (template === 'auto-mode') {
      toggleAutoModeMutation.mutate({ deviceId: device.id, enabled: true });
    } else {
      toggleAutoModeMutation.mutate({ deviceId: device.id, enabled: false });
      sendCommandMutation.mutate({ deviceId: device.id, template });
    }
  };

  // Display launch helpers
  const getDisplayUrl = () => `${baseUrl}/display`;

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied!', description: `${label} URL copied to clipboard` });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const launchDisplay = () => {
    window.open(getDisplayUrl(), '_blank');
  };

  const showDisplayQR = async () => {
    const url = getDisplayUrl();
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrCodeDataUrl(dataUrl);
      setQrDialog({ open: true, url, title: 'Launch Display' });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

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
          <div className="flex items-center gap-2">
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
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Display Content
                  </CardTitle>
                  <CardDescription>
                    Select what content to show on this display
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDevice.status !== 'online' ? (
                    <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm">
                      Device must be online to send commands
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: 'finishlynx' }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: true });
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            displayMode[selectedDevice.id] === 'finishlynx' || autoModeStatus?.autoMode
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover-elevate'
                          }`}
                          data-testid="tile-finishlynx"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="w-5 h-5 text-primary" />
                            <span className="font-medium">FinishLynx</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Auto-switching results from timing system
                          </p>
                          {(displayMode[selectedDevice.id] === 'finishlynx' || autoModeStatus?.autoMode) && (
                            <Badge variant="default" className="mt-2">Active</Badge>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: 'hytek' }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: false });
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            displayMode[selectedDevice.id] === 'hytek' && !autoModeStatus?.autoMode
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover-elevate'
                          }`}
                          data-testid="tile-hytek"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-5 h-5 text-blue-500" />
                            <span className="font-medium">Hytek Results</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Compiled results from MDB file
                          </p>
                          {displayMode[selectedDevice.id] === 'hytek' && !autoModeStatus?.autoMode && (
                            <Badge variant="default" className="mt-2">Active</Badge>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: 'teamscores' }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: false });
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            displayMode[selectedDevice.id] === 'teamscores' && !autoModeStatus?.autoMode
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover-elevate'
                          }`}
                          data-testid="tile-teamscores"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium">Team Scores</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Team standings from MDB file
                          </p>
                          {displayMode[selectedDevice.id] === 'teamscores' && !autoModeStatus?.autoMode && (
                            <Badge variant="default" className="mt-2">Active</Badge>
                          )}
                        </button>
                      </div>

                      {displayMode[selectedDevice.id] === 'finishlynx' || autoModeStatus?.autoMode ? (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-start gap-2">
                            <Zap className="w-4 h-4 text-green-500 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-green-700 dark:text-green-400">
                                Auto-switching active
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                                Display automatically shows start list, running time, and results based on FinishLynx data.
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : displayMode[selectedDevice.id] === 'hytek' ? (
                        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                          <div className="space-y-2">
                            <Label>Select Event</Label>
                            <Select
                              value={selectedHytekEvent[selectedDevice.id] || ''}
                              onValueChange={(value) => {
                                setSelectedHytekEvent(prev => ({ ...prev, [selectedDevice.id]: value }));
                              }}
                            >
                              <SelectTrigger data-testid="select-hytek-event">
                                <SelectValue placeholder="Choose an event to display" />
                              </SelectTrigger>
                              <SelectContent>
                                {events.map(event => (
                                  <SelectItem key={event.id} value={event.id}>
                                    {event.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Paging (lines = seconds)</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(pagingLines[selectedDevice.id] || 8)}
                                onValueChange={(value) => {
                                  setPagingLines(prev => ({ ...prev, [selectedDevice.id]: parseInt(value) }));
                                }}
                              >
                                <SelectTrigger className="w-24" data-testid="select-hytek-paging">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[4, 6, 8, 10, 12, 16, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">
                                lines per page, {pagingLines[selectedDevice.id] || 8} seconds per page
                              </span>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              const eventId = selectedHytekEvent[selectedDevice.id];
                              const lines = pagingLines[selectedDevice.id] || 8;
                              if (eventId) {
                                sendHytekResultsMutation.mutate({
                                  deviceId: selectedDevice.id,
                                  eventId,
                                  pagingLines: lines,
                                });
                              }
                            }}
                            disabled={!selectedHytekEvent[selectedDevice.id] || sendHytekResultsMutation.isPending}
                            className="w-full"
                            data-testid="button-send-hytek"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send to Display
                          </Button>
                        </div>
                      ) : displayMode[selectedDevice.id] === 'teamscores' ? (
                        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                          <div className="space-y-2">
                            <Label>Paging (lines = seconds)</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(pagingLines[selectedDevice.id] || 8)}
                                onValueChange={(value) => {
                                  setPagingLines(prev => ({ ...prev, [selectedDevice.id]: parseInt(value) }));
                                }}
                              >
                                <SelectTrigger className="w-24" data-testid="select-teamscores-paging">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[4, 6, 8, 10, 12, 16, 20].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">
                                teams per page, {pagingLines[selectedDevice.id] || 8} seconds per page
                              </span>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              const lines = pagingLines[selectedDevice.id] || 8;
                              sendTeamScoresMutation.mutate({
                                deviceId: selectedDevice.id,
                                pagingLines: lines,
                              });
                            }}
                            disabled={sendTeamScoresMutation.isPending}
                            className="w-full"
                            data-testid="button-send-teamscores"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send to Display
                          </Button>
                        </div>
                      ) : null}
                    </>
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
                
                <Separator className="my-6 mx-auto w-48" />
                
                <h4 className="font-medium text-sm mb-3">Or Launch a New Display</h4>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={launchDisplay} data-testid="button-launch-display">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Launch Display
                  </Button>
                  <Button variant="outline" size="icon" onClick={showDisplayQR} data-testid="button-show-qr">
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(getDisplayUrl(), 'Display')} data-testid="button-copy-url">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onOpenChange={(open) => setQrDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{qrDialog.title}</DialogTitle>
            <DialogDescription>
              Scan this QR code on a display device to open the display
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
            )}
            <code className="text-xs bg-muted px-2 py-1 rounded break-all">
              {qrDialog.url}
            </code>
            <Button 
              variant="outline" 
              onClick={() => copyToClipboard(qrDialog.url, 'Display')}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scene Layout Mappings Section */}
      <div className="border-t p-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="scene-mappings" className="border-none">
            <AccordionTrigger className="py-4" data-testid="accordion-scene-mappings">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                <span className="text-lg font-semibold">Scene Layout Mappings</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Assign custom scenes to display types and modes. When a display shows a specific mode, 
                  it will use your custom scene instead of the default template.
                </p>
                
                {layoutScenes.length === 0 ? (
                  <div className="text-center py-8 bg-muted/50 rounded-lg">
                    <Layout className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No custom scenes available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create scenes in the Scene Editor to use them here
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 border-b text-sm font-medium text-muted-foreground">
                            Display Mode
                          </th>
                          {displayTypes.map(type => (
                            <th key={type} className="text-left p-2 border-b text-sm font-medium">
                              {type}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayModes.map(mode => (
                          <tr key={mode} className="border-b last:border-b-0">
                            <td className="p-2 text-sm font-medium">
                              {displayModeLabels[mode]}
                            </td>
                            {displayTypes.map(type => {
                              const mapping = getMappingForCell(type, mode);
                              const selectedScene = mapping ? layoutScenes.find(s => s.id === mapping.sceneId) : null;
                              
                              return (
                                <td key={`${type}-${mode}`} className="p-2">
                                  <Select
                                    value={mapping ? String(mapping.sceneId) : 'default'}
                                    onValueChange={(value) => {
                                      if (value === 'default') {
                                        if (mapping) {
                                          deleteMappingMutation.mutate(mapping.id);
                                        }
                                      } else {
                                        setMappingMutation.mutate({
                                          displayType: type,
                                          displayMode: mode,
                                          sceneId: parseInt(value),
                                        });
                                      }
                                    }}
                                    disabled={setMappingMutation.isPending || deleteMappingMutation.isPending}
                                  >
                                    <SelectTrigger 
                                      className="w-[160px]"
                                      data-testid={`select-mapping-${type}-${mode}`}
                                    >
                                      <SelectValue>
                                        {selectedScene ? selectedScene.name : 'Default'}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default</SelectItem>
                                      {layoutScenes.map(scene => (
                                        <SelectItem key={scene.id} value={String(scene.id)}>
                                          {scene.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
