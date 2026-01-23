import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Settings, Image, X, Save, MapPin, Calendar as CalendarIcon, Palette, RotateCcw, FileText, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Meet } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = {
  primaryColor: "#0066CC",
  secondaryColor: "#003366",
  accentColor: "#FFD700",
  textColor: "#FFFFFF",
};

function ColorPickerField({ 
  label, 
  value, 
  onChange, 
  description,
  testId
}: { 
  label: string; 
  value: string; 
  onChange: (color: string) => void;
  description?: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div 
          className="relative w-12 h-10 rounded-md border-2 border-border overflow-hidden cursor-pointer"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid={testId}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-28 font-mono uppercase"
          maxLength={7}
        />
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}

function MeetSetupSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MeetSetup() {
  const [, params] = useRoute("/control/:meetId/setup");
  const meetId = params?.meetId;
  const { toast } = useToast();

  const { data: meet, isLoading } = useQuery<Meet>({
    queryKey: ["/api/meets", meetId],
    enabled: !!meetId,
  });

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Color scheme state
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondaryColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_COLORS.accentColor);
  const [textColor, setTextColor] = useState(DEFAULT_COLORS.textColor);
  const [hasColorChanges, setHasColorChanges] = useState(false);
  
  // Track heat watcher state
  const [evtFilePath, setEvtFilePath] = useState("");
  const [hasEvtChanges, setHasEvtChanges] = useState(false);

  // Initialize form values when meet data loads
  useEffect(() => {
    if (meet) {
      setName(meet.name);
      setLocation(meet.location || "");
      setStartDate(new Date(meet.startDate));
      // Initialize colors from meet data
      setPrimaryColor(meet.primaryColor || DEFAULT_COLORS.primaryColor);
      setSecondaryColor(meet.secondaryColor || DEFAULT_COLORS.secondaryColor);
      setAccentColor(meet.accentColor || DEFAULT_COLORS.accentColor);
      setTextColor(meet.textColor || DEFAULT_COLORS.textColor);
    }
  }, [meet]);

  const updateMeetMutation = useMutation({
    mutationFn: async (data: { name?: string; location?: string; startDate?: Date }) => {
      return await apiRequest("PATCH", `/api/meets/${meetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({ title: "Meet updated successfully" });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update meet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      
      const response = await fetch(`/api/meets/${meetId}/logo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ 
        title: "Logo uploaded successfully",
        description: "Color scheme has been generated from your logo"
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      // Reset color changes flag since we just got new colors from the logo
      setHasColorChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meets/${meetId}/logo`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete logo");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ title: "Logo removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateColorsMutation = useMutation({
    mutationFn: async (colors: { 
      primaryColor: string; 
      secondaryColor: string; 
      accentColor: string; 
      textColor: string;
    }) => {
      return await apiRequest("PATCH", `/api/meets/${meetId}`, colors);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({ title: "Color scheme updated successfully" });
      setHasColorChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update color scheme",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Track heat watcher query and mutation
  interface TrackHeatConfig {
    meetId: string;
    evtFilePath: string;
  }
  
  const { data: trackHeatWatcherData } = useQuery<{ configs: TrackHeatConfig[]; activeWatchers: { meetId: string; evtFilePath: string }[] }>({
    queryKey: ["/api/track-heat-watcher"],
    enabled: !!meetId,
  });
  
  // Initialize EVT file path from existing config
  useEffect(() => {
    if (trackHeatWatcherData && meetId) {
      const existingConfig = trackHeatWatcherData.configs.find(c => c.meetId === meetId);
      if (existingConfig) {
        setEvtFilePath(existingConfig.evtFilePath);
      }
    }
  }, [trackHeatWatcherData, meetId]);
  
  const isWatcherActive = trackHeatWatcherData?.activeWatchers.some(w => w.meetId === meetId);
  
  const saveEvtConfigMutation = useMutation({
    mutationFn: async (data: { meetId: string; evtFilePath: string }) => {
      return await apiRequest("POST", "/api/track-heat-watcher", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/track-heat-watcher"] });
      toast({ title: "EVT watcher configured successfully" });
      setHasEvtChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to configure EVT watcher",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const stopEvtWatcherMutation = useMutation({
    mutationFn: async (meetIdToStop: string) => {
      const response = await fetch(`/api/track-heat-watcher/${meetIdToStop}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to stop watcher");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/track-heat-watcher"] });
      toast({ title: "EVT watcher stopped" });
      setEvtFilePath("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop watcher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent' | 'text', value: string) => {
    setHasColorChanges(true);
    switch (colorType) {
      case 'primary': setPrimaryColor(value); break;
      case 'secondary': setSecondaryColor(value); break;
      case 'accent': setAccentColor(value); break;
      case 'text': setTextColor(value); break;
    }
  };

  const handleSaveColors = () => {
    updateColorsMutation.mutate({
      primaryColor,
      secondaryColor,
      accentColor,
      textColor,
    });
  };

  const handleResetColors = () => {
    setPrimaryColor(DEFAULT_COLORS.primaryColor);
    setSecondaryColor(DEFAULT_COLORS.secondaryColor);
    setAccentColor(DEFAULT_COLORS.accentColor);
    setTextColor(DEFAULT_COLORS.textColor);
    setHasColorChanges(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or GIF image",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = () => {
    if (selectedFile) {
      uploadLogoMutation.mutate(selectedFile);
    }
  };

  const handleRemoveLogo = () => {
    deleteLogoMutation.mutate();
  };

  const handleSaveChanges = () => {
    const updates: { name?: string; location?: string; startDate?: Date } = {};
    
    if (name !== meet?.name) updates.name = name;
    if (location !== (meet?.location || "")) updates.location = location;
    if (startDate && startDate.getTime() !== new Date(meet?.startDate || 0).getTime()) {
      updates.startDate = startDate;
    }
    
    if (Object.keys(updates).length > 0) {
      updateMeetMutation.mutate(updates);
    }
  };

  if (isLoading || !meet) {
    return <MeetSetupSkeleton />;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-meet-setup">Meet Setup</h1>
          <p className="text-muted-foreground">Configure your meet settings</p>
        </div>
      </div>

      <Card data-testid="card-meet-logo">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Meet Logo
          </CardTitle>
          <CardDescription>
            Upload a logo that will appear on display boards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meet.logoUrl ? (
            <div className="flex items-center gap-4">
              <img 
                src={meet.logoUrl} 
                alt="Meet logo" 
                className="h-24 object-contain bg-muted rounded-md p-2"
                data-testid="img-meet-logo"
              />
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRemoveLogo}
                disabled={deleteLogoMutation.isPending}
                data-testid="button-remove-logo"
              >
                <X className="w-4 h-4 mr-2" />
                Remove Logo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {previewUrl ? (
                <div className="flex items-center gap-4">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="h-24 object-contain bg-muted rounded-md p-2"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUploadLogo}
                      disabled={uploadLogoMutation.isPending}
                      data-testid="button-confirm-upload"
                    >
                      {uploadLogoMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      data-testid="button-cancel-upload"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileChange}
                    className="cursor-pointer max-w-md"
                    data-testid="input-logo-file"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Accepted formats: JPEG, PNG, GIF (max 1024px)
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-meet-details">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Meet Details
          </CardTitle>
          <CardDescription>
            Update basic meet information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meet-name">Meet Name</Label>
            <Input
              id="meet-name"
              value={name || meet.name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Enter meet name"
              data-testid="input-meet-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meet-location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="meet-location"
                value={location || meet.location || ""}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Enter venue location"
                className="pl-10"
                data-testid="input-meet-location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meet Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full max-w-md justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                  data-testid="button-select-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : format(new Date(meet.startDate), "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate || new Date(meet.startDate)}
                  onSelect={(date) => {
                    setStartDate(date);
                    setHasChanges(true);
                  }}
                  initialFocus
                  data-testid="calendar-meet-date"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSaveChanges}
              disabled={!hasChanges || updateMeetMutation.isPending}
              data-testid="button-save-changes"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMeetMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-color-scheme">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Scheme
          </CardTitle>
          <CardDescription>
            Customize the colors used in display layouts. Choose colors that match your event branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorPickerField
              label="Primary Color"
              value={primaryColor}
              onChange={(v) => handleColorChange('primary', v)}
              description="Main brand color"
              testId="input-primary-color"
            />
            <ColorPickerField
              label="Secondary Color"
              value={secondaryColor}
              onChange={(v) => handleColorChange('secondary', v)}
              description="Gradient/background"
              testId="input-secondary-color"
            />
            <ColorPickerField
              label="Accent Color"
              value={accentColor}
              onChange={(v) => handleColorChange('accent', v)}
              description="Times & highlights"
              testId="input-accent-color"
            />
            <ColorPickerField
              label="Text Color"
              value={textColor}
              onChange={(v) => handleColorChange('text', v)}
              description="Primary text"
              testId="input-text-color"
            />
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">Preview</Label>
            <div 
              className="rounded-lg p-4 flex items-center justify-between"
              style={{ 
                background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: primaryColor, color: textColor }}
                >
                  1
                </div>
                <div style={{ color: textColor }}>
                  <div className="font-semibold">Athlete Name</div>
                  <div className="text-sm opacity-80">Team Name</div>
                </div>
              </div>
              <div 
                className="text-2xl font-bold font-mono"
                style={{ color: accentColor }}
              >
                10.52
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleSaveColors}
              disabled={!hasColorChanges || updateColorsMutation.isPending}
              data-testid="button-save-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateColorsMutation.isPending ? "Saving..." : "Save Colors"}
            </Button>
            <Button 
              variant="outline"
              onClick={handleResetColors}
              data-testid="button-reset-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-evt-watcher">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Track Heat Detection
          </CardTitle>
          <CardDescription>
            Monitor a FinishLynx EVT file to automatically detect heat counts. Shows "Final" for single heat events, or "Heat X of Y" for multi-heat events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evt-path">EVT File Path</Label>
            <div className="flex gap-2">
              <Input
                id="evt-path"
                value={evtFilePath}
                onChange={(e) => {
                  setEvtFilePath(e.target.value);
                  setHasEvtChanges(true);
                }}
                placeholder="/path/to/lynx.evt"
                className="flex-1 font-mono text-sm"
                data-testid="input-evt-path"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Full path to your FinishLynx .evt file (e.g., C:\Lynx\Events\meet.evt)
            </p>
          </div>
          
          {isWatcherActive && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>Watcher active - monitoring for changes</span>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (meetId && evtFilePath) {
                  saveEvtConfigMutation.mutate({ meetId, evtFilePath });
                }
              }}
              disabled={!evtFilePath || saveEvtConfigMutation.isPending || (!hasEvtChanges && isWatcherActive)}
              data-testid="button-save-evt"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveEvtConfigMutation.isPending ? "Saving..." : isWatcherActive ? "Update Watcher" : "Start Watcher"}
            </Button>
            
            {isWatcherActive && (
              <Button
                variant="outline"
                onClick={() => meetId && stopEvtWatcherMutation.mutate(meetId)}
                disabled={stopEvtWatcherMutation.isPending}
                data-testid="button-stop-evt"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Watcher
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-meet-code">
        <CardHeader>
          <CardTitle>Meet Code</CardTitle>
          <CardDescription>
            Share this code with display devices to connect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <code className="text-3xl font-mono font-bold tracking-widest bg-muted px-4 py-2 rounded-lg" data-testid="text-meet-code">
              {meet.meetCode}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
