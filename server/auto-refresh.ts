import { db } from "./db";
import { meets } from "@shared/schema";
import { eq } from "drizzle-orm";
import { importCompleteMDB } from "./import-mdb-complete";
import { existsSync } from "fs";

let pollingInterval: NodeJS.Timeout | null = null;

export function startAutoRefresh() {
  if (pollingInterval) return;
  
  console.log("🔄 Starting auto-refresh service...");
  
  pollingInterval = setInterval(async () => {
    try {
      const meetsToRefresh = await db.query.meets.findMany({
        where: (meets, { eq }) => eq(meets.autoRefresh, true)
      });
      
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
          
          console.log(`🔄 Auto-refreshing meet: ${meet.name} (${meet.id})`);
          
          try {
            await importCompleteMDB(meet.mdbPath, meet.id);
            
            await db.update(meets)
              .set({ lastImportAt: now })
              .where(eq(meets.id, meet.id));
              
            console.log(`✅ Auto-refresh complete for ${meet.name}`);
          } catch (error) {
            console.error(`❌ Auto-refresh failed for ${meet.name}:`, error);
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
