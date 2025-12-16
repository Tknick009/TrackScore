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
  SceneDataBinding,
  SceneObjectConfig,
  SceneObjectStyle
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Plus, Save, Trash2, Eye, Monitor, 
  Type, Image, Grid3X3, MousePointer, 
  Copy, ChevronLeft, Layers, Settings
} from "lucide-react";
import { Link } from "wouter";

const FIELD_OPTIONS = [
  { value: 'place', label: 'Place', description: '1, 2, 3...' },
  { value: 'lane', label: 'Lane', description: 'Lane number' },
  { value: 'name', label: 'Name', description: 'Athlete full name' },
  { value: 'first-name', label: 'First Name', description: 'First name only' },
  { value: 'last-name', label: 'Last Name', description: 'Last name only' },
  { value: 'school', label: 'School/Team', description: 'Affiliation' },
  { value: 'time', label: 'Time/Mark', description: 'Result time or mark' },
  { value: 'reaction-time', label: 'Reaction Time', description: 'RT' },
  { value: 'bib', label: 'Bib Number', description: 'Bib #' },
  { value: 'running-time', label: 'Running Time', description: 'Clock' },
  { value: 'event-name', label: 'Event Name', description: 'e.g. Men\'s 100m' },
  { value: 'event-number', label: 'Event Number', description: 'Event #' },
  { value: 'heat-number', label: 'Heat Number', description: 'Heat #' },
  { value: 'wind', label: 'Wind', description: 'Wind reading' },
] as const;

const IMAGE_FIELD_OPTIONS = [
  { value: 'school-logo', label: 'School Logo', description: 'Team logo' },
  { value: 'athlete-photo', label: 'Athlete Photo', description: 'Headshot' },
  { value: 'static', label: 'Static Image', description: 'Fixed image' },
] as const;

type CanvasPreset = { name: string; width: number; height: number; ratio: string };
const CANVAS_PRESETS: CanvasPreset[] = [
  { name: 'P10 LED (192x96)', width: 192, height: 96, ratio: '2:1' },
  { name: 'P6 LED (288x144)', width: 288, height: 144, ratio: '2:1' },
  { name: 'BigBoard HD (1920x1080)', width: 1920, height: 1080, ratio: '16:9' },
  { name: 'Custom', width: 0, height: 0, ratio: 'custom' },
];

const SAMPLE_DATA = {
  entries: [
    { place: 1, lane: 4, name: 'Marcus Johnson', firstName: 'Marcus', lastName: 'Johnson', affiliation: 'Alabama', time: '10.23', reactionTime: '0.142', bib: '101' },
    { place: 2, lane: 6, name: 'Tyler Brooks', firstName: 'Tyler', lastName: 'Brooks', affiliation: 'LSU', time: '10.31', reactionTime: '0.156', bib: '205' },
    { place: 3, lane: 5, name: 'David Chen', firstName: 'David', lastName: 'Chen', affiliation: 'Oregon', time: '10.45', reactionTime: '0.138', bib: '312' },
    { place: 4, lane: 3, name: 'James Wilson', firstName: 'James', lastName: 'Wilson', affiliation: 'Florida', time: '10.52', reactionTime: '0.149', bib: '418' },
    { place: 5, lane: 7, name: 'Michael Davis', firstName: 'Michael', lastName: 'Davis', affiliation: 'Texas', time: '10.58', reactionTime: '0.161', bib: '523' },
    { place: 6, lane: 2, name: 'Chris Martin', firstName: 'Chris', lastName: 'Martin', affiliation: 'USC', time: '10.67', reactionTime: '0.144', bib: '629' },
    { place: 7, lane: 8, name: 'Kevin Lee', firstName: 'Kevin', lastName: 'Lee', affiliation: 'UCLA', time: '10.74', reactionTime: '0.152', bib: '734' },
    { place: 8, lane: 1, name: 'Brian Taylor', firstName: 'Brian', lastName: 'Taylor', affiliation: 'Georgia', time: '10.89', reactionTime: '0.165', bib: '841' },
  ],
  eventName: "MEN'S 100M DASH",
  eventNumber: 1,
  heat: 1,
  wind: '+1.2',
  runningTime: '00:10.23',
};

interface DragState {
  type: 'move' | 'resize' | 'draw';
  objectId?: number;
  startX: number;
  startY: number;
  startObjX: number;
  startObjY: number;
  startObjWidth: number;
  startObjHeight: number;
  resizeHandle?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
}

export default function ResulTVEditor() {
  const { currentMeet: meet } = useMeet();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [tool, setTool] = useState<'select' | 'draw-text' | 'draw-image'>('select');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [localDragPosition, setLocalDragPosition] = useState<{ objectId: number; x: number; y: number; width: number; height: number } | null>(null);
  const dragPositionRef = useRef<{ objectId: number; x: number; y: number; width: number; height: number } | null>(null);
  
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(CANVAS_PRESETS[0]);
  const [customWidth, setCustomWidth] = useState(192);
  const [customHeight, setCustomHeight] = useState(96);
  
  const { data: scenes = [], isLoading: loadingScenes } = useQuery<SelectLayoutScene[]>({
    queryKey: ['/api/layout-scenes', 'list', meet?.id],
    queryFn: async () => {
      if (!meet?.id) return [];
      const res = await fetch(`/api/layout-scenes?meetId=${meet.id}`);
      if (!res.ok) throw new Error('Failed to load layouts');
      return res.json();
    },
    enabled: !!meet?.id,
  });
  
  const { data: currentScene, isLoading: loadingScene } = useQuery<LayoutSceneWithObjects>({
    queryKey: ['/api/layout-scenes', selectedSceneId],
    queryFn: async () => {
      if (!selectedSceneId) throw new Error('No scene selected');
      const res = await fetch(`/api/layout-scenes/${selectedSceneId}`);
      if (!res.ok) throw new Error('Failed to load scene');
      return res.json();
    },
    enabled: !!selectedSceneId,
  });
  
  const createSceneMutation = useMutation({
    mutationFn: async (scene: InsertLayoutScene) => {
      const res = await apiRequest('POST', '/api/layout-scenes', scene);
      return res.json();
    },
    onSuccess: (newScene) => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', 'list'] });
      setSelectedSceneId(newScene.id);
      setShowNewSceneDialog(false);
      setNewSceneName('');
      toast({ title: "Layout created" });
    },
  });
  
  const createObjectMutation = useMutation({
    mutationFn: async ({ sceneId, object }: { sceneId: number; object: Omit<InsertLayoutObject, 'sceneId'> }) => {
      const res = await apiRequest('POST', `/api/layout-scenes/${sceneId}/objects`, object);
      return res.json();
    },
    onSuccess: (newObject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
      setSelectedObjectId(newObject.id);
      setTool('select');
      toast({ title: "Object added" });
    },
  });
  
  const updateObjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLayoutObject> }) => {
      const res = await apiRequest('PATCH', `/api/layout-objects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
    },
  });
  
  const deleteObjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/layout-objects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
      setSelectedObjectId(null);
      toast({ title: "Object deleted" });
    },
  });
  
  const selectedObject = currentScene?.objects.find(o => o.id === selectedObjectId);
  
  const handleCreateScene = () => {
    if (!meet?.id || !newSceneName.trim()) return;
    const width = selectedPreset.width || customWidth;
    const height = selectedPreset.height || customHeight;
    createSceneMutation.mutate({
      meetId: meet.id,
      name: newSceneName.trim(),
      canvasWidth: width,
      canvasHeight: height,
      aspectRatio: `${width}:${height}`,
      backgroundColor: '#000000',
    });
  };
  
  const snapToGrid = useCallback((value: number): number => {
    const SNAP_INCREMENT = 5;
    return Math.round(value / SNAP_INCREMENT) * SNAP_INCREMENT;
  }, []);
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (previewMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (tool === 'draw-text' || tool === 'draw-image') {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setDragState({
        type: 'draw',
        startX: e.clientX,
        startY: e.clientY,
        startObjX: showGrid ? snapToGrid(x) : x,
        startObjY: showGrid ? snapToGrid(y) : y,
        startObjWidth: 0,
        startObjHeight: 0,
      });
    } else {
      setSelectedObjectId(null);
    }
  };
  
  const handleObjectMouseDown = useCallback((e: React.MouseEvent, object: SelectLayoutObject, handle?: DragState['resizeHandle']) => {
    if (previewMode) return;
    e.stopPropagation();
    
    setSelectedObjectId(object.id);
    
    if (tool !== 'select') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setDragState({
      type: handle ? 'resize' : 'move',
      objectId: object.id,
      startX: e.clientX,
      startY: e.clientY,
      startObjX: object.x,
      startObjY: object.y,
      startObjWidth: object.width,
      startObjHeight: object.height,
      resizeHandle: handle,
    });
  }, [previewMode, tool]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;
    
    if (dragState.type === 'draw') {
      let width = Math.abs(deltaX);
      let height = Math.abs(deltaY);
      let x = deltaX >= 0 ? dragState.startObjX : dragState.startObjX + deltaX;
      let y = deltaY >= 0 ? dragState.startObjY : dragState.startObjY + deltaY;
      
      if (showGrid) {
        width = snapToGrid(width);
        height = snapToGrid(height);
        x = snapToGrid(x);
        y = snapToGrid(y);
      }
      
      const pos = { objectId: -1, x, y, width: Math.max(5, width), height: Math.max(5, height) };
      dragPositionRef.current = pos;
      setLocalDragPosition(pos);
    } else if (dragState.type === 'move' && dragState.objectId) {
      let newX = Math.max(0, Math.min(100 - dragState.startObjWidth, dragState.startObjX + deltaX));
      let newY = Math.max(0, Math.min(100 - dragState.startObjHeight, dragState.startObjY + deltaY));
      
      if (showGrid) {
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);
      }
      
      const pos = { objectId: dragState.objectId, x: newX, y: newY, width: dragState.startObjWidth, height: dragState.startObjHeight };
      dragPositionRef.current = pos;
      setLocalDragPosition(pos);
    } else if (dragState.type === 'resize' && dragState.objectId && dragState.resizeHandle) {
      let newX = dragState.startObjX;
      let newY = dragState.startObjY;
      let newWidth = dragState.startObjWidth;
      let newHeight = dragState.startObjHeight;
      
      switch (dragState.resizeHandle) {
        case 'se':
          newWidth = Math.max(5, dragState.startObjWidth + deltaX);
          newHeight = Math.max(5, dragState.startObjHeight + deltaY);
          break;
        case 'e':
          newWidth = Math.max(5, dragState.startObjWidth + deltaX);
          break;
        case 's':
          newHeight = Math.max(5, dragState.startObjHeight + deltaY);
          break;
        case 'sw':
          newX = Math.max(0, dragState.startObjX + deltaX);
          newWidth = Math.max(5, dragState.startObjWidth - deltaX);
          newHeight = Math.max(5, dragState.startObjHeight + deltaY);
          break;
        case 'ne':
          newY = Math.max(0, dragState.startObjY + deltaY);
          newWidth = Math.max(5, dragState.startObjWidth + deltaX);
          newHeight = Math.max(5, dragState.startObjHeight - deltaY);
          break;
        case 'nw':
          newX = Math.max(0, dragState.startObjX + deltaX);
          newY = Math.max(0, dragState.startObjY + deltaY);
          newWidth = Math.max(5, dragState.startObjWidth - deltaX);
          newHeight = Math.max(5, dragState.startObjHeight - deltaY);
          break;
        case 'w':
          newX = Math.max(0, dragState.startObjX + deltaX);
          newWidth = Math.max(5, dragState.startObjWidth - deltaX);
          break;
        case 'n':
          newY = Math.max(0, dragState.startObjY + deltaY);
          newHeight = Math.max(5, dragState.startObjHeight - deltaY);
          break;
      }
      
      if (showGrid) {
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);
        newWidth = snapToGrid(newWidth);
        newHeight = snapToGrid(newHeight);
      }
      
      const pos = { objectId: dragState.objectId, x: newX, y: newY, width: newWidth, height: newHeight };
      dragPositionRef.current = pos;
      setLocalDragPosition(pos);
    }
  }, [dragState, showGrid, snapToGrid]);
  
  const handleMouseUp = useCallback(() => {
    if (!dragState) return;
    
    if (dragState.type === 'draw' && dragPositionRef.current && selectedSceneId) {
      const { x, y, width, height } = dragPositionRef.current;
      if (width >= 5 && height >= 5) {
        const objectType = tool === 'draw-image' ? 'logo' : 'text';
        const newObject: Omit<InsertLayoutObject, 'sceneId'> = {
          name: objectType === 'logo' ? 'Image' : 'Text',
          objectType,
          x, y, width, height,
          zIndex: (currentScene?.objects.length || 0) + 1,
          dataBinding: { 
            sourceType: 'live-data',
            athleteIndex: 0,
            fieldKey: objectType === 'logo' ? 'school-logo' : 'name',
          },
          config: {},
          style: {
            fontSize: 24,
            textColor: '#ffffff',
          },
          visible: true,
          locked: false,
        };
        createObjectMutation.mutate({ sceneId: selectedSceneId, object: newObject });
      }
    } else if (dragState.objectId && dragPositionRef.current) {
      updateObjectMutation.mutate({
        id: dragState.objectId,
        data: { 
          x: dragPositionRef.current.x, 
          y: dragPositionRef.current.y,
          width: dragPositionRef.current.width,
          height: dragPositionRef.current.height,
        },
      });
    }
    
    dragPositionRef.current = null;
    setLocalDragPosition(null);
    setDragState(null);
  }, [dragState, selectedSceneId, tool, currentScene, createObjectMutation, updateObjectMutation]);
  
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);
  
  const getPreviewText = (object: SelectLayoutObject) => {
    const dataBinding = object.dataBinding as SceneDataBinding;
    const fieldKey = dataBinding?.fieldKey;
    const athleteIndex = dataBinding?.athleteIndex || 0;
    
    if (!fieldKey) return object.name || 'Text';
    
    const entry = SAMPLE_DATA.entries[athleteIndex];
    if (!entry && ['place', 'lane', 'name', 'first-name', 'last-name', 'school', 'time', 'reaction-time', 'bib'].includes(fieldKey)) {
      return `[Row ${athleteIndex + 1}]`;
    }
    
    const fieldMap: Record<string, string> = {
      'place': String(entry?.place || ''),
      'lane': String(entry?.lane || ''),
      'name': entry?.name || '',
      'first-name': entry?.firstName || '',
      'last-name': entry?.lastName || '',
      'school': entry?.affiliation || '',
      'time': entry?.time || '',
      'reaction-time': entry?.reactionTime || '',
      'bib': entry?.bib || '',
      'running-time': SAMPLE_DATA.runningTime,
      'event-name': SAMPLE_DATA.eventName,
      'event-number': String(SAMPLE_DATA.eventNumber),
      'heat-number': String(SAMPLE_DATA.heat),
      'wind': SAMPLE_DATA.wind,
    };
    
    return fieldMap[fieldKey] || `{${fieldKey}}`;
  };
  
  const renderObject = (object: SelectLayoutObject) => {
    const isSelected = object.id === selectedObjectId;
    const style = object.style as SceneObjectStyle;
    const dataBinding = object.dataBinding as SceneDataBinding;
    
    const position = localDragPosition?.objectId === object.id ? localDragPosition : null;
    const x = position ? position.x : object.x;
    const y = position ? position.y : object.y;
    const width = position ? position.width : object.width;
    const height = position ? position.height : object.height;
    
    const isImage = object.objectType === 'logo';
    const content = previewMode ? getPreviewText(object) : (
      isImage 
        ? `[${dataBinding?.fieldKey || 'Image'}]` 
        : `[${dataBinding?.fieldKey || 'Text'}: Row ${(dataBinding?.athleteIndex || 0) + 1}]`
    );
    
    return (
      <div
        key={object.id}
        className={`absolute cursor-move transition-shadow ${
          isSelected && !previewMode ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-black' : ''
        }`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${width}%`,
          height: `${height}%`,
          zIndex: object.zIndex,
          backgroundColor: previewMode ? 'transparent' : 'rgba(50, 50, 50, 0.8)',
          border: previewMode ? 'none' : '1px solid rgba(100, 100, 100, 0.5)',
          color: style?.textColor || '#ffffff',
          fontSize: `${Math.min(typeof style?.fontSize === 'number' ? style.fontSize : 14, height * 0.8)}px`,
        }}
        onMouseDown={(e) => handleObjectMouseDown(e, object)}
        data-testid={`object-${object.id}`}
      >
        <div 
          className="flex items-center justify-center h-full w-full overflow-hidden font-stadium uppercase"
          style={{ 
            fontFamily: "'Oswald', sans-serif",
            fontWeight: style?.fontWeight || 700,
          }}
        >
          {content}
        </div>
        
        {isSelected && !previewMode && (
          <>
            {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as const).map((handle) => {
              const pos: Record<string, string> = {
                nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
                ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
                sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
                se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
                n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
                s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
                e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
                w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
              };
              return (
                <div
                  key={handle}
                  className={`absolute w-3 h-3 bg-blue-500 border border-white ${pos[handle]}`}
                  onMouseDown={(e) => handleObjectMouseDown(e, object, handle)}
                />
              );
            })}
          </>
        )}
      </div>
    );
  };
  
  if (!meet) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a meet to edit layouts</p>
      </div>
    );
  }
  
  return (
    <div className="flex h-full bg-neutral-950">
      <div className="w-64 border-r flex flex-col bg-neutral-900">
        <div className="p-3 border-b flex items-center gap-2">
          <Link href={`/control/${meet.id}/displays`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold text-sm">Layout Editor</h1>
        </div>
        
        <div className="p-3 border-b">
          <Label className="text-xs text-muted-foreground mb-2 block">Layouts</Label>
          <div className="space-y-1">
            {scenes.map((scene) => (
              <Button
                key={scene.id}
                variant={selectedSceneId === scene.id ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedSceneId(scene.id)}
                data-testid={`button-scene-${scene.id}`}
              >
                <Layers className="w-4 h-4 mr-2" />
                {scene.name}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowNewSceneDialog(true)}
            data-testid="button-new-layout"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Layout
          </Button>
        </div>
        
        <div className="p-3 border-b">
          <Label className="text-xs text-muted-foreground mb-2 block">Tools</Label>
          <div className="flex gap-1">
            <Button
              variant={tool === 'select' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setTool('select')}
              title="Select & Move"
              data-testid="button-tool-select"
            >
              <MousePointer className="w-4 h-4" />
            </Button>
            <Button
              variant={tool === 'draw-text' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setTool('draw-text')}
              title="Draw Text Box"
              data-testid="button-tool-text"
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              variant={tool === 'draw-image' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setTool('draw-image')}
              title="Draw Image Box"
              data-testid="button-tool-image"
            >
              <Image className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-3 border-b flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Grid Snap</Label>
          <Switch checked={showGrid} onCheckedChange={setShowGrid} data-testid="switch-grid" />
        </div>
        
        <div className="p-3 border-b flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <Switch checked={previewMode} onCheckedChange={setPreviewMode} data-testid="switch-preview" />
        </div>
        
        {currentScene?.objects && currentScene.objects.length > 0 && (
          <div className="flex-1 overflow-auto p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Objects</Label>
            <div className="space-y-1">
              {currentScene.objects.map((obj) => {
                const db = obj.dataBinding as SceneDataBinding;
                return (
                  <Button
                    key={obj.id}
                    variant={selectedObjectId === obj.id ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setSelectedObjectId(obj.id)}
                    data-testid={`button-object-${obj.id}`}
                  >
                    {obj.objectType === 'logo' ? <Image className="w-3 h-3 mr-2" /> : <Type className="w-3 h-3 mr-2" />}
                    <span className="truncate">{db?.fieldKey || obj.name}</span>
                    <Badge variant="outline" className="ml-auto text-[10px] px-1">
                      R{(db?.athleteIndex || 0) + 1}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col">
        {currentScene ? (
          <>
            <div className="p-2 border-b bg-neutral-900 flex items-center gap-2">
              <span className="text-sm font-medium">{currentScene.name}</span>
              <Badge variant="outline" className="text-xs">
                {currentScene.canvasWidth} x {currentScene.canvasHeight}
              </Badge>
              {previewMode && (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  PREVIEW
                </Badge>
              )}
              {tool !== 'select' && (
                <Badge variant="default" className="bg-blue-600 text-xs">
                  {tool === 'draw-text' ? 'Draw Text' : 'Draw Image'}
                </Badge>
              )}
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-neutral-800">
              <div
                ref={canvasRef}
                className={`relative bg-black ${tool !== 'select' ? 'cursor-crosshair' : ''}`}
                style={{
                  width: '100%',
                  maxWidth: Math.min(800, currentScene.canvasWidth * 2),
                  aspectRatio: `${currentScene.canvasWidth} / ${currentScene.canvasHeight}`,
                  backgroundColor: currentScene.backgroundColor || '#000000',
                }}
                onMouseDown={handleCanvasMouseDown}
                data-testid="canvas"
              >
                {showGrid && !previewMode && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(100,100,100,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,100,100,0.3) 1px, transparent 1px)',
                      backgroundSize: '5% 5%',
                    }}
                  />
                )}
                
                {currentScene.objects.sort((a, b) => a.zIndex - b.zIndex).map(renderObject)}
                
                {dragState?.type === 'draw' && localDragPosition && (
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20"
                    style={{
                      left: `${localDragPosition.x}%`,
                      top: `${localDragPosition.y}%`,
                      width: `${localDragPosition.width}%`,
                      height: `${localDragPosition.height}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {loadingScene ? 'Loading...' : 'Select or create a layout'}
          </div>
        )}
      </div>
      
      <div className="w-72 border-l bg-neutral-900 flex flex-col">
        <div className="p-3 border-b">
          <h2 className="font-semibold text-sm">Properties</h2>
        </div>
        
        {selectedObject ? (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Object Type</Label>
                <Badge variant="secondary">
                  {selectedObject.objectType === 'logo' ? 'Image' : 'Text'}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Data Binding</h4>
                
                {selectedObject.objectType === 'logo' ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Image Type</Label>
                    <Select
                      value={(selectedObject.dataBinding as SceneDataBinding)?.fieldKey || 'school-logo'}
                      onValueChange={(value) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: {
                          dataBinding: {
                            ...(selectedObject.dataBinding as SceneDataBinding || {}),
                            sourceType: 'live-data',
                            fieldKey: value,
                          },
                        },
                      })}
                    >
                      <SelectTrigger data-testid="select-image-field">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_FIELD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div>{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={(selectedObject.dataBinding as SceneDataBinding)?.fieldKey || 'name'}
                      onValueChange={(value) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: {
                          dataBinding: {
                            ...(selectedObject.dataBinding as SceneDataBinding || {}),
                            sourceType: 'live-data',
                            fieldKey: value,
                          },
                        },
                      })}
                    >
                      <SelectTrigger data-testid="select-text-field">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div>{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {['place', 'lane', 'name', 'first-name', 'last-name', 'school', 'time', 'reaction-time', 'bib', 'school-logo', 'athlete-photo'].includes(
                  (selectedObject.dataBinding as SceneDataBinding)?.fieldKey || ''
                ) && (
                  <div className="space-y-2">
                    <Label className="text-xs">Row (Athlete #)</Label>
                    <Select
                      value={String((selectedObject.dataBinding as SceneDataBinding)?.athleteIndex || 0)}
                      onValueChange={(value) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: {
                          dataBinding: {
                            ...(selectedObject.dataBinding as SceneDataBinding || {}),
                            athleteIndex: parseInt(value),
                          },
                        },
                      })}
                    >
                      <SelectTrigger data-testid="select-row">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            Row {idx + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Position & Size</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">X (%)</Label>
                    <Input
                      type="number"
                      value={selectedObject.x.toFixed(0)}
                      onChange={(e) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: { x: parseFloat(e.target.value) || 0 },
                      })}
                      data-testid="input-x"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Y (%)</Label>
                    <Input
                      type="number"
                      value={selectedObject.y.toFixed(0)}
                      onChange={(e) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: { y: parseFloat(e.target.value) || 0 },
                      })}
                      data-testid="input-y"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Width (%)</Label>
                    <Input
                      type="number"
                      value={selectedObject.width.toFixed(0)}
                      onChange={(e) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: { width: parseFloat(e.target.value) || 10 },
                      })}
                      data-testid="input-width"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Height (%)</Label>
                    <Input
                      type="number"
                      value={selectedObject.height.toFixed(0)}
                      onChange={(e) => updateObjectMutation.mutate({
                        id: selectedObject.id,
                        data: { height: parseFloat(e.target.value) || 10 },
                      })}
                      data-testid="input-height"
                    />
                  </div>
                </div>
              </div>
              
              {selectedObject.objectType === 'text' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Text Style</h4>
                    <div className="space-y-2">
                      <Label className="text-xs">Font Size</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[typeof (selectedObject.style as SceneObjectStyle)?.fontSize === 'number' ? (selectedObject.style as SceneObjectStyle).fontSize as number : 24]}
                          onValueChange={([val]) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: {
                              style: {
                                ...(selectedObject.style as SceneObjectStyle || {}),
                                fontSize: val,
                              },
                            },
                          })}
                          min={8}
                          max={120}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs w-8 text-right">
                          {(selectedObject.style as SceneObjectStyle)?.fontSize || 24}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={(selectedObject.style as SceneObjectStyle)?.textColor || '#ffffff'}
                          onChange={(e) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: {
                              style: {
                                ...(selectedObject.style as SceneObjectStyle || {}),
                                textColor: e.target.value,
                              },
                            },
                          })}
                          className="w-12 h-8 p-0 border-0"
                          data-testid="input-text-color"
                        />
                        <Input
                          value={(selectedObject.style as SceneObjectStyle)?.textColor || '#ffffff'}
                          onChange={(e) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: {
                              style: {
                                ...(selectedObject.style as SceneObjectStyle || {}),
                                textColor: e.target.value,
                              },
                            },
                          })}
                          className="flex-1"
                          data-testid="input-text-color-hex"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => deleteObjectMutation.mutate(selectedObject.id)}
                data-testid="button-delete-object"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Object
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
            {tool === 'select' 
              ? 'Select an object to edit properties'
              : 'Draw a box on the canvas to create an object'
            }
          </div>
        )}
      </div>
      
      <Dialog open={showNewSceneDialog} onOpenChange={setShowNewSceneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Layout</DialogTitle>
            <DialogDescription>
              Create a new display layout for your scoreboard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Layout Name</Label>
              <Input
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                placeholder="e.g., 8-Lane Results"
                data-testid="input-layout-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Canvas Size</Label>
              <Select
                value={selectedPreset.name}
                onValueChange={(val) => {
                  const preset = CANVAS_PRESETS.find(p => p.name === val);
                  if (preset) setSelectedPreset(preset);
                }}
              >
                <SelectTrigger data-testid="select-canvas-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANVAS_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPreset.ratio === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (px)</Label>
                  <Input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value) || 192)}
                    data-testid="input-custom-width"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (px)</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value) || 96)}
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
            <Button 
              onClick={handleCreateScene} 
              disabled={!newSceneName.trim()}
              data-testid="button-create-layout"
            >
              Create Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
