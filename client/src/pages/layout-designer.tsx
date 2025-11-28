import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SelectCompositeLayout, SelectLayoutZone, InsertCompositeLayout, InsertLayoutZone, Event } from "@shared/schema";
import { BOARD_TYPES, BINDING_TYPES, STYLE_PRESETS, CARD_SIZES, TIMER_MODES, LANE_SIZES, FONT_SIZES, GENERAL_SIZES, ALL_ZONE_SIZES } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Save, Trash2, Edit, Layout, Eye, Loader2 } from "lucide-react";

// Helper function to convert kebab-case enum values to readable labels
function makeOptions(values: readonly string[]) {
  return values.map(v => ({
    value: v,
    label: v.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }));
}

// Derive UI options from imported enums (single source of truth)
const BOARD_TYPE_OPTIONS = makeOptions(BOARD_TYPES);
const STYLE_PRESET_OPTIONS = makeOptions(STYLE_PRESETS);
const CARD_SIZE_OPTIONS = makeOptions(CARD_SIZES);
const TIMER_MODE_OPTIONS = makeOptions(TIMER_MODES);
const BINDING_TYPE_OPTIONS = makeOptions(BINDING_TYPES);
const FONT_SIZE_OPTIONS = makeOptions(FONT_SIZES);
const SIZE_OPTIONS = makeOptions(ALL_ZONE_SIZES);

// Create layout form schema
const createLayoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  aspectRatio: z.string().default('16:9'),
  baseTheme: z.string().default('stadium'),
});

// Zone form schema with all board config fields - using imported enums from shared schema
const zoneFormSchema = z.object({
  order: z.number().min(0).default(0),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(1).max(100),
  heightPercent: z.number().min(1).max(100),
  boardType: z.enum(BOARD_TYPES),
  stylePreset: z.enum(STYLE_PRESETS).default('none'),
  
  // Data binding fields
  dataBindingType: z.enum(BINDING_TYPES),
  eventId: z.string().optional(),
  staticContent: z.string().default(''),
  heatNumber: z.number().optional(),
  limit: z.number().optional(),
  
  // Board config fields with defaults - form validation ensures these exist when needed
  cardSize: z.enum(CARD_SIZES).default('medium'),
  columns: z.number().min(1).max(6).default(3),
  timerMode: z.enum(TIMER_MODES).default('countdown'),
  size: z.enum(ALL_ZONE_SIZES).default('medium'),
  showMillis: z.boolean().default(false),
  showMarks: z.boolean().default(true),
  totalLanes: z.number().min(4).max(10).default(8),
  showProgress: z.boolean().default(true),
  showTimes: z.boolean().default(true),
  maxRows: z.number().min(5).max(20).default(10),
  showPhotos: z.boolean().default(true),
  fontSize: z.enum(FONT_SIZES).default('medium'),
  height: z.number().default(100),
});

type ZoneFormData = z.infer<typeof zoneFormSchema>;

// Helper function to build zone payload from form data - strongly typed
function buildZonePayload(formData: ZoneFormData, layoutId: number): InsertLayoutZone {
  // Build dataBinding - using discriminated union type from InsertLayoutZone
  let dataBinding: InsertLayoutZone['dataBinding'];
  
  if (formData.dataBindingType === 'event') {
    dataBinding = {
      type: 'event',
      eventId: formData.eventId || '',
      heatNumber: formData.heatNumber,
      limit: formData.limit,
    };
  } else if (formData.dataBindingType === 'current-event') {
    dataBinding = { type: 'current-event' };
  } else if (formData.dataBindingType === 'standings') {
    dataBinding = {
      type: 'standings',
      eventId: formData.eventId,
      limit: formData.limit,
    };
  } else {
    // 'static'
    dataBinding = {
      type: 'static',
      content: formData.staticContent,
    };
  }

  // Build boardConfig - using discriminated union type from InsertLayoutZone
  let boardConfig: InsertLayoutZone['boardConfig'];
  
  if (formData.boardType === 'athlete-card-grid') {
    boardConfig = {
      boardType: 'athlete-card-grid',
      cardSize: formData.cardSize,
      columns: formData.columns,
    };
  } else if (formData.boardType === 'athlete-card-single') {
    boardConfig = {
      boardType: 'athlete-card-single',
      cardSize: formData.cardSize,
    };
  } else if (formData.boardType === 'attempt-tracker') {
    boardConfig = {
      boardType: 'attempt-tracker',
      size: formData.size as 'small' | 'medium' | 'large',
      showMarks: formData.showMarks,
    };
  } else if (formData.boardType === 'live-timer') {
    boardConfig = {
      boardType: 'live-timer',
      mode: formData.timerMode,
      size: formData.size as 'small' | 'medium' | 'large',
      showMillis: formData.showMillis,
    };
  } else if (formData.boardType === 'lane-visualization') {
    boardConfig = {
      boardType: 'lane-visualization',
      size: formData.size as 'compact' | 'standard' | 'expanded',
      totalLanes: formData.totalLanes,
      showProgress: formData.showProgress,
      showTimes: formData.showTimes,
    };
  } else if (formData.boardType === 'standings-table') {
    boardConfig = {
      boardType: 'standings-table',
      maxRows: formData.maxRows,
      showPhotos: formData.showPhotos,
    };
  } else if (formData.boardType === 'event-info') {
    boardConfig = {
      boardType: 'event-info',
      fontSize: formData.fontSize,
    };
  } else {
    // 'logo-banner'
    boardConfig = {
      boardType: 'logo-banner',
      height: formData.height,
    };
  }

  // Return properly typed payload - trust form validation for defaults
  return {
    layoutId,
    order: formData.order,
    xPercent: formData.xPercent,
    yPercent: formData.yPercent,
    widthPercent: formData.widthPercent,
    heightPercent: formData.heightPercent,
    boardType: formData.boardType,
    dataBinding,
    boardConfig,
    stylePreset: formData.stylePreset,
  };
}

export default function LayoutDesigner() {
  const { toast } = useToast();
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [createLayoutOpen, setCreateLayoutOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(false);

  // Fetch all layouts
  const { data: layouts = [] } = useQuery<SelectCompositeLayout[]>({
    queryKey: ['/api/layouts'],
  });

  // Fetch selected layout with zones
  const { data: layoutWithZones, isLoading: loadingLayout } = useQuery<SelectCompositeLayout & { zones: SelectLayoutZone[] }>({
    queryKey: ['/api/layouts', selectedLayoutId, 'with-zones'],
    enabled: selectedLayoutId !== null,
  });

  // Fetch events for data binding
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  // Create layout form
  const createLayoutForm = useForm({
    resolver: zodResolver(createLayoutSchema),
    defaultValues: {
      name: '',
      description: '',
      aspectRatio: '16:9',
      baseTheme: 'stadium',
    },
  });

  // Zone form
  const zoneForm = useForm<ZoneFormData>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      order: 0,
      xPercent: 10,
      yPercent: 10,
      widthPercent: 30,
      heightPercent: 30,
      boardType: 'athlete-card-grid',
      stylePreset: 'none',
      dataBindingType: 'current-event',
      // Board config defaults
      cardSize: 'medium',
      columns: 3,
      timerMode: 'countdown',
      size: 'medium',
      showMillis: false,
      showMarks: true,
      totalLanes: 8,
      showProgress: true,
      showTimes: true,
      maxRows: 10,
      showPhotos: true,
      fontSize: 'medium',
      height: 100,
    },
  });

  // Create layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createLayoutSchema>) => {
      const response = await apiRequest('POST', '/api/layouts', data);
      return await response.json();
    },
    onSuccess: (newLayout) => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      setSelectedLayoutId(newLayout.id);
      setCreateLayoutOpen(false);
      createLayoutForm.reset();
      toast({
        title: "Layout created",
        description: "Your new layout has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating layout",
        description: error.message || "Failed to create layout.",
        variant: "destructive",
      });
    },
  });

  // Delete layout mutation
  const deleteLayoutMutation = useMutation({
    mutationFn: async (layoutId: number) => {
      await apiRequest('DELETE', `/api/layouts/${layoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      setSelectedLayoutId(null);
      toast({
        title: "Layout deleted",
        description: "The layout has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting layout",
        description: error.message || "Failed to delete layout.",
        variant: "destructive",
      });
    },
  });

  // Create zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (formData: ZoneFormData) => {
      if (!selectedLayoutId) throw new Error("No layout selected");
      const payload = buildZonePayload(formData, selectedLayoutId);
      const response = await apiRequest('POST', '/api/zones', payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts', selectedLayoutId, 'with-zones'] });
      setZoneDialogOpen(false);
      zoneForm.reset();
      toast({
        title: "Zone created",
        description: "The zone has been added to the layout.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating zone",
        description: error.message || "Failed to create zone.",
        variant: "destructive",
      });
    },
  });

  // Update zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: async ({ zoneId, data }: { zoneId: number; data: ZoneFormData }) => {
      if (!selectedLayoutId) throw new Error("No layout selected");
      const payload = buildZonePayload(data, selectedLayoutId);
      const response = await apiRequest('PATCH', `/api/zones/${zoneId}`, payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts', selectedLayoutId, 'with-zones'] });
      setZoneDialogOpen(false);
      setEditingZone(false);
      setSelectedZoneId(null);
      zoneForm.reset();
      toast({
        title: "Zone updated",
        description: "The zone has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating zone",
        description: error.message || "Failed to update zone.",
        variant: "destructive",
      });
    },
  });

  // Delete zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: number) => {
      await apiRequest('DELETE', `/api/zones/${zoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts', selectedLayoutId, 'with-zones'] });
      toast({
        title: "Zone deleted",
        description: "The zone has been removed from the layout.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting zone",
        description: error.message || "Failed to delete zone.",
        variant: "destructive",
      });
    },
  });

  // Handle creating new zone
  const handleCreateZone = () => {
    zoneForm.reset({
      order: layoutWithZones?.zones.length || 0,
      xPercent: 10,
      yPercent: 10,
      widthPercent: 30,
      heightPercent: 30,
      boardType: 'athlete-card-grid',
      stylePreset: 'none',
      dataBindingType: 'current-event',
    });
    setEditingZone(false);
    setSelectedZoneId(null);
    setZoneDialogOpen(true);
  };

  // Handle editing existing zone
  const handleEditZone = (zone: SelectLayoutZone) => {
    const binding = zone.dataBinding as any;
    const config = zone.boardConfig as any;
    
    zoneForm.reset({
      order: zone.order,
      xPercent: zone.xPercent,
      yPercent: zone.yPercent,
      widthPercent: zone.widthPercent,
      heightPercent: zone.heightPercent,
      boardType: zone.boardType,
      stylePreset: (zone.stylePreset || 'none') as typeof STYLE_PRESETS[number],
      
      // Data binding fields
      dataBindingType: binding?.type,
      eventId: binding?.eventId,
      staticContent: binding?.content,
      heatNumber: binding?.heatNumber,
      limit: binding?.limit,
      
      // Board config fields - trust database values, form defaults will apply if missing
      cardSize: config?.cardSize,
      columns: config?.columns,
      timerMode: config?.mode,
      size: config?.size,
      showMillis: config?.showMillis,
      showMarks: config?.showMarks,
      totalLanes: config?.totalLanes,
      showProgress: config?.showProgress,
      showTimes: config?.showTimes,
      maxRows: config?.maxRows,
      showPhotos: config?.showPhotos,
      fontSize: config?.fontSize,
      height: config?.height,
    });
    setEditingZone(true);
    setSelectedZoneId(zone.id);
    setZoneDialogOpen(true);
  };

  // Submit zone form
  const onZoneSubmit = (data: ZoneFormData) => {
    if (editingZone && selectedZoneId) {
      updateZoneMutation.mutate({ zoneId: selectedZoneId, data });
    } else {
      createZoneMutation.mutate(data);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Layout List */}
      <div className="w-80 border-r flex flex-col overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Composite Layouts</h2>
            <Dialog open={createLayoutOpen} onOpenChange={setCreateLayoutOpen}>
              <DialogTrigger asChild>
                <Button size="icon" data-testid="button-new-layout">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Layout</DialogTitle>
                  <DialogDescription>
                    Create a new composite layout for multi-zone stadium displays
                  </DialogDescription>
                </DialogHeader>
                <Form {...createLayoutForm}>
                  <form onSubmit={createLayoutForm.handleSubmit((data) => createLayoutMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={createLayoutForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Layout Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Main Stadium Display" data-testid="input-layout-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createLayoutForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Layout description..." rows={3} data-testid="textarea-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateLayoutOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createLayoutMutation.isPending} data-testid="button-create-layout">
                        {createLayoutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Create Layout
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a layout to edit or create a new one
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {layouts.map((layout) => (
              <Card
                key={layout.id}
                className={`cursor-pointer hover-elevate active-elevate-2 ${
                  selectedLayoutId === layout.id ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedLayoutId(layout.id)}
                data-testid={`layout-${layout.id}`}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base">{layout.name}</CardTitle>
                      {layout.description && (
                        <CardDescription className="text-xs mt-1">
                          {layout.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this layout?')) {
                          deleteLayoutMutation.mutate(layout.id);
                        }
                      }}
                      data-testid={`button-delete-layout-${layout.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}

            {layouts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No layouts yet</p>
                <p className="text-xs">Create your first layout to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedLayoutId && layoutWithZones ? (
          <>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{layoutWithZones.name}</h1>
                  {layoutWithZones.description && (
                    <p className="text-muted-foreground mt-1">{layoutWithZones.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCreateZone}
                    data-testid="button-add-zone"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Zone
                  </Button>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <ScrollArea className="flex-1 p-8">
              <div className="max-w-6xl mx-auto">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="bg-muted relative"
                      style={{
                        aspectRatio: layoutWithZones.aspectRatio || '16/9',
                        minHeight: '600px',
                      }}
                      data-testid="canvas-preview"
                    >
                      {/* Zones */}
                      {layoutWithZones.zones.map((zone) => {
                        const binding = zone.dataBinding as any;
                        const event = binding?.eventId ? events.find(e => e.id === binding.eventId) : null;
                        
                        return (
                          <div
                            key={zone.id}
                            className="absolute border-2 border-primary bg-primary/10 rounded-md cursor-pointer hover-elevate transition-all group"
                            style={{
                              left: `${zone.xPercent}%`,
                              top: `${zone.yPercent}%`,
                              width: `${zone.widthPercent}%`,
                              height: `${zone.heightPercent}%`,
                            }}
                            onClick={() => handleEditZone(zone)}
                            data-testid={`zone-${zone.id}`}
                          >
                            <div className="absolute inset-0 p-3 flex flex-col justify-between">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <Badge variant="secondary" className="text-xs mb-2">
                                    {BOARD_TYPE_OPTIONS.find(bt => bt.value === zone.boardType)?.label}
                                  </Badge>
                                  {event && (
                                    <p className="text-xs font-medium truncate">
                                      {event.name}
                                    </p>
                                  )}
                                  {binding?.type === 'current-event' && (
                                    <p className="text-xs text-muted-foreground">Current Event</p>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this zone?')) {
                                      deleteZoneMutation.mutate(zone.id);
                                    }
                                  }}
                                  data-testid={`button-delete-zone-${zone.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {zone.xPercent.toFixed(0)}%, {zone.yPercent.toFixed(0)}% • 
                                {zone.widthPercent.toFixed(0)}×{zone.heightPercent.toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty state */}
                      {layoutWithZones.zones.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Layout className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No zones yet</p>
                            <p className="text-sm">Click "Add Zone" to create your first display zone</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </>
        ) : loadingLayout ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Layout className="w-20 h-20 mx-auto mb-4 opacity-20" />
              <p className="text-xl font-medium">No layout selected</p>
              <p className="text-sm">Select a layout from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>

      {/* Zone Configuration Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zone' : 'Add New Zone'}</DialogTitle>
            <DialogDescription>
              Configure the zone position, size, board type, and data binding
            </DialogDescription>
          </DialogHeader>
          <Form {...zoneForm}>
            <form onSubmit={zoneForm.handleSubmit(onZoneSubmit)} className="space-y-6">
              {/* Position and Size */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Position & Size</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={zoneForm.control}
                    name="xPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X Position (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-x-percent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={zoneForm.control}
                    name="yPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Y Position (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-y-percent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={zoneForm.control}
                    name="widthPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-width-percent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={zoneForm.control}
                    name="heightPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-height-percent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Board Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Board Configuration</h3>
                <FormField
                  control={zoneForm.control}
                  name="boardType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-board-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BOARD_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={zoneForm.control}
                  name="stylePreset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Style Preset</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-style-preset">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STYLE_PRESET_OPTIONS.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={zoneForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Z-Index (Layer Order)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-order"
                        />
                      </FormControl>
                      <FormDescription>Higher numbers appear on top</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional Board Config Fields */}
                {(zoneForm.watch('boardType') === 'athlete-card-grid' || zoneForm.watch('boardType') === 'athlete-card-single') && (
                  <>
                    <FormField
                      control={zoneForm.control}
                      name="cardSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Size</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-card-size">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CARD_SIZE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {zoneForm.watch('boardType') === 'athlete-card-grid' && (
                      <FormField
                        control={zoneForm.control}
                        name="columns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Columns</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={6}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-columns"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                {zoneForm.watch('boardType') === 'live-timer' && (
                  <>
                    <FormField
                      control={zoneForm.control}
                      name="timerMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timer Mode</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-timer-mode">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMER_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={zoneForm.control}
                      name="showMillis"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Show Milliseconds</FormLabel>
                            <FormDescription>Display milliseconds in timer</FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              data-testid="checkbox-show-millis"
                              className="h-4 w-4"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <Separator />

              {/* Data Binding */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Data Binding</h3>
                <FormField
                  control={zoneForm.control}
                  name="dataBindingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Binding Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-binding-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BINDING_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional fields based on binding type */}
                {(zoneForm.watch('dataBindingType') === 'event' || zoneForm.watch('dataBindingType') === 'standings') && (
                  <FormField
                    control={zoneForm.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event">
                              <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                Event {event.eventNumber}: {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {zoneForm.watch('dataBindingType') === 'static' && (
                  <FormField
                    control={zoneForm.control}
                    name="staticContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Static Content</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter static text content..."
                            rows={4}
                            data-testid="textarea-static-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setZoneDialogOpen(false);
                    setEditingZone(false);
                    setSelectedZoneId(null);
                    zoneForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                  data-testid="button-save-zone"
                >
                  {(createZoneMutation.isPending || updateZoneMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingZone ? 'Update Zone' : 'Create Zone'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
