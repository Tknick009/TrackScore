import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Users,
  Clock,
  Trophy,
  Target,
  ListOrdered,
  Award,
  Image,
  Wifi,
  WifiOff,
  Copy,
  Maximize,
  Send,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { DISPLAY_TYPES, DISPLAY_CONTENT_TYPES, type DisplayType } from '@shared/layout-templates';
import type { DisplayDevice } from '@shared/schema';
import QRCode from 'qrcode';

const CONTENT_ICONS: Record<string, any> = {
  'users': Users,
  'clock': Clock,
  'trophy': Trophy,
  'target': Target,
  'list': ListOrdered,
  'award': Award,
  'image': Image,
};

export default function DisplayHub() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [qrDialog, setQrDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({});

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '';

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery<DisplayDevice[]>({
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

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest('DELETE', `/api/display-devices/${deviceId}`);
    },
    onSuccess: () => {
      toast({ title: 'Device removed' });
      refetchDevices();
    }
  });

  const getDisplayUrl = (displayType: DisplayType, contentType: string) => {
    const templateId = `${displayType.toLowerCase()}-${contentType}`;
    return `${baseUrl}/preset-display/${templateId}?meetId=${currentMeetId}`;
  };

  const getDeviceSetupUrl = () => `${baseUrl}/display`;

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied!', description: `${label} URL copied to clipboard` });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const launchDisplay = (displayType: DisplayType, contentType: string) => {
    const url = getDisplayUrl(displayType, contentType);
    window.open(url, '_blank');
  };

  const showQRCode = async (displayType: DisplayType, contentType: string) => {
    const url = getDisplayUrl(displayType, contentType);
    const contentInfo = DISPLAY_CONTENT_TYPES.find(c => c.id === contentType);
    const displayInfo = DISPLAY_TYPES.find(d => d.id === displayType);
    
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrCodeDataUrl(dataUrl);
      setQrDialog({ 
        open: true, 
        url, 
        title: `${displayInfo?.name} - ${contentInfo?.name}` 
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const showDeviceSetupQR = async () => {
    const url = getDeviceSetupUrl();
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrCodeDataUrl(dataUrl);
      setQrDialog({ 
        open: true, 
        url, 
        title: 'Display Device Setup' 
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const getContentForDisplayType = (displayType: DisplayType) => {
    const contentTypes = DISPLAY_CONTENT_TYPES.filter(content => {
      if (displayType === 'P10' && content.id === 'team-scores') return false;
      return true;
    });
    return contentTypes;
  };

  const sendCommand = (device: DisplayDevice, template: string) => {
    sendCommandMutation.mutate({ deviceId: device.id, template });
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-display-hub-title">Display Hub</h1>
        <p className="text-muted-foreground">
          Manage displays for {currentMeet?.name || 'your meet'}.
        </p>
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
                    <div key={device.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg" data-testid={`device-row-${device.id}`}>
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
                        <div key={device.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg opacity-60" data-testid={`device-row-${device.id}`}>
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
              <CardTitle className="text-lg">Add New Display</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                On each display computer, visit:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {getDeviceSetupUrl()}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(getDeviceSetupUrl(), 'Setup')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button className="w-full" variant="outline" onClick={showDeviceSetupQR} data-testid="button-show-setup-qr">
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Launch</CardTitle>
              <CardDescription>Open displays directly in new tabs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DISPLAY_TYPES.map(dt => (
                <div key={dt.id} className="space-y-1">
                  <p className="text-sm font-medium">{dt.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {getContentForDisplayType(dt.id as DisplayType).slice(0, 3).map(content => (
                      <Button 
                        key={content.id}
                        size="sm" 
                        variant="outline"
                        onClick={() => launchDisplay(dt.id as DisplayType, content.id)}
                        className="text-xs"
                      >
                        {content.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
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
