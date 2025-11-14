import { useState, useRef, useEffect } from "react";
import { Athlete } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

interface AthleteDetailDialogProps {
  athlete: Athlete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PhotoData {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

export function AthleteDetailDialog({ athlete, open, onOpenChange }: AthleteDetailDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  // Fetch athlete photo when dialog opens
  useEffect(() => {
    if (athlete && open) {
      fetchAthletePhoto();
    } else {
      setPhotoData(null);
    }
  }, [athlete?.id, open]);

  const fetchAthletePhoto = async () => {
    if (!athlete) return;
    
    setLoadingPhoto(true);
    try {
      const response = await fetch(`/api/athletes/${athlete.id}/photo`);
      if (response.ok) {
        const data = await response.json();
        setPhotoData(data);
      } else if (response.status === 404) {
        setPhotoData(null);
      }
    } catch (error) {
      console.error("Error fetching photo:", error);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!athlete) return;

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
        description: "Photo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch(`/api/athletes/${athlete.id}/photo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setPhotoData(data);
      
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Photo uploaded successfully",
        description: `${data.width}×${data.height}px, ${formatFileSize(data.byteSize)}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!athlete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/athletes/${athlete.id}/photo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setPhotoData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Photo deleted",
        description: "Athlete photo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete photo",
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

  if (!athlete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-athlete-detail">
        <DialogHeader>
          <DialogTitle data-testid="text-athlete-detail-title">
            {athlete.firstName} {athlete.lastName}
          </DialogTitle>
          <DialogDescription>
            Manage athlete information and photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Athlete Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Athlete Number</p>
              <p className="font-medium" data-testid="text-athlete-number">
                {athlete.athleteNumber}
              </p>
            </div>
            {athlete.bibNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Bib Number</p>
                <Badge variant="outline" data-testid="badge-bib-number">
                  #{athlete.bibNumber}
                </Badge>
              </div>
            )}
            {athlete.gender && (
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium" data-testid="text-gender">
                  {athlete.gender}
                </p>
              </div>
            )}
          </div>

          {/* Photo Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Athlete Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo Preview */}
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  {loadingPhoto ? (
                    <div className="h-32 w-32 rounded-md border flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Avatar className="h-32 w-32" data-testid="avatar-athlete-photo">
                      <AvatarImage 
                        src={photoData?.url} 
                        alt={`${athlete.firstName} ${athlete.lastName}`} 
                      />
                      <AvatarFallback className="text-3xl">
                        {athlete.firstName.charAt(0)}{athlete.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {photoData && (
                    <div className="text-center text-sm text-muted-foreground" data-testid="text-photo-metadata">
                      <p>{photoData.width} × {photoData.height}px</p>
                      <p>{formatFileSize(photoData.byteSize)}</p>
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
                    data-testid="input-photo-file"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || deleting}
                    className="w-full gap-2"
                    data-testid="button-upload-photo"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {photoData ? 'Replace Photo' : 'Upload Photo'}
                      </>
                    )}
                  </Button>

                  {photoData && (
                    <Button
                      variant="outline"
                      onClick={handlePhotoDelete}
                      disabled={uploading || deleting}
                      className="w-full gap-2"
                      data-testid="button-delete-photo"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete Photo
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
