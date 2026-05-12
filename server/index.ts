import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAutoRefresh } from "./auto-refresh";
import { storage } from "./storage";
import { initEVTWatchers } from "./evt-watcher";
import { installLogCapture, exportLogs, clearLogs, logCount } from "./log-capture";
import { bootSync } from "./folder-sync";
import { lynxListener } from "./lynx-listener";

// Install log capture BEFORE anything else so all console output is recorded
installLogCapture();

const app = express();

// Serve static files from public folder (NCAA logos, etc.)
// Cache-Control headers prevent browser re-fetching on every render cycle,
// eliminating the "flashy" look on headshots and logos.
app.use(express.static(path.join(process.cwd(), 'public'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
}));

// Serve uploaded files (meet logos, athlete photos, team logos)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
}));

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
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      // Only log slow requests or errors — skip high-frequency polling endpoints
      const isPolling = reqPath.includes('/live-events') || reqPath.includes('/events/current') || reqPath.includes('/scoring/standings');
      if (isPolling && res.statusCode < 400 && duration < 500) return; // Skip normal polling
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
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
  
  // ===== Log export endpoints =====
  // Guard: only allow log endpoints from localhost or same-machine requests
  const isLocalRequest = (req: Request): boolean => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === req.socket.localAddress;
  };

  app.get('/api/logs/export', (req, res) => {
    if (!isLocalRequest(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
    const text = exportLogs();
    const filename = `trackscore-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(text);
  });

  app.post('/api/logs/clear', (req, res) => {
    if (!isLocalRequest(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
    clearLogs();
    res.json({ ok: true });
  });

  app.get('/api/logs/count', (req, res) => {
    if (!isLocalRequest(req)) { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json({ count: logCount() });
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[Express Error] ${status}: ${message}`, err.stack || err);
    res.status(status).json({ message });
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

    // Boot-time folder sync: check configured sync folder for new meet packages
    bootSync().catch(err => {
      console.error("Failed to run boot sync:", err);
    });
  });

  // Graceful shutdown: close connections cleanly so SQLite isn't left dirty
  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[Shutdown] Received ${signal}, closing gracefully...`);

    // 1. Stop accepting new HTTP connections
    server.close(() => {
      console.log("[Shutdown] HTTP server closed");
    });

    // 2. Stop FinishLynx TCP listeners
    try {
      await lynxListener.stop();
      console.log("[Shutdown] Lynx listeners stopped");
    } catch (e) {
      console.error("[Shutdown] Error stopping Lynx listeners:", e);
    }

    // 3. Close SQLite cleanly
    try {
      if ('close' in storage && typeof (storage as any).close === 'function') {
        (storage as any).close();
        console.log("[Shutdown] Database closed");
      }
    } catch (e) {
      console.error("[Shutdown] Error closing database:", e);
    }

    // 4. Force exit after timeout (5s) if something hangs
    setTimeout(() => {
      console.error("[Shutdown] Forced exit after timeout");
      process.exit(1);
    }, 5000).unref();

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
