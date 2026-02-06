import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAutoRefresh } from "./auto-refresh";
import { storage } from "./storage";
import { initEVTWatchers } from "./evt-watcher";

const app = express();

// Serve static files from public folder (NCAA logos, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve uploaded files (meet logos, athlete photos, team logos)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed scoring presets using storage abstraction
  try {
    await storage.seedScoringPresets();
    console.log("✅ Scoring presets initialized");
  } catch (error) {
    console.error("❌ Failed to seed scoring presets:", error);
    throw error; // Prevent server start on seed failure
  }

  // Seed split time defaults
  try {
    await storage.seedSplitDefaults();
    console.log("✅ Split defaults initialized");
  } catch (error) {
    console.error("❌ Failed to seed split defaults:", error);
    throw error;
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const isWindows = process.platform === 'win32';
  server.listen({
    port,
    host: "0.0.0.0",
    ...(isWindows ? {} : { reusePort: true }),
  }, () => {
    log(`serving on port ${port}`);
    startAutoRefresh();
    
    // Initialize EVT file watchers for field event sessions
    initEVTWatchers().catch(err => {
      console.error("Failed to initialize EVT watchers:", err);
    });
  });
})();
