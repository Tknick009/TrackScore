import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';
import { createTray, updateTrayStatus, destroyTray } from './tray';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

interface AppSettings {
  windowState: WindowState;
  serverPort: number;
  autoStart: boolean;
  lastMeetId?: string;
}

const store = new Store<AppSettings>({
  defaults: {
    windowState: {
      width: 1400,
      height: 900,
      isMaximized: false
    },
    serverPort: 5000,
    autoStart: true
  }
});

let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort: number = 5000;
let isQuitting = false;

function getAppPath(): string {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  return path.resolve(__dirname, '..');
}

function getServerPath(): string {
  const appPath = getAppPath();
  if (app.isPackaged) {
    return path.join(appPath, 'resources', 'server');
  }
  return path.resolve(__dirname, '..', 'dist');
}

function getDataPath(): string {
  const userDataPath = app.getPath('userData');
  const dataPath = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

function getUploadsPath(): string {
  const dataPath = getDataPath();
  const uploadsPath = path.join(dataPath, 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  return uploadsPath;
}

async function findAvailablePort(startPort: number): Promise<number> {
  const net = await import('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function createLoadingWindow(): void {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const loadingHtml = path.join(__dirname, 'loading.html');
  if (fs.existsSync(loadingHtml)) {
    loadingWindow.loadFile(loadingHtml);
  } else {
    loadingWindow.loadURL(`data:text/html;charset=utf-8,
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #1e3a5f 0%, #0d1f33 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: white;
            -webkit-app-region: drag;
          }
          .container {
            text-align: center;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top-color: #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .status {
            font-size: 14px;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Track & Field Scoreboard</h1>
          <div class="spinner"></div>
          <div class="status">Starting server...</div>
        </div>
      </body>
      </html>
    `);
  }
}

async function startServer(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      serverPort = await findAvailablePort(store.get('serverPort', 5000));
      
      const serverPath = getServerPath();
      const dataPath = getDataPath();
      const uploadsPath = getUploadsPath();
      
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        NODE_ENV: 'production',
        EDGE_MODE: 'true',
        PORT: serverPort.toString(),
        DATA_PATH: dataPath,
        UPLOADS_PATH: uploadsPath,
        SQLITE_PATH: path.join(dataPath, 'scoreboard.db')
      };

      const serverScript = app.isPackaged 
        ? path.join(serverPath, 'index.js')
        : path.join(path.resolve(__dirname, '..'), 'dist', 'index.js');

      console.log(`Starting server at: ${serverScript}`);
      console.log(`Port: ${serverPort}`);
      console.log(`Data path: ${dataPath}`);

      serverProcess = spawn('node', [serverScript], {
        env,
        cwd: app.isPackaged ? serverPath : path.resolve(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let serverStarted = false;
      const startTimeout = setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Server startup timeout'));
        }
      }, 30000);

      serverProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log('[Server]', output);
        
        if (output.includes('serving on port') || output.includes('listening')) {
          serverStarted = true;
          clearTimeout(startTimeout);
          updateTrayStatus('connected');
          resolve();
        }
      });

      serverProcess.stderr?.on('data', (data: Buffer) => {
        console.error('[Server Error]', data.toString());
      });

      serverProcess.on('error', (error) => {
        console.error('Server process error:', error);
        updateTrayStatus('error');
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        console.log(`Server exited with code ${code}`);
        if (!isQuitting) {
          updateTrayStatus('disconnected');
        }
        serverProcess = null;
      });

    } catch (error) {
      reject(error);
    }
  });
}

function stopServer(): void {
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

function createMainWindow(): void {
  const windowState = store.get('windowState');

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    title: 'Track & Field Scoreboard',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', () => {
    console.log('Failed to load, retrying...');
    setTimeout(() => {
      mainWindow?.loadURL(`http://localhost:${serverPort}`);
    }, 1000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith(`http://127.0.0.1`)) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function saveWindowState(): void {
  if (!mainWindow) return;

  const bounds = mainWindow.getBounds();
  store.set('windowState', {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: mainWindow.isMaximized()
  });
}

function setupIPC(): void {
  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    mode: 'edge',
    serverPort,
    dataPath: getDataPath(),
    platform: process.platform
  }));

  ipcMain.handle('get-server-status', () => ({
    running: serverProcess !== null,
    port: serverPort
  }));

  ipcMain.handle('restart-server', async () => {
    stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startServer();
    return { success: true, port: serverPort };
  });

  ipcMain.handle('open-data-folder', () => {
    shell.openPath(getDataPath());
  });

  ipcMain.handle('show-dev-tools', () => {
    mainWindow?.webContents.openDevTools();
  });

  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.hide());
}

export function showMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

export function quitApp(): void {
  isQuitting = true;
  stopServer();
  destroyTray();
  app.quit();
}

export function getServerPort(): number {
  return serverPort;
}

app.whenReady().then(async () => {
  createLoadingWindow();
  createTray();
  setupIPC();

  try {
    await startServer();
    createMainWindow();
  } catch (error) {
    console.error('Failed to start server:', error);
    dialog.showErrorBox(
      'Server Error',
      `Failed to start the scoreboard server:\n${error}`
    );
    if (loadingWindow) {
      loadingWindow.close();
    }
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    showMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  saveWindowState();
  stopServer();
});

process.on('SIGTERM', () => {
  isQuitting = true;
  stopServer();
  app.quit();
});

process.on('SIGINT', () => {
  isQuitting = true;
  stopServer();
  app.quit();
});
