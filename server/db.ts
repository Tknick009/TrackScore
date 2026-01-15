import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// In Edge Mode, we use SQLite instead of PostgreSQL
// So we don't require DATABASE_URL when EDGE_MODE is enabled
const isEdgeMode = process.env.EDGE_MODE === 'true';

if (!isEdgeMode && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Only create PostgreSQL pool/db when not in Edge Mode
export const pool = isEdgeMode ? null : new Pool({ connectionString: process.env.DATABASE_URL });
export const db = isEdgeMode ? null : drizzle({ client: pool!, schema });
