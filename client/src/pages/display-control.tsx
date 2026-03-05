import { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
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
  ChevronRight,
  Search,
  Target,
  Settings,
  Image,
  Award
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

function getEventDisplayStatus(event: Event): string {
  if (event.status === "in_progress") return 'live';
  if (event.isScored || event.hytekStatus === 'scored') return 'scored';
  if (event.hytekStatus === 'done') return 'done';
  if (event.hytekStatus === 'seeded') return 'seeded';
  return 'unseeded';
}

function EventStatusBadge({ event }: { event: Event }) {
  const displayStatus = getEventDisplayStatus(event);

  if (displayStatus === 'live') {
    return <Badge className="bg-green-600 text-white ml-auto shrink-0" data-testid={`badge-dc-status-${event.id}`}>Live</Badge>;
  }
  if (displayStatus === 'scored') {
    return <Badge className="bg-pink-500 text-white dark:bg-pink-600 ml-auto shrink-0" data-testid={`badge-dc-status-${event.id}`}>Scored</Badge>;
  }
  if (displayStatus === 'done') {
    return <Badge className="bg-gray-400 text-white dark:bg-gray-500 ml-auto shrink-0" data-testid={`badge-dc-status-${event.id}`}>Done</Badge>;
  }
  if (displayStatus === 'seeded') {
    return <Badge className="bg-teal-500 text-white dark:bg-teal-600 ml-auto shrink-0" data-testid={`badge-dc-status-${event.id}`}>Seeded</Badge>;
  }
  return <Badge variant="outline" className="bg-white text-gray-700 dark:bg-gray-200 dark:text-gray-700 ml-auto shrink-0" data-testid={`badge-dc-status-${event.id}`}>Unseeded</Badge>;
}

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
  fieldPort: number | null;
  isBigBoard: boolean;
  assignedEvent?: Event;
}

// Display mode types
type DisplayMode = 'finishlynx' | 'hytek' | 'teamscores' | 'field' | 'winners';

export default function DisplayControlPage() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({});
  const [qrDialog, setQrDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // New display mode state - tracks which mode is active per device
  const [displayMode, setDisplayMode] = useState<Record<string, DisplayMode>>({});
  const [selectedHytekItem, setSelectedHytekItem] = useState<Record<string, string>>({});
  const [selectedWinnersEvent, setSelectedWinnersEvent] = useState<Record<string, number>>({});
  const [winnersPreview, setWinnersPreview] = useState<Record<string, any>>({}); // deviceId -> preview data
  const [pagingLines, setPagingLines] = useState<Record<string, number>>({});
  const [teamScoreGender, setTeamScoreGender] = useState<Record<string, 'M' | 'W'>>({});
  const [maxPages, setMaxPages] = useState<Record<string, number>>({});
  const [eventSearch, setEventSearch] = useState('');
  const [winnersEventSearch, setWinnersEventSearch] = useState('');
  const [pendingFieldPort, setPendingFieldPort] = useState<Record<string, number>>({});

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '';

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery<DisplayDevice[]>({
    queryKey: ['/api/display-devices/meet', currentMeetId],
    enabled: !!currentMeetId,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events', currentMeetId],
    queryFn: () => fetch(`/api/events?meetId=${currentMeetId}`).then(r => r.json()),
    enabled: !!currentMeetId,
  });

  const parseEventTime = (t: string | null | undefined): number => {
    if (!t) return 9999;
    const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 9999;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'AM' && hours === 12) hours = 0;
    else if (period === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  };

  const sortedFilteredEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const timeDiff = parseEventTime(a.eventTime) - parseEventTime(b.eventTime);
      if (timeDiff !== 0) return timeDiff;
      return (a.eventNumber || 0) - (b.eventNumber || 0);
    });

    if (!eventSearch.trim()) return sorted;
    const q = eventSearch.toLowerCase();
    return sorted.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.eventTime && e.eventTime.toLowerCase().includes(q)) ||
      String(e.eventNumber).includes(q)
    );
  }, [events, eventSearch]);

  const hytekEventRoundItems = useMemo(() => {
    const roundLabels: Record<string, string> = {
      preliminary: 'Prelims',
      quarterfinal: 'Quarters',
      semifinal: 'Semis',
      final: 'Finals',
    };

    const roundOrder = ['preliminary', 'quarterfinal', 'semifinal', 'final'];

    const items: Array<{
      key: string;
      eventId: string;
      round: string;
      label: string;
      roundLabel: string | null;
      event: Event;
    }> = [];

    for (const event of sortedFilteredEvents) {
      const rounds = event.numRounds || 1;
      if (rounds <= 1) {
        items.push({
          key: `${event.id}:final`,
          eventId: event.id,
          round: 'final',
          label: event.name,
          roundLabel: null,
          event,
        });
      } else {
        const activeRounds = roundOrder.slice(-(rounds));
        for (const r of activeRounds) {
          items.push({
            key: `${event.id}:${r}`,
            eventId: event.id,
            round: r,
            label: event.name,
            roundLabel: roundLabels[r] || r,
            event,
          });
        }
      }
    }

    return items;
  }, [sortedFilteredEvents]);

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

  // Remote refresh: force a display device to reload its page
  const refreshDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await apiRequest('POST', `/api/display-devices/${deviceId}/refresh`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.delivered ? 'Refresh sent' : 'Device offline',
        description: data.delivered
          ? 'The display is reloading now.'
          : 'The device is not connected — refresh will apply when it reconnects.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive',
      });
    },
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

  const sendHytekResultsMutation = useMutation({
    mutationFn: async ({ deviceId, eventId, pagingLines, round }: { deviceId: string; eventId: string; pagingLines: number; round: string }) => {
      const response = await apiRequest('POST', `/api/display-devices/${deviceId}/hytek-results`, { eventId, pagingLines, round });
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
    mutationFn: async ({ deviceId, pagingLines, gender, maxPages: mp }: { deviceId: string; pagingLines: number; gender: 'M' | 'W'; maxPages?: number }) => {
      const response = await apiRequest('POST', `/api/display-devices/${deviceId}/team-scores`, { pagingLines, gender, maxPages: mp || 0 });
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

  // Fetch available events that have LIF/LFF files
  const { data: availableWinnersEvents = [] } = useQuery<{ eventNumber: number; eventId: string | null; name: string; eventTime: string | null }[]>({
    queryKey: ['/api/meets', currentMeetId, 'winners-available-events'],
    queryFn: () => fetch(`/api/meets/${currentMeetId}/winners-available-events`).then(r => r.json()).then(d => d.events || []),
    enabled: !!currentMeetId,
    refetchInterval: 10000, // Refresh every 10s to pick up new result files
  });

  // Preview Winners Board mutation — fetches data without sending to display
  const previewWinnersMutation = useMutation({
    mutationFn: async ({ deviceId, eventNumber }: { deviceId: string; eventNumber: number }) => {
      const response = await apiRequest('POST', `/api/meets/${currentMeetId}/winners-board-preview`, { eventNumber });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setWinnersPreview(prev => ({ ...prev, [variables.deviceId]: data }));
      if (!data.success) {
        toast({ title: 'Preview failed', description: data.error, variant: 'destructive' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to preview Winners Board', description: error.message, variant: 'destructive' });
    },
  });

  // Send Winners Board mutation — pushes previewed data to the display
  const sendWinnersBoardMutation = useMutation({
    mutationFn: async ({ deviceId, eventNumber }: { deviceId: string; eventNumber: number }) => {
      const response = await apiRequest('POST', `/api/display-devices/${deviceId}/winners-board-lynx`, { eventNumber });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.warning ? 'Winners sent with warning' : 'Winners Board sent',
        description: data.warning || `Display is now showing ${data.entryCount || 0} winners.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send Winners Board', description: error.message, variant: 'destructive' });
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
  const displayTypes = ['P10', 'P6', 'BigBoard', 'Custom'] as const;
  const displayModes = [
    'start_list', 
    'running_time', 
    'track_results', 
    'multi_track',
    'field_results',
    'field_standings', 
    'multi_field',
    'hytek_results',
    'team_scores',
  ] as const;
  
  const displayModeLabels: Record<string, string> = {
    start_list: 'Start List',
    running_time: 'Running Time',
    track_results: 'Track Results',
    multi_track: 'Multi-Event Track',
    field_results: 'Field Results',
    field_standings: 'Field Standings',
    multi_field: 'Multi-Event Field',
    hytek_results: 'HyTek Results',
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
      <div className="px-6 py-5 border-b bg-background">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Display Control</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage connected display boards and assign content
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Refresh this display remotely"
                        onClick={() => refreshDeviceMutation.mutate(selectedDevice.id)}
                        disabled={refreshDeviceMutation.isPending || selectedDevice.status !== 'online'}
                        data-testid="button-refresh-device"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshDeviceMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
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
                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: undefined as any }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: false });
                            sendCommandMutation.mutate({ deviceId: selectedDevice.id, template: 'meet-logo' });
                          }}
                          className="w-full p-3 rounded-lg border-2 transition-all text-left border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-3"
                          data-testid="tile-meet-logo"
                        >
                          <Image className="w-5 h-5 text-amber-500" />
                          <div>
                            <span className="font-medium">Return to Meet Logo</span>
                            <p className="text-xs text-muted-foreground">Send device back to the meet logo screen</p>
                          </div>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: 'finishlynx' }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: true });
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}/content-mode`, { contentMode: 'lynx' });
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
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}/content-mode`, { contentMode: 'hytek' });
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
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}/content-mode`, { contentMode: 'team_scores' });
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

                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: 'field' }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: false });
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}/mode`, { displayMode: 'field' });
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}/content-mode`, { contentMode: 'field' });
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            displayMode[selectedDevice.id] === 'field' && !autoModeStatus?.autoMode
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover-elevate'
                          }`}
                          data-testid="tile-field"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-5 h-5 text-orange-500" />
                            <span className="font-medium">Field Events</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Results from Athletic Field App
                          </p>
                          {displayMode[selectedDevice.id] === 'field' && !autoModeStatus?.autoMode && (
                            <Badge variant="default" className="mt-2">Active</Badge>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDisplayMode(prev => ({ ...prev, [selectedDevice.id]: 'winners' }));
                            toggleAutoModeMutation.mutate({ deviceId: selectedDevice.id, enabled: false });
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}/content-mode`, { contentMode: 'winners' });
                          }}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            displayMode[selectedDevice.id] === 'winners' && !autoModeStatus?.autoMode
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover-elevate'
                          }`}
                          data-testid="tile-winners"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <span className="font-medium">Winners Board</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Top 4 finishers from LIF/LFF files
                          </p>
                          {displayMode[selectedDevice.id] === 'winners' && !autoModeStatus?.autoMode && (
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
                            <Label>Select Event / Round</Label>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search events..."
                                value={eventSearch}
                                onChange={(e) => setEventSearch(e.target.value)}
                                className="pl-8"
                                data-testid="input-event-search"
                              />
                            </div>
                            <ScrollArea className="h-48 rounded-md border">
                              <div className="p-1">
                                {hytekEventRoundItems.length === 0 && (
                                  <p className="text-sm text-muted-foreground p-2">No events found</p>
                                )}
                                {hytekEventRoundItems.map(item => {
                                  const isSelected = selectedHytekItem[selectedDevice.id] === item.key;
                                  // Detect sub-events: event number >= 1000 and name contains " - " (e.g., "Women's Pentathlon - 60m Hurdles")
                                  const isSubEvent = (item.event.eventNumber || 0) >= 1000 && item.label.includes(' - ');
                                  // For sub-events, show only the sub-event part after " - "
                                  const displayLabel = isSubEvent ? item.label.split(' - ').slice(1).join(' - ') : item.label;
                                  return (
                                    <button
                                      key={item.key}
                                      onClick={() => setSelectedHytekItem(prev => ({ ...prev, [selectedDevice.id]: item.key }))}
                                      className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md cursor-pointer hover-elevate ${isSelected ? 'bg-accent' : ''} ${isSubEvent ? 'pl-6' : ''}`}
                                      data-testid={`button-hytek-${item.key}`}
                                    >
                                      {!isSubEvent && item.event.eventTime && (
                                        <span className="text-muted-foreground shrink-0 w-16 text-xs">{item.event.eventTime}</span>
                                      )}
                                      {isSubEvent && (
                                        <span className="text-muted-foreground shrink-0 text-xs">↳</span>
                                      )}
                                      <span className="truncate">
                                        {displayLabel}
                                        {item.roundLabel && (
                                          <span className="text-muted-foreground"> - {item.roundLabel}</span>
                                        )}
                                      </span>
                                      <EventStatusBadge event={item.event} />
                                    </button>
                                  );
                                })}
                              </div>
                            </ScrollArea>
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
                              const itemKey = selectedHytekItem[selectedDevice.id];
                              if (!itemKey) return;
                              const item = hytekEventRoundItems.find(i => i.key === itemKey);
                              if (!item) return;
                              const lines = pagingLines[selectedDevice.id] || 8;
                              sendHytekResultsMutation.mutate({
                                deviceId: selectedDevice.id,
                                eventId: item.eventId,
                                pagingLines: lines,
                                round: item.round,
                              });
                            }}
                            disabled={!selectedHytekItem[selectedDevice.id] || sendHytekResultsMutation.isPending}
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
                            <Label>Gender</Label>
                            <div className="flex gap-2">
                              <Button
                                variant={teamScoreGender[selectedDevice.id] === 'M' || !teamScoreGender[selectedDevice.id] ? 'default' : 'outline'}
                                onClick={() => setTeamScoreGender(prev => ({ ...prev, [selectedDevice.id]: 'M' }))}
                                className="flex-1"
                                data-testid="button-teamscores-men"
                              >
                                Men
                              </Button>
                              <Button
                                variant={teamScoreGender[selectedDevice.id] === 'W' ? 'default' : 'outline'}
                                onClick={() => setTeamScoreGender(prev => ({ ...prev, [selectedDevice.id]: 'W' }))}
                                className="flex-1"
                                data-testid="button-teamscores-women"
                              >
                                Women
                              </Button>
                            </div>
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

                          <div className="space-y-2">
                            <Label>Max Pages</Label>
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(maxPages[selectedDevice.id] || 0)}
                                onValueChange={(value) => {
                                  setMaxPages(prev => ({ ...prev, [selectedDevice.id]: parseInt(value) }));
                                }}
                              >
                                <SelectTrigger className="w-24" data-testid="select-teamscores-maxpages">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 5, 10].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n === 0 ? 'All' : String(n)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">
                                {(maxPages[selectedDevice.id] || 0) === 0 ? 'show all pages' : `only show first ${maxPages[selectedDevice.id]} page${maxPages[selectedDevice.id] === 1 ? '' : 's'}`}
                              </span>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              const lines = pagingLines[selectedDevice.id] || 8;
                              const gender = teamScoreGender[selectedDevice.id] || 'M';
                              const mp = maxPages[selectedDevice.id] || 0;
                              sendTeamScoresMutation.mutate({
                                deviceId: selectedDevice.id,
                                pagingLines: lines,
                                gender,
                                maxPages: mp,
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
                      ) : displayMode[selectedDevice.id] === 'winners' ? (
                        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                          {/* Step 1: Select event from available LIF/LFF files */}
                          <div className="space-y-2">
                            <Label>Select Event (events with result files)</Label>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search events..."
                                value={winnersEventSearch}
                                onChange={(e) => setWinnersEventSearch(e.target.value)}
                                className="pl-8"
                                data-testid="input-winners-event-search"
                              />
                            </div>
                            <ScrollArea className="h-48 border rounded-md">
                              <div className="p-2 space-y-0.5">
                                {availableWinnersEvents
                                  .filter(evt => !winnersEventSearch || evt.name.toLowerCase().includes(winnersEventSearch.toLowerCase()) || String(evt.eventNumber).includes(winnersEventSearch))
                                  .map(evt => {
                                    const isSelected = selectedWinnersEvent[selectedDevice.id] === evt.eventNumber;
                                    return (
                                      <button
                                        key={evt.eventNumber}
                                        onClick={() => {
                                          setSelectedWinnersEvent(prev => ({ ...prev, [selectedDevice.id]: evt.eventNumber }));
                                          // Clear any previous preview when selecting a new event
                                          setWinnersPreview(prev => { const next = { ...prev }; delete next[selectedDevice.id]; return next; });
                                        }}
                                        className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md cursor-pointer hover-elevate ${isSelected ? 'bg-accent' : ''}`}
                                        data-testid={`button-winners-${evt.eventNumber}`}
                                      >
                                        <span className="text-muted-foreground shrink-0 w-8 text-xs font-mono">#{evt.eventNumber}</span>
                                        {evt.eventTime && (
                                          <span className="text-muted-foreground shrink-0 w-16 text-xs">{evt.eventTime}</span>
                                        )}
                                        <span className="truncate">{evt.name}</span>
                                      </button>
                                    );
                                  })}
                                {availableWinnersEvents.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-4">No events with LIF/LFF result files found. Make sure your Lynx files directory is configured in Ingestion Settings.</p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          {/* Step 2: Preview button */}
                          <Button
                            onClick={() => {
                              const evtNum = selectedWinnersEvent[selectedDevice.id];
                              if (!evtNum) return;
                              previewWinnersMutation.mutate({
                                deviceId: selectedDevice.id,
                                eventNumber: evtNum,
                              });
                            }}
                            disabled={!selectedWinnersEvent[selectedDevice.id] || previewWinnersMutation.isPending}
                            variant="outline"
                            className="w-full"
                            data-testid="button-preview-winners"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            {previewWinnersMutation.isPending ? 'Loading Preview...' : 'Preview Winners'}
                          </Button>

                          {/* Step 3: Preview table */}
                          {winnersPreview[selectedDevice.id] && winnersPreview[selectedDevice.id].entries && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">{winnersPreview[selectedDevice.id].eventName}</Label>
                                <Badge variant="outline" className="text-xs">Round {winnersPreview[selectedDevice.id].round} • {winnersPreview[selectedDevice.id].source?.toUpperCase()}</Badge>
                              </div>
                              <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="px-2 py-1 text-left w-8">#</th>
                                      <th className="px-2 py-1 text-left">Athlete</th>
                                      <th className="px-2 py-1 text-left">Team</th>
                                      <th className="px-2 py-1 text-right">Mark</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {winnersPreview[selectedDevice.id].entries.map((entry: any, idx: number) => (
                                      <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                                        <td className="px-2 py-1.5 font-medium">{entry.position}</td>
                                        <td className="px-2 py-1.5">
                                          <div className="flex items-center gap-2">
                                            {entry.headshotUrl && <img src={entry.headshotUrl} alt="" className="w-6 h-6 rounded-full object-cover" />}
                                            <span>{entry.name}</span>
                                          </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            {entry.teamLogoUrl && <img src={entry.teamLogoUrl} alt="" className="w-4 h-4 object-contain" />}
                                            <span>{entry.team}</span>
                                          </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-mono">{entry.mark}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Step 4: Send to Board button (only visible after preview) */}
                          {winnersPreview[selectedDevice.id]?.entries && (
                            <Button
                              onClick={() => {
                                const evtNum = selectedWinnersEvent[selectedDevice.id];
                                if (!evtNum) return;
                                sendWinnersBoardMutation.mutate({
                                  deviceId: selectedDevice.id,
                                  eventNumber: evtNum,
                                });
                              }}
                              disabled={sendWinnersBoardMutation.isPending}
                              className="w-full"
                              data-testid="button-send-winners"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {sendWinnersBoardMutation.isPending ? 'Sending...' : 'Send to Board'}
                            </Button>
                          )}
                        </div>
                      ) : displayMode[selectedDevice.id] === 'field' ? (
                        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                          <div className="space-y-2">
                            <Label>Field Port</Label>
                            <div className="flex gap-2">
                              <Select
                                value={String(pendingFieldPort[selectedDevice.id] ?? selectedDevice.fieldPort ?? 4560)}
                                onValueChange={(val) => {
                                  setPendingFieldPort(prev => ({ ...prev, [selectedDevice.id]: parseInt(val) }));
                                }}
                              >
                                <SelectTrigger data-testid="select-field-port" className="flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 10 }, (_, i) => 4560 + i).map(port => (
                                    <SelectItem key={port} value={String(port)}>
                                      Port {port}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                data-testid="button-send-field-port"
                                onClick={async () => {
                                  const port = pendingFieldPort[selectedDevice.id] ?? selectedDevice.fieldPort ?? 4560;
                                  await apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}`, { fieldPort: port });
                                  await queryClient.invalidateQueries({ queryKey: ['/api/display-devices/meet', currentMeetId] });
                                  setPendingFieldPort(prev => {
                                    const next = { ...prev };
                                    delete next[selectedDevice.id];
                                    return next;
                                  });
                                  toast({ title: `Port ${port} set`, description: `${selectedDevice.deviceName} default port set to ${port}` });
                                }}
                                disabled={!pendingFieldPort[selectedDevice.id] || pendingFieldPort[selectedDevice.id] === selectedDevice.fieldPort}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Set
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Default port for this device. Scene objects with their own port binding (set in Scene Editor) override this.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Device Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium">Display Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'P10', label: 'P10 Display', desc: '192 × 96' },
                        { value: 'P6', label: 'P6 Display', desc: '288 × 144' },
                        { value: 'BigBoard', label: 'Big Board', desc: '1920 × 1080' },
                        { value: 'Custom', label: 'Custom', desc: 'Custom res' },
                        { value: 'Broadcast', label: 'Broadcast', desc: 'Ticker & Clock' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}`, { displayType: opt.value });
                            queryClient.invalidateQueries({ queryKey: ['/api/display-devices/meet', currentMeetId] });
                          }}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            (selectedDevice.displayType || 'P10') === opt.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-accent/50'
                          }`}
                          data-testid={`tile-display-type-${opt.value}`}
                        >
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Keep old select hidden for backwards compat but functionally replaced */}
                  <div className="hidden">
                    <Select
                      value={selectedDevice.displayType || 'P10'}
                      onValueChange={(val) => {
                        apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}`, { displayType: val });
                        queryClient.invalidateQueries({ queryKey: ['/api/display-devices/meet', currentMeetId] });
                      }}
                    >
                      <SelectTrigger data-testid="select-display-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P10">P10 Display (192 x 96)</SelectItem>
                        <SelectItem value="P6">P6 Display (288 x 144)</SelectItem>
                        <SelectItem value="BigBoard">Big Board (1920 x 1080)</SelectItem>
                        <SelectItem value="Custom">Custom Resolution</SelectItem>
                        <SelectItem value="Broadcast">Broadcast (Ticker & Clock)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">Big Board Mode</div>
                      <p className="text-xs text-muted-foreground">Uses big board channel for independent paging</p>
                    </div>
                    <Switch
                      checked={selectedDevice.isBigBoard || false}
                      onCheckedChange={(checked) => {
                        apiRequest('PATCH', `/api/display-devices/${selectedDevice.id}`, { isBigBoard: checked });
                        queryClient.invalidateQueries({ queryKey: ['/api/display-devices/meet', currentMeetId] });
                      }}
                      data-testid="switch-big-board"
                    />
                  </div>
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
                  <div className="space-y-4">
                    {displayModes.map(mode => {
                      const hasAnyMapping = displayTypes.some(type => getMappingForCell(type, mode));
                      return (
                        <div key={mode} className="rounded-lg border bg-background">
                          <div className="px-4 py-3 border-b bg-muted/30">
                            <span className="text-sm font-semibold">{displayModeLabels[mode]}</span>
                          </div>
                          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {displayTypes.map(type => {
                              const mapping = getMappingForCell(type, mode);
                              const selectedScene = mapping ? layoutScenes.find(s => s.id === mapping.sceneId) : null;
                              
                              return (
                                <div key={`${type}-${mode}`} className="space-y-1">
                                  <label className="text-xs text-muted-foreground font-medium">{type}</label>
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
                                      className={`w-full text-xs h-8 ${selectedScene ? 'border-primary/40 bg-primary/5' : ''}`}
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
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{device.deviceName}</span>
            {device.displayType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0" data-testid={`badge-device-type-${device.id}`}>
                {device.displayType}
              </Badge>
            )}
          </div>
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
