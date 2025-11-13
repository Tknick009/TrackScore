import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation, Link } from "wouter";
import type { Event, Meet, DisplayLayout, LayoutCell } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Grid3x3, Save, Eye, Pencil, Plus, Trash2, ArrowLeft, Loader2, Copy, Layout } from "lucide-react";

interface CellData {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  eventId: string | null;
  boardType: string;
  settings: {
    customColor?: string;
    fontSizeMultiplier?: number;
    hiddenFields?: string[];
  };
}

interface LayoutData {
  name: string;
  description: string;
  rows: number;
  cols: number;
  cells: CellData[];
}

const GRID_PRESETS = [
  { name: "1×1", rows: 1, cols: 1 },
  { name: "1×2", rows: 1, cols: 2 },
  { name: "2×1", rows: 2, cols: 1 },
  { name: "2×2", rows: 2, cols: 2 },
  { name: "3×2", rows: 3, cols: 2 },
  { name: "2×3", rows: 2, cols: 3 },
];

const BOARD_TYPES = [
  {
    value: "live_time",
    label: "Live Time Board",
    description: "Real-time race progression with splits",
  },
  {
    value: "single_result",
    label: "Single Result Board",
    description: "Spotlight individual athlete result",
  },
  {
    value: "standings",
    label: "Standings Board",
    description: "Final rankings and podium",
  },
  {
    value: "field_event",
    label: "Field Event Board",
    description: "Attempt-by-attempt tracking",
  },
];

export default function LayoutDesigner() {
  const { layoutId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(null);
  const [layoutData, setLayoutData] = useState<LayoutData>({
    name: "New Layout",
    description: "",
    rows: 2,
    cols: 2,
    cells: [],
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch meets for selection
  const { data: meets } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  // Fetch events for selected meet
  const { data: events } = useQuery<Event[]>({
    queryKey: selectedMeetId ? [`/api/meets/${selectedMeetId}/events`] : [],
    enabled: !!selectedMeetId,
  });

  // Fetch existing layouts for selected meet
  const { data: existingLayouts } = useQuery<DisplayLayout[]>({
    queryKey: selectedMeetId ? [`/api/display-layouts/meet/${selectedMeetId}`] : [],
    enabled: !!selectedMeetId,
  });

  // Fetch specific layout if editing
  const { data: loadedLayout, isLoading: layoutLoading } = useQuery<DisplayLayout>({
    queryKey: layoutId ? [`/api/display-layouts/${layoutId}`] : [],
    enabled: !!layoutId,
  });

  const { data: loadedCells } = useQuery<LayoutCell[]>({
    queryKey: layoutId ? [`/api/layout-cells/layout/${layoutId}`] : [],
    enabled: !!layoutId,
  });

  // Load layout data when editing
  useEffect(() => {
    if (loadedLayout && loadedCells) {
      setLayoutData({
        name: loadedLayout.name,
        description: loadedLayout.description || "",
        rows: loadedLayout.rows,
        cols: loadedLayout.cols,
        cells: loadedCells.map((cell) => ({
          row: cell.row,
          col: cell.col,
          rowSpan: cell.rowSpan,
          colSpan: cell.colSpan,
          eventId: cell.eventId,
          boardType: cell.boardType,
          settings: (cell.settings as any) || {},
        })),
      });
      setHasChanges(false);
    }
  }, [loadedLayout, loadedCells]);

  // Auto-select first meet if only one exists
  useEffect(() => {
    if (meets && meets.length === 1 && !selectedMeetId) {
      setSelectedMeetId(meets[0].id);
    }
  }, [meets, selectedMeetId]);

  // Generate cells for grid
  const generateCellsForGrid = (rows: number, cols: number): CellData[] => {
    const cells: CellData[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const existingCell = layoutData.cells.find(
          (c) => c.row === row && c.col === col
        );
        cells.push(
          existingCell || {
            row,
            col,
            rowSpan: 1,
            colSpan: 1,
            eventId: null,
            boardType: "live_time",
            settings: {},
          }
        );
      }
    }
    return cells;
  };

  // Apply preset
  const applyPreset = (rows: number, cols: number) => {
    setLayoutData((prev) => ({
      ...prev,
      rows,
      cols,
      cells: generateCellsForGrid(rows, cols),
    }));
    setHasChanges(true);
  };

  // Get cell at position
  const getCellAtPosition = (row: number, col: number): CellData | undefined => {
    return layoutData.cells.find((c) => c.row === row && c.col === col);
  };

  // Update cell configuration
  const updateCellConfig = (row: number, col: number, updates: Partial<CellData>) => {
    setLayoutData((prev) => ({
      ...prev,
      cells: prev.cells.map((cell) =>
        cell.row === row && cell.col === col ? { ...cell, ...updates } : cell
      ),
    }));
    setHasChanges(true);
  };

  // Open cell configuration drawer
  const openCellDrawer = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setDrawerOpen(true);
  };

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMeetId) throw new Error("No meet selected");

      // Create or update layout
      const layoutPayload = {
        meetId: selectedMeetId,
        name: layoutData.name,
        description: layoutData.description,
        rows: layoutData.rows,
        cols: layoutData.cols,
      };

      let savedLayoutId: string;

      if (layoutId) {
        const response = await apiRequest("PATCH", `/api/display-layouts/${layoutId}`, layoutPayload);
        const updated = await response.json();
        savedLayoutId = updated.id;

        // Delete existing cells
        const existingCells = await queryClient.fetchQuery<LayoutCell[]>({
          queryKey: [`/api/layout-cells/layout/${layoutId}`],
        });
        await Promise.all(
          existingCells.map((cell) =>
            apiRequest("DELETE", `/api/layout-cells/${cell.id}`)
          )
        );
      } else {
        const response = await apiRequest("POST", "/api/display-layouts", layoutPayload);
        const created = await response.json();
        savedLayoutId = created.id;
      }

      // Create cells
      await Promise.all(
        layoutData.cells.map((cell) =>
          apiRequest("POST", "/api/layout-cells", {
            layoutId: savedLayoutId,
            row: cell.row,
            col: cell.col,
            rowSpan: cell.rowSpan,
            colSpan: cell.colSpan,
            eventId: cell.eventId,
            boardType: cell.boardType,
            settings: cell.settings,
          })
        )
      );

      return savedLayoutId;
    },
    onSuccess: (savedLayoutId) => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/display-layouts/meet/${selectedMeetId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/layout-cells/layout/${savedLayoutId}`] });
      toast({
        title: "Layout saved",
        description: "Your display layout has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving layout",
        description: error.message || "Failed to save layout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete layout mutation
  const deleteLayoutMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/display-layouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/display-layouts/meet/${selectedMeetId}`] });
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

  // Clone layout
  const cloneLayout = (layout: DisplayLayout) => {
    setLayoutData({
      name: `${layout.name} (Copy)`,
      description: layout.description || "",
      rows: layout.rows,
      cols: layout.cols,
      cells: [],
    });
    setHasChanges(true);

    // Load cells for the layout to clone
    queryClient.fetchQuery<LayoutCell[]>({
      queryKey: [`/api/layout-cells/layout/${layout.id}`],
    }).then((cells) => {
      setLayoutData((prev) => ({
        ...prev,
        cells: cells.map((cell) => ({
          row: cell.row,
          col: cell.col,
          rowSpan: cell.rowSpan,
          colSpan: cell.colSpan,
          eventId: cell.eventId,
          boardType: cell.boardType,
          settings: (cell.settings as any) || {},
        })),
      }));
    });

    toast({
      title: "Layout cloned",
      description: "You can now edit and save the cloned layout.",
    });
  };

  const currentCell = selectedCell ? getCellAtPosition(selectedCell.row, selectedCell.col) : null;
  const selectedEvent = currentCell?.eventId
    ? events?.find((e) => e.id === currentCell.eventId)
    : null;

  if (layoutLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/control">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Multi-Event Display Designer</h1>
              <p className="text-muted-foreground">
                Create grid layouts with multiple event displays
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (layoutId) {
                  window.open(`/display?layoutId=${layoutId}`, "_blank");
                } else {
                  toast({
                    title: "Save first",
                    description: "Please save the layout before previewing.",
                    variant: "destructive",
                  });
                }
              }}
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={() => saveLayoutMutation.mutate()}
              disabled={!hasChanges || !selectedMeetId || saveLayoutMutation.isPending}
              data-testid="button-save"
            >
              {saveLayoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Layout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Configuration */}
        <div className="w-96 border-r overflow-y-auto p-6 space-y-6">
          {/* Meet Selector */}
          {meets && meets.length > 1 && (
            <div className="space-y-2">
              <Label>Meet</Label>
              <Select value={selectedMeetId || ""} onValueChange={setSelectedMeetId}>
                <SelectTrigger data-testid="select-meet">
                  <SelectValue placeholder="Select a meet" />
                </SelectTrigger>
                <SelectContent>
                  {meets.map((meet) => (
                    <SelectItem key={meet.id} value={meet.id}>
                      {meet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Layout Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Layout Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Layout Name *</Label>
                <Input
                  value={layoutData.name}
                  onChange={(e) => {
                    setLayoutData({ ...layoutData, name: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="e.g., Main Stadium Display"
                  data-testid="input-layout-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={layoutData.description}
                  onChange={(e) => {
                    setLayoutData({ ...layoutData, description: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="Optional description"
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Grid Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grid Configuration</CardTitle>
              <CardDescription>Select a preset or create custom grid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {GRID_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={
                      layoutData.rows === preset.rows && layoutData.cols === preset.cols
                        ? "default"
                        : "outline"
                    }
                    onClick={() => applyPreset(preset.rows, preset.cols)}
                    className="h-16"
                    data-testid={`button-preset-${preset.name.replace('×', 'x')}`}
                  >
                    <div className="text-center">
                      <Grid3x3 className="w-4 h-4 mx-auto mb-1" />
                      <div className="text-xs">{preset.name}</div>
                    </div>
                  </Button>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Custom Grid</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Rows (1-4)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      value={layoutData.rows}
                      onChange={(e) => {
                        const rows = Math.min(4, Math.max(1, parseInt(e.target.value) || 1));
                        applyPreset(rows, layoutData.cols);
                      }}
                      data-testid="input-rows"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Columns (1-4)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      value={layoutData.cols}
                      onChange={(e) => {
                        const cols = Math.min(4, Math.max(1, parseInt(e.target.value) || 1));
                        applyPreset(layoutData.rows, cols);
                      }}
                      data-testid="input-cols"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Layouts */}
          {existingLayouts && existingLayouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saved Layouts</CardTitle>
                <CardDescription>Load, clone, or delete existing layouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {existingLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{layout.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {layout.rows}×{layout.cols} grid
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => navigate(`/control/layouts/designer/${layout.id}`)}
                        data-testid={`button-load-${layout.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => cloneLayout(layout)}
                        data-testid={`button-clone-${layout.id}`}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this layout?")) {
                            deleteLayoutMutation.mutate(layout.id);
                          }
                        }}
                        data-testid={`button-delete-${layout.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center Panel - Grid Builder */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${layoutData.cols}, 1fr)`,
                gridTemplateRows: `repeat(${layoutData.rows}, 1fr)`,
              }}
            >
              {Array.from({ length: layoutData.rows }).map((_, row) =>
                Array.from({ length: layoutData.cols }).map((_, col) => {
                  const cell = getCellAtPosition(row, col);
                  const event = cell?.eventId
                    ? events?.find((e) => e.id === cell.eventId)
                    : null;
                  const boardType = BOARD_TYPES.find((bt) => bt.value === cell?.boardType);

                  return (
                    <Card
                      key={`${row}-${col}`}
                      className="min-h-48 cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => openCellDrawer(row, col)}
                      data-testid={`cell-${row}-${col}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs">
                            Cell {row + 1}-{col + 1}
                          </Badge>
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {event ? (
                          <div className="space-y-2">
                            <p className="font-semibold text-sm">
                              Event {event.eventNumber}: {event.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {event.gender} • {event.eventType}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {boardType?.label}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                            <Plus className="w-6 h-6 mb-2" />
                            <p className="text-sm">Empty Cell</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cell Configuration Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              Configure Cell {selectedCell ? `${selectedCell.row + 1}-${selectedCell.col + 1}` : ""}
            </SheetTitle>
            <SheetDescription>
              Assign an event and configure display settings
            </SheetDescription>
          </SheetHeader>

          {currentCell && (
            <div className="space-y-6 mt-6">
              {/* Event Selector */}
              <div className="space-y-2">
                <Label>Event</Label>
                <Select
                  value={currentCell.eventId || "none"}
                  onValueChange={(value) => {
                    updateCellConfig(selectedCell!.row, selectedCell!.col, {
                      eventId: value === "none" ? null : value,
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-event">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Event (Empty)</SelectItem>
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        Event {event.eventNumber}: {event.name} ({event.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Board Type */}
              <div className="space-y-3">
                <Label>Board Type</Label>
                <RadioGroup
                  value={currentCell.boardType}
                  onValueChange={(value) => {
                    updateCellConfig(selectedCell!.row, selectedCell!.col, {
                      boardType: value,
                    });
                  }}
                >
                  {BOARD_TYPES.map((boardType) => (
                    <div
                      key={boardType.value}
                      className="flex items-start space-x-3 space-y-0 p-3 border rounded-lg hover-elevate"
                      data-testid={`radio-board-${boardType.value}`}
                    >
                      <RadioGroupItem value={boardType.value} id={boardType.value} />
                      <div className="flex-1">
                        <Label htmlFor={boardType.value} className="font-medium cursor-pointer">
                          {boardType.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {boardType.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Cell Span Controls */}
              <div className="space-y-4">
                <Label>Cell Spanning</Label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Row Span</Label>
                      <span className="text-xs text-muted-foreground">
                        {currentCell.rowSpan}
                      </span>
                    </div>
                    <Slider
                      value={[currentCell.rowSpan]}
                      onValueChange={([value]) => {
                        updateCellConfig(selectedCell!.row, selectedCell!.col, {
                          rowSpan: value,
                        });
                      }}
                      min={1}
                      max={Math.min(3, layoutData.rows)}
                      step={1}
                      data-testid="slider-row-span"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Column Span</Label>
                      <span className="text-xs text-muted-foreground">
                        {currentCell.colSpan}
                      </span>
                    </div>
                    <Slider
                      value={[currentCell.colSpan]}
                      onValueChange={([value]) => {
                        updateCellConfig(selectedCell!.row, selectedCell!.col, {
                          colSpan: value,
                        });
                      }}
                      min={1}
                      max={Math.min(3, layoutData.cols)}
                      step={1}
                      data-testid="slider-col-span"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced">
                  <AccordionTrigger>Advanced Settings</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Custom Accent Color</Label>
                      <Input
                        type="color"
                        value={currentCell.settings.customColor || "#165fff"}
                        onChange={(e) => {
                          updateCellConfig(selectedCell!.row, selectedCell!.col, {
                            settings: {
                              ...currentCell.settings,
                              customColor: e.target.value,
                            },
                          });
                        }}
                        className="h-10"
                        data-testid="input-custom-color"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Font Size Multiplier</Label>
                        <span className="text-xs text-muted-foreground">
                          {currentCell.settings.fontSizeMultiplier || 1}×
                        </span>
                      </div>
                      <Slider
                        value={[currentCell.settings.fontSizeMultiplier || 1]}
                        onValueChange={([value]) => {
                          updateCellConfig(selectedCell!.row, selectedCell!.col, {
                            settings: {
                              ...currentCell.settings,
                              fontSizeMultiplier: value,
                            },
                          });
                        }}
                        min={0.5}
                        max={2}
                        step={0.1}
                        data-testid="slider-font-size"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Selected Event Info */}
              {selectedEvent && (
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">Selected Event</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1">
                    <p className="text-sm font-medium">
                      Event {selectedEvent.eventNumber}: {selectedEvent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.gender} • {selectedEvent.eventType}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {selectedEvent.status}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
