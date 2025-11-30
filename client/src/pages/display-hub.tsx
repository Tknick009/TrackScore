import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMeet } from '@/contexts/MeetContext';
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
  Maximize
} from 'lucide-react';
import { DISPLAY_TYPES, DISPLAY_CONTENT_TYPES, type DisplayType } from '@shared/layout-templates';
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

interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  meetId: string;
  lastHeartbeat: number;
  currentDisplay?: string;
}

export default function DisplayHub() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [qrDialog, setQrDialog] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '';

  const getDisplayUrl = (displayType: DisplayType, contentType: string) => {
    const templateId = `${displayType.toLowerCase()}-${contentType}`;
    return `${baseUrl}/preset-display/${templateId}?meetId=${currentMeetId}`;
  };

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

  const getContentForDisplayType = (displayType: DisplayType) => {
    const contentTypes = DISPLAY_CONTENT_TYPES.filter(content => {
      if (displayType === 'P10' && content.id === 'team-scores') return false;
      return true;
    });
    return contentTypes;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-display-hub-title">Display Hub</h1>
        <p className="text-muted-foreground">
          Launch displays for your {currentMeet?.name || 'meet'}. Pick a display type, choose what to show, and click Launch.
        </p>
      </div>

      <Tabs defaultValue="P10" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {DISPLAY_TYPES.map(dt => (
            <TabsTrigger key={dt.id} value={dt.id} data-testid={`tab-display-${dt.id}`}>
              <Monitor className="w-4 h-4 mr-2" />
              {dt.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {DISPLAY_TYPES.map(displayType => (
          <TabsContent key={displayType.id} value={displayType.id}>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      {displayType.name}
                    </CardTitle>
                    <CardDescription>
                      {displayType.resolution} ({displayType.pixelPitch}) - {displayType.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getContentForDisplayType(displayType.id as DisplayType).map(content => {
                    const IconComponent = CONTENT_ICONS[content.icon] || Monitor;
                    return (
                      <Card key={content.id} className="hover-elevate">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-primary" />
                            {content.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {content.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => launchDisplay(displayType.id as DisplayType, content.id)}
                              data-testid={`button-launch-${displayType.id}-${content.id}`}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Launch
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => showQRCode(displayType.id as DisplayType, content.id)}
                              data-testid={`button-qr-${displayType.id}-${content.id}`}
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyToClipboard(
                                getDisplayUrl(displayType.id as DisplayType, content.id),
                                content.name
                              )}
                              data-testid={`button-copy-${displayType.id}-${content.id}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Maximize className="w-5 h-5" />
                  Remote Display Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <span>On your display computer, open Chrome and paste the URL (or scan QR code)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">F11</kbd> to go full-screen</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <span>The display updates automatically - no refresh needed</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={qrDialog.open} onOpenChange={(open) => setQrDialog({ ...qrDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{qrDialog.title}</DialogTitle>
            <DialogDescription>
              Scan this QR code with your display computer's camera
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
