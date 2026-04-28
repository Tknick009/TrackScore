import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMeet } from '@/contexts/MeetContext';
import { 
  Monitor, 
  Copy, 
  ExternalLink, 
  QrCode,
  Layers,
  Maximize,
  Info,
  CheckCircle2
} from 'lucide-react';
import type { SelectLayoutScene } from '@shared/schema';
import QRCode from 'qrcode';

export default function DisplayLauncherPage() {
  const { currentMeetId, currentMeet } = useMeet();
  const { toast } = useToast();
  const [selectedScene, setSelectedScene] = useState<SelectLayoutScene | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const { data: scenes = [], isLoading } = useQuery<SelectLayoutScene[]>({
    queryKey: ['/api/layout-scenes', { meetId: currentMeetId }],
    queryFn: async () => {
      if (!currentMeetId) return [];
      const res = await fetch(`/api/layout-scenes?meetId=${currentMeetId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentMeetId,
  });

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '';

  const getSceneUrl = (sceneId: number) => {
    return `${baseUrl}/scene-display/${sceneId}?meetId=${currentMeetId}`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const showQRCode = async (scene: SelectLayoutScene) => {
    setSelectedScene(scene);
    try {
      const url = getSceneUrl(scene.id);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Display Launcher</h1>
        <p className="text-muted-foreground">
          Share scene links with remote display computers. Each display loads a scene URL and receives live updates automatically.
        </p>
      </div>

      <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            How Remote Displays Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span><strong>Step 1:</strong> On your display computer, open a web browser (Chrome recommended)</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span><strong>Step 2:</strong> Paste the scene URL or scan the QR code from below</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span><strong>Step 3:</strong> Press F11 for full-screen mode (recommended for LED displays)</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span><strong>Step 4:</strong> The display will automatically receive live updates - no refresh needed!</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Available Scenes
          </CardTitle>
          <CardDescription>
            {currentMeet?.name ? `Scenes for ${currentMeet.name}` : 'Select a meet to view scenes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading scenes...
            </div>
          ) : scenes.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No scenes created yet</p>
              <Button variant="outline" onClick={() => window.location.href = `/control/${currentMeetId}/scene-editor`}>
                Go to Scene Editor
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4">
                {scenes.map((scene) => (
                  <div 
                    key={scene.id}
                    className="border rounded-lg p-4 hover-elevate"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{scene.name}</h3>
                          {scene.isTemplate && (
                            <Badge variant="secondary">Template</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{scene.canvasWidth} × {scene.canvasHeight}</span>
                        </div>
                        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono truncate">
                          {getSceneUrl(scene.id)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(getSceneUrl(scene.id), 'Scene URL')}
                          data-testid={`button-copy-url-${scene.id}`}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy URL
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => showQRCode(scene)}
                          data-testid={`button-qr-code-${scene.id}`}
                        >
                          <QrCode className="w-4 h-4 mr-1" />
                          QR Code
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => openInNewTab(getSceneUrl(scene.id))}
                          data-testid={`button-open-display-${scene.id}`}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Legacy Display Board
          </CardTitle>
          <CardDescription>
            Open the original single-event display board (for simpler setups)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              The legacy display board shows the currently active event without scene layouts.
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(`${baseUrl}/display`, 'Display URL')}
                data-testid="button-copy-legacy-url"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
              <Button 
                onClick={() => openInNewTab('/display')}
                data-testid="button-open-legacy-display"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Open Display
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedScene} onOpenChange={(open) => !open && setSelectedScene(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan to Open Display</DialogTitle>
            <DialogDescription>
              Scan this QR code with a phone or tablet camera to open the display on that device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="QR Code for display" 
                className="w-64 h-64 rounded-lg border"
              />
            )}
            <div className="text-center">
              <p className="font-medium">{selectedScene?.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedScene?.canvasWidth} × {selectedScene?.canvasHeight}
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => selectedScene && copyToClipboard(getSceneUrl(selectedScene.id), 'Scene URL')}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy URL
              </Button>
              <Button 
                className="flex-1"
                onClick={() => selectedScene && openInNewTab(getSceneUrl(selectedScene.id))}
              >
                <Maximize className="w-4 h-4 mr-1" />
                Open Full Screen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
