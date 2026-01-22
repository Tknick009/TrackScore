# Track and Field Scoreboard Application

## Overview
This project is a real-time track and field scoreboard system for centralizing event management, athlete result recording, and live data broadcasting. It supports multi-display output via WebSocket connections, providing a comprehensive solution for meet organizers. Built as a full-stack TypeScript application with React for the frontend and Express for the backend, the system aims to be robust, scalable, and user-friendly. The business vision is to provide a reliable platform for athletic events, with market potential in athletic organizations and event management companies seeking advanced, real-time scoring and display solutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with shadcn/ui on Radix UI and Tailwind CSS, adhering to Material Design principles for control interfaces and high-visibility design for displays. Typography uses Inter/Roboto for control panels and Roboto Condensed for display boards. The architecture separates a control dashboard (`/control`) from various display boards (`/display`, `/scene-display`).

### Technical Implementations
**Frontend:**
- **Framework:** React 18 with TypeScript, Vite, Wouter for routing.
- **State Management:** TanStack Query for server state, real-time updates via WebSocket with a 5-second polling fallback.
- **Form Management:** React Hook Form with Zod for validation.

**Backend:**
- **Server Framework:** Express.js with TypeScript and `ws` for WebSockets.
- **API Design:** RESTful endpoints (`/api`) and a WebSocket endpoint (`/ws`) for real-time updates.
- **Data Storage:** In-memory storage (`MemStorage`) with an `IStorage` abstraction, designed for future PostgreSQL migration via Drizzle ORM.
- **WebSocket Broadcasting:** Manages connected display clients, broadcasting event state updates.
- **Remote Display Control:** Allows operators to assign specific events to registered display devices.

**Feature Specifications:**
- **Scene-Based Layout System (ResulTV-Style):** Manages `layout_scenes` and `layout_objects` for dynamic display layouts. Features a visual Scene Editor UI for designing and configuring scenes, and a Scene Display Runtime for rendering with live data. Includes a simplified editor with draw-box workflow, field binding inspector, and pre-built field combinations. Advanced tools like snap-to-grid, alignment toolbar, field code system, and layout templates are available. Supports RTV file import.
- **Asset Management System:** Manages athlete photos and team logos with metadata and image processing (`FileStorage`).
- **HyTek MDB Import System:** Parses HyTek MDB files for event scheduling and naming.
- **Lynx Protocol Integration (ResulTV/LSS Format):** Uses ResulTV binary protocol for FinishLynx integration. Architecture:
  - **Data Flow:** FinishLynx → TCP ports → ResulTV Parser → WebSocket → Displays
  - **Development Mode:** TCP Forwarder (`tools/tcp-forwarders/lynx-tcp-forwarder.cjs`) bridges remote FinishLynx to cloud server via HTTP, forwarding raw bytes (base64 encoded) to `/api/lynx/raw` endpoint
  - **Production/Edge Mode:** FinishLynx connects directly to server TCP ports
  - **Dual-Port Architecture:** Supports independent paging for big board and small board displays:
    - Port 4554: Big Board results (`results_big` type) → broadcasts to `track_mode_change_big` WebSocket channel
    - Port 4555: Small Board results (`results` type) → broadcasts to `track_mode_change` WebSocket channel
    - Port 4556: Shared clock data
    - Port 4557: FieldLynx data
    - **Single-Port Fallback:** When only one results port is configured (common setup), all data (track_mode_change, start_list, layout_command) is broadcast to BOTH big and small board channels. This ensures displays work regardless of which channel they select.
  - **FinishLynx Configuration:** Configure two separate ResulTV outputs in FinishLynx with different page sizes (e.g., 8 lines for P10, 16 lines for big board)
  - **Display Channel Selection:** Display devices can choose which channel to subscribe to via the "Data Channel" toggle in setup
  - **ResulTV Parser (`server/parsers/resultv-parser.ts`):** Decodes LSS binary format with group codes (\10-\17) and variable codes (\01-\0f), handles layout commands, clock, wind, headers, and result entries
  - **WebSocket Events:** `layout-command`, `lynx_clock`, `lynx_wind`, `lynx_header`, `lynx_entry`, `track_mode_change`, `track_mode_change_big`
  - **Key Principle:** Forwarder does NO parsing - all intelligence is in the server. Displays receive complete data and just render.
- **Scene Layout Mapping System:** Displays use Scene Layout Mappings to switch scenes based on FinishLynx layout commands. The mapping table (`scene_template_mappings`) associates (meetId, displayType, displayMode) → sceneId. When FinishLynx sends a layout command (e.g., "Start List"), the display maps it to a displayMode (`start_list`, `running_time`, `track_results`, `field_results`, `field_standings`, `team_scores`), looks up the configured scene for that mode, and switches to it. Falls back to default templates if no scene is configured. Configure mappings in Display Control → Scene Template Mappings tab.
- **Auto-Mode Track Display System:** Displays automatically switch templates based on live Lynx timing data without pre-configured events. Persistence of auto-mode state, four auto states (idle, armed, running, results), and template mapping per display type.
- **Total Heats Display:** WebSocket broadcasts include `totalHeats` field for "Heat X of Y" display. Total heats are calculated from the database entries table using `getTotalHeatsForEvent()` which counts distinct heats per event/round. Available in both `track_mode_change` and `start_list` broadcasts.
- **Round Name Display:** WebSocket broadcasts include `roundName` field based on event's `numRounds` configuration. Maps round numbers to display names: 1 round = "Finals", 2 rounds = "Prelims"/"Finals", 3 rounds = "Prelims"/"Semis"/"Finals", 4 rounds = "Prelims"/"Quarters"/"Semis"/"Finals".
- **Broadcast Display Type:** Full-screen overlay display for streaming/broadcast with animated ticker showing race winners (scrolling every 4 seconds using framer-motion), running clock from FinishLynx, and meet logo. Uses meet colors for gradient background.
- **Athlete Bests (Personal Records):** Stores college and season personal records with API and UI integration.
- **Data Ingestion System:** Uses `chokidar` to monitor directories for FinishLynx LIF and FieldLynx LFF files, parsing and mapping results. Configurable polling for HyTek MDB changes.
- **LFF Export System:** Exports field event results in FieldLynx LFF format, supporting horizontal and vertical events. Includes API endpoints for download/export and auto-export functionality.
- **EVT File Import System:** Directory-based import of .evt files for events and athletes. Includes API endpoints for configuration, listing events, getting athletes, and auto-provisioning field sessions. Supports global horizontal event defaults and field event athletes without database entries.
- **Vertical Event Support (High Jump/Pole Vault):** Configurable bar heights, attempt recording (O/X/-), elimination logic, bar progression, and vertical standings calculation. Includes dedicated UI components and an "Open Event" workflow for check-in and session initiation.

### System Design Choices
**Database Schema:** Uses Drizzle ORM for PostgreSQL schema management with core tables like `athletes`, `events`, `track_results`, `field_results`, `meets`.
**Data Flow Patterns:** Control Dashboard interacts with Frontend REST API, which updates backend storage and broadcasts via WebSocket to displays. Display boards connect via WebSocket and fall back to polling.
**Styling & Design System:** CSS custom properties, Tailwind CSS, custom design tokens, elevation system, and mobile-first responsive design.
**Local-First Architecture (Edge Mode):** Supports Cloud Mode (Replit, PostgreSQL) and Edge Mode (local server, SQLite) via a storage factory and `EDGE_MODE` environment variable. Features a SQLite Storage Adapter, a bidirectional sync system with conflict resolution, an Electron Desktop App, and Edge Setup CLI tools.

## External Dependencies

### Third-Party UI Libraries
- **Radix UI:** Accessible component primitives.
- **shadcn/ui:** Component library based on Radix.
- **Lucide React:** Icon set.

### Database & ORM
- **Drizzle ORM:** Type-safe database toolkit.
- **Drizzle Zod:** Schema-to-Zod validator generation.
- **@neondatabase/serverless:** PostgreSQL driver.
- **connect-pg-simple:** PostgreSQL session store.
- **better-sqlite3:** SQLite driver for edge/local operation.

### Form Management
- **React Hook Form:** Form state and validation.
- **@hookform/resolvers:** Zod integration.
- **Zod:** Runtime type validation.

### Real-Time Communication
- **ws:** Server-side WebSocket implementation.
- Native browser WebSocket API.

### Utilities
- **date-fns:** Date manipulation.
- **clsx & tailwind-merge:** Conditional className utilities.
- **class-variance-authority:** Variant-based component styling.
- **nanoid:** Unique ID generation.
- **chokidar:** Directory watcher for file ingestion.
- **mdb-reader:** HyTek/FinishLynx .mdb database file parser.

### Image Processing
- **Sharp:** High-performance image processing.
- **Multer:** Multipart/form-data handling.

## Edge Mode (Local Server Operation)

The system supports offline/local operation using SQLite instead of PostgreSQL for stadium deployments where internet connectivity is unreliable.

### Running in Edge Mode

Set the `EDGE_MODE` environment variable to use local SQLite storage:

```bash
EDGE_MODE=true npm run dev
```

The server will:
1. Use SQLite database at `./data/scoreboard.db` (or path from `SQLITE_DB_PATH`)
2. Log "Running in EDGE mode with SQLite database" on startup
3. All features work identically, just with local storage

### Web UI Cloud Sync

Download meet data from a cloud server using the web interface:

1. Navigate to `/cloud-sync` (or click "Download from Cloud" on the homepage)
2. Enter the cloud server URL (must be HTTPS)
3. Enter the 6-character meet code
4. Click "Preview Meet" to see what will be downloaded
5. Click "Download Meet" to sync all data including layouts and logos

### Edge Setup CLI

Initialize a local database with meet data from the cloud:

```bash
# Setup with meet data from cloud server
npx tsx tools/edge-setup.ts setup --cloud-url https://your-app.replit.app --meet-code ABC123

# Check current edge configuration
npx tsx tools/edge-setup.ts status

# Clear all local data
npx tsx tools/edge-setup.ts clear
```

### Key Files
- `server/storage/sqlite-adapter.ts` - SQLite storage implementation
- `server/storage.ts` - Storage factory (auto-selects SQLite or PostgreSQL)
- `server/cloud-sync.ts` - Cloud sync logic for downloading meets
- `client/src/pages/cloud-sync.tsx` - Web UI for cloud sync
- `tools/edge-setup.ts` - CLI for downloading meet data
- `./data/scoreboard.db` - Default SQLite database location
- `./data/edge-config.json` - Edge configuration file

### Environment Variables
- `EDGE_MODE=true` - Enable SQLite storage instead of PostgreSQL
- `SQLITE_DB_PATH=./data/scoreboard.db` - Custom database location