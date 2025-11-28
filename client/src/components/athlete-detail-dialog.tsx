import { useState, useRef, useEffect, useMemo } from "react";
import { Athlete, Event } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, Trash2, Image as ImageIcon, Loader2, Calendar, Trophy, Clock, CheckCircle2, XCircle, AlertCircle, ArrowUpDown } from "lucide-react";

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

interface AthleteEventEntry {
  event: Event;
  entry: {
    id: string;
    seedMark: number | null;
    finalMark: number | null;
    finalPlace: number | null;
    isScratched: boolean | null;
    isDisqualified: boolean | null;
    checkInStatus: string | null;
    heat: number | null;
    lane: number | null;
  };
}

// Track events use lanes, field events use flights
const TRACK_EVENT_TYPES = ['sprint', 'distance', 'hurdles', 'relay', 'steeplechase', 'race_walk'];

const isTrackEvent = (eventType: string): boolean => {
  return TRACK_EVENT_TYPES.some(t => eventType.toLowerCase().includes(t));
};

type EventSortOption = 'number' | 'time' | 'name';

export function AthleteDetailDialog({ athlete, open, onOpenChange }: AthleteDetailDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [events, setEvents] = useState<AthleteEventEntry[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventSort, setEventSort] = useState<EventSortOption>('time');

  // Sort events based on selected option
  const sortedEvents = useMemo(() => {
    if (!events.length) return events;
    
    return [...events].sort((a, b) => {
      switch (eventSort) {
        case 'number':
          return (a.event.eventNumber || 0) - (b.event.eventNumber || 0);
        case 'time':
          // Sort by date first, then by time string
          const dateA = a.event.eventDate ? new Date(a.event.eventDate).getTime() : Infinity;
          const dateB = b.event.eventDate ? new Date(b.event.eventDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          // Parse time strings like "2:30 PM" or "14:30"
          const timeA = a.event.eventTime || '';
          const timeB = b.event.eventTime || '';
          return timeA.localeCompare(timeB);
        case 'name':
          return (a.event.name || '').localeCompare(b.event.name || '');
        default:
          return 0;
      }
    });
  }, [events, eventSort]);

  // Fetch athlete photo and events when dialog opens
  useEffect(() => {
    if (athlete && open) {
      fetchAthletePhoto();
      fetchAthleteEvents();
    } else {
      setPhotoData(null);
      setEvents([]);
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

  const fetchAthleteEvents = async () => {
    if (!athlete) return;
    
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/athletes/${athlete.id}/events`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const formatMark = (mark: number | null, eventType: string): string => {
    if (mark === null) return "-";
    
    // Time events (track) - format as time
    const timeEvents = ['sprint', 'distance', 'hurdles', 'relay', 'steeplechase', 'race_walk'];
    if (timeEvents.some(t => eventType.toLowerCase().includes(t))) {
      const minutes = Math.floor(mark / 60);
      const seconds = (mark % 60).toFixed(2);
      if (minutes > 0) {
        return `${minutes}:${seconds.padStart(5, '0')}`;
      }
      return seconds;
    }
    
    // Field events - format as distance/height
    return `${mark.toFixed(2)}m`;
  };

  const getStatusBadge = (entry: AthleteEventEntry['entry'], eventStatus: string) => {
    if (entry.isDisqualified) {
      return <Badge variant="destructive" className="text-xs">DQ</Badge>;
    }
    if (entry.isScratched) {
      return <Badge variant="secondary" className="text-xs">Scratched</Badge>;
    }
    if (entry.finalPlace !== null && entry.finalPlace !== undefined) {
      return (
        <Badge variant="default" className="text-xs">
          {entry.finalPlace}{getOrdinalSuffix(entry.finalPlace)}
        </Badge>
      );
    }
    if (eventStatus === 'in_progress') {
      return <Badge variant="outline" className="text-xs">In Progress</Badge>;
    }
    if (entry.checkInStatus === 'checked_in') {
      return <Badge variant="outline" className="text-xs text-green-600">Checked In</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Scheduled</Badge>;
  };

  const getOrdinalSuffix = (n: number): string => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
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

          {/* Events Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Events ({events.length})
              </CardTitle>
              {events.length > 1 && (
                <Select value={eventSort} onValueChange={(v) => setEventSort(v as EventSortOption)}>
                  <SelectTrigger className="w-[140px]" data-testid="select-event-sort">
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">By Time</SelectItem>
                    <SelectItem value="number">By Event #</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No events assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedEvents.map(({ event, entry }) => {
                    const trackEvent = isTrackEvent(event.eventType);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`row-athlete-event-${event.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                              #{event.eventNumber}
                            </Badge>
                            <span className="font-medium truncate" data-testid={`text-event-name-${event.id}`}>
                              {event.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            {/* Event time */}
                            {event.eventTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.eventTime}
                              </span>
                            )}
                            {/* Heat/Flight and Lane/Position */}
                            {entry.heat !== null && (
                              <span>
                                {trackEvent ? 'Heat' : 'Flight'} {entry.heat}
                              </span>
                            )}
                            {entry.lane !== null && (
                              <span>
                                {trackEvent ? 'Lane' : 'Position'} {entry.lane}
                              </span>
                            )}
                            {/* Seed mark */}
                            {entry.seedMark !== null && (
                              <span>
                                Seed: {formatMark(entry.seedMark, event.eventType)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {entry.finalMark !== null && (
                            <span className="text-sm font-medium" data-testid={`text-result-${event.id}`}>
                              {formatMark(entry.finalMark, event.eventType)}
                            </span>
                          )}
                          {getStatusBadge(entry, event.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
