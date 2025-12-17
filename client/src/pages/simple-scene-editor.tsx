import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMeet } from "@/contexts/MeetContext";
import type { 
  SelectLayoutScene, 
  SelectLayoutObject, 
  InsertLayoutScene,
  InsertLayoutObject,
  LayoutSceneWithObjects,
} from "@shared/schema";
import { 
  FIELD_BINDINGS, 
  TEXT_FIELD_BINDINGS, 
  IMAGE_FIELD_BINDINGS,
  FIELD_BINDING_CATEGORIES,
  SCREEN_PRESETS,
  type FieldBinding 
} from "@/lib/fieldBindings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Save, Trash2, Eye, Monitor, 
  MousePointer, Square, Copy, Clipboard,
  Type, Image, ChevronLeft, Upload,
  Grid3X3, ZoomIn, ZoomOut, Undo2, Pencil,
  LayoutGrid, Minus
} from "lucide-react";

type BoxType = 'text' | 'image';

interface LayoutBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: BoxType;
  fieldKey: string | null;
  staticText?: string;
  staticImageUrl?: string;
  zIndex: number;
  athleteIndex?: number;  // ResulTV-style line number (0-indexed). Line 1 = 0, Line 2 = 1, etc.
  style?: {
    fontSize?: number;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    backgroundStyle?: 'solid' | 'transparent';
    textColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderSides?: ('all' | 'top' | 'right' | 'bottom' | 'left')[];
    padding?: number;
    objectFit?: 'contain' | 'cover' | 'fill';
  };
}

type EditorTool = 'select' | 'draw';

const generateId = () => `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function SimpleSceneEditor() {
  const { toast } = useToast();
  const { currentMeet } = useMeet();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Scene state
  const [currentScene, setCurrentScene] = useState<SelectLayoutScene | null>(null);
  const [boxes, setBoxes] = useState<LayoutBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<LayoutBox | null>(null);
  
  // Editor state
  const [tool, setTool] = useState<EditorTool>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [showPreview, setShowPreview] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  
  // Dragging/resizing state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; boxX: number; boxY: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  // Dialogs
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<typeof SCREEN_PRESETS[number] | null>(null);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  
  // Copy scene dialog
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [sceneToCopy, setSceneToCopy] = useState<LayoutSceneWithObjects | null>(null);
  const [copySceneName, setCopySceneName] = useState('');
  const [copyPreset, setCopyPreset] = useState<typeof SCREEN_PRESETS[number] | null>(null);
  const [copyWidth, setCopyWidth] = useState(1920);
  const [copyHeight, setCopyHeight] = useState(1080);
  
  // Scene dimensions (default 1920x1080)
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  
  const selectedBox = boxes.find(b => b.id === selectedBoxId);
  
  // Fetch existing scenes
  const { data: scenes = [] } = useQuery<LayoutSceneWithObjects[]>({
    queryKey: [`/api/layout-scenes?meetId=${currentMeet?.id}`],
    enabled: !!currentMeet?.id,
  });
  
  // Save scene mutation
  const saveMutation = useMutation({
    mutationFn: async (sceneData: { scene: Partial<InsertLayoutScene>; objects: Partial<InsertLayoutObject>[] }) => {
      if (currentScene?.id && currentScene.id > 0) {
        // Update existing scene
        await apiRequest('PATCH', `/api/layout-scenes/${currentScene.id}`, { 
          ...sceneData.scene,
          objects: sceneData.objects 
        });
        return { id: currentScene.id, isNew: false };
      } else {
        // Create new scene
        const response = await apiRequest('POST', '/api/layout-scenes', sceneData.scene);
        const newScene = await response.json();
        // Add objects
        for (const obj of sceneData.objects) {
          await apiRequest('POST', '/api/layout-objects', { ...obj, sceneId: newScene.id });
        }
        return { id: newScene.id, isNew: true };
      }
    },
    onSuccess: (result) => {
      toast({ title: 'Scene saved successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/layout-scenes?meetId=${currentMeet?.id}`] });
      // Update currentScene with the server-assigned ID so future saves update instead of create
      if (result?.isNew && result.id && currentScene) {
        setCurrentScene({ ...currentScene, id: result.id });
      }
    },
    onError: (error) => {
      toast({ title: 'Failed to save scene', description: String(error), variant: 'destructive' });
    },
  });
  
  // Delete scene mutation
  const deleteMutation = useMutation({
    mutationFn: async (sceneId: number) => {
      await apiRequest('DELETE', `/api/layout-scenes/${sceneId}`);
    },
    onSuccess: () => {
      toast({ title: 'Scene deleted' });
      queryClient.invalidateQueries({ queryKey: [`/api/layout-scenes?meetId=${currentMeet?.id}`] });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete scene', description: String(error), variant: 'destructive' });
    },
  });
  
  // Copy scene mutation with scaling support
  const copyMutation = useMutation({
    mutationFn: async ({ scene, newName, newWidth, newHeight }: { 
      scene: LayoutSceneWithObjects; 
      newName: string; 
      newWidth: number; 
      newHeight: number;
    }) => {
      // Calculate scale factors for font sizing only
      // x, y, width, height are percentages (0-100) so they don't need scaling
      const scaleX = newWidth / scene.canvasWidth;
      const scaleY = newHeight / scene.canvasHeight;
      const avgScale = (scaleX + scaleY) / 2;
      
      // Create a copy of the scene with new name and dimensions
      const response = await apiRequest('POST', '/api/layout-scenes', {
        meetId: currentMeet?.id,
        name: newName,
        canvasWidth: newWidth,
        canvasHeight: newHeight,
        backgroundColor: scene.backgroundColor || '#000000',
      });
      const newScene = await response.json();
      
      // Copy all objects to the new scene
      // Positions and sizes are percentages, so they stay the same
      // Only font sizes (in pixels) need to be scaled
      const objects = scene.objects || [];
      for (const obj of objects) {
        // Scale font size if present in style (font sizes are in pixels)
        let scaledStyle: any = obj.style;
        if (scaledStyle && typeof scaledStyle === 'object' && 'fontSize' in scaledStyle) {
          scaledStyle = {
            ...scaledStyle,
            fontSize: Math.round(scaledStyle.fontSize * avgScale),
          };
        }
        
        await apiRequest('POST', `/api/layout-scenes/${newScene.id}/objects`, {
          name: obj.name,
          objectType: obj.objectType,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          zIndex: obj.zIndex,
          dataBinding: obj.dataBinding,
          config: obj.config,
          style: scaledStyle,
        });
      }
      
      return newScene;
    },
    onSuccess: (newScene) => {
      toast({ title: 'Scene copied' });
      queryClient.invalidateQueries({ queryKey: [`/api/layout-scenes?meetId=${currentMeet?.id}`] });
      // Load the copied scene for editing
      setCurrentScene(newScene);
      setCanvasWidth(newScene.canvasWidth);
      setCanvasHeight(newScene.canvasHeight);
      // Fetch and load the objects
      fetch(`/api/layout-scenes/${newScene.id}/objects`)
        .then(res => res.json())
        .then((objects: SelectLayoutObject[]) => {
          setBoxes(objects.map(layoutObjectToBox));
        });
      // Close the dialog
      setShowCopyDialog(false);
      setSceneToCopy(null);
      setCopySceneName('');
    },
    onError: (error) => {
      toast({ title: 'Failed to copy scene', description: String(error), variant: 'destructive' });
    },
  });
  
  // Convert LayoutBox to InsertLayoutObject format
  const boxToLayoutObject = (box: LayoutBox): Partial<InsertLayoutObject> => {
    // Determine sourceType based on the field binding
    // 'static-text' and 'static-image' are truly static, others are live data
    const isStatic = !box.fieldKey || box.fieldKey === 'static-text' || box.fieldKey === 'static-image';
    const sourceType = isStatic ? 'static' as const : 'live-data' as const;
    
    return {
      name: `Box ${box.id.slice(-4)}`,
      objectType: box.type === 'image' ? 'logo' : 'text',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      zIndex: box.zIndex,
      dataBinding: { sourceType, fieldKey: box.fieldKey || undefined, athleteIndex: box.athleteIndex },
      config: {
        dynamicText: box.staticText,
        staticImageUrl: box.staticImageUrl,
      },
      style: box.style as any,
    };
  };
  
  // Convert SelectLayoutObject to LayoutBox
  const layoutObjectToBox = (obj: SelectLayoutObject): LayoutBox => ({
    id: String(obj.id),
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    type: obj.objectType === 'logo' ? 'image' : 'text',
    fieldKey: (obj.dataBinding as any)?.fieldKey || null,
    staticText: (obj.config as any)?.dynamicText,
    staticImageUrl: (obj.config as any)?.staticImageUrl,
    athleteIndex: (obj.dataBinding as any)?.athleteIndex,
    zIndex: obj.zIndex,
    style: obj.style as any,
  });
  
  // Handle creating a new scene
  const handleCreateScene = () => {
    if (!newSceneName.trim()) {
      toast({ title: 'Please enter a scene name', variant: 'destructive' });
      return;
    }
    
    const width = selectedPreset ? selectedPreset.width : customWidth;
    const height = selectedPreset ? selectedPreset.height : customHeight;
    
    setCanvasWidth(width);
    setCanvasHeight(height);
    setBoxes([]);
    setCurrentScene({
      id: 0,
      meetId: currentMeet?.id || null,
      name: newSceneName,
      description: null,
      canvasWidth: width,
      canvasHeight: height,
      aspectRatio: `${width}:${height}`,
      backgroundColor: '#000000',
      backgroundImage: null,
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setShowNewSceneDialog(false);
    setNewSceneName('');
    setSelectedPreset(null);
  };
  
  // Handle loading an existing scene - fetch full data with objects
  const handleLoadScene = async (scene: LayoutSceneWithObjects) => {
    try {
      // Fetch the full scene with objects
      const response = await fetch(`/api/layout-scenes/${scene.id}`);
      if (!response.ok) throw new Error('Failed to load scene');
      const fullScene: LayoutSceneWithObjects = await response.json();
      
      setCurrentScene(fullScene);
      setCanvasWidth(fullScene.canvasWidth);
      setCanvasHeight(fullScene.canvasHeight);
      setBoxes((fullScene.objects || []).map(layoutObjectToBox));
    } catch (error) {
      toast({ title: 'Failed to load scene', description: String(error), variant: 'destructive' });
    }
  };
  
  // Handle saving the scene
  const handleSave = () => {
    if (!currentScene) return;
    
    saveMutation.mutate({
      scene: {
        meetId: currentMeet?.id,
        name: currentScene.name,
        canvasWidth,
        canvasHeight,
        backgroundColor: '#000000',
      },
      objects: boxes.map(boxToLayoutObject),
    });
  };
  
  // Get mouse position relative to canvas in percentage
  const getCanvasPosition = (e: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };
  
  // Snap to grid (5% increments)
  const snapToGrid = (value: number): number => {
    if (!showGrid) return value;
    return Math.round(value / 5) * 5;
  };
  
  // Check if point is on resize handle
  const getResizeHandle = (pos: { x: number; y: number }, box: LayoutBox): string | null => {
    const handleSize = 2; // % of canvas
    const handles = {
      'nw': { x: box.x, y: box.y },
      'ne': { x: box.x + box.width, y: box.y },
      'sw': { x: box.x, y: box.y + box.height },
      'se': { x: box.x + box.width, y: box.y + box.height },
    };
    
    for (const [handle, handlePos] of Object.entries(handles)) {
      if (Math.abs(pos.x - handlePos.x) < handleSize && Math.abs(pos.y - handlePos.y) < handleSize) {
        return handle;
      }
    }
    return null;
  };
  
  // Handle mouse down on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    
    if (tool === 'draw') {
      setIsDrawing(true);
      setDrawStart(pos);
      setDrawCurrent(pos);
      setSelectedBoxId(null);
    } else {
      // Check if clicking on a resize handle of selected box
      if (selectedBox) {
        const handle = getResizeHandle(pos, selectedBox);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setDragStart({ x: pos.x, y: pos.y, boxX: selectedBox.x, boxY: selectedBox.y });
          return;
        }
      }
      
      // Check if clicking on a box
      const clickedBox = [...boxes].reverse().find(box => 
        pos.x >= box.x && pos.x <= box.x + box.width &&
        pos.y >= box.y && pos.y <= box.y + box.height
      );
      
      if (clickedBox) {
        setSelectedBoxId(clickedBox.id);
        setIsDragging(true);
        setDragStart({ x: pos.x, y: pos.y, boxX: clickedBox.x, boxY: clickedBox.y });
      } else {
        setSelectedBoxId(null);
      }
    }
  };
  
  // Handle mouse move on canvas
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    
    if (isDrawing && drawStart) {
      setDrawCurrent(pos);
    } else if (isResizing && resizeHandle && dragStart && selectedBox) {
      // Handle resizing
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      let newX = selectedBox.x;
      let newY = selectedBox.y;
      let newWidth = selectedBox.width;
      let newHeight = selectedBox.height;
      
      if (resizeHandle.includes('w')) {
        newX = snapToGrid(Math.max(0, Math.min(selectedBox.x + selectedBox.width - 5, dragStart.boxX + dx)));
        newWidth = snapToGrid(selectedBox.x + selectedBox.width - newX);
      }
      if (resizeHandle.includes('e')) {
        newWidth = snapToGrid(Math.max(5, selectedBox.width + dx));
      }
      if (resizeHandle.includes('n')) {
        newY = snapToGrid(Math.max(0, Math.min(selectedBox.y + selectedBox.height - 5, dragStart.boxY + dy)));
        newHeight = snapToGrid(selectedBox.y + selectedBox.height - newY);
      }
      if (resizeHandle.includes('s')) {
        newHeight = snapToGrid(Math.max(5, selectedBox.height + dy));
      }
      
      setBoxes(prev => prev.map(box => 
        box.id === selectedBoxId ? { ...box, x: newX, y: newY, width: newWidth, height: newHeight } : box
      ));
    } else if (isDragging && dragStart && selectedBoxId) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      const newX = snapToGrid(Math.max(0, Math.min(100 - (selectedBox?.width || 0), dragStart.boxX + dx)));
      const newY = snapToGrid(Math.max(0, Math.min(100 - (selectedBox?.height || 0), dragStart.boxY + dy)));
      
      setBoxes(prev => prev.map(box => 
        box.id === selectedBoxId ? { ...box, x: newX, y: newY } : box
      ));
    }
  };
  
  // Handle mouse up on canvas
  const handleCanvasMouseUp = () => {
    if (isDrawing && drawStart && drawCurrent) {
      const x = snapToGrid(Math.min(drawStart.x, drawCurrent.x));
      const y = snapToGrid(Math.min(drawStart.y, drawCurrent.y));
      const width = snapToGrid(Math.abs(drawCurrent.x - drawStart.x));
      const height = snapToGrid(Math.abs(drawCurrent.y - drawStart.y));
      
      // Only create if box has meaningful size
      if (width >= 3 && height >= 3) {
        const newBox: LayoutBox = {
          id: generateId(),
          x,
          y,
          width,
          height,
          type: 'text',
          fieldKey: null,
          zIndex: boxes.length + 1,
          style: {
            fontSize: 14,
            textAlign: 'left',
            backgroundColor: 'rgba(0,0,0,0.5)',
            textColor: '#ffffff',
          },
        };
        setBoxes(prev => [...prev, newBox]);
        setSelectedBoxId(newBox.id);
        setTool('select'); // Switch back to select after drawing
      }
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setIsDragging(false);
    setDragStart(null);
    setIsResizing(false);
    setResizeHandle(null);
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBoxId && !(e.target instanceof HTMLInputElement)) {
          setBoxes(prev => prev.filter(b => b.id !== selectedBoxId));
          setSelectedBoxId(null);
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBox) {
        setClipboard({ ...selectedBox });
        toast({ title: 'Copied box' });
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        const newBox: LayoutBox = {
          ...clipboard,
          id: generateId(),
          x: clipboard.x + 5,
          y: clipboard.y + 5,
          zIndex: boxes.length + 1,
        };
        setBoxes(prev => [...prev, newBox]);
        setSelectedBoxId(newBox.id);
        toast({ title: 'Pasted box' });
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBox) {
        const newBox: LayoutBox = {
          ...selectedBox,
          id: generateId(),
          x: selectedBox.x + 5,
          y: selectedBox.y + 5,
          zIndex: boxes.length + 1,
        };
        setBoxes(prev => [...prev, newBox]);
        setSelectedBoxId(newBox.id);
        toast({ title: 'Duplicated box' });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxId, selectedBox, clipboard, boxes, toast]);
  
  // Update selected box properties
  const updateSelectedBox = (updates: Partial<LayoutBox>) => {
    if (!selectedBoxId) return;
    setBoxes(prev => prev.map(box => 
      box.id === selectedBoxId ? { ...box, ...updates } : box
    ));
  };
  
  // Get display value for a field binding
  const getPreviewValue = (fieldKey: string | null, type: BoxType): string => {
    if (!fieldKey) return type === 'text' ? 'Click to set field' : '';
    const binding = FIELD_BINDINGS[fieldKey];
    if (!binding) return fieldKey;
    
    // Sample preview data using real NCAA school names
    const sampleData: Record<string, string> = {
      'event-name': "Men's 100m Final",
      'heat-number': 'Heat 2 of 4',
      'round': 'Finals',
      'wind': '+1.2',
      'lane': '4',
      'place': '1',
      'name': 'John Smith',
      'first-name': 'John',
      'last-name': 'Smith',
      'school': 'Alabama',
      'time': '10.24',
      'last-split': '5.12',
      'cumulative-split': '5.12',
      'reaction-time': '0.142',
      'running-time': '0:12.34',
      'bib': '247',
      'static-text': selectedBox?.staticText || 'Static Text',
    };
    
    return sampleData[fieldKey] || binding.label;
  };
  
  // Calculate canvas display size
  const aspectRatio = canvasWidth / canvasHeight;
  const maxWidth = 800;
  const maxHeight = 600;
  let displayWidth = maxWidth;
  let displayHeight = displayWidth / aspectRatio;
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = displayHeight * aspectRatio;
  }
  displayWidth *= zoom / 100;
  displayHeight *= zoom / 100;
  
  // Render scene selection if no scene is active
  if (!currentScene) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Scene Editor</h1>
            <p className="text-muted-foreground">
              Create custom display layouts for your scoreboard
            </p>
          </div>
          
          <div className="space-y-4">
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => setShowNewSceneDialog(true)}
              data-testid="card-new-scene"
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Create New Scene</h3>
                  <p className="text-sm text-muted-foreground">Start with a blank canvas</p>
                </div>
              </CardContent>
            </Card>
            
            {scenes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Your Scenes</h3>
                <div className="space-y-2">
                  {scenes.map((scene) => (
                    <Card key={scene.id} className="hover-elevate" data-testid={`card-scene-${scene.id}`}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-secondary">
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium">{scene.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {scene.canvasWidth}×{scene.canvasHeight} • {(scene.objects || []).length} objects
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleLoadScene(scene)}
                            title="Edit"
                            data-testid={`button-edit-scene-${scene.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open copy dialog with scene info
                              setSceneToCopy(scene);
                              setCopySceneName('');
                              setCopyWidth(scene.canvasWidth);
                              setCopyHeight(scene.canvasHeight);
                              setCopyPreset(null);
                              setShowCopyDialog(true);
                            }}
                            disabled={copyMutation.isPending}
                            title="Copy"
                            data-testid={`button-copy-scene-${scene.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${scene.name}"? This cannot be undone.`)) {
                                deleteMutation.mutate(scene.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                            data-testid={`button-delete-scene-${scene.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* New Scene Dialog */}
        <Dialog open={showNewSceneDialog} onOpenChange={setShowNewSceneDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Scene</DialogTitle>
              <DialogDescription>
                Choose a screen size to start designing your layout
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scene Name</Label>
                <Input
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="e.g., Track Results Board"
                  data-testid="input-scene-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Screen Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SCREEN_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant={selectedPreset?.name === preset.name ? 'default' : 'outline'}
                      className="justify-start h-auto py-3"
                      onClick={() => setSelectedPreset(preset)}
                      data-testid={`button-preset-${preset.name.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs opacity-70">{preset.width}×{preset.height}</div>
                      </div>
                    </Button>
                  ))}
                  <Button
                    variant={selectedPreset === null ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setSelectedPreset(null)}
                    data-testid="button-preset-custom"
                  >
                    <div className="text-left">
                      <div className="font-medium">Custom</div>
                      <div className="text-xs opacity-70">Enter dimensions</div>
                    </div>
                  </Button>
                </div>
              </div>
              
              {selectedPreset === null && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                      data-testid="input-custom-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                      data-testid="input-custom-height"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewSceneDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateScene} data-testid="button-create-scene">
                Create Scene
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Copy Scene Dialog */}
        <Dialog open={showCopyDialog} onOpenChange={(open) => {
          setShowCopyDialog(open);
          if (!open) {
            setSceneToCopy(null);
            setCopySceneName('');
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Copy Scene</DialogTitle>
              <DialogDescription>
                Enter a new name and optionally change the canvas size. Objects keep their relative positions.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Scene Name <span className="text-destructive">*</span></Label>
                <Input
                  value={copySceneName}
                  onChange={(e) => setCopySceneName(e.target.value)}
                  placeholder="Enter a unique name"
                  data-testid="input-copy-scene-name"
                />
                {sceneToCopy && (
                  <p className="text-xs text-muted-foreground">
                    Copying from: {sceneToCopy.name} ({sceneToCopy.canvasWidth}×{sceneToCopy.canvasHeight})
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Target Screen Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SCREEN_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant={copyPreset?.name === preset.name ? 'default' : 'outline'}
                      className="justify-start h-auto py-3"
                      onClick={() => {
                        setCopyPreset(preset);
                        setCopyWidth(preset.width);
                        setCopyHeight(preset.height);
                      }}
                      data-testid={`button-copy-preset-${preset.name.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs opacity-70">{preset.width}×{preset.height}</div>
                      </div>
                    </Button>
                  ))}
                  <Button
                    variant={copyPreset === null ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setCopyPreset(null)}
                    data-testid="button-copy-preset-custom"
                  >
                    <div className="text-left">
                      <div className="font-medium">Custom</div>
                      <div className="text-xs opacity-70">Enter dimensions</div>
                    </div>
                  </Button>
                </div>
              </div>
              
              {copyPreset === null && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={copyWidth}
                      onChange={(e) => setCopyWidth(parseInt(e.target.value) || 1920)}
                      data-testid="input-copy-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={copyHeight}
                      onChange={(e) => setCopyHeight(parseInt(e.target.value) || 1080)}
                      data-testid="input-copy-height"
                    />
                  </div>
                </div>
              )}
              
              {sceneToCopy && (copyWidth !== sceneToCopy.canvasWidth || copyHeight !== sceneToCopy.canvasHeight) && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <div className="font-medium mb-1">Dimension Change</div>
                  <div className="text-muted-foreground">
                    Objects keep the same relative positions. Font sizes will scale by {(((copyWidth / sceneToCopy.canvasWidth + copyHeight / sceneToCopy.canvasHeight) / 2) * 100).toFixed(0)}%.
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!sceneToCopy || !copySceneName.trim()) {
                    toast({ title: 'Please enter a name for the new scene', variant: 'destructive' });
                    return;
                  }
                  copyMutation.mutate({
                    scene: sceneToCopy,
                    newName: copySceneName.trim(),
                    newWidth: copyWidth,
                    newHeight: copyHeight,
                  });
                }}
                disabled={!copySceneName.trim() || copyMutation.isPending}
                data-testid="button-confirm-copy"
              >
                {copyMutation.isPending ? 'Copying...' : 'Copy Scene'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Main editor view
  return (
    <div className="flex h-full">
      {/* Left Toolbar */}
      <div className="w-14 border-r bg-muted/30 flex flex-col items-center py-2 gap-1">
        <Button
          size="icon"
          variant={tool === 'select' ? 'default' : 'ghost'}
          onClick={() => setTool('select')}
          title="Select (V)"
          data-testid="button-tool-select"
        >
          <MousePointer className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant={tool === 'draw' ? 'default' : 'ghost'}
          onClick={() => setTool('draw')}
          title="Draw Box (R)"
          data-testid="button-tool-draw"
        >
          <Square className="w-4 h-4" />
        </Button>
        
        <Separator className="my-2" />
        
        <Button
          size="icon"
          variant={showGrid ? 'secondary' : 'ghost'}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
          data-testid="button-toggle-grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant={showPreview ? 'secondary' : 'ghost'}
          onClick={() => setShowPreview(!showPreview)}
          title="Preview Mode"
          data-testid="button-toggle-preview"
        >
          <Eye className="w-4 h-4" />
        </Button>
        
        <Separator className="my-2" />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setZoom(Math.min(200, zoom + 25))}
          title="Zoom In"
          data-testid="button-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground">{zoom}%</div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setZoom(Math.max(50, zoom - 25))}
          title="Zoom Out"
          data-testid="button-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <div className="flex-1" />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setCurrentScene(null);
            setBoxes([]);
          }}
          title="Back to Scene List"
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-12 border-b flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-2">
            <Input
              value={currentScene.name}
              onChange={(e) => setCurrentScene({ ...currentScene, name: e.target.value })}
              className="w-48 h-8 font-medium"
              placeholder="Scene name"
              data-testid="input-scene-name-edit"
            />
            <Badge variant="outline">{canvasWidth}×{canvasHeight}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedBox) {
                  setClipboard({ ...selectedBox });
                  toast({ title: 'Copied' });
                }
              }}
              disabled={!selectedBox}
              data-testid="button-copy"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (clipboard) {
                  const newBox: LayoutBox = {
                    ...clipboard,
                    id: generateId(),
                    x: clipboard.x + 5,
                    y: clipboard.y + 5,
                    zIndex: boxes.length + 1,
                  };
                  setBoxes(prev => [...prev, newBox]);
                  setSelectedBoxId(newBox.id);
                }
              }}
              disabled={!clipboard}
              data-testid="button-paste"
            >
              <Clipboard className="w-4 h-4 mr-1" />
              Paste
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              <Save className="w-4 h-4 mr-1" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-muted/50 p-8 flex items-center justify-center">
          <div
            ref={canvasRef}
            className="relative bg-black"
            style={{
              width: displayWidth,
              height: displayHeight,
              cursor: tool === 'draw' ? 'crosshair' : 'default',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            data-testid="canvas"
          >
            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '5% 5%',
              }} />
            )}
            
            {/* Boxes */}
            {boxes.map((box) => {
              // Compute border styles based on borderSides
              const borderWidth = box.style?.borderWidth || 0;
              const borderColor = box.style?.borderColor || '#ffffff';
              const borderSides = box.style?.borderSides || ['all'];
              const hasAllBorders = borderSides.includes('all') || borderSides.length === 0;
              
              const borderStyles: React.CSSProperties = {};
              if (borderWidth > 0) {
                if (hasAllBorders) {
                  borderStyles.border = `${borderWidth}px solid ${borderColor}`;
                } else {
                  if (borderSides.includes('top')) borderStyles.borderTop = `${borderWidth}px solid ${borderColor}`;
                  if (borderSides.includes('right')) borderStyles.borderRight = `${borderWidth}px solid ${borderColor}`;
                  if (borderSides.includes('bottom')) borderStyles.borderBottom = `${borderWidth}px solid ${borderColor}`;
                  if (borderSides.includes('left')) borderStyles.borderLeft = `${borderWidth}px solid ${borderColor}`;
                }
              }
              
              // Background style
              const bgStyle = box.style?.backgroundStyle || 'solid';
              const bgColor = bgStyle === 'transparent' ? 'transparent' : (box.style?.backgroundColor || 'rgba(0,0,0,0.5)');
              
              return (
              <div
                key={box.id}
                className={`absolute ${
                  selectedBoxId === box.id 
                    ? 'ring-2 ring-primary' 
                    : (borderWidth === 0 ? 'border border-white/30' : '')
                }`}
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                  zIndex: box.zIndex,
                  backgroundColor: bgColor,
                  color: box.style?.textColor || '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: box.style?.textAlign === 'center' ? 'center' : 
                                  box.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  padding: box.style?.padding ? `${box.style.padding}px` : '2px 4px',
                  fontSize: `${(box.style?.fontSize || 14) * (displayWidth / 1920)}px`,
                  overflow: 'hidden',
                  ...borderStyles,
                }}
                data-testid={`box-${box.id}`}
              >
                {box.type === 'text' ? (
                  <span className="truncate">
                    {showPreview 
                      ? getPreviewValue(box.fieldKey, box.type)
                      : (box.fieldKey ? FIELD_BINDINGS[box.fieldKey]?.label : 'Unbound')}
                  </span>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <Image className="w-6 h-6 text-white/50" />
                    <span className="ml-1 text-xs text-white/50">
                      {box.fieldKey ? FIELD_BINDINGS[box.fieldKey]?.label : 'Image'}
                    </span>
                  </div>
                )}
                
                {/* Selection handles */}
                {selectedBoxId === box.id && (
                  <>
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary border border-white" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary border border-white" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary border border-white" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary border border-white" />
                  </>
                )}
              </div>
            );
            })}
            
            {/* Drawing preview */}
            {isDrawing && drawStart && drawCurrent && (
              <div
                className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                style={{
                  left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                  top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                  width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                  height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Inspector */}
      <div className="w-72 border-l bg-background">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Properties</h3>
        </div>
        
        {selectedBox ? (
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-4 space-y-4">
              {/* Box Type */}
              <div className="space-y-2">
                <Label>Box Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedBox.type === 'text' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateSelectedBox({ type: 'text', fieldKey: null })}
                    data-testid="button-type-text"
                  >
                    <Type className="w-4 h-4 mr-1" />
                    Text
                  </Button>
                  <Button
                    variant={selectedBox.type === 'image' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateSelectedBox({ type: 'image', fieldKey: null })}
                    data-testid="button-type-image"
                  >
                    <Image className="w-4 h-4 mr-1" />
                    Image
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Field Binding */}
              <div className="space-y-2">
                <Label>Data Field</Label>
                <Select
                  value={selectedBox.fieldKey || ''}
                  onValueChange={(value) => updateSelectedBox({ fieldKey: value || null })}
                >
                  <SelectTrigger data-testid="select-field-binding">
                    <SelectValue placeholder="Select a field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedBox.type === 'text' ? TEXT_FIELD_BINDINGS : IMAGE_FIELD_BINDINGS).map((field) => (
                      <SelectItem key={field.key} value={field.key} data-testid={`option-field-${field.key}`}>
                        <div className="flex items-center gap-2">
                          <span>{field.label}</span>
                          <span className="text-xs text-muted-foreground">({field.category})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBox.fieldKey && FIELD_BINDINGS[selectedBox.fieldKey] && (
                  <p className="text-xs text-muted-foreground">
                    {FIELD_BINDINGS[selectedBox.fieldKey].description}
                  </p>
                )}
              </div>
              
              {/* Static Text (for static-text binding) */}
              {selectedBox.type === 'text' && selectedBox.fieldKey === 'static-text' && (
                <div className="space-y-2">
                  <Label>Text Content</Label>
                  <Input
                    value={selectedBox.staticText || ''}
                    onChange={(e) => updateSelectedBox({ staticText: e.target.value })}
                    placeholder="Enter text..."
                    data-testid="input-static-text"
                  />
                </div>
              )}
              
              <Separator />
              
              {/* Position & Size */}
              <div className="space-y-2">
                <Label>Position & Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedBox.x}
                      onChange={(e) => updateSelectedBox({ x: parseFloat(e.target.value) || 0 })}
                      data-testid="input-x"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedBox.y}
                      onChange={(e) => updateSelectedBox({ y: parseFloat(e.target.value) || 0 })}
                      data-testid="input-y"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Width (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={selectedBox.width}
                      onChange={(e) => updateSelectedBox({ width: parseFloat(e.target.value) || 10 })}
                      data-testid="input-width"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Height (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={selectedBox.height}
                      onChange={(e) => updateSelectedBox({ height: parseFloat(e.target.value) || 10 })}
                      data-testid="input-height"
                    />
                  </div>
                </div>
              </div>
              
              {/* Text Styling (for text boxes) */}
              {selectedBox.type === 'text' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Text Style</Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Font Size</Label>
                        <Input
                          type="number"
                          min={8}
                          max={200}
                          value={selectedBox.style?.fontSize || 14}
                          onChange={(e) => updateSelectedBox({ 
                            style: { ...selectedBox.style, fontSize: parseInt(e.target.value) || 14 } 
                          })}
                          data-testid="input-font-size"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Alignment</Label>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <Button
                              key={align}
                              size="sm"
                              variant={selectedBox.style?.textAlign === align ? 'default' : 'outline'}
                              onClick={() => updateSelectedBox({ 
                                style: { ...selectedBox.style, textAlign: align } 
                              })}
                              data-testid={`button-align-${align}`}
                            >
                              {align.charAt(0).toUpperCase() + align.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Colors */}
              <Separator />
              <div className="space-y-2">
                <Label>Colors</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Background</Label>
                    <Input
                      type="color"
                      value={selectedBox.style?.backgroundColor?.replace(/[^#\w]/g, '') || '#000000'}
                      onChange={(e) => updateSelectedBox({ 
                        style: { ...selectedBox.style, backgroundColor: e.target.value } 
                      })}
                      className="h-8"
                      data-testid="input-bg-color"
                    />
                  </div>
                  {selectedBox.type === 'text' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Text</Label>
                      <Input
                        type="color"
                        value={selectedBox.style?.textColor || '#ffffff'}
                        onChange={(e) => updateSelectedBox({ 
                          style: { ...selectedBox.style, textColor: e.target.value } 
                        })}
                        className="h-8"
                        data-testid="input-text-color"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Background Style */}
              <Separator />
              <div className="space-y-2">
                <Label>Background Style</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={(selectedBox.style?.backgroundStyle || 'solid') === 'solid' ? 'default' : 'outline'}
                    onClick={() => updateSelectedBox({ 
                      style: { ...selectedBox.style, backgroundStyle: 'solid' } 
                    })}
                    className="flex-1"
                    data-testid="button-bg-solid"
                  >
                    Solid
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedBox.style?.backgroundStyle === 'transparent' ? 'default' : 'outline'}
                    onClick={() => updateSelectedBox({ 
                      style: { ...selectedBox.style, backgroundStyle: 'transparent', backgroundColor: 'transparent' } 
                    })}
                    className="flex-1"
                    data-testid="button-bg-transparent"
                  >
                    Transparent
                  </Button>
                </div>
              </div>
              
              {/* Border */}
              <Separator />
              <div className="space-y-3">
                <Label>Border</Label>
                
                {/* Border Color & Width */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <Input
                      type="color"
                      value={selectedBox.style?.borderColor || '#ffffff'}
                      onChange={(e) => updateSelectedBox({ 
                        style: { ...selectedBox.style, borderColor: e.target.value } 
                      })}
                      className="h-8"
                      data-testid="input-border-color"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Width (px)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={selectedBox.style?.borderWidth || 0}
                      onChange={(e) => updateSelectedBox({ 
                        style: { ...selectedBox.style, borderWidth: parseInt(e.target.value) || 0 } 
                      })}
                      className="h-8"
                      data-testid="input-border-width"
                    />
                  </div>
                </div>
                
                {/* Border Sides */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Sides</Label>
                  <div className="flex flex-wrap gap-2">
                    {/* All Sides */}
                    <Button
                      size="sm"
                      variant={(selectedBox.style?.borderSides?.includes('all') || !selectedBox.style?.borderSides?.length) ? 'default' : 'outline'}
                      onClick={() => updateSelectedBox({ 
                        style: { ...selectedBox.style, borderSides: ['all'] } 
                      })}
                      data-testid="button-border-all"
                    >
                      All
                    </Button>
                    {/* Individual Sides */}
                    {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                      const currentSides = selectedBox.style?.borderSides || [];
                      const isAllSelected = currentSides.includes('all') || currentSides.length === 0;
                      const isSelected = isAllSelected || currentSides.includes(side);
                      
                      return (
                        <Button
                          key={side}
                          size="sm"
                          variant={!isAllSelected && isSelected ? 'default' : 'outline'}
                          onClick={() => {
                            let newSides: ('all' | 'top' | 'right' | 'bottom' | 'left')[];
                            if (isAllSelected) {
                              // Switch from 'all' to individual - start with all 4 but remove clicked one
                              newSides = (['top', 'right', 'bottom', 'left'] as const).filter(s => s !== side);
                            } else if (currentSides.includes(side)) {
                              // Remove this side
                              newSides = currentSides.filter(s => s !== side && s !== 'all') as typeof newSides;
                            } else {
                              // Add this side
                              newSides = [...currentSides.filter(s => s !== 'all'), side] as typeof newSides;
                            }
                            // If all 4 are selected, switch back to 'all'
                            if (newSides.length === 4) {
                              newSides = ['all'];
                            }
                            updateSelectedBox({ 
                              style: { ...selectedBox.style, borderSides: newSides } 
                            });
                          }}
                          data-testid={`button-border-${side}`}
                        >
                          {side.charAt(0).toUpperCase() + side.slice(1)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Padding/Buffer */}
              <Separator />
              <div className="space-y-2">
                <Label>Padding / Buffer</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={selectedBox.style?.padding || 0}
                    onChange={(e) => updateSelectedBox({ 
                      style: { ...selectedBox.style, padding: parseInt(e.target.value) || 0 } 
                    })}
                    className="w-20"
                    data-testid="input-padding"
                  />
                  <span className="text-xs text-muted-foreground">pixels</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Space between content and box edge
                </p>
              </div>
              
              {/* Line Number for ResulTV-style multi-athlete layouts */}
              <Separator />
              <div className="space-y-2">
                <Label>Line Number</Label>
                <Select
                  value={String((selectedBox.athleteIndex ?? 0) + 1)}
                  onValueChange={(value) => updateSelectedBox({ 
                    athleteIndex: parseInt(value) - 1
                  })}
                >
                  <SelectTrigger data-testid="select-line-number">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <SelectItem key={n} value={String(n)}>Line {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Which result slot this box shows (Line 1 = 1st result, Line 2 = 2nd, etc.)
                </p>
              </div>
              
              <Separator />
              
              {/* Delete */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  setBoxes(prev => prev.filter(b => b.id !== selectedBoxId));
                  setSelectedBoxId(null);
                }}
                data-testid="button-delete-box"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Box
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">Select a box to edit its properties</p>
            <p className="text-xs mt-2">
              Use the <Square className="w-3 h-3 inline" /> Draw tool to create boxes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
