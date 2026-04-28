import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { showMainWindow, quitApp, getServerPort } from './main';

let tray: Tray | null = null;
let currentStatus: 'connected' | 'disconnected' | 'syncing' | 'error' = 'disconnected';

function getIconPath(status: string): string {
  const iconName = `tray-${status}`;
  const iconExt = process.platform === 'win32' ? 'ico' : 'png';
  
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', `${iconName}.${iconExt}`);
  }
  
  return path.join(__dirname, 'assets', `${iconName}.${iconExt}`);
}

function createTrayIcon(status: string): nativeImage {
  const iconPath = getIconPath(status);
  
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    const size = process.platform === 'darwin' ? 22 : 16;
    const colors: Record<string, string> = {
      connected: '#4CAF50',
      disconnected: '#9E9E9E',
      syncing: '#2196F3',
      error: '#F44336'
    };
    
    const color = colors[status] || colors.disconnected;
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="white"/>
      </svg>
    `;
    
    return nativeImage.createFromDataURL(
      `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    );
  }
}

function buildContextMenu(): Menu {
  const statusLabels: Record<string, string> = {
    connected: 'Server Running',
    disconnected: 'Server Stopped',
    syncing: 'Syncing...',
    error: 'Server Error'
  };

  return Menu.buildFromTemplate([
    {
      label: 'Track & Field Scoreboard',
      enabled: false,
      icon: createTrayIcon('connected').resize({ width: 16, height: 16 })
    },
    { type: 'separator' },
    {
      label: statusLabels[currentStatus] || 'Unknown',
      enabled: false
    },
    {
      label: `Port: ${getServerPort()}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Scoreboard',
      click: () => showMainWindow(),
      accelerator: 'CmdOrCtrl+O'
    },
    {
      label: 'Open in Browser',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal(`http://localhost:${getServerPort()}`);
      }
    },
    { type: 'separator' },
    {
      label: 'Mode: Edge (Local)',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => quitApp(),
      accelerator: 'CmdOrCtrl+Q'
    }
  ]);
}

export function createTray(): void {
  if (tray) return;

  const icon = createTrayIcon('disconnected');
  tray = new Tray(icon);
  
  tray.setToolTip('Track & Field Scoreboard');
  tray.setContextMenu(buildContextMenu());

  tray.on('click', () => {
    if (process.platform !== 'darwin') {
      showMainWindow();
    }
  });

  tray.on('double-click', () => {
    showMainWindow();
  });
}

export function updateTrayStatus(status: 'connected' | 'disconnected' | 'syncing' | 'error'): void {
  if (!tray) return;

  currentStatus = status;
  const icon = createTrayIcon(status);
  tray.setImage(icon);
  tray.setContextMenu(buildContextMenu());

  const tooltips: Record<string, string> = {
    connected: 'Track & Field Scoreboard - Running',
    disconnected: 'Track & Field Scoreboard - Stopped',
    syncing: 'Track & Field Scoreboard - Syncing',
    error: 'Track & Field Scoreboard - Error'
  };
  
  tray.setToolTip(tooltips[status] || 'Track & Field Scoreboard');
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
