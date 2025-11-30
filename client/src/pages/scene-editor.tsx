import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMeet } from "@/contexts/MeetContext";
import type { 
  Event, 
  SelectLayoutScene, 
  SelectLayoutObject, 
  InsertLayoutScene,
  InsertLayoutObject,
  LayoutSceneWithObjects,
  LayoutObjectType,
  SceneDataBinding,
  SceneObjectConfig,
  SceneObjectStyle,
  LAYOUT_OBJECT_TYPES 
} from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Save, Trash2, Eye, Monitor, Move, 
  Type, Clock, User, Users, Trophy, Image, 
  Settings, ChevronLeft, ChevronRight, Layers,
  MousePointer, Grid3X3, Maximize2, Copy, Wind,
  Timer, BarChart3, Flag, Award, 
  AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
  LayoutTemplate
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Object type definitions with icons and categories
const OBJECT_TYPE_INFO: Record<LayoutObjectType, { name: string; icon: typeof Type; category: string; description: string }> = {
  'results-table': { name: 'Results Table', icon: BarChart3, category: 'data', description: 'Shows results from one or more events' },
  'timer': { name: 'Timer', icon: Timer, category: 'timing', description: 'Live running time display' },
  'event-header': { name: 'Event Header', icon: Type, category: 'header', description: 'Event name and info' },
  'athlete-card': { name: 'Athlete Card', icon: User, category: 'athletes', description: 'Single athlete with photo' },
  'athlete-grid': { name: 'Athlete Grid', icon: Users, category: 'athletes', description: 'Grid of multiple athletes' },
  'team-standings': { name: 'Team Standings', icon: Trophy, category: 'scoring', description: 'Team score standings' },
  'lane-graphic': { name: 'Lane Graphic', icon: Grid3X3, category: 'visualization', description: 'Lane assignment visualization' },
  'attempt-tracker': { name: 'Attempt Tracker', icon: BarChart3, category: 'field', description: 'Field event attempts' },
  'logo': { name: 'Logo/Image', icon: Image, category: 'media', description: 'Image or logo display' },
  'text': { name: 'Text', icon: Type, category: 'static', description: 'Custom text block' },
  'clock': { name: 'Clock', icon: Clock, category: 'timing', description: 'Time of day' },
  'wind-reading': { name: 'Wind Reading', icon: Wind, category: 'data', description: 'Wind speed display' },
  'split-times': { name: 'Split Times', icon: Clock, category: 'timing', description: 'Split times display' },
  'record-indicator': { name: 'Record Indicator', icon: Award, category: 'data', description: 'Record alert indicator' },
};

const OBJECT_CATEGORIES = [
  { id: 'data', name: 'Data Display' },
  { id: 'timing', name: 'Timing' },
  { id: 'header', name: 'Headers' },
  { id: 'athletes', name: 'Athletes' },
  { id: 'scoring', name: 'Scoring' },
  { id: 'visualization', name: 'Visualization' },
  { id: 'field', name: 'Field Events' },
  { id: 'media', name: 'Media' },
  { id: 'static', name: 'Static' },
];

// Default sizes for each object type (in percentage)
const DEFAULT_OBJECT_SIZES: Record<LayoutObjectType, { width: number; height: number }> = {
  'results-table': { width: 40, height: 60 },
  'timer': { width: 30, height: 15 },
  'event-header': { width: 50, height: 10 },
  'athlete-card': { width: 20, height: 25 },
  'athlete-grid': { width: 60, height: 50 },
  'team-standings': { width: 35, height: 40 },
  'lane-graphic': { width: 80, height: 30 },
  'attempt-tracker': { width: 50, height: 40 },
  'logo': { width: 15, height: 15 },
  'text': { width: 30, height: 10 },
  'clock': { width: 20, height: 10 },
  'wind-reading': { width: 15, height: 8 },
  'split-times': { width: 40, height: 30 },
  'record-indicator': { width: 20, height: 8 },
};

// Field code presets for data binding
const FIELD_PRESETS = {
  'track-result': {
    name: 'Track Result Row',
    codes: '{place}. {name} ({affiliation}) - {time}',
    fields: ['place', 'lane', 'name', 'affiliation', 'time', 'reaction'],
  },
  'field-result': {
    name: 'Field Result Row',
    codes: '{place}. {name} ({affiliation}) - {mark}',
    fields: ['place', 'name', 'affiliation', 'mark', 'best_mark', 'attempts', 'wind'],
  },
  'athlete-name': {
    name: 'Athlete Name',
    codes: '{name}',
    fields: ['name', 'first_name', 'last_name'],
  },
  'time-result': {
    name: 'Time + Place',
    codes: '{place} - {time}',
    fields: ['place', 'time'],
  },
  'field-mark': {
    name: 'Mark + Wind',
    codes: '{mark} ({wind})',
    fields: ['mark', 'wind'],
  },
};

// Layout templates with pre-positioned objects
const LAYOUT_TEMPLATES = {
  'track-8lane': {
    name: '8-Lane Track Results',
    description: 'Standard 8-lane running event results board',
    objects: [
      { name: 'Event Header', objectType: 'event-header' as LayoutObjectType, x: 5, y: 2, width: 90, height: 8, zIndex: 1 },
      { name: 'Timer', objectType: 'timer' as LayoutObjectType, x: 70, y: 12, width: 25, height: 10, zIndex: 2 },
      { name: 'Lane 1', objectType: 'text' as LayoutObjectType, x: 5, y: 22, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 1', objectType: 'text' as LayoutObjectType, x: 67, y: 22, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 2', objectType: 'text' as LayoutObjectType, x: 5, y: 31, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 2', objectType: 'text' as LayoutObjectType, x: 67, y: 31, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 3', objectType: 'text' as LayoutObjectType, x: 5, y: 40, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 3', objectType: 'text' as LayoutObjectType, x: 67, y: 40, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 4', objectType: 'text' as LayoutObjectType, x: 5, y: 49, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 4', objectType: 'text' as LayoutObjectType, x: 67, y: 49, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 5', objectType: 'text' as LayoutObjectType, x: 5, y: 58, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 5', objectType: 'text' as LayoutObjectType, x: 67, y: 58, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 6', objectType: 'text' as LayoutObjectType, x: 5, y: 67, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 6', objectType: 'text' as LayoutObjectType, x: 67, y: 67, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 7', objectType: 'text' as LayoutObjectType, x: 5, y: 76, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 7', objectType: 'text' as LayoutObjectType, x: 67, y: 76, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
      { name: 'Lane 8', objectType: 'text' as LayoutObjectType, x: 5, y: 85, width: 60, height: 8, zIndex: 3, config: { dynamicText: '{place}. {name} ({affiliation})' } },
      { name: 'Time 8', objectType: 'text' as LayoutObjectType, x: 67, y: 85, width: 28, height: 8, zIndex: 3, config: { dynamicText: '{time}' } },
    ],
  },
  'field-standings': {
    name: 'Field Event Standings',
    description: 'Field event results with attempt tracker',
    objects: [
      { name: 'Event Header', objectType: 'event-header' as LayoutObjectType, x: 5, y: 2, width: 90, height: 8, zIndex: 1 },
      { name: 'Wind Reading', objectType: 'wind-reading' as LayoutObjectType, x: 80, y: 12, width: 15, height: 6, zIndex: 2 },
      { name: 'Results Table', objectType: 'results-table' as LayoutObjectType, x: 5, y: 18, width: 55, height: 75, zIndex: 3 },
      { name: 'Attempt Tracker', objectType: 'attempt-tracker' as LayoutObjectType, x: 62, y: 18, width: 33, height: 75, zIndex: 3 },
    ],
  },
  'running-time': {
    name: 'Running Time with Event Header',
    description: 'Large timer display with event information',
    objects: [
      { name: 'Event Header', objectType: 'event-header' as LayoutObjectType, x: 5, y: 5, width: 90, height: 12, zIndex: 1 },
      { name: 'Timer', objectType: 'timer' as LayoutObjectType, x: 15, y: 30, width: 70, height: 40, zIndex: 2 },
      { name: 'Status Text', objectType: 'text' as LayoutObjectType, x: 25, y: 75, width: 50, height: 10, zIndex: 3, config: { dynamicText: 'IN PROGRESS' } },
    ],
  },
  'team-standings': {
    name: 'Team Standings',
    description: 'Team scoring display with standings',
    objects: [
      { name: 'Header', objectType: 'text' as LayoutObjectType, x: 5, y: 2, width: 90, height: 10, zIndex: 1, config: { dynamicText: 'TEAM STANDINGS' } },
      { name: 'Team Standings', objectType: 'team-standings' as LayoutObjectType, x: 5, y: 15, width: 90, height: 80, zIndex: 2 },
    ],
  },
};

interface DragState {
  type: 'move' | 'resize';
  objectId: number;
  startX: number;
  startY: number;
  startObjX: number;
  startObjY: number;
  startObjWidth: number;
  startObjHeight: number;
  resizeHandle?: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';
}

export default function SceneEditor() {
  const { toast } = useToast();
  const { currentMeet } = useMeet();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [objectPaletteCategory, setObjectPaletteCategory] = useState<string>('all');
  
  // Fetch scenes for current meet
  const { data: scenes = [], isLoading: loadingScenes } = useQuery<SelectLayoutScene[]>({
    queryKey: ['/api/layout-scenes', { meetId: currentMeet?.id }],
    queryFn: async () => {
      if (!currentMeet?.id) return [];
      const res = await fetch(`/api/layout-scenes?meetId=${currentMeet.id}`);
      if (!res.ok) throw new Error('Failed to fetch scenes');
      return res.json();
    },
    enabled: !!currentMeet?.id,
  });
  
  // Fetch selected scene with objects
  const { data: currentScene, isLoading: loadingScene } = useQuery<LayoutSceneWithObjects>({
    queryKey: ['/api/layout-scenes', selectedSceneId],
    queryFn: async () => {
      if (!selectedSceneId) return null;
      const res = await fetch(`/api/layout-scenes/${selectedSceneId}`);
      if (!res.ok) throw new Error('Failed to fetch scene');
      return res.json();
    },
    enabled: !!selectedSceneId,
  });
  
  // Fetch events for data binding
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events', { meetId: currentMeet?.id }],
    enabled: !!currentMeet?.id,
  });
  
  // Create scene mutation
  const createSceneMutation = useMutation({
    mutationFn: async (scene: InsertLayoutScene) => {
      const res = await apiRequest('POST', '/api/layout-scenes', scene);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes'] });
      setShowNewSceneDialog(false);
      setNewSceneName("");
      toast({ title: "Scene created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create scene", description: error.message, variant: "destructive" });
    },
  });
  
  // Update scene mutation
  const updateSceneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLayoutScene> }) => {
      const res = await apiRequest('PATCH', `/api/layout-scenes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes'] });
      toast({ title: "Scene updated" });
    },
  });
  
  // Delete scene mutation
  const deleteSceneMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/layout-scenes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes'] });
      setSelectedSceneId(null);
      toast({ title: "Scene deleted" });
    },
  });
  
  // Create object mutation
  const createObjectMutation = useMutation({
    mutationFn: async ({ sceneId, object }: { sceneId: number; object: Omit<InsertLayoutObject, 'sceneId'> }) => {
      const res = await apiRequest('POST', `/api/layout-scenes/${sceneId}/objects`, object);
      return res.json();
    },
    onSuccess: (newObject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
      setSelectedObjectId(newObject.id);
      toast({ title: "Object added" });
    },
  });
  
  // Update object mutation
  const updateObjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLayoutObject> }) => {
      const res = await apiRequest('PATCH', `/api/layout-objects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
    },
  });
  
  // Delete object mutation
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
  
  // Get selected object
  const selectedObject = currentScene?.objects.find(o => o.id === selectedObjectId);
  
  // Handle adding a new object
  const handleAddObject = useCallback((objectType: LayoutObjectType) => {
    if (!selectedSceneId) return;
    
    const defaultSize = DEFAULT_OBJECT_SIZES[objectType];
    const newObject: Omit<InsertLayoutObject, 'sceneId'> = {
      name: OBJECT_TYPE_INFO[objectType].name,
      objectType,
      x: 10,
      y: 10,
      width: defaultSize.width,
      height: defaultSize.height,
      zIndex: (currentScene?.objects.length || 0) + 1,
      dataBinding: { sourceType: 'static' },
      config: {},
      style: {},
      visible: true,
      locked: false,
    };
    
    createObjectMutation.mutate({ sceneId: selectedSceneId, object: newObject });
  }, [selectedSceneId, currentScene, createObjectMutation]);
  
  // Handle mouse down on object (for drag/move)
  const handleObjectMouseDown = useCallback((e: React.MouseEvent, object: SelectLayoutObject, handle?: DragState['resizeHandle']) => {
    if (previewMode || object.locked) return;
    e.stopPropagation();
    
    setSelectedObjectId(object.id);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
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
  }, [previewMode]);
  
  // Snap value to grid (5% increments)
  const snapToGrid = useCallback((value: number): number => {
    const SNAP_INCREMENT = 5;
    return Math.round(value / SNAP_INCREMENT) * SNAP_INCREMENT;
  }, []);

  // Handle mouse move (for dragging)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;
    
    if (dragState.type === 'move') {
      let newX = Math.max(0, Math.min(100 - dragState.startObjWidth, dragState.startObjX + deltaX));
      let newY = Math.max(0, Math.min(100 - dragState.startObjHeight, dragState.startObjY + deltaY));
      
      // Snap to grid when grid is visible
      if (showGrid) {
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);
      }
      
      updateObjectMutation.mutate({
        id: dragState.objectId,
        data: { x: newX, y: newY },
      });
    } else if (dragState.type === 'resize' && dragState.resizeHandle) {
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
      
      // Snap to grid when grid is visible
      if (showGrid) {
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);
        newWidth = snapToGrid(newWidth);
        newHeight = snapToGrid(newHeight);
      }
      
      updateObjectMutation.mutate({
        id: dragState.objectId,
        data: { x: newX, y: newY, width: newWidth, height: newHeight },
      });
    }
  }, [dragState, updateObjectMutation, showGrid, snapToGrid]);
  
  // Handle mouse up (end drag)
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);
  
  // Attach global mouse listeners
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
  
  // Render an object on the canvas
  const renderObject = (object: SelectLayoutObject) => {
    const isSelected = selectedObjectId === object.id;
    const info = OBJECT_TYPE_INFO[object.objectType as LayoutObjectType];
    const Icon = info?.icon || Type;
    
    return (
      <div
        key={object.id}
        className={`absolute transition-shadow ${
          isSelected && !previewMode ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-black' : ''
        } ${object.locked ? 'opacity-75' : 'cursor-move'} ${
          !object.visible ? 'opacity-40' : ''
        }`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          width: `${object.width}%`,
          height: `${object.height}%`,
          zIndex: object.zIndex,
          transform: object.rotation ? `rotate(${object.rotation}deg)` : undefined,
          backgroundColor: (object.style as SceneObjectStyle)?.backgroundColor || 'rgba(30, 30, 40, 0.9)',
          borderColor: (object.style as SceneObjectStyle)?.borderColor || 'rgba(100, 100, 120, 0.5)',
          borderWidth: (object.style as SceneObjectStyle)?.borderWidth ?? 1,
          borderStyle: 'solid',
          borderRadius: (object.style as SceneObjectStyle)?.borderRadius ?? 4,
        }}
        onMouseDown={(e) => handleObjectMouseDown(e, object)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedObjectId(object.id);
        }}
        data-testid={`layout-object-${object.id}`}
      >
        {/* Object content preview */}
        <div className="w-full h-full flex flex-col items-center justify-center text-white p-2 overflow-hidden">
          <Icon className="w-6 h-6 mb-1 opacity-60" />
          <span className="text-xs text-center opacity-80 truncate w-full">
            {object.name || info?.name || object.objectType}
          </span>
        </div>
        
        {/* Resize handles (only when selected and not in preview) */}
        {isSelected && !previewMode && !object.locked && (
          <>
            <div
              className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 cursor-nw-resize"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'nw')}
            />
            <div
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 cursor-ne-resize"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'ne')}
            />
            <div
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-400 cursor-sw-resize"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'sw')}
            />
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 cursor-se-resize"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'se')}
            />
            <div
              className="absolute top-1/2 -left-1 w-2 h-4 bg-yellow-400 cursor-w-resize -translate-y-1/2"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'w')}
            />
            <div
              className="absolute top-1/2 -right-1 w-2 h-4 bg-yellow-400 cursor-e-resize -translate-y-1/2"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'e')}
            />
            <div
              className="absolute -top-1 left-1/2 w-4 h-2 bg-yellow-400 cursor-n-resize -translate-x-1/2"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 'n')}
            />
            <div
              className="absolute -bottom-1 left-1/2 w-4 h-2 bg-yellow-400 cursor-s-resize -translate-x-1/2"
              onMouseDown={(e) => handleObjectMouseDown(e, object, 's')}
            />
          </>
        )}
      </div>
    );
  };
  
  // Get selected objects (for alignment)
  const selectedObjects = currentScene?.objects.filter(o => o.id === selectedObjectId) || [];
  
  // Alignment handlers
  const handleAlignLeft = useCallback(() => {
    if (!selectedObject) return;
    updateObjectMutation.mutate({
      id: selectedObject.id,
      data: { x: 0 },
    });
  }, [selectedObject, updateObjectMutation]);

  const handleAlignCenter = useCallback(() => {
    if (!selectedObject) return;
    const newX = (100 - selectedObject.width) / 2;
    updateObjectMutation.mutate({
      id: selectedObject.id,
      data: { x: showGrid ? snapToGrid(newX) : newX },
    });
  }, [selectedObject, updateObjectMutation, showGrid, snapToGrid]);

  const handleAlignRight = useCallback(() => {
    if (!selectedObject) return;
    updateObjectMutation.mutate({
      id: selectedObject.id,
      data: { x: 100 - selectedObject.width },
    });
  }, [selectedObject, updateObjectMutation]);

  const handleAlignTop = useCallback(() => {
    if (!selectedObject) return;
    updateObjectMutation.mutate({
      id: selectedObject.id,
      data: { y: 0 },
    });
  }, [selectedObject, updateObjectMutation]);

  const handleAlignMiddle = useCallback(() => {
    if (!selectedObject) return;
    const newY = (100 - selectedObject.height) / 2;
    updateObjectMutation.mutate({
      id: selectedObject.id,
      data: { y: showGrid ? snapToGrid(newY) : newY },
    });
  }, [selectedObject, updateObjectMutation, showGrid, snapToGrid]);

  const handleAlignBottom = useCallback(() => {
    if (!selectedObject) return;
    updateObjectMutation.mutate({
      id: selectedObject.id,
      data: { y: 100 - selectedObject.height },
    });
  }, [selectedObject, updateObjectMutation]);

  const handleDistributeHorizontally = useCallback(() => {
    if (!currentScene || currentScene.objects.length < 2) return;
    const objects = [...currentScene.objects].sort((a, b) => a.x - b.x);
    const totalWidth = objects.reduce((sum, o) => sum + o.width, 0);
    const availableSpace = 100 - totalWidth;
    const spacing = availableSpace / (objects.length + 1);
    
    let currentX = spacing;
    objects.forEach((obj) => {
      updateObjectMutation.mutate({
        id: obj.id,
        data: { x: showGrid ? snapToGrid(currentX) : currentX },
      });
      currentX += obj.width + spacing;
    });
  }, [currentScene, updateObjectMutation, showGrid, snapToGrid]);

  const handleDistributeVertically = useCallback(() => {
    if (!currentScene || currentScene.objects.length < 2) return;
    const objects = [...currentScene.objects].sort((a, b) => a.y - b.y);
    const totalHeight = objects.reduce((sum, o) => sum + o.height, 0);
    const availableSpace = 100 - totalHeight;
    const spacing = availableSpace / (objects.length + 1);
    
    let currentY = spacing;
    objects.forEach((obj) => {
      updateObjectMutation.mutate({
        id: obj.id,
        data: { y: showGrid ? snapToGrid(currentY) : currentY },
      });
      currentY += obj.height + spacing;
    });
  }, [currentScene, updateObjectMutation, showGrid, snapToGrid]);

  // Create scene from template
  const handleCreateFromTemplate = useCallback(async (templateKey: keyof typeof LAYOUT_TEMPLATES) => {
    if (!currentMeet?.id) return;
    
    const template = LAYOUT_TEMPLATES[templateKey];
    
    // First create the scene
    const sceneRes = await apiRequest('POST', '/api/layout-scenes', {
      meetId: currentMeet.id,
      name: template.name,
      canvasWidth: 1920,
      canvasHeight: 1080,
      aspectRatio: '16:9',
      backgroundColor: '#000000',
    });
    const newScene = await sceneRes.json();
    
    // Then add all the objects
    for (const objTemplate of template.objects) {
      await apiRequest('POST', `/api/layout-scenes/${newScene.id}/objects`, {
        name: objTemplate.name,
        objectType: objTemplate.objectType,
        x: objTemplate.x,
        y: objTemplate.y,
        width: objTemplate.width,
        height: objTemplate.height,
        zIndex: objTemplate.zIndex,
        config: objTemplate.config || {},
        dataBinding: { sourceType: 'static' },
        style: {},
        visible: true,
        locked: false,
      });
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes'] });
    setSelectedSceneId(newScene.id);
    toast({ title: `Created "${template.name}" scene` });
  }, [currentMeet, toast]);

  // Filter objects by category
  const filteredObjectTypes = Object.entries(OBJECT_TYPE_INFO).filter(([_, info]) => 
    objectPaletteCategory === 'all' || info.category === objectPaletteCategory
  );
  
  return (
    <div className="h-screen flex flex-col bg-background" data-testid="scene-editor">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Scene Editor</h1>
          {currentMeet && (
            <Badge variant="outline">{currentMeet.name}</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            data-testid="button-toggle-grid"
          >
            <Grid3X3 className="w-4 h-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={previewMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            data-testid="button-toggle-preview"
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {selectedSceneId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = `/scene-display/${selectedSceneId}?meetId=${currentMeet?.id || ''}`;
                window.open(url, '_blank');
              }}
              data-testid="button-open-display"
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              Open Display
            </Button>
          )}
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewSceneDialog(true)}
            data-testid="button-new-scene"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Scene
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Scene list & Templates */}
        <div className="w-56 border-r flex flex-col">
          <Tabs defaultValue="scenes" className="flex-1 flex flex-col">
            <TabsList className="mx-2 mt-2">
              <TabsTrigger value="scenes" className="flex-1" data-testid="tab-scenes">Scenes</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1" data-testid="tab-templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scenes" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {scenes.map((scene) => (
                    <Button
                      key={scene.id}
                      variant={selectedSceneId === scene.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedSceneId(scene.id)}
                      data-testid={`scene-item-${scene.id}`}
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      <span className="truncate">{scene.name}</span>
                    </Button>
                  ))}
                  {scenes.length === 0 && !loadingScenes && (
                    <p className="text-sm text-muted-foreground p-2">No scenes yet</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="templates" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  <p className="text-xs text-muted-foreground px-1">Click to create a new scene from template</p>
                  {Object.entries(LAYOUT_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-auto py-2 flex-col items-start gap-0.5"
                      onClick={() => handleCreateFromTemplate(key as keyof typeof LAYOUT_TEMPLATES)}
                      disabled={!currentMeet?.id}
                      data-testid={`button-template-${key}`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <LayoutTemplate className="w-4 h-4 shrink-0" />
                        <span className="truncate text-left">{template.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground pl-6 text-left line-clamp-2">{template.description}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
          {selectedSceneId && currentScene ? (
            <>
              {/* Canvas toolbar */}
              <div className="flex items-center justify-between p-2 bg-neutral-800 border-b border-neutral-700">
                <span className="text-sm text-white">{currentScene.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">
                    {currentScene.canvasWidth} x {currentScene.canvasHeight}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-neutral-400 hover:text-white"
                    onClick={() => {
                      if (confirm('Delete this scene?')) {
                        deleteSceneMutation.mutate(selectedSceneId);
                      }
                    }}
                    data-testid="button-delete-scene"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Alignment toolbar */}
              <div className="flex items-center gap-1 p-2 bg-neutral-850 border-b border-neutral-700 flex-wrap">
                <span className="text-xs text-neutral-400 mr-2">Align:</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleAlignLeft}
                  disabled={!selectedObject}
                  title="Align Left"
                  data-testid="button-align-left"
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleAlignCenter}
                  disabled={!selectedObject}
                  title="Align Center"
                  data-testid="button-align-center"
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleAlignRight}
                  disabled={!selectedObject}
                  title="Align Right"
                  data-testid="button-align-right"
                >
                  <AlignRight className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1 bg-neutral-600" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleAlignTop}
                  disabled={!selectedObject}
                  title="Align Top"
                  data-testid="button-align-top"
                >
                  <AlignVerticalJustifyStart className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleAlignMiddle}
                  disabled={!selectedObject}
                  title="Align Middle"
                  data-testid="button-align-middle"
                >
                  <AlignVerticalJustifyCenter className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleAlignBottom}
                  disabled={!selectedObject}
                  title="Align Bottom"
                  data-testid="button-align-bottom"
                >
                  <AlignVerticalJustifyEnd className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1 bg-neutral-600" />
                <span className="text-xs text-neutral-400 mx-1">Distribute:</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleDistributeHorizontally}
                  disabled={!currentScene || currentScene.objects.length < 2}
                  title="Distribute Horizontally"
                  data-testid="button-distribute-horizontal"
                >
                  <AlignHorizontalSpaceAround className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-400 hover:text-white"
                  onClick={handleDistributeVertically}
                  disabled={!currentScene || currentScene.objects.length < 2}
                  title="Distribute Vertically"
                  data-testid="button-distribute-vertical"
                >
                  <AlignVerticalSpaceAround className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Canvas area */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <div
                  ref={canvasRef}
                  className="relative bg-black"
                  style={{
                    width: '100%',
                    maxWidth: '1200px',
                    aspectRatio: currentScene.aspectRatio || '16/9',
                    backgroundColor: currentScene.backgroundColor || '#000000',
                    backgroundImage: currentScene.backgroundImage ? `url(${currentScene.backgroundImage})` : undefined,
                    backgroundSize: 'cover',
                  }}
                  onClick={() => setSelectedObjectId(null)}
                  data-testid="scene-canvas"
                >
                  {/* Grid overlay */}
                  {showGrid && !previewMode && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: 'linear-gradient(rgba(100,100,100,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(100,100,100,0.2) 1px, transparent 1px)',
                        backgroundSize: '5% 5%',
                      }}
                    />
                  )}
                  
                  {/* Objects */}
                  {currentScene.objects
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map(renderObject)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              {loadingScene ? 'Loading...' : 'Select or create a scene'}
            </div>
          )}
        </div>
        
        {/* Right sidebar - Object palette & Properties */}
        <div className="w-80 border-l flex flex-col">
          <Tabs defaultValue="objects" className="flex-1 flex flex-col">
            <TabsList className="mx-2 mt-2">
              <TabsTrigger value="objects" className="flex-1">Objects</TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
            </TabsList>
            
            {/* Objects palette */}
            <TabsContent value="objects" className="flex-1 flex flex-col m-0 overflow-hidden">
              <div className="p-2 border-b">
                <Select value={objectPaletteCategory} onValueChange={setObjectPaletteCategory}>
                  <SelectTrigger data-testid="select-object-category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {OBJECT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2 grid grid-cols-2 gap-2">
                  {filteredObjectTypes.map(([type, info]) => {
                    const Icon = info.icon;
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => handleAddObject(type as LayoutObjectType)}
                        disabled={!selectedSceneId}
                        data-testid={`button-add-${type}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs text-center">{info.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Properties panel */}
            <TabsContent value="properties" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1">
                {selectedObject ? (
                  <div className="p-3 space-y-4">
                    {/* Object info */}
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={selectedObject.name || ''}
                        onChange={(e) => updateObjectMutation.mutate({
                          id: selectedObject.id,
                          data: { name: e.target.value },
                        })}
                        placeholder="Object name"
                        data-testid="input-object-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Badge variant="secondary">
                        {OBJECT_TYPE_INFO[selectedObject.objectType as LayoutObjectType]?.name || selectedObject.objectType}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    {/* Position & Size */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Position & Size</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">X (%)</Label>
                          <Input
                            type="number"
                            value={selectedObject.x.toFixed(1)}
                            onChange={(e) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: { x: parseFloat(e.target.value) || 0 },
                            })}
                            data-testid="input-object-x"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Y (%)</Label>
                          <Input
                            type="number"
                            value={selectedObject.y.toFixed(1)}
                            onChange={(e) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: { y: parseFloat(e.target.value) || 0 },
                            })}
                            data-testid="input-object-y"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Width (%)</Label>
                          <Input
                            type="number"
                            value={selectedObject.width.toFixed(1)}
                            onChange={(e) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: { width: parseFloat(e.target.value) || 10 },
                            })}
                            data-testid="input-object-width"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Height (%)</Label>
                          <Input
                            type="number"
                            value={selectedObject.height.toFixed(1)}
                            onChange={(e) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: { height: parseFloat(e.target.value) || 10 },
                            })}
                            data-testid="input-object-height"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Z-Index</Label>
                        <Input
                          type="number"
                          value={selectedObject.zIndex}
                          onChange={(e) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: { zIndex: parseInt(e.target.value) || 0 },
                          })}
                          data-testid="input-object-zindex"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Data Binding */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Data Source</h4>
                      <div className="space-y-2">
                        <Label className="text-xs">Source Type</Label>
                        <Select
                          value={(selectedObject.dataBinding as SceneDataBinding)?.sourceType || 'static'}
                          onValueChange={(value) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: {
                              dataBinding: {
                                ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                sourceType: value as SceneDataBinding['sourceType'],
                              },
                            },
                          })}
                        >
                          <SelectTrigger data-testid="select-data-source">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static">Static (No data)</SelectItem>
                            <SelectItem value="events">Specific Event(s)</SelectItem>
                            <SelectItem value="current-track">Current Track Event</SelectItem>
                            <SelectItem value="current-field">Current Field Event</SelectItem>
                            <SelectItem value="live-data">Live Lynx Data</SelectItem>
                            <SelectItem value="standings">Team Standings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Event selection for 'events' source type */}
                      {(selectedObject.dataBinding as SceneDataBinding)?.sourceType === 'events' && (
                        <div className="space-y-2">
                          <Label className="text-xs">Events</Label>
                          <Select
                            value={(selectedObject.dataBinding as SceneDataBinding)?.eventIds?.[0] || ''}
                            onValueChange={(value) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: {
                                dataBinding: {
                                  ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                  eventIds: [value],
                                },
                              },
                            })}
                          >
                            <SelectTrigger data-testid="select-event">
                              <SelectValue placeholder="Select event" />
                            </SelectTrigger>
                            <SelectContent>
                              {events.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  {event.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Port selection for live-data or current-field */}
                      {((selectedObject.dataBinding as SceneDataBinding)?.sourceType === 'live-data' ||
                        (selectedObject.dataBinding as SceneDataBinding)?.sourceType === 'current-field') && (
                        <div className="space-y-2">
                          <Label className="text-xs">Lynx Port</Label>
                          <Select
                            value={String((selectedObject.dataBinding as SceneDataBinding)?.lynxPort || 5055)}
                            onValueChange={(value) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: {
                                dataBinding: {
                                  ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                  lynxPort: parseInt(value),
                                },
                              },
                            })}
                          >
                            <SelectTrigger data-testid="select-lynx-port">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5055">5055 - Track Results</SelectItem>
                              <SelectItem value="5056">5056 - Track Clock</SelectItem>
                              <SelectItem value="5057">5057 - Field Results</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Enhanced text field binding for text objects */}
                      {selectedObject.objectType === 'text' && (selectedObject.dataBinding as SceneDataBinding)?.sourceType !== 'static' && (
                        <div className="space-y-3 mt-4 p-3 bg-muted/50 rounded-md">
                          <h5 className="font-medium text-xs text-muted-foreground">Field Binding (Text Objects)</h5>
                          
                          {/* Field preset dropdown */}
                          <div className="space-y-2">
                            <Label className="text-xs">Field Presets</Label>
                            <Select
                              value=""
                              onValueChange={(value) => {
                                const preset = FIELD_PRESETS.find(p => p.id === value);
                                if (preset) {
                                  updateObjectMutation.mutate({
                                    id: selectedObject.id,
                                    data: {
                                      dataBinding: {
                                        ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                        fieldCode: preset.template,
                                      },
                                    },
                                  });
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-field-preset">
                                <SelectValue placeholder="Choose a field preset..." />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_PRESETS.map((preset) => (
                                  <SelectItem key={preset.id} value={preset.id}>
                                    <div className="flex flex-col">
                                      <span>{preset.name}</span>
                                      <span className="text-xs text-muted-foreground">{preset.template}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Dynamic field code input */}
                          <div className="space-y-2">
                            <Label className="text-xs">Field Code</Label>
                            <Input
                              value={(selectedObject.dataBinding as SceneDataBinding)?.fieldCode || ''}
                              onChange={(e) => updateObjectMutation.mutate({
                                id: selectedObject.id,
                                data: {
                                  dataBinding: {
                                    ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                    fieldCode: e.target.value,
                                  },
                                },
                              })}
                              placeholder="{place}. {name} - {time}"
                              data-testid="input-field-code"
                            />
                            <p className="text-xs text-muted-foreground">
                              Use field codes like: {'{place}'}, {'{name}'}, {'{affiliation}'}, {'{time}'}, {'{mark}'}, {'{wind}'}
                            </p>
                          </div>
                          
                          {/* Preview */}
                          {(selectedObject.dataBinding as SceneDataBinding)?.fieldCode && (
                            <div className="space-y-2">
                              <Label className="text-xs">Preview</Label>
                              <div className="p-2 bg-black/20 rounded text-sm font-mono" data-testid="text-field-preview">
                                {(selectedObject.dataBinding as SceneDataBinding)?.fieldCode
                                  ?.replace('{place}', '1')
                                  .replace('{lane}', '4')
                                  .replace('{name}', 'John Smith')
                                  .replace('{affiliation}', 'Track Club')
                                  .replace('{time}', '10.54')
                                  .replace('{reaction}', '0.142')
                                  .replace('{mark}', '7.82m')
                                  .replace('{best_mark}', '7.95m')
                                  .replace('{attempts}', 'X P 7.82')
                                  .replace('{wind}', '+1.2')
                                }
                              </div>
                            </div>
                          )}
                          
                          {/* Available field codes */}
                          <div className="space-y-1">
                            <Label className="text-xs">Available Fields</Label>
                            <div className="flex flex-wrap gap-1">
                              {['{place}', '{lane}', '{name}', '{affiliation}', '{time}', '{reaction}', '{mark}', '{best_mark}', '{attempts}', '{wind}'].map((code) => (
                                <Badge
                                  key={code}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-accent"
                                  onClick={() => {
                                    const currentCode = (selectedObject.dataBinding as SceneDataBinding)?.fieldCode || '';
                                    updateObjectMutation.mutate({
                                      id: selectedObject.id,
                                      data: {
                                        dataBinding: {
                                          ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                          fieldCode: currentCode + code,
                                        },
                                      },
                                    });
                                  }}
                                  data-testid={`badge-field-${code.replace(/[{}]/g, '')}`}
                                >
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Visibility & Lock */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Visible</Label>
                        <Switch
                          checked={selectedObject.visible ?? true}
                          onCheckedChange={(checked) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: { visible: checked },
                          })}
                          data-testid="switch-visible"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Locked</Label>
                        <Switch
                          checked={selectedObject.locked ?? false}
                          onCheckedChange={(checked) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: { locked: checked },
                          })}
                          data-testid="switch-locked"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Delete button */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteObjectMutation.mutate(selectedObject.id)}
                      data-testid="button-delete-object"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Object
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Select an object to edit its properties
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* New Scene Dialog */}
      <Dialog open={showNewSceneDialog} onOpenChange={setShowNewSceneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Scene</DialogTitle>
            <DialogDescription>
              Create a new layout scene for your display board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scene Name</Label>
              <Input
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                placeholder="e.g., Track Results, Field Display"
                data-testid="input-new-scene-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSceneDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newSceneName.trim() || !currentMeet?.id) return;
                createSceneMutation.mutate({
                  meetId: currentMeet.id,
                  name: newSceneName.trim(),
                  canvasWidth: 1920,
                  canvasHeight: 1080,
                  aspectRatio: '16:9',
                  backgroundColor: '#000000',
                });
              }}
              disabled={!newSceneName.trim() || createSceneMutation.isPending}
              data-testid="button-create-scene"
            >
              Create Scene
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
