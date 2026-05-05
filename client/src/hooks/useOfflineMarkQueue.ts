/**
 * Offline mark queue — stores marks in IndexedDB when the server is unreachable,
 * then syncs them automatically when the connection is restored.
 * 
 * This ensures field officials can keep entering data even if the tablet
 * temporarily loses WiFi at the stadium.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Mark data that gets queued when offline
export interface QueuedMark {
  id: string; // Unique ID for deduplication
  sessionId: number;
  athleteId: number;
  attemptNumber: number;
  markType: string;
  measurement?: number | null;
  measurementDisplay?: string | null;
  wind?: number | null;
  heightIndex?: number | null;
  attemptAtHeight?: number | null;
  isFinalsRound?: boolean;
  deviceName?: string;
  queuedAt: number; // timestamp
  synced: boolean;
  syncError?: string;
}

const DB_NAME = "TrackScoreFieldOffline";
const DB_VERSION = 1;
const STORE_NAME = "queuedMarks";
const SESSION_CACHE_STORE = "sessionCache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("sessionId", "sessionId", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("queuedAt", "queuedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(SESSION_CACHE_STORE)) {
        db.createObjectStore(SESSION_CACHE_STORE, { keyPath: "sessionId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(mark: QueuedMark): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(mark);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getUnsynced(): Promise<QueuedMark[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("synced");
    const request = index.getAll(IDBKeyRange.only(false));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function markAsSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        store.put(record);
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function markSyncError(id: string, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.syncError = error;
        store.put(record);
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function clearSyncedMarks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("synced");
    const request = index.openCursor(IDBKeyRange.only(true));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Cache session data locally so the roster is available offline
async function cacheSessionData(sessionId: number, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_CACHE_STORE, "readwrite");
    tx.objectStore(SESSION_CACHE_STORE).put({ sessionId, data, cachedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCachedSession(sessionId: number): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_CACHE_STORE, "readonly");
    const request = tx.objectStore(SESSION_CACHE_STORE).get(sessionId);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
}

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export function useOfflineMarkQueue(sessionId: number | null) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connected");
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPingRef = useRef<number>(Date.now());

  // Check server connectivity
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        lastPingRef.current = Date.now();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Sync all queued marks to server
  const syncQueuedMarks = useCallback(async () => {
    if (syncingRef.current || !sessionId) return;
    syncingRef.current = true;
    
    try {
      const unsynced = await getUnsynced();
      if (unsynced.length === 0) return;

      setIsSyncing(true);
      
      // Sort by queuedAt to maintain order
      const sorted = unsynced.sort((a, b) => a.queuedAt - b.queuedAt);
      
      for (const qm of sorted) {
        try {
          await apiRequest("POST", "/api/field-marks", {
            sessionId: qm.sessionId,
            athleteId: qm.athleteId,
            attemptNumber: qm.attemptNumber,
            markType: qm.markType,
            measurement: qm.measurement,
            measurementDisplay: qm.measurementDisplay,
            wind: qm.wind,
            heightIndex: qm.heightIndex,
            attemptAtHeight: qm.attemptAtHeight,
            isFinalsRound: qm.isFinalsRound,
            deviceName: qm.deviceName,
          });
          await markAsSynced(qm.id);
        } catch (err: any) {
          // If it's a duplicate (409) or validation error (400), mark as synced to avoid infinite retry
          // apiRequest throws Error with message like "409: ..." so check message prefix
          if (err?.message?.startsWith('409') || err?.message?.startsWith('400')) {
            await markAsSynced(qm.id);
          } else {
            await markSyncError(qm.id, err?.message || "Unknown error");
            // Stop syncing on network error — will retry on next interval
            break;
          }
        }
      }
      
      // Clean up synced marks
      await clearSyncedMarks();
      
      // Invalidate queries so UI refreshes with synced data
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "marks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/field-sessions", sessionId, "athletes"] });
      }
      
      // Update pending count
      const remaining = await getUnsynced();
      setPendingCount(remaining.length);
    } catch (err) {
      console.error("[OfflineQueue] Sync error:", err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [sessionId]);

  // Queue a mark (called instead of direct API when we might be offline)
  const queueMark = useCallback(async (markData: Omit<QueuedMark, "id" | "queuedAt" | "synced">) => {
    const mark: QueuedMark = {
      ...markData,
      id: `${markData.sessionId}-${markData.athleteId}-${markData.attemptNumber}-${Date.now()}`,
      queuedAt: Date.now(),
      synced: false,
    };
    
    // Try to send directly first
    if (connectionStatus === "connected") {
      try {
        const response = await apiRequest("POST", "/api/field-marks", {
          sessionId: mark.sessionId,
          athleteId: mark.athleteId,
          attemptNumber: mark.attemptNumber,
          markType: mark.markType,
          measurement: mark.measurement,
          measurementDisplay: mark.measurementDisplay,
          wind: mark.wind,
          heightIndex: mark.heightIndex,
          attemptAtHeight: mark.attemptAtHeight,
          isFinalsRound: mark.isFinalsRound,
          deviceName: mark.deviceName,
        });
        return await response.json();
      } catch (err: any) {
        // Only treat network errors as offline — server errors (400, 500) should propagate
        if (err?.message?.includes('fetch') || err?.message?.includes('network') || !navigator.onLine) {
          setConnectionStatus("offline");
        } else {
          throw err;
        }
      }
    }
    
    // Queue locally
    await addToQueue(mark);
    const unsynced = await getUnsynced();
    setPendingCount(unsynced.length);
    
    return mark;
  }, [connectionStatus]);

  // Cache session data when it changes
  const cacheSession = useCallback(async (data: any) => {
    if (sessionId) {
      await cacheSessionData(sessionId, data);
    }
  }, [sessionId]);

  // Get cached session data (for offline use)
  const getCached = useCallback(async () => {
    if (!sessionId) return null;
    return getCachedSession(sessionId);
  }, [sessionId]);

  // Periodic connectivity check and sync
  useEffect(() => {
    const interval = setInterval(async () => {
      const isOnline = await checkConnection();
      
      if (isOnline) {
        if (connectionStatus !== "connected") {
          setConnectionStatus("reconnecting");
          // Sync queued marks
          await syncQueuedMarks();
          setConnectionStatus("connected");
        }
      } else {
        if (connectionStatus === "connected") {
          setConnectionStatus("offline");
        }
      }
    }, 5000); // Check every 5 seconds

    syncIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [connectionStatus, checkConnection, syncQueuedMarks]);

  // Load pending count on mount
  useEffect(() => {
    getUnsynced().then(marks => setPendingCount(marks.length)).catch(() => {});
  }, []);

  return {
    connectionStatus,
    pendingCount,
    isSyncing,
    queueMark,
    syncQueuedMarks,
    cacheSession,
    getCached,
  };
}
