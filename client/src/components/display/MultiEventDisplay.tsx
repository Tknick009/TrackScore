import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  EventWithEntries,
  DisplayLayout,
  LayoutCell,
  Meet,
  Event,
  WSMessage,
  DisplayBoardState,
} from "@shared/schema";
import {
  LiveTimeBoard,
  SingleResultBoard,
  StandingsBoard,
  FieldEventBoard,
} from "./templates";
import { Trophy } from "lucide-react";

interface MultiEventDisplayProps {
  layoutId: string;
  meetId: string;
}

interface CellBoardProps {
  cell: LayoutCell;
  meet?: Meet;
  onClearCell: (cellId: string) => void;
}

// Hook to fetch event with entries using React Query
function useEventWithEntries(eventId: string | null | undefined) {
  return useQuery<EventWithEntries>({
    queryKey: [`/api/events/${eventId}/entries`],
    enabled: !!eventId,
    staleTime: 1000, // 1 second
    // Handle errors gracefully
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (event deleted)
      if (error?.status === 404 || error?.response?.status === 404) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });
}

function CellBoard({ cell, meet, onClearCell }: CellBoardProps) {
  // Track cleared event IDs to prevent duplicate auto-clear attempts
  // MUST be at top of component before any early returns (React Hooks rules)
  const clearedEventIdsRef = useRef<Set<string>>(new Set());
  
  // Guard: Return placeholder immediately if no event assigned
  if (!cell.eventId) {
    return (
      <div className="flex items-center justify-center h-full text-[hsl(var(--display-muted))]" data-testid={`cell-empty-${cell.id}`}>
        <div className="text-center">
          <p className="text-[64px] font-stadium mb-2">No Event Assigned</p>
          <p className="text-[36px]">Assign an event in the Layout Designer</p>
        </div>
      </div>
    );
  }

  // Only call useEventWithEntries if we have a valid eventId
  const { data: event, isLoading, error } = useEventWithEntries(cell.eventId);

  // Auto-clear cell if event deleted (404)
  // TODO: Reconsider StrictMode double-invocation behavior in future iteration
  useEffect(() => {
    const is404 = (error as any)?.status === 404 || (error as any)?.response?.status === 404;
    if (is404 && cell.eventId && !clearedEventIdsRef.current.has(cell.eventId)) {
      console.log(`Event ${cell.eventId} deleted, auto-clearing cell ${cell.id}`);
      clearedEventIdsRef.current.add(cell.eventId);
      onClearCell(cell.id);
    }
  }, [error, cell.id, cell.eventId, onClearCell]);

  // Apply cell-specific settings (font size multiplier)
  const fontMultiplier = (cell.settings as any)?.fontMultiplier || 1;
  const customStyle: React.CSSProperties = {
    fontSize: `${fontMultiplier * 100}%`,
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[48px] font-stadium text-[hsl(var(--display-muted))]" data-testid="text-loading">
          Loading...
        </p>
      </div>
    );
  }

  // Handle error state - distinguish 404 from other errors
  if (error) {
    const is404 = (error as any)?.status === 404 || (error as any)?.response?.status === 404;
    return (
      <div className="flex items-center justify-center h-full text-[hsl(var(--display-warning))]" data-testid={`cell-error-${cell.id}`}>
        <div className="text-center">
          <p className="text-[56px] font-stadium mb-2">
            {is404 ? "Event Deleted" : "Error Loading Event"}
          </p>
          <p className="text-[32px]">
            {is404 ? "This event has been removed. Please reassign this cell in the Layout Designer." : "Please check your connection and try again."}
          </p>
        </div>
      </div>
    );
  }

  // Handle event not found (shouldn't happen with proper error handling)
  if (!event) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[48px] font-stadium text-[hsl(var(--display-muted))]" data-testid="text-event-not-found">
          Event not found
        </p>
      </div>
    );
  }

  // Render appropriate board type
  const boardProps = { event, meet, mode: "live" };

  return (
    <div style={customStyle} className="h-full w-full overflow-auto">
      {cell.boardType === "live_time" && <LiveTimeBoard {...boardProps} />}
      {cell.boardType === "single_result" && <SingleResultBoard {...boardProps} />}
      {cell.boardType === "standings" && <StandingsBoard {...boardProps} />}
      {cell.boardType === "field_event" && <FieldEventBoard {...boardProps} />}
      {!["live_time", "single_result", "standings", "field_event"].includes(cell.boardType) && (
        <div className="flex items-center justify-center h-full">
          <p className="text-[32px] text-[hsl(var(--display-muted))]">
            Unknown board type: {cell.boardType}
          </p>
        </div>
      )}
    </div>
  );
}

export function MultiEventDisplay({ layoutId, meetId }: MultiEventDisplayProps) {
  // Fetch layout configuration
  const { data: layout, isLoading: layoutLoading, error: layoutError } = useQuery<DisplayLayout>({
    queryKey: [`/api/display-layouts/${layoutId}`],
  });

  // Fetch layout cells
  const { data: cells = [], isLoading: cellsLoading } = useQuery<LayoutCell[]>({
    queryKey: [`/api/layout-cells/layout/${layoutId}`],
    enabled: !!layoutId,
  });

  // Fetch meet info
  const { data: meet } = useQuery<Meet>({
    queryKey: [`/api/meets/${meetId}`],
    enabled: !!meetId,
  });

  // Fetch all events for the meet
  const { data: allEvents = [] } = useQuery<Event[]>({
    queryKey: [`/api/meets/${meetId}/events`],
    enabled: !!meetId,
  });

  // Mutation to clear cell when event is deleted (404)
  const clearCellMutation = useMutation({
    mutationFn: async (cellId: string) => {
      const response = await fetch(`/api/layout-cells/${cellId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: null }),
      });
      if (!response.ok) throw new Error('Failed to clear cell');
      return response.json();
    },
    onSuccess: () => {
      // Refresh cells after clearing
      queryClient.invalidateQueries({
        queryKey: [`/api/layout-cells/layout/${layoutId}`],
      });
    },
  });

  // WebSocket connection for real-time updates
  // Note: Depends only on layoutId to prevent reconnection loops when cells/queries update
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("Multi-event display WebSocket connected");
    };

    websocket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        
        // Handle different message types
        switch (message.type) {
          case "event_update":
            if (message.data?.id) {
              queryClient.invalidateQueries({
                queryKey: [`/api/events/${message.data.id}/entries`],
              });
            }
            break;
            
          case "board_update":
            if (message.data?.currentEvent?.id) {
              queryClient.invalidateQueries({
                queryKey: [`/api/events/${message.data.currentEvent.id}/entries`],
              });
            }
            break;
            
          case "entry_update":
            if (message.data?.eventId) {
              queryClient.invalidateQueries({
                queryKey: [`/api/events/${message.data.eventId}/entries`],
              });
            }
            break;
            
          // Handle layout configuration updates (e.g., when cells are auto-cleared)
          case "layout_update":
            // Refresh layout configuration
            queryClient.invalidateQueries({
              queryKey: [`/api/display-layouts/${layoutId}`],
            });
            // Refresh layout cells
            queryClient.invalidateQueries({
              queryKey: [`/api/layout-cells/layout/${layoutId}`],
            });
            break;
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("Multi-event display WebSocket disconnected");
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [layoutId]); // Only depend on layoutId to prevent reconnection loops

  // Loading state
  if (layoutLoading || cellsLoading) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-32 h-32 text-[hsl(var(--display-accent))] mx-auto mb-8 animate-pulse" />
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4">
            Loading Display Layout
          </h1>
          <p className="text-[40px] text-[hsl(var(--display-muted))]">
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (layoutError || !layout) {
    return (
      <div className="min-h-screen w-full bg-[hsl(var(--display-bg))] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-32 h-32 text-[hsl(var(--display-warning))] mx-auto mb-8" />
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4">
            Layout Not Found
          </h1>
          <p className="text-[40px] text-[hsl(var(--display-muted))]">
            Could not load display layout configuration
          </p>
        </div>
      </div>
    );
  }

  // Render grid with cells
  return (
    <div
      className="grid h-screen w-screen gap-2 p-2 bg-[hsl(var(--display-bg))]"
      style={{
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
      }}
      data-testid="multi-event-display-grid"
    >
      {cells.map((cell) => (
        <div
          key={cell.id}
          className="border-2 border-[hsl(var(--display-border))] bg-[hsl(var(--display-bg))] rounded-lg overflow-hidden"
          style={{
            gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
            gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
          }}
          data-testid={`cell-${cell.id}`}
        >
          {cell.eventId ? (
            <CellBoard cell={cell} meet={meet} onClearCell={clearCellMutation.mutate} />
          ) : (
            <div className="flex items-center justify-center h-full text-[hsl(var(--display-muted))]">
              <p className="text-[48px] font-stadium" data-testid="text-no-event">
                No Event Assigned
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
