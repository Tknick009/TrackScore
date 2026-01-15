# Local Installation Guide

This guide explains how to install and run the Track & Field Scoreboard locally for stadium deployment.

## Requirements

- **Node.js 18+** - Download from https://nodejs.org
- **FinishLynx** - For live timing data (optional for testing)

## Quick Install

### Mac/Linux
```bash
./install.sh
./start.sh
```

### Windows
```
install.bat
start.bat
```

## Manual Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create data directory:**
   ```bash
   mkdir data
   ```

3. **Start in Edge Mode:**
   ```bash
   EDGE_MODE=true npm run dev
   ```
   
   Windows:
   ```cmd
   set EDGE_MODE=true && npm run dev
   ```

## Syncing Meet Data from Cloud

If you have meet data on a cloud server, you can download it:

### Option 1: Web Interface
1. Open http://localhost:5000/cloud-sync
2. Enter the cloud server URL (e.g., https://your-app.replit.app)
3. Enter your 6-character meet code
4. Click "Download Meet"

### Option 2: Command Line
```bash
npx tsx tools/edge-setup.ts setup --cloud-url https://your-app.replit.app --meet-code ABC123
```

## FinishLynx Connection

When running locally, FinishLynx connects directly to these TCP ports:

| Data Type | Port |
|-----------|------|
| Results   | 5555 |
| Clock     | 5556 |
| Field     | 5557 |

Configure FinishLynx ResulTV to send data to your local machine's IP address on these ports.

## Access the Application

- **Control Panel:** http://localhost:5000/control
- **Display Devices:** http://localhost:5000/display-devices
- **Scene Editor:** http://localhost:5000/scene-editor

## Data Storage

In Edge Mode, all data is stored locally in:
- **Database:** `./data/scoreboard.db` (SQLite)
- **Assets:** `./data/assets/` (images, logos)

## Troubleshooting

**Port 5000 already in use:**
Another application is using port 5000. Close it or modify the port in server configuration.

**FinishLynx not connecting:**
- Ensure firewall allows incoming connections on ports 5555-5557
- Verify FinishLynx ResulTV is configured with the correct IP address
- Check that the server is running before starting FinishLynx

**Missing meet data:**
Use the cloud sync feature to download meet configuration from your cloud server.
