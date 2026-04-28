import { contextBridge, ipcRenderer } from 'electron';

interface AppInfo {
  version: string;
  mode: string;
  serverPort: number;
  dataPath: string;
  platform: string;
}

interface ServerStatus {
  running: boolean;
  port: number;
}

interface RestartResult {
  success: boolean;
  port: number;
}

const electronAPI = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke('get-app-info'),
  
  getServerStatus: (): Promise<ServerStatus> => ipcRenderer.invoke('get-server-status'),
  
  restartServer: (): Promise<RestartResult> => ipcRenderer.invoke('restart-server'),
  
  openDataFolder: (): Promise<void> => ipcRenderer.invoke('open-data-folder'),
  
  showDevTools: (): Promise<void> => ipcRenderer.invoke('show-dev-tools'),
  
  window: {
    minimize: (): void => ipcRenderer.send('window-minimize'),
    maximize: (): void => ipcRenderer.send('window-maximize'),
    close: (): void => ipcRenderer.send('window-close')
  },
  
  on: (channel: string, callback: (...args: any[]) => void): void => {
    const validChannels = [
      'server-status-changed',
      'sync-status-changed',
      'update-available',
      'update-downloaded'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  
  off: (channel: string, callback: (...args: any[]) => void): void => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  platform: process.platform,
  
  isElectron: true
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
