import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Settings, Image, X, Save, MapPin, Calendar as CalendarIcon } from "lucide-react";
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

  useState(() => {
    if (meet) {
      setName(meet.name);
      setLocation(meet.location || "");
      setStartDate(new Date(meet.startDate));
    }
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId] });
      toast({ title: "Logo uploaded successfully" });
      setSelectedFile(null);
      setPreviewUrl(null);
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
