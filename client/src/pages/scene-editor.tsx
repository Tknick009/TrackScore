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
  LayoutTemplate, Upload, AlertCircle, Check, Download, FolderUp
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

// Get field label for preview display
const getFieldLabel = (fieldKey: string): string => {
  const labels: Record<string, string> = {
    'event-name': 'EVENT NAME',
    'event-number': 'EVENT #',
    'heat-number': 'HEAT #',
    'distance': 'DISTANCE',
    'wind': 'WIND',
    'lane': 'LANE',
    'place': 'PLACE',
    'name': 'NAME',
    'first-name': 'FIRST',
    'last-name': 'LAST',
    'school': 'SCHOOL',
    'time': 'TIME',
    'mark': 'MARK',
    'reaction-time': 'REACT',
    'bib': 'BIB',
    'running-time': '0:00.00',
  };
  return labels[fieldKey] || fieldKey.toUpperCase();
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
  
  // Local drag position state (for smooth visual updates without API calls)
  const dragPositionRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [localDragPosition, setLocalDragPosition] = useState<{ objectId: number; x: number; y: number; width: number; height: number } | null>(null);
  
  // State
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [objectPaletteCategory, setObjectPaletteCategory] = useState<string>('all');
  
  // RTV Import state
  const [showRtvImportDialog, setShowRtvImportDialog] = useState(false);
  const [rtvImportLoading, setRtvImportLoading] = useState(false);
  const [rtvParsedObjects, setRtvParsedObjects] = useState<Array<{
    name: string;
    textContent: string;
    x: number;
    y: number;
    width: number;
    height: number;
    suggestedFieldCode: string | null;
    selected: boolean;
    editedFieldCode: string;
  }>>([]);
  const [rtvImportWarnings, setRtvImportWarnings] = useState<string[]>([]);
  
  // Scene Export/Import state
  const [showSceneImportDialog, setShowSceneImportDialog] = useState(false);
  const [sceneImportFile, setSceneImportFile] = useState<File | null>(null);
  const [sceneImportData, setSceneImportData] = useState<any>(null);
  const [sceneImportLoading, setSceneImportLoading] = useState(false);
  const sceneImportInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Batch update objects mutation (for alignment/distribute operations)
  const batchUpdateObjectsMutation = useMutation({
    mutationFn: async (updates: Array<{ id: number; data: { x?: number; y?: number; width?: number; height?: number } }>) => {
      const res = await apiRequest('POST', '/api/layout-objects/batch-update', { updates });
      const result = await res.json();
      // Check for partial failures (207 Multi-Status)
      if (result.failedIds && result.failedIds.length > 0) {
        throw new Error(`${result.failedIds.length} objects failed to update`);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
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

  // Handle mouse move (for dragging) - update local state only, no API calls
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
      
      // Update local state only (no API call during drag)
      const pos = { objectId: dragState.objectId, x: newX, y: newY, width: dragState.startObjWidth, height: dragState.startObjHeight };
      dragPositionRef.current = pos;
      setLocalDragPosition(pos);
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
      
      // Update local state only (no API call during drag)
      const pos = { objectId: dragState.objectId, x: newX, y: newY, width: newWidth, height: newHeight };
      dragPositionRef.current = pos;
      setLocalDragPosition(pos);
    }
  }, [dragState, showGrid, snapToGrid]);
  
  // Handle mouse up (end drag) - persist to API only on mouse up
  const handleMouseUp = useCallback(() => {
    if (dragState && dragPositionRef.current) {
      // Persist the final position to the API
      updateObjectMutation.mutate({
        id: dragState.objectId,
        data: { 
          x: dragPositionRef.current.x, 
          y: dragPositionRef.current.y,
          width: dragPositionRef.current.width,
          height: dragPositionRef.current.height
        },
      });
    }
    dragPositionRef.current = null;
    setLocalDragPosition(null);
    setDragState(null);
  }, [dragState, updateObjectMutation]);
  
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
  
  // Render preview content for an object type
  const renderPreviewContent = (object: SelectLayoutObject) => {
    const objectType = object.objectType as LayoutObjectType;
    const config = object.config as SceneObjectConfig;
    const dataBinding = object.dataBinding as SceneDataBinding;
    const style = object.style as SceneObjectStyle;
    
    const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : parseInt(String(style?.fontSize || 14), 10);
    const textAlign = style?.textAlign || 'center';
    
    // Determine if this is a field event based on data source
    const isFieldEvent = dataBinding?.sourceType === 'current-field' || 
                         (dataBinding?.sourceType === 'events' && dataBinding?.eventIds?.some(id => id?.includes('field')));
    
    switch (objectType) {
      case 'text': {
        // Show field key label or static text
        const fieldKey = dataBinding?.fieldKey;
        const textTemplate = config?.dynamicText || config?.text || object.name || '';
        
        // If bound to a field, show the field label
        const displayText = fieldKey ? getFieldLabel(fieldKey) : textTemplate || 'TEXT';
        
        return (
          <div 
            className="w-full h-full flex items-center overflow-hidden px-2"
            style={{ fontSize: `${Math.max(10, Math.min(fontSize, 48))}px`, textAlign }}
          >
            <span className="w-full text-white font-semibold" style={{ textAlign }}>
              {displayText}
            </span>
          </div>
        );
      }
      
      case 'timer': {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-2" data-testid="preview-timer">
            <span className="text-4xl font-bold text-white font-mono tracking-wider">
              0:00.00
            </span>
            <span className="text-xs text-white/70 mt-1">
              LIVE TIMER
            </span>
          </div>
        );
      }
      
      case 'clock': {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return (
          <div className="w-full h-full flex items-center justify-center p-2" data-testid="preview-clock">
            <span className="text-2xl font-bold text-white font-mono">
              {timeStr}
            </span>
          </div>
        );
      }
      
      case 'event-header': {
        return (
          <div className="w-full h-full flex flex-col justify-center px-3 py-2" data-testid="preview-event-header">
            <span className="text-xl font-bold text-white">
              EVENT NAME
            </span>
            <span className="text-sm text-white/70">
              HEAT/ROUND
            </span>
          </div>
        );
      }
      
      case 'results-table': {
        return (
          <div className="w-full h-full flex flex-col p-1 overflow-hidden" data-testid="preview-results-table">
            <div className="text-xs font-semibold text-white/70 border-b border-white/20 pb-1 mb-1 flex">
              <span className="w-8">PL</span>
              <span className="flex-1">ATHLETE</span>
              <span className="w-16 text-right">{isFieldEvent ? 'MARK' : 'TIME'}</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-white/50 text-xs">
              LIVE DATA
            </div>
          </div>
        );
      }
      
      case 'team-standings': {
        return (
          <div className="w-full h-full flex flex-col p-1 overflow-hidden" data-testid="preview-team-standings">
            <div className="text-xs font-semibold text-white/70 border-b border-white/20 pb-1 mb-1 flex">
              <span className="w-8">RK</span>
              <span className="flex-1">TEAM</span>
              <span className="w-12 text-right">PTS</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-white/50 text-xs">
              LIVE DATA
            </div>
          </div>
        );
      }
      
      case 'wind-reading': {
        return (
          <div className="w-full h-full flex items-center justify-center p-1" data-testid="preview-wind-reading">
            <Wind className="w-4 h-4 mr-1 text-white/70" />
            <span className="text-lg font-mono text-white">WIND</span>
          </div>
        );
      }
      
      case 'athlete-card': {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-2" data-testid="preview-athlete-card">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
              <User className="w-6 h-6 text-white/70" />
            </div>
            <span className="text-sm font-bold text-white text-center">ATHLETE</span>
            <span className="text-xs text-white/70">SCHOOL</span>
          </div>
        );
      }
      
      case 'athlete-grid': {
        return (
          <div className="w-full h-full grid grid-cols-4 gap-1 p-1 overflow-hidden" data-testid="preview-athlete-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center bg-white/5 rounded p-1">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-0.5">
                  <User className="w-3 h-3 text-white/60" />
                </div>
                <span className="text-[8px] text-white text-center truncate w-full">LANE {i}</span>
              </div>
            ))}
          </div>
        );
      }
      
      case 'lane-graphic': {
        return (
          <div className="w-full h-full flex flex-col gap-0.5 p-1 overflow-hidden" data-testid="preview-lane-graphic">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div 
                key={i} 
                className="flex-1 flex items-center bg-white/10 rounded px-2"
                style={{ minHeight: '12px' }}
              >
                <span className="w-5 text-xs font-bold text-white">{i}</span>
                <span className="flex-1 text-xs text-white truncate">LANE {i}</span>
                <span className="text-xs text-white/70">SCHOOL</span>
              </div>
            ))}
          </div>
        );
      }
      
      case 'attempt-tracker': {
        return (
          <div className="w-full h-full flex flex-col p-1 overflow-hidden" data-testid="preview-attempt-tracker">
            <div className="text-xs font-semibold text-white/70 border-b border-white/20 pb-1 mb-1 flex">
              <span className="flex-1">ATHLETE</span>
              <span className="w-24 text-center">ATTEMPTS</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-white/50 text-xs">
              LIVE DATA
            </div>
          </div>
        );
      }
      
      case 'split-times': {
        return (
          <div className="w-full h-full flex flex-col p-1 overflow-hidden" data-testid="preview-split-times">
            <div className="text-xs font-semibold text-white mb-1">SPLIT TIMES</div>
            <div className="flex-1 flex items-center justify-center text-white/50 text-xs">
              LIVE DATA
            </div>
          </div>
        );
      }
      
      case 'record-indicator': {
        return (
          <div className="w-full h-full flex items-center justify-center p-1 bg-yellow-500/20" data-testid="preview-record-indicator">
            <Award className="w-4 h-4 mr-1 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">RECORD</span>
          </div>
        );
      }
      
      case 'logo': {
        return (
          <div className="w-full h-full flex items-center justify-center p-2" data-testid="preview-logo">
            <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
              <Image className="w-8 h-8 text-white/40" />
            </div>
          </div>
        );
      }
      
      default:
        return null;
    }
  };
  
  // Render an object on the canvas
  const renderObject = (object: SelectLayoutObject) => {
    const isSelected = selectedObjectId === object.id;
    const info = OBJECT_TYPE_INFO[object.objectType as LayoutObjectType];
    const Icon = info?.icon || Type;
    
    // Use local drag position if this object is being dragged
    const isDragging = localDragPosition?.objectId === object.id;
    const displayX = isDragging ? localDragPosition.x : object.x;
    const displayY = isDragging ? localDragPosition.y : object.y;
    const displayWidth = isDragging ? localDragPosition.width : object.width;
    const displayHeight = isDragging ? localDragPosition.height : object.height;
    
    return (
      <div
        key={object.id}
        className={`absolute ${isDragging ? '' : 'transition-shadow'} ${
          isSelected && !previewMode ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-black' : ''
        } ${object.locked ? 'opacity-75' : previewMode ? '' : 'cursor-move'} ${
          !object.visible ? 'opacity-40' : ''
        }`}
        style={{
          left: `${displayX}%`,
          top: `${displayY}%`,
          width: `${displayWidth}%`,
          height: `${displayHeight}%`,
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
          if (!previewMode) {
            setSelectedObjectId(object.id);
          }
        }}
        data-testid={`layout-object-${object.id}`}
      >
        {/* Object content - show preview content or editor placeholder */}
        {previewMode ? (
          renderPreviewContent(object)
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white p-2 overflow-hidden">
            <Icon className="w-6 h-6 mb-1 opacity-60" />
            <span className="text-xs text-center opacity-80 truncate w-full">
              {object.name || info?.name || object.objectType}
            </span>
          </div>
        )}
        
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
    
    // Build batch updates for objects that actually need to move
    const updates: Array<{ id: number; data: { x: number } }> = [];
    let currentX = spacing;
    objects.forEach((obj) => {
      const newX = showGrid ? snapToGrid(currentX) : currentX;
      // Only add update if position actually changed (avoid no-op updates)
      if (Math.abs(newX - obj.x) > 0.01) {
        updates.push({ id: obj.id, data: { x: newX } });
      }
      currentX += obj.width + spacing;
    });
    
    // Only call API if there are actual position changes
    if (updates.length > 0) {
      batchUpdateObjectsMutation.mutate(updates);
    }
  }, [currentScene, batchUpdateObjectsMutation, showGrid, snapToGrid]);

  const handleDistributeVertically = useCallback(() => {
    if (!currentScene || currentScene.objects.length < 2) return;
    const objects = [...currentScene.objects].sort((a, b) => a.y - b.y);
    const totalHeight = objects.reduce((sum, o) => sum + o.height, 0);
    const availableSpace = 100 - totalHeight;
    const spacing = availableSpace / (objects.length + 1);
    
    // Build batch updates for objects that actually need to move
    const updates: Array<{ id: number; data: { y: number } }> = [];
    let currentY = spacing;
    objects.forEach((obj) => {
      const newY = showGrid ? snapToGrid(currentY) : currentY;
      // Only add update if position actually changed (avoid no-op updates)
      if (Math.abs(newY - obj.y) > 0.01) {
        updates.push({ id: obj.id, data: { y: newY } });
      }
      currentY += obj.height + spacing;
    });
    
    // Only call API if there are actual position changes
    if (updates.length > 0) {
      batchUpdateObjectsMutation.mutate(updates);
    }
  }, [currentScene, batchUpdateObjectsMutation, showGrid, snapToGrid]);

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
        config: ('config' in objTemplate ? objTemplate.config : {}) || {},
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

  // Handle RTV file upload
  const handleRtvFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setRtvImportLoading(true);
    setRtvParsedObjects([]);
    setRtvImportWarnings([]);
    
    try {
      const formData = new FormData();
      formData.append('rtv', file);
      
      const res = await fetch('/api/import-rtv', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to parse RTV file');
      }
      
      const data = await res.json();
      
      if (data.objects && data.objects.length > 0) {
        setRtvParsedObjects(data.objects.map((obj: any) => ({
          ...obj,
          selected: true,
          editedFieldCode: obj.suggestedFieldCode || obj.textContent.replace('%s', '{value}'),
        })));
      }
      
      if (data.warnings && data.warnings.length > 0) {
        setRtvImportWarnings(data.warnings);
      }
      
      toast({ title: `Parsed ${data.objects?.length || 0} objects from RTV file` });
    } catch (error: any) {
      toast({ title: 'RTV Import Error', description: error.message, variant: 'destructive' });
    } finally {
      setRtvImportLoading(false);
    }
  }, [toast]);

  // Handle importing selected RTV objects into the scene
  const handleImportRtvObjects = useCallback(async () => {
    if (!selectedSceneId) return;
    
    const selectedObjects = rtvParsedObjects.filter(obj => obj.selected);
    if (selectedObjects.length === 0) {
      toast({ title: 'No objects selected', variant: 'destructive' });
      return;
    }
    
    try {
      for (const obj of selectedObjects) {
        await apiRequest('POST', `/api/layout-scenes/${selectedSceneId}/objects`, {
          name: obj.name,
          objectType: 'text',
          x: obj.x,
          y: obj.y,
          width: Math.max(10, obj.width),
          height: Math.max(5, obj.height),
          zIndex: (currentScene?.objects.length || 0) + 1,
          dataBinding: {
            sourceType: 'live-data',
            fieldCode: obj.editedFieldCode,
          },
          config: {
            textContent: obj.editedFieldCode,
          },
          style: {},
          visible: true,
          locked: false,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes', selectedSceneId] });
      setShowRtvImportDialog(false);
      setRtvParsedObjects([]);
      setRtvImportWarnings([]);
      toast({ title: `Imported ${selectedObjects.length} objects` });
    } catch (error: any) {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    }
  }, [selectedSceneId, rtvParsedObjects, currentScene, toast]);

  // Toggle RTV object selection
  const toggleRtvObjectSelection = useCallback((index: number) => {
    setRtvParsedObjects(prev => prev.map((obj, i) => 
      i === index ? { ...obj, selected: !obj.selected } : obj
    ));
  }, []);

  // Update RTV object field code
  const updateRtvObjectFieldCode = useCallback((index: number, fieldCode: string) => {
    setRtvParsedObjects(prev => prev.map((obj, i) => 
      i === index ? { ...obj, editedFieldCode: fieldCode } : obj
    ));
  }, []);

  // Export all scenes
  const handleExportScenes = useCallback(async () => {
    try {
      const meetIdParam = currentMeet?.id ? `?meetId=${currentMeet.id}` : '';
      const response = await fetch(`/api/scenes/export${meetIdParam}`);
      if (!response.ok) throw new Error('Failed to export scenes');
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenes-${currentMeet?.name || 'all'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: `Exported ${data.scenes?.length || 0} scenes` });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    }
  }, [currentMeet, toast]);

  // Handle scene import file selection
  const handleSceneImportFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSceneImportFile(file);
    setSceneImportLoading(true);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.scenes || !Array.isArray(data.scenes)) {
        throw new Error('Invalid scene file format');
      }
      
      setSceneImportData(data);
      setShowSceneImportDialog(true);
    } catch (error: any) {
      toast({ title: 'Invalid file', description: error.message, variant: 'destructive' });
      setSceneImportFile(null);
    } finally {
      setSceneImportLoading(false);
      if (sceneImportInputRef.current) {
        sceneImportInputRef.current.value = '';
      }
    }
  }, [toast]);

  // Import scenes
  const handleImportScenes = useCallback(async (replaceExisting: boolean) => {
    if (!sceneImportData || !currentMeet?.id) return;
    
    setSceneImportLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/scenes/import', {
        scenes: sceneImportData.scenes,
        targetMeetId: currentMeet.id,
        replaceExisting,
      });
      
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/layout-scenes'] });
      setShowSceneImportDialog(false);
      setSceneImportData(null);
      setSceneImportFile(null);
      
      toast({ title: `Imported ${result.imported} scenes` });
    } catch (error: any) {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    } finally {
      setSceneImportLoading(false);
    }
  }, [sceneImportData, currentMeet, toast]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportScenes}
            disabled={scenes.length === 0}
            data-testid="button-export-scenes"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sceneImportInputRef.current?.click()}
            disabled={!currentMeet?.id}
            data-testid="button-import-scenes"
          >
            <FolderUp className="w-4 h-4 mr-1" />
            Import
          </Button>
          <input
            ref={sceneImportInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleSceneImportFileChange}
          />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-neutral-300 hover:text-white hover:bg-neutral-700"
                    onClick={() => setShowRtvImportDialog(true)}
                    data-testid="button-import-rtv"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Import RTV
                  </Button>
                  <Separator orientation="vertical" className="h-5 bg-neutral-600" />
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
                <div className="relative">
                  {/* Preview mode indicator */}
                  {previewMode && (
                    <div className="absolute -top-8 left-0 right-0 flex items-center justify-center gap-2 text-green-400 text-sm font-medium" data-testid="preview-mode-indicator">
                      <Eye className="w-4 h-4" />
                      <span>PREVIEW MODE</span>
                    </div>
                  )}
                  <div
                    ref={canvasRef}
                    className={`relative bg-black transition-all ${previewMode ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-neutral-900' : ''}`}
                    style={{
                      width: '100%',
                      maxWidth: '1200px',
                      aspectRatio: currentScene.aspectRatio || '16/9',
                      backgroundColor: currentScene.backgroundColor || '#000000',
                      backgroundImage: currentScene.backgroundImage ? `url(${currentScene.backgroundImage})` : undefined,
                      backgroundSize: 'cover',
                    }}
                    onClick={() => !previewMode && setSelectedObjectId(null)}
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
                      
                      {/* Line Number for athlete data objects - ResulTV-style paging */}
                      {((selectedObject.dataBinding as SceneDataBinding)?.sourceType === 'live-data' ||
                        (selectedObject.dataBinding as SceneDataBinding)?.sourceType === 'current-field') && (
                        <div className="space-y-2">
                          <Label className="text-xs">Line Number</Label>
                          <Select
                            value={String(((selectedObject.dataBinding as SceneDataBinding)?.athleteIndex ?? 0) + 1)}
                            onValueChange={(value) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: {
                                dataBinding: {
                                  ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                  athleteIndex: parseInt(value) - 1,
                                },
                              },
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
                            Which result slot this object shows (Line 1 = 1st result, Line 2 = 2nd, etc.)
                          </p>
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
                                const preset = Object.entries(FIELD_PRESETS).find(([key]) => key === value);
                                if (preset) {
                                  updateObjectMutation.mutate({
                                    id: selectedObject.id,
                                    data: {
                                      dataBinding: {
                                        ...(selectedObject.dataBinding as SceneDataBinding || {}),
                                        fieldCode: preset[1].codes,
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
                                {Object.entries(FIELD_PRESETS).map(([key, preset]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex flex-col">
                                      <span>{preset.name}</span>
                                      <span className="text-xs text-muted-foreground">{preset.codes}</span>
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
                    
                    {/* Padding Controls */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Padding</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Left (px)</Label>
                          <Input
                            type="number"
                            value={(selectedObject.style as SceneObjectStyle)?.paddingLeft ?? 0}
                            onChange={(e) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: {
                                style: {
                                  ...(selectedObject.style as SceneObjectStyle || {}),
                                  paddingLeft: parseInt(e.target.value) || 0,
                                },
                              },
                            })}
                            data-testid="input-padding-left"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Right (px)</Label>
                          <Input
                            type="number"
                            value={(selectedObject.style as SceneObjectStyle)?.paddingRight ?? 0}
                            onChange={(e) => updateObjectMutation.mutate({
                              id: selectedObject.id,
                              data: {
                                style: {
                                  ...(selectedObject.style as SceneObjectStyle || {}),
                                  paddingRight: parseInt(e.target.value) || 0,
                                },
                              },
                            })}
                            data-testid="input-padding-right"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Visibility & Lock */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Visibility</h4>
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
                      
                      {/* Conditional Visibility */}
                      <div className="space-y-2">
                        <Label className="text-xs">Conditional Visibility</Label>
                        <Select
                          value={(selectedObject.config as SceneObjectConfig)?.conditionalVisibility || 'always'}
                          onValueChange={(value) => updateObjectMutation.mutate({
                            id: selectedObject.id,
                            data: {
                              config: {
                                ...(selectedObject.config as SceneObjectConfig || {}),
                                conditionalVisibility: value as 'always' | 'hide-when-no-wind' | 'hide-when-nwi',
                              },
                            },
                          })}
                        >
                          <SelectTrigger data-testid="select-conditional-visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Always Show</SelectItem>
                            <SelectItem value="hide-when-no-wind">Hide When No Wind Data</SelectItem>
                            <SelectItem value="hide-when-nwi">Hide When NWI</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Controls when this object is hidden based on data conditions
                        </p>
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

      {/* RTV Import Dialog */}
      <Dialog open={showRtvImportDialog} onOpenChange={(open) => {
        setShowRtvImportDialog(open);
        if (!open) {
          setRtvParsedObjects([]);
          setRtvImportWarnings([]);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import RTV File</DialogTitle>
            <DialogDescription>
              Import text objects from a ResulTV (.rtv) file into the current scene.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            {/* File upload area */}
            <div className="space-y-2">
              <Label>Select RTV File</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".rtv,.bin"
                  onChange={handleRtvFileUpload}
                  disabled={rtvImportLoading}
                  className="flex-1"
                  data-testid="input-rtv-file"
                />
                {rtvImportLoading && (
                  <span className="text-sm text-muted-foreground">Parsing...</span>
                )}
              </div>
            </div>

            {/* Warnings */}
            {rtvImportWarnings.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md space-y-1">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Warnings</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5 ml-6">
                  {rtvImportWarnings.map((warning, i) => (
                    <li key={i} data-testid={`text-rtv-warning-${i}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parsed objects list */}
            {rtvParsedObjects.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Parsed Objects ({rtvParsedObjects.filter(o => o.selected).length} selected)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRtvParsedObjects(prev => prev.map(o => ({ ...o, selected: true })))}
                      data-testid="button-rtv-select-all"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRtvParsedObjects(prev => prev.map(o => ({ ...o, selected: false })))}
                      data-testid="button-rtv-select-none"
                    >
                      Select None
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 border rounded-md">
                  <div className="p-2 space-y-2">
                    {rtvParsedObjects.map((obj, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${obj.selected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}
                        data-testid={`rtv-object-row-${index}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleRtvObjectSelection(index)}
                            className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
                              obj.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                            }`}
                            data-testid={`checkbox-rtv-object-${index}`}
                          >
                            {obj.selected && <Check className="w-3 h-3" />}
                          </button>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm" data-testid={`text-rtv-object-name-${index}`}>
                                {obj.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Pos: ({obj.x.toFixed(1)}%, {obj.y.toFixed(1)}%) Size: ({obj.width.toFixed(1)}% x {obj.height.toFixed(1)}%)
                              </span>
                            </div>
                            
                            <div className="text-xs text-muted-foreground bg-black/10 dark:bg-white/5 rounded px-2 py-1 font-mono" data-testid={`text-rtv-object-content-${index}`}>
                              {obj.textContent}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">Field Code:</Label>
                              <Input
                                value={obj.editedFieldCode}
                                onChange={(e) => updateRtvObjectFieldCode(index, e.target.value)}
                                placeholder="{field_code}"
                                className="h-7 text-xs font-mono"
                                disabled={!obj.selected}
                                data-testid={`input-rtv-field-code-${index}`}
                              />
                              {obj.suggestedFieldCode && obj.editedFieldCode === obj.suggestedFieldCode && (
                                <Badge variant="secondary" className="text-xs">Auto-mapped</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Empty state */}
            {!rtvImportLoading && rtvParsedObjects.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Upload an RTV file to parse text objects
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports ResulTV (.rtv) binary files
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRtvImportDialog(false);
                setRtvParsedObjects([]);
                setRtvImportWarnings([]);
              }}
              data-testid="button-rtv-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportRtvObjects}
              disabled={rtvParsedObjects.filter(o => o.selected).length === 0}
              data-testid="button-rtv-import"
            >
              <Plus className="w-4 h-4 mr-1" />
              Import {rtvParsedObjects.filter(o => o.selected).length} Objects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scene Import Dialog */}
      <Dialog open={showSceneImportDialog} onOpenChange={setShowSceneImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Scenes</DialogTitle>
            <DialogDescription>
              Import scenes from a previously exported file
            </DialogDescription>
          </DialogHeader>
          
          {sceneImportData && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">File Summary</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>Scenes: {sceneImportData.scenes?.length || 0}</p>
                  <p>Total Objects: {sceneImportData.scenes?.reduce((acc: number, s: any) => acc + (s.objects?.length || 0), 0) || 0}</p>
                  {sceneImportData.exportedAt && (
                    <p>Exported: {new Date(sceneImportData.exportedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  How would you like to import these scenes?
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowSceneImportDialog(false);
                setSceneImportData(null);
                setSceneImportFile(null);
              }}
              disabled={sceneImportLoading}
              data-testid="button-import-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleImportScenes(false)}
              disabled={sceneImportLoading}
              data-testid="button-import-add"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add to Existing
            </Button>
            <Button
              onClick={() => handleImportScenes(true)}
              disabled={sceneImportLoading}
              data-testid="button-import-replace"
            >
              <FolderUp className="w-4 h-4 mr-1" />
              Replace All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
