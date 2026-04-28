# Track & Field Scoreboard - Electron Desktop App

This directory contains the Electron wrapper for packaging the Track & Field Scoreboard as a standalone desktop application.

## Overview

The Electron app embeds the Express server and serves the React frontend, allowing stadium operators to run the complete scoreboard system as a native desktop application without requiring a separate server setup.

## Features

- **Single-click Launch**: Double-click to start the scoreboard
- **Embedded Server**: Node.js/Express server runs inside the app
- **System Tray**: Shows connection status with quick actions
- **Auto Port Selection**: Finds available port automatically
- **Edge Mode**: Runs with local SQLite database
- **Window State Persistence**: Remembers size and position

## Prerequisites

Before building, ensure you have:

1. Node.js 18+ installed
2. The main application built (`npm run build` in root)
3. Platform-specific build tools:
   - **Windows**: Visual Studio Build Tools
   - **macOS**: Xcode Command Line Tools
   - **Linux**: build-essential, rpm (for RPM builds)

## Project Structure

```
electron/
├── main.ts           # Main Electron process
├── preload.ts        # Preload script (IPC bridge)
├── tray.ts           # System tray management
├── loading.html      # Splash screen
├── package.json      # Electron dependencies
├── tsconfig.json     # TypeScript config
├── build.config.js   # electron-builder config
├── entitlements.mac.plist  # macOS permissions
├── installer.nsh     # Windows installer script
└── assets/           # App icons
    ├── icon.ico      # Windows icon
    ├── icon.icns     # macOS icon
    └── icon.png      # Linux icon
```

## Building the App

### 1. Build the Web Application

From the project root:

```bash
npm run build
```

### 2. Install Electron Dependencies

```bash
cd electron
npm install
```

### 3. Compile TypeScript

```bash
npm run build:main
```

### 4. Build for Your Platform

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**All platforms (requires platform-specific machines):**
```bash
npm run dist
```

### 5. Find Your Installer

Built installers will be in `electron/release/`:
- Windows: `Track & Field Scoreboard-x.x.x-Windows.exe`
- macOS: `Track & Field Scoreboard-x.x.x-macOS-x64.dmg`
- Linux: `Track & Field Scoreboard-x.x.x-Linux.AppImage`

## Development

To run in development mode:

```bash
npm run dev
```

This compiles TypeScript and launches Electron pointing to the development server.

## App Icons

Place your app icons in the `assets/` folder:

| File | Platform | Size |
|------|----------|------|
| `icon.ico` | Windows | 256x256 multi-size |
| `icon.icns` | macOS | 512x512 (with retina) |
| `icon.png` | Linux/Tray | 512x512 |
| `tray-connected.png` | All | 32x32 |
| `tray-disconnected.png` | All | 32x32 |
| `tray-syncing.png` | All | 32x32 |
| `tray-error.png` | All | 32x32 |

## Configuration

### Environment Variables

The Electron app sets these environment variables when starting the server:

| Variable | Description |
|----------|-------------|
| `EDGE_MODE` | Set to `true` for local operation |
| `PORT` | Server port (auto-selected) |
| `DATA_PATH` | Path to store SQLite database |
| `UPLOADS_PATH` | Path for uploaded files |
| `SQLITE_PATH` | Full path to SQLite database file |

### User Settings

Settings are stored using `electron-store` in the user's app data:

- **Windows**: `%APPDATA%\track-field-scoreboard\`
- **macOS**: `~/Library/Application Support/track-field-scoreboard/`
- **Linux**: `~/.config/track-field-scoreboard/`

## Troubleshooting

### Server Won't Start

1. Check if another instance is running
2. Verify the `dist/` folder contains the built server
3. Check console for error messages (View > Toggle Developer Tools)

### Port Conflicts

The app automatically finds an available port. If you need a specific port:
1. Close other applications using port 5000
2. The app will use 5000 by default if available

### macOS Gatekeeper

If macOS blocks the app:
1. Right-click the app and select "Open"
2. Or: System Preferences > Security & Privacy > General > Open Anyway

### Windows SmartScreen

On first run, Windows may show a SmartScreen warning:
1. Click "More info"
2. Click "Run anyway"

## Architecture

```
Electron Main Process
├── Starts Express Server (spawned Node.js process)
├── Creates BrowserWindow → loads http://localhost:{port}
├── Manages System Tray
└── Handles IPC communication

Renderer Process (Web App)
├── React Frontend
└── Communicates via preload IPC bridge

Preload Script
├── Exposes safe APIs to renderer
└── Bridges main ↔ renderer communication
```

## Data Storage (Edge Mode)

In Edge Mode, data is stored locally:

```
{userData}/
├── data/
│   ├── scoreboard.db    # SQLite database
│   └── uploads/         # Uploaded files
│       ├── meets/       # Meet logos
│       ├── athletes/    # Athlete photos
│       └── teams/       # Team logos
└── config.json          # App settings
```

## Security

- Context isolation enabled
- Node integration disabled in renderer
- Only safe IPC methods exposed via preload
- Native modules rebuilt for Electron
