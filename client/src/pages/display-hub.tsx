import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMeet } from '@/contexts/MeetContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Monitor, 
  ExternalLink, 
  QrCode,
  Wifi,
  WifiOff,
  Copy,
  Send,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { DISPLAY_CONTENT_TYPES } from '@shared/layout-templates';
import type { DisplayDevice } from '@shared/schema';
import QRCode from 'qrcode';

export default function DisplayHub() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [qrDialog, setQrDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({});

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '';

  const { data: devices = [], refetch: refetchDevices } = useQuery<DisplayDevice[]>({
    queryKey: ['/api/display-devices/meet', currentMeetId],
    enabled: !!currentMeetId,
    refetchInterval: 5000,
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

  const toggleAutoModeMutation = useMutation({
    mutationFn: async ({ deviceId, enabled }: { deviceId: string; enabled: boolean }) => {
      return apiRequest('POST', `/api/display-devices/${deviceId}/auto-mode`, { enabled });
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: 'Auto Mode ' + (variables.enabled ? 'Enabled' : 'Disabled'),
        description: variables.enabled 
          ? 'Display will automatically switch based on race state' 
          : 'Display will stay on manual control'
      });
      refetchDevices();
    },
    onError: () => {
      toast({ title: 'Failed to toggle auto mode', variant: 'destructive' });
    }
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest('DELETE', `/api/display-devices/${deviceId}`);
    },
    onSuccess: () => {
      toast({ title: 'Device removed' });
      refetchDevices();
    }
  });

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
      setQrDialog({ 
        open: true, 
        url, 
        title: 'Launch Display' 
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const sendCommand = (device: DisplayDevice, template: string) => {
    if (template === 'auto-mode') {
      toggleAutoModeMutation.mutate({ deviceId: device.id, enabled: true });
    } else {
      // Disable auto-mode when manually selecting a template
      toggleAutoModeMutation.mutate({ deviceId: device.id, enabled: false });
      sendCommandMutation.mutate({ deviceId: device.id, template });
    }
  };

  const getTemplatesForDevice = (displayType: string | null) => {
    const type = (displayType || 'P10').toLowerCase();
    return DISPLAY_CONTENT_TYPES.map(c => ({
      id: `${type}-${c.id}`,
      name: c.name
    }));
  };

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status !== 'online');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-display-hub-title">Display Hub</h1>
            <p className="text-sm text-muted-foreground">
              Manage displays for {currentMeet?.name || 'your meet'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Connected Displays ({onlineDevices.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => refetchDevices()} data-testid="button-refresh-devices">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No displays connected yet</p>
                  <p className="text-sm">Have your display computers visit <code className="bg-muted px-1.5 py-0.5 rounded">/display</code> to register</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {onlineDevices.map(device => (
                    <div key={device.id} className="flex items-center gap-4 p-4 bg-card border rounded-xl transition-all hover:shadow-sm" data-testid={`device-row-${device.id}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="default" className="bg-green-500 shrink-0">
                          <Wifi className="w-3 h-3 mr-1" />
                          Online
                        </Badge>
                        <span className="font-medium truncate">{device.deviceName}</span>
                        {device.displayType && (
                          <Badge variant="outline" className="shrink-0">{device.displayType}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select 
                          value={selectedTemplate[device.id] || device.currentTemplate || ''} 
                          onValueChange={(v) => setSelectedTemplate(prev => ({ ...prev, [device.id]: v }))}
                        >
                          <SelectTrigger className="w-[160px]" data-testid={`select-template-${device.id}`}>
                            <SelectValue placeholder="Select content" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto-mode">Auto Mode (Track)</SelectItem>
                            <Separator className="my-1" />
                            <SelectItem value="meet-logo">Meet Logo</SelectItem>
                            <SelectItem value="team-scores">Team Scores</SelectItem>
                            {getTemplatesForDevice(device.displayType).map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          onClick={() => sendCommand(device, selectedTemplate[device.id] || device.currentTemplate || 'meet-logo')}
                          disabled={sendCommandMutation.isPending}
                          data-testid={`button-send-${device.id}`}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => deleteDeviceMutation.mutate(device.id)}
                          data-testid={`button-delete-${device.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {offlineDevices.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <p className="text-sm text-muted-foreground mb-2">Offline Devices</p>
                      {offlineDevices.map(device => (
                        <div key={device.id} className="flex items-center gap-4 p-4 bg-muted/30 border border-dashed rounded-xl opacity-60" data-testid={`device-row-${device.id}`}>
                          <div className="flex items-center gap-2 flex-1">
                            <Badge variant="secondary" className="shrink-0">
                              <WifiOff className="w-3 h-3 mr-1" />
                              Offline
                            </Badge>
                            <span className="font-medium truncate">{device.deviceName}</span>
                            {device.displayType && (
                              <Badge variant="outline" className="shrink-0">{device.displayType}</Badge>
                            )}
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => deleteDeviceMutation.mutate(device.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Launch Display
              </CardTitle>
              <CardDescription>
                Open a new display window - you'll choose P10, P6, or Big Board after launch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                size="lg"
                onClick={launchDisplay}
                data-testid="button-launch-display"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Launch Display
              </Button>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  For remote displays, have them visit:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                    {getDisplayUrl()}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(getDisplayUrl(), 'Display URL')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button className="w-full" variant="outline" onClick={showDisplayQR} data-testid="button-show-qr">
                  <QrCode className="w-4 h-4 mr-2" />
                  Show QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={qrDialog.open} onOpenChange={(open) => setQrDialog({ ...qrDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{qrDialog.title}</DialogTitle>
            <DialogDescription>
              Scan this QR code with your display computer
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="rounded-lg" />
            )}
            <div className="flex items-center gap-2 w-full">
              <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                {qrDialog.url}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(qrDialog.url, 'Display URL')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
