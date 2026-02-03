import { storage } from "./storage";
import { importCompleteMDB } from "./import-mdb-complete";
import { existsSync, copyFileSync, mkdirSync, unlinkSync } from "fs";
import * as path from "path";

let pollingInterval: NodeJS.Timeout | null = null;

// Helper to clean up temp files
function cleanupTempFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`⚠️  Failed to clean up temp file: ${filePath}`, error);
  }
}

export function startAutoRefresh() {
  if (pollingInterval) return;
  
  console.log("🔄 Starting auto-refresh service...");
  
  pollingInterval = setInterval(async () => {
    try {
      // Use storage abstraction instead of direct db access
      const allMeets = await storage.getMeets();
      const meetsToRefresh = allMeets.filter(m => m.autoRefresh === true);
      
      for (const meet of meetsToRefresh) {
        const now = new Date();
        const lastImport = meet.lastImportAt || new Date(0);
        const timeSinceLastImport = (now.getTime() - lastImport.getTime()) / 1000;
        const refreshInterval = meet.refreshInterval ?? 30;
        
        if (timeSinceLastImport >= refreshInterval && meet.mdbPath) {
          if (!existsSync(meet.mdbPath)) {
            console.warn(`⚠️  File not found for auto-refresh: ${meet.mdbPath}`);
            continue;
          }
          
          // Use copy-first approach to avoid MDB file locking issues with HyTek
          const tempDir = path.join(process.cwd(), 'data', 'temp');
          const tempMdbPath = path.join(tempDir, `autorefresh_${meet.id}_${Date.now()}.mdb`);
          
          try {
            // Ensure temp directory exists
            if (!existsSync(tempDir)) {
              mkdirSync(tempDir, { recursive: true });
            }
            
            // Quick copy to minimize lock time on original
            try {
              copyFileSync(meet.mdbPath, tempMdbPath);
            } catch (copyError: any) {
              // File might be locked by HyTek, skip this cycle
              if (copyError.code === 'EBUSY' || copyError.code === 'EACCES') {
                console.log(`🔒 MDB file busy/locked, will retry next cycle: ${meet.mdbPath}`);
                continue;
              }
              throw copyError;
            }
            
            console.log(`🔄 Auto-refreshing meet: ${meet.name} (${meet.id})`);
            
            // Import from the copy, not the original
            await importCompleteMDB(tempMdbPath, meet.id);
            
            // Use storage abstraction to update the meet
            await storage.updateMeet(meet.id, { lastImportAt: now });
              
            console.log(`✅ Auto-refresh complete for ${meet.name}`);
          } catch (error) {
            console.error(`❌ Auto-refresh failed for ${meet.name}:`, error);
          } finally {
            // Always clean up temp file
            cleanupTempFile(tempMdbPath);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in auto-refresh service:", error);
    }
  }, 5000);
}

export function stopAutoRefresh() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("🛑 Auto-refresh service stopped");
  }
}
