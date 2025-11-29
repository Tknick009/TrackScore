import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMeet } from "@/contexts/MeetContext";
import type { Event, Athlete, Team } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Save, Trash2, Eye, Monitor, Grid3X3, Move, 
  Type, Clock, User, Users, Trophy, Image, Hash, Ruler,
  Settings, ChevronLeft, ChevronRight, Play, Pause,
  Maximize2, Minimize2, RotateCcw, Copy, Layers
} from "lucide-react";

// Element types that can be placed on the grid
const ELEMENT_TYPES = [
  { id: 'event-name', name: 'Event Name', icon: Type, category: 'header' },
  { id: 'running-time', name: 'Running Time', icon: Clock, category: 'header' },
  { id: 'heat-round', name: 'Heat/Round', icon: Hash, category: 'header' },
  { id: 'wind', name: 'Wind', icon: Ruler, category: 'header' },
  
  { id: 'place', name: 'Place', icon: Trophy, category: 'result' },
  { id: 'lane', name: 'Lane', icon: Hash, category: 'result' },
  { id: 'athlete-name', name: 'Athlete Name', icon: User, category: 'result' },
  { id: 'team-name', name: 'Team Name', icon: Users, category: 'result' },
  { id: 'team-abbrev', name: 'Team Abbrev', icon: Type, category: 'result' },
  { id: 'time-mark', name: 'Time/Mark', icon: Clock, category: 'result' },
  { id: 'delta', name: 'Delta/Split', icon: Clock, category: 'result' },
  { id: 'cumulative', name: 'Cumulative', icon: Clock, category: 'result' },
  
  { id: 'team-logo', name: 'Team Logo', icon: Image, category: 'media' },
  { id: 'athlete-photo', name: 'Athlete Photo', icon: User, category: 'media' },
  { id: 'meet-logo', name: 'Meet Logo', icon: Image, category: 'media' },
  
  { id: 'attempt-num', name: 'Attempt #', icon: Hash, category: 'field' },
  { id: 'height-bar', name: 'Height/Bar', icon: Ruler, category: 'field' },
  { id: 'attempt-marks', name: 'X/O Marks', icon: Type, category: 'field' },
  { id: 'mark-feet', name: 'Mark (Feet)', icon: Ruler, category: 'field' },
  { id: 'mark-meters', name: 'Mark (Meters)', icon: Ruler, category: 'field' },
  
  { id: 'team-score', name: 'Team Score', icon: Trophy, category: 'scoring' },
  { id: 'standings-row', name: 'Standings Row', icon: Users, category: 'scoring' },
] as const;

type ElementType = typeof ELEMENT_TYPES[number]['id'];

interface PlacedElement {
  id: string;
  type: ElementType;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  config: {
    index?: number; // For Place 1, Place 2, etc.
    fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
    alignment?: 'left' | 'center' | 'right';
    showLabel?: boolean;
    dataSource?: 'dynamic' | 'static';
    staticValue?: string;
  };
}

interface LayoutConfig {
  id: string;
  name: string;
  gridRows: number;
  gridCols: number;
  elements: PlacedElement[];
  aspectRatio: string;
  backgroundColor: string;
  boardType: 'P6' | 'P10' | 'custom';
}

// Team logo component
function TeamLogo({ teamName, className = "" }: { teamName?: string; className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string>("/logos/NCAA/0.png");
  
  useEffect(() => {
    if (teamName) {
      fetch(`/api/ncaa-logo?team=${encodeURIComponent(teamName)}`)
        .then(res => res.json())
        .then(data => {
          if (data.logoPath) setLogoUrl(data.logoPath);
        })
        .catch(() => {});
    }
  }, [teamName]);
  
  return (
    <img 
      src={logoUrl} 
      alt={teamName || "Team"} 
      className={`object-contain ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "/logos/NCAA/0.png";
      }}
    />
  );
}

// Live element renderer - shows real data
function LiveElement({ 
  element, 
  event,
  results,
  isSelected,
  onClick
}: { 
  element: PlacedElement;
  event?: Event;
  results?: Array<{ place: number; name: string; team: string; time: string; logo?: string }>;
  isSelected: boolean;
  onClick: () => void;
}) {
  const idx = element.config.index ?? 0;
  const result = results?.[idx];
  
  const baseClasses = `
    absolute flex items-center justify-center overflow-hidden
    ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
    cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all
  `;
  
  const fontSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-lg',
    xlarge: 'text-2xl',
  }[element.config.fontSize || 'medium'];
  
  const renderContent = () => {
    switch (element.type) {
      case 'event-name':
        return (
          <div className={`${fontSize} font-bold text-white truncate px-1`}>
            {event?.name || 'Event Name'}
          </div>
        );
      
      case 'running-time':
        return (
          <div className={`text-2xl font-mono font-bold text-white`}>
            0:00.00
          </div>
        );
      
      case 'heat-round':
        return (
          <div className={`${fontSize} text-white`}>
            Final
          </div>
        );
      
      case 'wind':
        return (
          <div className={`${fontSize} text-gray-300`}>
            WIND: +1.2
          </div>
        );
      
      case 'place':
        return (
          <div className={`text-xl font-bold text-white`}>
            {result?.place || (idx + 1)}
          </div>
        );
      
      case 'lane':
        return (
          <div className={`${fontSize} text-white`}>
            {idx + 1}
          </div>
        );
      
      case 'athlete-name':
        return (
          <div className={`${fontSize} font-bold text-white truncate px-1`}>
            {result?.name || `Athlete ${idx + 1}`}
          </div>
        );
      
      case 'team-name':
        return (
          <div className={`${fontSize} text-gray-300 truncate px-1`}>
            {result?.team || `Team ${idx + 1}`}
          </div>
        );
      
      case 'team-abbrev':
        return (
          <div className={`${fontSize} text-white truncate`}>
            {result?.team?.substring(0, 4).toUpperCase() || 'TEAM'}
          </div>
        );
      
      case 'time-mark':
        return (
          <div className={`${fontSize} font-mono font-bold text-yellow-400`}>
            {result?.time || '0:00.00'}
          </div>
        );
      
      case 'delta':
        return (
          <div className={`${fontSize} font-mono text-cyan-400`}>
            +0.00
          </div>
        );
      
      case 'cumulative':
        return (
          <div className={`${fontSize} font-mono text-white`}>
            0:00.00
          </div>
        );
      
      case 'team-logo':
        return (
          <TeamLogo teamName={result?.team} className="w-full h-full p-1" />
        );
      
      case 'athlete-photo':
        return (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <User className="w-1/2 h-1/2 text-gray-500" />
          </div>
        );
      
      case 'meet-logo':
        return (
          <div className="w-full h-full bg-blue-900 flex items-center justify-center p-1">
            <span className="text-xs text-white font-bold">MEET</span>
          </div>
        );
      
      case 'attempt-num':
        return (
          <div className={`${fontSize} text-white`}>
            Attempt: {idx + 1}
          </div>
        );
      
      case 'height-bar':
        return (
          <div className={`${fontSize} font-bold text-white`}>
            1.80m
          </div>
        );
      
      case 'attempt-marks':
        return (
          <div className="flex gap-1">
            <span className="text-red-500 font-bold">X</span>
            <span className="text-red-500 font-bold">X</span>
            <span className="text-green-500 font-bold">O</span>
          </div>
        );
      
      case 'mark-feet':
        return (
          <div className={`${fontSize} font-mono text-cyan-400`}>
            65-11.75
          </div>
        );
      
      case 'mark-meters':
        return (
          <div className={`${fontSize} font-mono text-white`}>
            20.11
          </div>
        );
      
      case 'team-score':
        return (
          <div className={`${fontSize} font-bold text-yellow-400`}>
            125
          </div>
        );
      
      case 'standings-row':
        return (
          <div className="flex items-center gap-1 w-full px-1">
            <span className="text-yellow-400 font-bold w-4">{idx + 1}</span>
            <TeamLogo teamName={result?.team} className="w-5 h-5" />
            <span className="text-white flex-1 truncate text-xs">{result?.name || 'Name'}</span>
            <span className="text-cyan-400 font-mono text-xs">{result?.time || '0.00'}</span>
          </div>
        );
      
      default:
        return <div className="text-xs text-gray-500">{element.type}</div>;
    }
  };
  
  return (
    <div 
      className={baseClasses}
      onClick={onClick}
      data-testid={`element-${element.id}`}
    >
      {renderContent()}
    </div>
  );
}

export default function VisualLayoutDesigner() {
  const { toast } = useToast();
  const { currentMeet } = useMeet();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Layout state
  const [layout, setLayout] = useState<LayoutConfig>({
    id: 'new',
    name: 'Untitled Layout',
    gridRows: 12,
    gridCols: 16,
    elements: [],
    aspectRatio: '16:9',
    backgroundColor: '#000000',
    boardType: 'P10',
  });
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<ElementType | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [savedLayouts, setSavedLayouts] = useState<LayoutConfig[]>([]);
  
  // Load saved layouts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('visualLayouts');
    if (saved) {
      try {
        setSavedLayouts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved layouts:', e);
      }
    }
  }, []);
  
  // Save layout to localStorage
  const saveLayout = useCallback(() => {
    const layoutToSave = { ...layout, id: layout.id === 'new' ? `layout-${Date.now()}` : layout.id, name: layoutName || layout.name };
    
    setSavedLayouts(prev => {
      const existing = prev.findIndex(l => l.id === layoutToSave.id);
      let updated: LayoutConfig[];
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = layoutToSave;
      } else {
        updated = [...prev, layoutToSave];
      }
      localStorage.setItem('visualLayouts', JSON.stringify(updated));
      return updated;
    });
    
    setLayout(layoutToSave);
    setSaveDialogOpen(false);
    toast({
      title: "Layout saved",
      description: `"${layoutToSave.name}" has been saved.`,
    });
  }, [layout, layoutName, toast]);
  
  // Load a saved layout
  const loadLayout = useCallback((savedLayout: LayoutConfig) => {
    setLayout(savedLayout);
    setLoadDialogOpen(false);
    setSelectedElement(null);
    toast({
      title: "Layout loaded",
      description: `"${savedLayout.name}" has been loaded.`,
    });
  }, [toast]);
  
  // Delete a saved layout
  const deleteSavedLayout = useCallback((layoutId: string) => {
    setSavedLayouts(prev => {
      const updated = prev.filter(l => l.id !== layoutId);
      localStorage.setItem('visualLayouts', JSON.stringify(updated));
      return updated;
    });
    toast({
      title: "Layout deleted",
      description: "The layout has been removed.",
    });
  }, [toast]);
  
  // Fetch events for live data
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });
  
  // Sample results for preview
  const sampleResults = [
    { place: 1, name: 'Enrique Torres', team: 'Navy', time: '8:47.57' },
    { place: 2, name: 'Davia Rodriguez', team: 'Army', time: '8:52.03' },
    { place: 3, name: 'Brad Hansen', team: 'Air Force', time: '8:52.75' },
    { place: 4, name: 'Brian Henstorf', team: 'Navy', time: '8:54.38' },
    { place: 5, name: 'Paul Wellman', team: 'Army', time: '8:54.96' },
    { place: 6, name: 'Tony Trueba', team: 'Navy', time: '8:56.24' },
    { place: 7, name: 'Daniel Embaye', team: 'Army', time: '8:57.46' },
    { place: 8, name: 'Juan Pablo Miramonte', team: 'Air Force', time: '8:57.67' },
  ];
  
  const selectedEvent = events[0];
  
  // Handle drop on grid
  const handleDrop = useCallback((row: number, col: number) => {
    if (!draggedType) return;
    
    const newElement: PlacedElement = {
      id: `${draggedType}-${Date.now()}`,
      type: draggedType,
      row,
      col,
      rowSpan: 1,
      colSpan: draggedType.includes('name') || draggedType === 'event-name' ? 3 : 
               draggedType.includes('photo') || draggedType.includes('logo') ? 2 : 1,
      config: {
        fontSize: 'medium',
        alignment: 'center',
        index: layout.elements.filter(e => e.type === draggedType).length,
      },
    };
    
    setLayout(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    
    setSelectedElement(newElement.id);
    setDraggedType(null);
  }, [draggedType, layout.elements]);
  
  // Delete selected element
  const handleDelete = useCallback(() => {
    if (!selectedElement) return;
    setLayout(prev => ({
      ...prev,
      elements: prev.elements.filter(e => e.id !== selectedElement),
    }));
    setSelectedElement(null);
  }, [selectedElement]);
  
  // Update element config
  const updateElementConfig = useCallback((updates: Partial<PlacedElement['config']>) => {
    if (!selectedElement) return;
    setLayout(prev => ({
      ...prev,
      elements: prev.elements.map(e => 
        e.id === selectedElement 
          ? { ...e, config: { ...e.config, ...updates } }
          : e
      ),
    }));
  }, [selectedElement]);
  
  // Resize element
  const resizeElement = useCallback((direction: 'grow' | 'shrink', axis: 'row' | 'col') => {
    if (!selectedElement) return;
    setLayout(prev => ({
      ...prev,
      elements: prev.elements.map(e => {
        if (e.id !== selectedElement) return e;
        const span = axis === 'row' ? 'rowSpan' : 'colSpan';
        const newSpan = direction === 'grow' ? e[span] + 1 : Math.max(1, e[span] - 1);
        return { ...e, [span]: newSpan };
      }),
    }));
  }, [selectedElement]);
  
  // Move element
  const moveElement = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedElement) return;
    setLayout(prev => ({
      ...prev,
      elements: prev.elements.map(e => {
        if (e.id !== selectedElement) return e;
        switch (direction) {
          case 'up': return { ...e, row: Math.max(0, e.row - 1) };
          case 'down': return { ...e, row: Math.min(prev.gridRows - e.rowSpan, e.row + 1) };
          case 'left': return { ...e, col: Math.max(0, e.col - 1) };
          case 'right': return { ...e, col: Math.min(prev.gridCols - e.colSpan, e.col + 1) };
        }
      }),
    }));
  }, [selectedElement]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      }
      if (e.key === 'ArrowUp') moveElement('up');
      if (e.key === 'ArrowDown') moveElement('down');
      if (e.key === 'ArrowLeft') moveElement('left');
      if (e.key === 'ArrowRight') moveElement('right');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, moveElement]);
  
  const selectedElementData = layout.elements.find(e => e.id === selectedElement);
  
  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Element Palette */}
      <div className="w-64 border-r flex flex-col bg-card">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Elements</h2>
          <p className="text-xs text-muted-foreground">Drag to canvas</p>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {['header', 'result', 'media', 'field', 'scoring'].map(category => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {category}
                </h3>
                <div className="space-y-1">
                  {ELEMENT_TYPES.filter(t => t.category === category).map(type => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-grab hover-elevate active-elevate-2 bg-muted/50"
                        draggable
                        onDragStart={() => setDraggedType(type.id)}
                        onDragEnd={() => setDraggedType(null)}
                        data-testid={`palette-${type.id}`}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{type.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Input 
              value={layout.name}
              onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
              className="w-48 h-8"
              data-testid="input-layout-name"
            />
            <Separator orientation="vertical" className="h-6" />
            <Select 
              value={layout.boardType} 
              onValueChange={(v) => setLayout(prev => ({ ...prev, boardType: v as any }))}
            >
              <SelectTrigger className="w-24 h-8" data-testid="select-board-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P6">P6 Board</SelectItem>
                <SelectItem value="P10">P10 Board</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Grid</Label>
              <Switch 
                checked={showGrid} 
                onCheckedChange={setShowGrid}
                data-testid="switch-show-grid"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setLoadDialogOpen(true)}
              data-testid="button-load"
            >
              <Layers className="w-4 h-4 mr-1" />
              Load
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              data-testid="button-preview"
            >
              {previewMode ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                setLayoutName(layout.name);
                setSaveDialogOpen(true);
              }}
              data-testid="button-save"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 p-6 overflow-auto bg-muted/30">
          <div className="mx-auto" style={{ maxWidth: '1200px' }}>
            <div 
              ref={canvasRef}
              className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
              style={{ 
                aspectRatio: layout.aspectRatio.replace(':', '/'),
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const col = Math.floor((x / rect.width) * layout.gridCols);
                const row = Math.floor((y / rect.height) * layout.gridRows);
                
                handleDrop(row, col);
              }}
              data-testid="canvas"
            >
              {/* Grid lines */}
              {showGrid && !previewMode && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: layout.gridCols - 1 }).map((_, i) => (
                    <div
                      key={`col-${i}`}
                      className="absolute top-0 bottom-0 border-l border-gray-700/30"
                      style={{ left: `${((i + 1) / layout.gridCols) * 100}%` }}
                    />
                  ))}
                  {Array.from({ length: layout.gridRows - 1 }).map((_, i) => (
                    <div
                      key={`row-${i}`}
                      className="absolute left-0 right-0 border-t border-gray-700/30"
                      style={{ top: `${((i + 1) / layout.gridRows) * 100}%` }}
                    />
                  ))}
                </div>
              )}
              
              {/* Placed elements */}
              {layout.elements.map(element => (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${(element.col / layout.gridCols) * 100}%`,
                    top: `${(element.row / layout.gridRows) * 100}%`,
                    width: `${(element.colSpan / layout.gridCols) * 100}%`,
                    height: `${(element.rowSpan / layout.gridRows) * 100}%`,
                  }}
                >
                  <LiveElement
                    element={element}
                    event={selectedEvent}
                    results={sampleResults}
                    isSelected={selectedElement === element.id && !previewMode}
                    onClick={() => !previewMode && setSelectedElement(element.id)}
                  />
                </div>
              ))}
              
              {/* Empty state */}
              {layout.elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Drag elements here</p>
                    <p className="text-sm">from the palette on the left</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Properties */}
      <div className="w-72 border-l flex flex-col bg-card">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Properties</h2>
        </div>
        
        {selectedElementData ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Element Type</Label>
                <p className="font-medium">
                  {ELEMENT_TYPES.find(t => t.id === selectedElementData.type)?.name}
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Position</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Row</Label>
                    <Input 
                      type="number" 
                      value={selectedElementData.row}
                      onChange={(e) => {
                        const row = parseInt(e.target.value);
                        setLayout(prev => ({
                          ...prev,
                          elements: prev.elements.map(el => 
                            el.id === selectedElement ? { ...el, row } : el
                          ),
                        }));
                      }}
                      className="h-8"
                      data-testid="input-row"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Column</Label>
                    <Input 
                      type="number" 
                      value={selectedElementData.col}
                      onChange={(e) => {
                        const col = parseInt(e.target.value);
                        setLayout(prev => ({
                          ...prev,
                          elements: prev.elements.map(el => 
                            el.id === selectedElement ? { ...el, col } : el
                          ),
                        }));
                      }}
                      className="h-8"
                      data-testid="input-col"
                    />
                  </div>
                </div>
                <div className="flex gap-1 justify-center">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveElement('up')}>
                    <ChevronLeft className="w-4 h-4 rotate-90" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveElement('left')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveElement('right')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => moveElement('down')}>
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Size</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Row Span</Label>
                    <Input 
                      type="number" 
                      value={selectedElementData.rowSpan}
                      min={1}
                      onChange={(e) => {
                        const rowSpan = parseInt(e.target.value);
                        setLayout(prev => ({
                          ...prev,
                          elements: prev.elements.map(el => 
                            el.id === selectedElement ? { ...el, rowSpan } : el
                          ),
                        }));
                      }}
                      className="h-8"
                      data-testid="input-rowspan"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Col Span</Label>
                    <Input 
                      type="number" 
                      value={selectedElementData.colSpan}
                      min={1}
                      onChange={(e) => {
                        const colSpan = parseInt(e.target.value);
                        setLayout(prev => ({
                          ...prev,
                          elements: prev.elements.map(el => 
                            el.id === selectedElement ? { ...el, colSpan } : el
                          ),
                        }));
                      }}
                      className="h-8"
                      data-testid="input-colspan"
                    />
                  </div>
                </div>
                <div className="flex gap-1 justify-center">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resizeElement('shrink', 'col')}>
                    <Minimize2 className="w-3 h-3 mr-1" /> W
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resizeElement('grow', 'col')}>
                    <Maximize2 className="w-3 h-3 mr-1" /> W
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resizeElement('shrink', 'row')}>
                    <Minimize2 className="w-3 h-3 mr-1" /> H
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resizeElement('grow', 'row')}>
                    <Maximize2 className="w-3 h-3 mr-1" /> H
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Appearance</h3>
                <div>
                  <Label className="text-xs">Font Size</Label>
                  <Select 
                    value={selectedElementData.config.fontSize || 'medium'}
                    onValueChange={(v) => updateElementConfig({ fontSize: v as any })}
                  >
                    <SelectTrigger className="h-8" data-testid="select-font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data Index</Label>
                  <Input 
                    type="number" 
                    value={selectedElementData.config.index || 0}
                    min={0}
                    max={7}
                    onChange={(e) => updateElementConfig({ index: parseInt(e.target.value) })}
                    className="h-8"
                    data-testid="input-data-index"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Which result row (0-7) this element shows
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={handleDelete}
                data-testid="button-delete-element"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Element
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center p-4">
              <Settings className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select an element</p>
              <p className="text-xs">to edit its properties</p>
            </div>
          </div>
        )}
        
        {/* Layout Settings */}
        <div className="p-4 border-t space-y-3">
          <h3 className="text-sm font-semibold">Grid Settings</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Rows</Label>
              <Input 
                type="number" 
                value={layout.gridRows}
                min={4}
                max={24}
                onChange={(e) => setLayout(prev => ({ ...prev, gridRows: parseInt(e.target.value) }))}
                className="h-8"
                data-testid="input-grid-rows"
              />
            </div>
            <div>
              <Label className="text-xs">Columns</Label>
              <Input 
                type="number" 
                value={layout.gridCols}
                min={4}
                max={32}
                onChange={(e) => setLayout(prev => ({ ...prev, gridCols: parseInt(e.target.value) }))}
                className="h-8"
                data-testid="input-grid-cols"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Layout Name</Label>
              <Input 
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="My Custom Layout"
                data-testid="input-save-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={saveLayout}
              data-testid="button-confirm-save"
            >
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {savedLayouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No saved layouts</p>
                <p className="text-xs">Create and save a layout to see it here</p>
              </div>
            ) : (
              savedLayouts.map(saved => (
                <div 
                  key={saved.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => loadLayout(saved)}
                  data-testid={`load-layout-${saved.id}`}
                >
                  <div>
                    <p className="font-medium">{saved.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {saved.elements.length} elements • {saved.gridCols}x{saved.gridRows} grid
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedLayout(saved.id);
                    }}
                    data-testid={`delete-layout-${saved.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
