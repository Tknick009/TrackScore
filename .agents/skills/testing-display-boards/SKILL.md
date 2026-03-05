# Testing Display Boards (Winners Board, Record Board)

## Overview
This skill covers testing the display board features (Winners Board, Record Board) which read from FinishLynx LIF/LFF files and render on display devices.

## Prerequisites

### Start the Dev Server
```bash
EDGE_MODE=true npm run dev
```
The app runs at `localhost:5000`.

### Create Test LIF Files
The Winners Board reads from LIF/LFF files in the configured Lynx files directory. To test:

1. Create the directory: `mkdir -p /tmp/lynx-files`
2. Create a test LIF file (e.g., `/tmp/lynx-files/5-1-1.lif` for event 5, round 1, heat 1):
```
0,5,1,1,100 Meters,
1,101,1,Johnson,Michael,Tigers,10.25,
2,102,2,Smith,David,Eagles,10.39,
3,103,3,Williams,James,Lions,10.52,
4,104,4,Brown,Robert,Bears,10.68,
```

File naming: `{eventNumber}-{round}-{heat}.lif` (or `.lff` for field events)

Header format: `0,eventNumber,roundNumber,heatNumber,eventName,`
Result format: `place,bibNumber,lane,lastName,firstName,team,time,`

### Configure Ingestion Settings
The meet must have `lynxFilesDirectory` set to `/tmp/lynx-files` (or wherever your test files are). This is configured in the Meet Setup > Ingestion Settings section.

## Testing Flow

### 1. Register a Display Device
- Navigate to `localhost:5000/display`
- Select the test meet from the dropdown
- Enter a device name (e.g., "Test P10")
- Select display type (P10, P6, Big Board, etc.)
- Click "Start Display"
- Verify green dot appears (device registered)

**IMPORTANT**: After a server restart, the display device must be re-registered. The `connectedDisplayDevices` map is in-memory and cleared on restart. If you see "showing 0 winners" in the toast, it likely means the device isn't registered — reload the display page and re-register.

### 2. Test Winners Board
- Open Display Control page: `localhost:5000/control/{meetId}/displays/control`
- Click on the registered device in the sidebar
- Click the "Winners Board" mode tile
- Select an event that has LIF/LFF files
- Click "Preview Winners" to see the data in the control panel
- Click "Send to Board" to push to the display
- Toast should say "Display is now showing N winners"
- Switch to the display tab to verify full-screen rendering

### 3. Test Record Board
- Same flow as Winners Board but click "Record Board" tile
- After preview, type a record label (e.g., "Meet Record")
- Click "Send to Board"
- Verify full-screen rendering with gold accents

## Key Behaviors to Verify

### Full-Screen Rendering
Winners Board and Record Board should render full-screen regardless of display type. Even on P10 (192x96), the board should fill the entire viewport. The `isFullScreenBoard` check in `display-device.tsx` bypasses the fixed-size container.

### Podium Colors
- 1st place: Gold accent (left border)
- 2nd place: Silver accent
- 3rd place: Bronze accent  
- 4th place: Muted/white accent

### Content Mode Change
When Winners/Record Board is sent, `autoModeRef` should be set to `false` to prevent FinishLynx data from overriding the display. This is handled in the `content_mode_change` handler.

## Common Issues

1. **"Showing 0 winners" toast**: Device not in `connectedDisplayDevices` map. Re-register the display device after server restart.
2. **Blank display after send**: Check that the client has a rendering handler for the template (e.g., `WinnersBoard.tsx` component must exist and be imported).
3. **Display constrained to P10 size**: The `isFullScreenBoard` check must match the template name and mode. Verify `template === 'winners-board'` and `mode === 'winners'`.
4. **Port conflicts on restart**: Kill old node processes before restarting: `pkill -f 'node.*TrackScore'`

## Devin Secrets Needed
No secrets required for local testing. The app runs entirely locally with SQLite.
