import type { WebSocket } from "ws";
import type { WSMessage } from "@shared/schema";
import type multer from "multer";
import type { FileStorage } from "./file-storage";

export type ContentMode = 'lynx' | 'hytek' | 'team_scores' | 'field' | 'winners' | 'record';

export interface ConnectedDisplayDevice {
  ws: WebSocket;
  deviceId: string;
  deviceName: string;
  meetId: string;
  displayType: string;
  autoMode: boolean;
  pagingSize: number;
  pagingInterval: number;
  fieldPort?: number;
  contentMode: ContentMode;
}

export interface RouteContext {
  broadcastToDisplays: (message: WSMessage) => void;
  broadcastCurrentEvent: () => Promise<void>;
  broadcastFieldEventUpdate: (sessionId: number, deviceName?: string) => Promise<void>;
  sendToDisplayDevice: (deviceId: string, message: WSMessage) => boolean;
  getActiveMeetId: () => Promise<string | null>;
  getConnectedDevicesForMeet: (meetId: string) => string[];
  connectedDisplayDevices: Map<string, ConnectedDisplayDevice>;
  displayClients: Set<WebSocket>;
  fieldSessionSubscribers: Map<number, Set<WebSocket>>;
  upload: multer.Multer;
  imageUpload: multer.Multer;
  fileStorage: FileStorage;
  seedDefaultScenes: (meetId: string) => Promise<number>;
  autoExportLFF: (sessionId: number) => Promise<void>;
  abbreviateEventName: (name: string) => string;
  prefetchSceneData: (sceneId: number) => Promise<{ scene: any; objects: any[] } | null>;
  getDisplayModeFromTemplate: (template: string) => string | null;
  enrichEntriesWithRecordTags: (eventType: string, gender: string, entries: any[]) => Promise<void>;
  autoUpdateAthleteBests: (eventType: string, entries: any[]) => Promise<void>;
}
