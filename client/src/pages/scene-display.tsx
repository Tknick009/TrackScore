import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import type { SelectLayoutScene, SelectLayoutObject } from "@shared/schema";
import { SceneCanvas } from "@/components/scene-canvas";

function getSceneCache(sceneId: string): { scene: any; objects: any[] } | null {
  try {
    const cached = localStorage.getItem(`scene_cache_${sceneId}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < 60000) {
        console.log(`[SceneDisplay] Using cached scene ${sceneId}`);
        return { scene: data.scene, objects: data.objects };
      }
    }
  } catch (e) {}
  return null;
}

function useScene(sceneId: string | undefined) {
  return useQuery<SelectLayoutScene>({
    queryKey: ["/api/layout-scenes", sceneId],
    queryFn: async () => {
      if (!sceneId) throw new Error("No scene ID");
      const cached = getSceneCache(sceneId);
      if (cached?.scene) return cached.scene;
      const res = await fetch(`/api/layout-scenes/${sceneId}`);
      if (!res.ok) throw new Error("Failed to load scene");
      return res.json();
    },
    enabled: !!sceneId,
    staleTime: 10000,
  });
}

function useSceneObjects(sceneId: string | undefined) {
  return useQuery<SelectLayoutObject[]>({
    queryKey: ["/api/layout-objects", { sceneId }],
    queryFn: async () => {
      if (!sceneId) return [];
      const cached = getSceneCache(sceneId);
      if (cached?.objects) return cached.objects;
      const res = await fetch(`/api/layout-objects?sceneId=${sceneId}`);
      if (!res.ok) throw new Error("Failed to load objects");
      return res.json();
    },
    enabled: !!sceneId,
    staleTime: 5000,
  });
}

export default function SceneDisplay() {
  const params = useParams();
  const [location] = useLocation();
  
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const sceneId = params.sceneId || urlParams.get("sceneId") || undefined;
  const meetId = urlParams.get("meetId") || undefined;
  const eventNumber = urlParams.get("eventNumber") || undefined;
  const pagingSize = parseInt(urlParams.get("pagingSize") || "8", 10);
  const pagingInterval = parseInt(urlParams.get("pagingInterval") || "5", 10);
  
  const cachedSceneData = useMemo(() => {
    if (!sceneId) return null;
    const cached = getSceneCache(sceneId);
    if (cached) {
      console.log(`[SceneDisplay] Found cached scene ${sceneId} for instant switch`);
    }
    return cached;
  }, [sceneId]);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const { data: scene } = useScene(sceneId);
  const { data: objects } = useSceneObjects(sceneId);
  
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log("Scene display WebSocket connected");
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "event_update":
          case "board_update":
          case "entry_update":
            if (message.data?.id || message.data?.eventId) {
              const eventId = message.data.id || message.data.eventId || message.data?.currentEvent?.id;
              if (eventId) {
                queryClient.invalidateQueries({
                  queryKey: [`/api/events/${eventId}/entries`],
                });
              }
            }
            break;
            
          case "live_data_update":
            if (message.data?.eventNumber) {
              queryClient.invalidateQueries({
                queryKey: ["/api/live-events", message.data.eventNumber],
              });
            }
            break;
            
          case "standings_update":
            if (meetId) {
              queryClient.invalidateQueries({
                queryKey: [`/api/meets/${meetId}/scoring/standings`],
              });
            }
            break;
            
          case "scene_update":
            if (sceneId) {
              queryClient.invalidateQueries({
                queryKey: ["/api/layout-scenes", sceneId],
              });
              queryClient.invalidateQueries({
                queryKey: ["/api/layout-objects", { sceneId }],
              });
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error("Scene display WebSocket error:", error);
    };
    
    websocket.onclose = () => {
      console.log("Scene display WebSocket disconnected");
    };
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [sceneId, meetId]);
  
  if (!sceneId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--display-bg))] display-layout">
        <div className="text-center">
          <p className="text-2xl font-stadium text-[hsl(var(--display-muted))]">
            No scene ID provided
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <SceneCanvas
      sceneId={parseInt(sceneId, 10)}
      scene={cachedSceneData?.scene || scene}
      objects={cachedSceneData?.objects || objects}
      meetId={meetId}
      eventNumber={eventNumber}
      pagingSize={pagingSize}
      pagingInterval={pagingInterval}
    />
  );
}
