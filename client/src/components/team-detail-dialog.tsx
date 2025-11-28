import { useState, useRef, useEffect } from "react";
import { Team } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

interface TeamDetailDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LogoData {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

export function TeamDetailDialog({ team, open, onOpenChange }: TeamDetailDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoData, setLogoData] = useState<LogoData | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);

  // Fetch team logo when dialog opens
  useEffect(() => {
    if (team && open) {
      fetchTeamLogo();
    } else {
      setLogoData(null);
    }
  }, [team?.id, open]);

  const fetchTeamLogo = async () => {
    if (!team) return;
    
    setLoadingLogo(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/logo`);
      if (response.ok) {
        const data = await response.json();
        setLogoData(data);
      } else if (response.status === 404) {
        setLogoData(null);
      }
    } catch (error) {
      console.error("Error fetching logo:", error);
    } finally {
      setLoadingLogo(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!team) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, and GIF images are allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Logo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch(`/api/teams/${team.id}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setLogoData(data);
      
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Logo uploaded successfully",
        description: `${data.width}×${data.height}px, ${formatFileSize(data.byteSize)}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!team) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setLogoData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Logo deleted",
        description: "Team logo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete logo",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-team-detail">
        <DialogHeader>
          <DialogTitle data-testid="text-team-detail-title">
            {team.name}
          </DialogTitle>
          <DialogDescription>
            Manage team information and logo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Info */}
          <div className="grid grid-cols-2 gap-4">
            {team.abbreviation && (
              <div>
                <p className="text-sm text-muted-foreground">Abbreviation</p>
                <p className="font-medium" data-testid="text-abbreviation">
                  {team.abbreviation}
                </p>
              </div>
            )}
            {team.shortName && (
              <div>
                <p className="text-sm text-muted-foreground">Short Name</p>
                <p className="font-medium" data-testid="text-short-name">
                  {team.shortName}
                </p>
              </div>
            )}
          </div>

          {/* Logo Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Team Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Preview */}
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  {loadingLogo ? (
                    <div className="h-32 w-32 rounded-md border flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Avatar className="h-32 w-32" data-testid="avatar-team-logo">
                      <AvatarImage 
                        src={logoData?.url} 
                        alt={team.name} 
                      />
                      <AvatarFallback className="text-3xl">
                        {team.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {logoData && (
                    <div className="text-center text-sm text-muted-foreground" data-testid="text-logo-metadata">
                      <p>{logoData.width} × {logoData.height}px</p>
                      <p>{formatFileSize(logoData.byteSize)}</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileSelect}
                    disabled={uploading || deleting}
                    className="hidden"
                    data-testid="input-logo-file"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || deleting}
                    className="w-full gap-2"
                    data-testid="button-upload-logo"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {logoData ? 'Replace Logo' : 'Upload Logo'}
                      </>
                    )}
                  </Button>

                  {logoData && (
                    <Button
                      variant="outline"
                      onClick={handleLogoDelete}
                      disabled={uploading || deleting}
                      className="w-full gap-2"
                      data-testid="button-delete-logo"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete Logo
                        </>
                      )}
                    </Button>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <p>• Accepted formats: JPEG, PNG, GIF</p>
                    <p>• Maximum size: 5MB</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
