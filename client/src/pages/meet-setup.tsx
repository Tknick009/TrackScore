import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Settings, Image, X, Save, MapPin, Calendar as CalendarIcon, Palette, RotateCcw, FileText, Check, AlertCircle, Database, Trash2, AlertTriangle, FolderOpen, Upload, Trophy, User, ExternalLink, Medal, Edit2, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LOGO_EFFECTS, type LogoEffect, getLogoEffectStyle } from "@/lib/logoEffects";

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
  const [logoEffect, setLogoEffect] = useState<LogoEffect>("none");
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
  
  // Lynx files directory state (for LFF field event standings)
  const [lynxFilesDir, setLynxFilesDir] = useState("");
  const [hasLynxDirChanges, setHasLynxDirChanges] = useState(false);

  // HyTek MDB watcher state
  const [mdbDirectory, setMdbDirectory] = useState("");
  const [hasMdbChanges, setHasMdbChanges] = useState(false);

  // Headshot directory state
  const [headshotDir, setHeadshotDir] = useState("");
  const [hasHeadshotDirChanges, setHasHeadshotDirChanges] = useState(false);

  // CSV import state for athlete bests
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    unmatched: number;
    unmatchedNames: string[];
    totalRows: number;
  } | null>(null);

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

      const effect = meet.logoEffect || "none";
      setLogoEffect(
        LOGO_EFFECTS.some((opt) => opt.value === effect)
          ? (effect as LogoEffect)
          : "none"
      );
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

  const saveLogoEffectMutation = useMutation({
    mutationFn: async (effect: LogoEffect) => {
      return await apiRequest("PATCH", `/api/meets/${meetId}`, { logoEffect: effect });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({ title: "Logo effect updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update logo effect",
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

  // HyTek MDB watcher query and mutation
  interface HytekMdbConfig {
    meetId: string;
    mdbDirectory: string;
  }
  
  const { data: hytekMdbWatcherData } = useQuery<{ configs: HytekMdbConfig[]; activeWatchers: { meetId: string; mdbDirectory: string; lastImportAt: string | null }[] }>({
    queryKey: ["/api/hytek-mdb-watcher"],
    enabled: !!meetId,
  });
  
  // Initialize MDB directory from existing config
  useEffect(() => {
    if (hytekMdbWatcherData && meetId) {
      const existingConfig = hytekMdbWatcherData.configs.find(c => c.meetId === meetId);
      if (existingConfig) {
        setMdbDirectory(existingConfig.mdbDirectory);
      }
    }
  }, [hytekMdbWatcherData, meetId]);
  
  const isMdbWatcherActive = hytekMdbWatcherData?.activeWatchers.some(w => w.meetId === meetId);
  const mdbWatcherInfo = hytekMdbWatcherData?.activeWatchers.find(w => w.meetId === meetId);
  
  const saveMdbConfigMutation = useMutation({
    mutationFn: async (data: { meetId: string; mdbDirectory: string }) => {
      return await apiRequest("POST", "/api/hytek-mdb-watcher", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hytek-mdb-watcher"] });
      toast({ title: "HyTek MDB watcher configured successfully" });
      setHasMdbChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to configure MDB watcher",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const stopMdbWatcherMutation = useMutation({
    mutationFn: async (meetIdToStop: string) => {
      const response = await fetch(`/api/hytek-mdb-watcher/${meetIdToStop}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to stop watcher");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hytek-mdb-watcher"] });
      toast({ title: "HyTek MDB watcher stopped" });
      setMdbDirectory("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop watcher",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Lynx files directory (ingestion settings) - for LFF field event standings
  const { data: ingestionSettings } = useQuery<{ lynxFilesDirectory: string | null; lynxFilesEnabled: boolean }>({
    queryKey: ["/api/meets", meetId, "ingestion-settings"],
    enabled: !!meetId,
  });

  useEffect(() => {
    if (ingestionSettings?.lynxFilesDirectory) {
      setLynxFilesDir(ingestionSettings.lynxFilesDirectory);
    }
    if ((ingestionSettings as any)?.headshotDirectory) {
      setHeadshotDir((ingestionSettings as any).headshotDirectory);
    }
  }, [ingestionSettings]);

  const saveLynxDirMutation = useMutation({
    mutationFn: async (data: { lynxFilesDirectory: string; lynxFilesEnabled: boolean }) => {
      return await apiRequest("PATCH", `/api/meets/${meetId}/ingestion-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-settings"] });
      toast({ title: "Lynx files directory saved" });
      setHasLynxDirChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save Lynx files directory",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveHeadshotDirMutation = useMutation({
    mutationFn: async (data: { headshotDirectory: string }) => {
      return await apiRequest("PATCH", `/api/meets/${meetId}/ingestion-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "ingestion-settings"] });
      toast({ title: "Headshot directory saved" });
      setHasHeadshotDirChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save headshot directory",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reimportMdbMutation = useMutation({
    mutationFn: async (meetIdToReimport: string) => {
      return await apiRequest("POST", `/api/hytek-mdb-watcher/${meetIdToReimport}/reimport`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hytek-mdb-watcher"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ title: "HyTek database re-imported successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to re-import",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/meets/${meetId}/import-athlete-bests`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCsvImportResult(data);
      setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "athlete-bests"] });
      toast({
        title: "CSV Import Complete",
        description: `Imported ${data.imported} bests. ${data.unmatched} athletes not matched.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV Import Failed",
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
    <div className="px-6 py-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-meet-setup">Meet Setup</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your meet settings and integrations</p>
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

          {/* Logo Effect Selector – only visible when a logo is uploaded */}
          {meet.logoUrl && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Logo Effect</Label>
              <div className="flex items-center gap-4">
                <Select
                  value={logoEffect}
                  onValueChange={(val) => {
                    const effect = val as LogoEffect;
                    setLogoEffect(effect);
                    saveLogoEffectMutation.mutate(effect);
                  }}
                >
                  <SelectTrigger className="w-48" data-testid="select-logo-effect">
                    <SelectValue placeholder="Select effect" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGO_EFFECTS.map((eff) => (
                      <SelectItem key={eff.value} value={eff.value}>
                        {eff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {LOGO_EFFECTS.find((e) => e.value === logoEffect)?.description}
                </span>
              </div>
              {/* Live preview */}
              {logoEffect !== "none" && (
                <div className="mt-2 p-3 bg-muted rounded-md inline-block">
                  <img
                    src={meet.logoUrl}
                    alt="Effect preview"
                    className="h-16 object-contain"
                    style={getLogoEffectStyle(logoEffect)}
                  />
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

      <Card data-testid="card-mdb-watcher">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            HyTek Database Watcher
          </CardTitle>
          <CardDescription>
            Monitor a directory for HyTek .mdb database files. When the file changes, events, athletes, and entries are automatically re-imported.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mdb-directory">MDB File Path</Label>
            <div className="flex gap-2">
              <Input
                id="mdb-directory"
                value={mdbDirectory}
                onChange={(e) => {
                  setMdbDirectory(e.target.value);
                  setHasMdbChanges(true);
                }}
                placeholder="/path/to/hytek/database/Meet.mdb"
                className="flex-1 font-mono text-sm"
                data-testid="input-mdb-directory"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Full path to the .mdb file or its parent directory (e.g., C:\Hy-Tek\TFMeet\Meet.mdb)
            </p>
          </div>
          
          {isMdbWatcherActive && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span>Watcher active - monitoring for changes</span>
              </div>
              {mdbWatcherInfo?.mdbFileName && (
                <div className="ml-6 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    MDB File: <span className="font-mono font-medium text-foreground">{mdbWatcherInfo.mdbFileName}</span>
                  </p>
                  {mdbWatcherInfo.mdbFilePath && (
                    <p
                      className="text-xs text-muted-foreground font-mono cursor-pointer hover-elevate rounded px-1 py-0.5 inline-block"
                      onClick={() => {
                        navigator.clipboard.writeText(mdbWatcherInfo.mdbFilePath!);
                        toast({ title: "Path copied to clipboard" });
                      }}
                      title="Click to copy full path"
                      data-testid="text-mdb-filepath"
                    >
                      {mdbWatcherInfo.mdbFilePath}
                    </p>
                  )}
                </div>
              )}
              {mdbWatcherInfo?.lastImportAt && (
                <p className="text-xs text-muted-foreground ml-6">
                  Last import: {new Date(mdbWatcherInfo.lastImportAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
          
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => {
                if (meetId && mdbDirectory) {
                  saveMdbConfigMutation.mutate({ meetId, mdbDirectory });
                }
              }}
              disabled={!mdbDirectory || saveMdbConfigMutation.isPending || (!hasMdbChanges && isMdbWatcherActive)}
              data-testid="button-save-mdb"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMdbConfigMutation.isPending ? "Saving..." : isMdbWatcherActive ? "Update Watcher" : "Start Watcher"}
            </Button>
            
            {isMdbWatcherActive && (
              <>
                <Button
                  variant="outline"
                  onClick={() => meetId && reimportMdbMutation.mutate(meetId)}
                  disabled={reimportMdbMutation.isPending}
                  data-testid="button-reimport-mdb"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {reimportMdbMutation.isPending ? "Importing..." : "Re-import Now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => meetId && stopMdbWatcherMutation.mutate(meetId)}
                  disabled={stopMdbWatcherMutation.isPending}
                  data-testid="button-stop-mdb"
                >
                  <X className="w-4 h-4 mr-2" />
                  Stop Watcher
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-lynx-files">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Lynx Files Directory
          </CardTitle>
          <CardDescription>
            Directory containing LIF and LFF files from FinishLynx and FieldLynx. When a field event display is idle for 120 seconds, the system automatically parses LFF files from this directory to show combined standings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lynx-files-dir">Directory Path</Label>
            <div className="flex gap-2">
              <Input
                id="lynx-files-dir"
                value={lynxFilesDir}
                onChange={(e) => {
                  setLynxFilesDir(e.target.value);
                  setHasLynxDirChanges(true);
                }}
                placeholder="/path/to/lynx/results"
                className="flex-1 font-mono text-sm"
                data-testid="input-lynx-files-dir"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Full path to the directory where FinishLynx writes LIF/LFF result files (e.g., C:\Lynx\Results)
            </p>
          </div>

          {ingestionSettings?.lynxFilesEnabled && ingestionSettings?.lynxFilesDirectory && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>Directory configured - field standings will auto-display after 120s idle</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (meetId && lynxFilesDir) {
                  saveLynxDirMutation.mutate({ lynxFilesDirectory: lynxFilesDir, lynxFilesEnabled: true });
                }
              }}
              disabled={!lynxFilesDir || saveLynxDirMutation.isPending || (!hasLynxDirChanges && ingestionSettings?.lynxFilesEnabled === true)}
              data-testid="button-save-lynx-dir"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveLynxDirMutation.isPending ? "Saving..." : "Save Directory"}
            </Button>

            {ingestionSettings?.lynxFilesEnabled && (
              <Button
                variant="outline"
                onClick={() => {
                  saveLynxDirMutation.mutate({ lynxFilesDirectory: '', lynxFilesEnabled: false });
                  setLynxFilesDir('');
                }}
                data-testid="button-clear-lynx-dir"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Athlete Headshots Directory */}
      <Card data-testid="card-headshot-dir">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Athlete Headshots Directory
          </CardTitle>
          <CardDescription>
            Directory containing athlete headshot images. Files should be named School_FirstName_LastName.png (e.g., Duke_John_Smith.png)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headshot-dir">Directory Path</Label>
            <div className="flex gap-2">
              <Input
                id="headshot-dir"
                value={headshotDir}
                onChange={(e) => {
                  setHeadshotDir(e.target.value);
                  setHasHeadshotDirChanges(true);
                }}
                placeholder="/path/to/headshots"
                className="flex-1 font-mono text-sm"
                data-testid="input-headshot-dir"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Full path to the folder with athlete headshot images (e.g., C:\Headshots or /Users/you/Headshots)
            </p>
          </div>

          {(ingestionSettings as any)?.headshotDirectory && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>Directory configured - headshots will display on boards automatically</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (headshotDir) {
                  saveHeadshotDirMutation.mutate({ headshotDirectory: headshotDir });
                }
              }}
              disabled={!headshotDir || saveHeadshotDirMutation.isPending || (!hasHeadshotDirChanges && !!(ingestionSettings as any)?.headshotDirectory)}
              data-testid="button-save-headshot-dir"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveHeadshotDirMutation.isPending ? "Saving..." : "Save Directory"}
            </Button>

            {(ingestionSettings as any)?.headshotDirectory && (
              <Button
                variant="outline"
                onClick={() => {
                  saveHeadshotDirMutation.mutate({ headshotDirectory: '' });
                  setHeadshotDir('');
                }}
                data-testid="button-clear-headshot-dir"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
            {(ingestionSettings as any)?.headshotDirectory && (
              <Button
                variant="secondary"
                onClick={() => {
                  window.open(`/control/${meetId}/headshots`, '_blank');
                }}
                data-testid="button-manage-headshots"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Headshots
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                window.open(`/control/${meetId}/logos`, '_blank');
              }}
              data-testid="button-manage-logos"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Team Logos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import for Season/Personal Bests */}
      <Card data-testid="card-csv-import">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Season / Personal Bests (CSV Import)
          </CardTitle>
          <CardDescription>
            Import athlete season bests (SB) and personal bests (PB) from a CSV file. The CSV should have columns: Event, Gender, Last Name, First Name, School, SB, pb
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCsvFile(file);
                    setCsvImportResult(null);
                  }
                }}
                className="flex-1"
                data-testid="input-csv-file"
              />
            </div>
            {csvFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <Button
            onClick={() => csvFile && importCsvMutation.mutate(csvFile)}
            disabled={!csvFile || importCsvMutation.isPending}
            data-testid="button-import-csv"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importCsvMutation.isPending ? "Importing..." : "Import Bests"}
          </Button>

          {csvImportResult && (
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span className="font-medium">Import Results:</span>
              </div>
              <div className="text-sm space-y-1 ml-6">
                <p>Total rows: {csvImportResult.totalRows}</p>
                <p className="text-green-600">Bests imported: {csvImportResult.imported}</p>
                <p className="text-yellow-600">Skipped (no SB/PB data): {csvImportResult.skipped}</p>
                <p className="text-orange-600">Unmatched athletes: {csvImportResult.unmatched}</p>
                {csvImportResult.unmatchedNames.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-muted-foreground">Show unmatched names</summary>
                    <ul className="mt-1 list-disc list-inside text-xs text-muted-foreground">
                      {csvImportResult.unmatchedNames.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ScoringConfigSection meetId={meetId!} />

      <RecordBooksSection />

      <ResetMeetSection meetId={meetId!} />

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

// ============= SCORING CONFIGURATION =============

type ScoringLevel = {
  gender: string;
  indPoints: number[];
  relPoints: number[];
};

function ScoringConfigSection({ meetId }: { meetId: string }) {
  const { toast } = useToast();
  const [newGender, setNewGender] = useState('');
  const [newIndPoints, setNewIndPoints] = useState('10,8,6,5,4,3,2,1');
  const [newRelPoints, setNewRelPoints] = useState('10,8,6,5,4,3,2,1');
  const [newIndMax, setNewIndMax] = useState('999');
  const [newRelMax, setNewRelMax] = useState('999');

  const { data: scoringData, isLoading } = useQuery({
    queryKey: ['/api/meets', meetId, 'scoring-rules'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/meets/${meetId}/scoring-rules`);
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { gender: string; indPoints: string; relPoints: string; indMaxScorers: string; relMaxScorers: string }) => {
      const res = await apiRequest('PUT', `/api/meets/${meetId}/scoring-rules`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meets', meetId, 'scoring-rules'] });
      toast({ title: 'Scoring rules saved' });
      setNewGender('');
    },
    onError: (err: any) => {
      toast({ title: 'Error saving scoring rules', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (gender: string) => {
      const res = await apiRequest('DELETE', `/api/meets/${meetId}/scoring-rules/${gender}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meets', meetId, 'scoring-rules'] });
      toast({ title: 'Scoring level removed' });
    },
    onError: (err: any) => {
      toast({ title: 'Error removing scoring level', description: err.message, variant: 'destructive' });
    },
  });

  const handleAddLevel = () => {
    if (!newGender.trim()) {
      toast({ title: 'Please enter a level (e.g., CM, CW, HSB, HSG)', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({
      gender: newGender.trim().toUpperCase(),
      indPoints: newIndPoints,
      relPoints: newRelPoints,
      indMaxScorers: newIndMax,
      relMaxScorers: newRelMax,
    });
  };

  const levels: ScoringLevel[] = scoringData?.levels || [];

  const LEVEL_LABELS: Record<string, string> = {
    CM: 'College Men',
    CW: 'College Women',
    HSB: 'High School Boys',
    HSG: 'High School Girls',
    M: 'Men',
    W: 'Women',
    F: 'Women',
  };

  return (
    <Card data-testid="card-scoring-config">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Scoring Configuration
        </CardTitle>
        <CardDescription>
          Set scoring points per place for each level. Enter as comma-separated list (e.g., 10,8,6,5,4,3,2,1). Enter 999 for max scorers if there is no limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing levels */}
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : levels.length > 0 ? (
          <div className="space-y-3">
            {levels.map((level) => (
              <div key={level.gender} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm">
                      {level.gender}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {LEVEL_LABELS[level.gender] || level.gender}
                    </span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {level.gender} scoring?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the scoring rules for {LEVEL_LABELS[level.gender] || level.gender}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(level.gender)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Individual:</span>{' '}
                    <span className="font-mono">{level.indPoints.join(',')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relay:</span>{' '}
                    <span className="font-mono">{level.relPoints.join(',')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No scoring rules configured. Add a level below.</p>
        )}

        {/* Max scorers display */}
        {scoringData && (scoringData.indMaxScorers > 0 || scoringData.relMaxScorers > 0) && (
          <div className="text-sm text-muted-foreground border-t pt-3">
            Max Scorers Per Team: Individual = {scoringData.indMaxScorers || 'unlimited'}, Relay = {scoringData.relMaxScorers || 'unlimited'}
          </div>
        )}

        {/* Add new level */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="text-sm font-medium">Add / Update Level</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="scoring-level">Level</Label>
              <Input
                id="scoring-level"
                placeholder="e.g., CM, CW, HSB, HSG"
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scoring-ind">Individual Points</Label>
              <Input
                id="scoring-ind"
                placeholder="10,8,6,5,4,3,2,1"
                value={newIndPoints}
                onChange={(e) => setNewIndPoints(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scoring-rel">Relay Points</Label>
              <Input
                id="scoring-rel"
                placeholder="10,8,6,5,4,3,2,1"
                value={newRelPoints}
                onChange={(e) => setNewRelPoints(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="scoring-ind-max">Ind. Max Scorers</Label>
                <Input
                  id="scoring-ind-max"
                  type="number"
                  placeholder="999"
                  value={newIndMax}
                  onChange={(e) => setNewIndMax(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="scoring-rel-max">Relay Max Scorers</Label>
                <Input
                  id="scoring-rel-max"
                  type="number"
                  placeholder="999"
                  value={newRelMax}
                  onChange={(e) => setNewRelMax(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Button 
            onClick={handleAddLevel}
            disabled={saveMutation.isPending || !newGender.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Level'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============= RECORD BOOKS MANAGEMENT =============

type RecordBookRecord = {
  id: number;
  eventType: string;
  gender: string;
  performance: string;
  athleteName: string;
  team: string | null;
  date: string | null;
  notes: string | null;
};

type RecordBookWithRecords = {
  id: number;
  name: string;
  description: string | null;
  scope: string;
  isActive: boolean;
  displayOrder: number;
  allowMultiple: boolean;
  records: RecordBookRecord[];
};

const SCOPE_OPTIONS = [
  { value: 'meet', label: 'Meet Record', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'facility', label: 'Facility Record', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'national', label: 'National Record', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'international', label: 'International Record', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300' },
];

function RecordBooksSection() {
  const { toast } = useToast();
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());
  const [editingBook, setEditingBook] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editPriority, setEditPriority] = useState(99);
  const [editAllowMultiple, setEditAllowMultiple] = useState(false);

  const { data: recordBooks = [], isLoading } = useQuery<RecordBookWithRecords[]>({
    queryKey: ['/api/record-books', 'all'],
    queryFn: () => fetch('/api/record-books?all=true').then(r => r.json()),
  });

  const updateBookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { name?: string; scope?: string; isActive?: boolean; displayOrder?: number; allowMultiple?: boolean } }) => {
      const res = await fetch(`/api/record-books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/record-books'] });
      queryClient.invalidateQueries({ queryKey: ['/api/records/all'] });
      toast({ title: 'Record book updated' });
      setEditingBook(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update record book', description: error.message, variant: 'destructive' });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/record-books/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/record-books'] });
      queryClient.invalidateQueries({ queryKey: ['/api/records/all'] });
      toast({ title: 'Record book deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete record book', description: error.message, variant: 'destructive' });
    },
  });

  const toggleExpand = (bookId: number) => {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const startEdit = (book: RecordBookWithRecords) => {
    setEditingBook(book.id);
    setEditName(book.name);
    setEditScope(book.scope);
    setEditPriority(book.displayOrder ?? 99);
    setEditAllowMultiple((book as any).allowMultiple ?? false);
  };

  const saveEdit = (bookId: number) => {
    updateBookMutation.mutate({ id: bookId, updates: { name: editName, scope: editScope, displayOrder: editPriority, allowMultiple: editAllowMultiple } });
  };

  const getScopeInfo = (scope: string) => {
    return SCOPE_OPTIONS.find(s => s.value === scope) || SCOPE_OPTIONS[4]; // default to custom
  };

  const totalRecords = recordBooks.reduce((sum, book) => sum + book.records.length, 0);

  return (
    <Card data-testid="card-record-books">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="w-5 h-5" />
          Record Books
        </CardTitle>
        <CardDescription>
          Records imported from HyTek MDB. Edit names and types for unknown tags, toggle visibility on schedule.
          {totalRecords > 0 && (
            <span className="ml-1 font-medium">
              ({recordBooks.length} book{recordBooks.length !== 1 ? 's' : ''}, {totalRecords} record{totalRecords !== 1 ? 's' : ''})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recordBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No record books found. Records will appear here after importing a HyTek MDB database that contains records.
          </p>
        ) : (
          recordBooks.map((book) => {
            const scopeInfo = getScopeInfo(book.scope);
            const isExpanded = expandedBooks.has(book.id);
            const isEditing = editingBook === book.id;
            const isUnknown = book.scope === 'custom' && book.name.startsWith('Record Book (Tag');

            return (
              <div
                key={book.id}
                className={cn(
                  'rounded-lg border',
                  !book.isActive && 'opacity-60',
                  isUnknown && 'border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/10',
                )}
              >
                {/* Book header */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    onClick={() => toggleExpand(book.id)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-48 h-8 text-sm"
                        placeholder="Book name"
                      />
                      <Select value={editScope} onValueChange={setEditScope}>
                        <SelectTrigger className="w-44 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCOPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Priority:</span>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={editPriority}
                          onChange={(e) => setEditPriority(Number(e.target.value))}
                          className="w-16 h-8 text-sm text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={editAllowMultiple}
                          onCheckedChange={setEditAllowMultiple}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {editAllowMultiple ? 'All breakers tagged' : 'Only winner tagged'}
                        </span>
                      </div>
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => saveEdit(book.id)} disabled={updateBookMutation.isPending}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingBook(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{book.name}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', scopeInfo.color)}>
                        {scopeInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        Priority: {book.displayOrder ?? 99}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', (book as any).allowMultiple ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : '')}>
                        {(book as any).allowMultiple ? 'All breakers' : 'Winner only'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({book.records.length} record{book.records.length !== 1 ? 's' : ''})
                      </span>
                      {isUnknown && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-400/50">
                          Unknown Tag — Click Edit to Map
                        </Badge>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => startEdit(book)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit name & type</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={book.isActive}
                                onCheckedChange={(checked) => {
                                  updateBookMutation.mutate({ id: book.id, updates: { isActive: checked } });
                                }}
                                className="scale-75"
                              />
                              {book.isActive ? <Eye className="w-3.5 h-3.5 text-green-600" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{book.isActive ? 'Visible on schedule' : 'Hidden from schedule'}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{book.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this record book and all {book.records.length} record{book.records.length !== 1 ? 's' : ''} in it.
                              Records will be re-imported on the next MDB update.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBookMutation.mutate(book.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {/* Expanded records table */}
                {isExpanded && book.records.length > 0 && (
                  <div className="border-t px-3 pb-3">
                    <table className="w-full text-xs mt-2">
                      <thead>
                        <tr className="text-muted-foreground border-b">
                          <th className="text-left py-1 pr-2 font-medium">Event</th>
                          <th className="text-left py-1 pr-2 font-medium">Gender</th>
                          <th className="text-left py-1 pr-2 font-medium">Performance</th>
                          <th className="text-left py-1 pr-2 font-medium">Athlete</th>
                          <th className="text-left py-1 pr-2 font-medium">Team</th>
                          <th className="text-left py-1 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {book.records.map((rec) => (
                          <tr key={rec.id} className="border-b border-muted/50 last:border-0">
                            <td className="py-1.5 pr-2 font-mono">{rec.eventType}</td>
                            <td className="py-1.5 pr-2">{rec.gender}</td>
                            <td className="py-1.5 pr-2 font-mono font-medium">{rec.performance}</td>
                            <td className="py-1.5 pr-2">{rec.athleteName}</td>
                            <td className="py-1.5 pr-2 text-muted-foreground">{rec.team || '—'}</td>
                            <td className="py-1.5 text-muted-foreground">
                              {rec.date ? new Date(rec.date).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && book.records.length === 0 && (
                  <div className="border-t px-3 py-3 text-xs text-muted-foreground text-center">
                    No records in this book
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function ResetMeetSection({ meetId }: { meetId: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meets/${meetId}/reset`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Meet Reset",
        description: (
          <div className="text-sm space-y-1">
            <div>Deleted {data.eventsDeleted} events</div>
            <div>Deleted {data.athletesDeleted} athletes</div>
            <div>Deleted {data.teamsDeleted} teams</div>
            <div>Deleted {data.divisionsDeleted} divisions</div>
          </div>
        ),
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset meet data",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-destructive/30" data-testid="card-reset-meet">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Reset Meet
        </CardTitle>
        <CardDescription>
          Clear all imported data so you can re-import fresh from the MDB
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 p-4 rounded-md border border-destructive/30 bg-destructive/5">
          <div className="space-y-1">
            <div className="font-medium">Reset Meet Data</div>
            <p className="text-sm text-muted-foreground">
              Deletes all events, athletes, teams, entries, results, and divisions. The meet itself and its settings will be kept.
            </p>
          </div>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-reset-meet">
                <Trash2 className="w-4 h-4 mr-2" />
                Reset Meet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Are you sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>This will permanently delete all data for this meet:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All events and entries</li>
                    <li>All athletes and athlete photos</li>
                    <li>All teams and team logos</li>
                    <li>All results and scoring data</li>
                    <li>All divisions</li>
                  </ul>
                  <p className="font-medium">The meet settings and configuration will be preserved so you can re-import.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-reset"
                >
                  {resetMutation.isPending ? "Resetting..." : "Yes, Reset Meet"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
