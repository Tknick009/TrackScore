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
- **Lynx Protocol Integration:** Parses JSON-based messages ("S", "T", "F") from Lynx systems, auto-starts listeners, stores live event data, and aggregates athlete entries. Includes HTTP Forward Endpoint and TCP Forwarder Scripts. Enhanced JSON Clock Handler for auto-mode switching. Displays heat numbers in "X OF Y" format.
- **Auto-Mode Track Display System:** Displays automatically switch templates based on live Lynx timing data without pre-configured events. Persistence of auto-mode state, four auto states (idle, armed, running, results), and template mapping per display type.
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
- `tools/edge-setup.ts` - CLI for downloading meet data
- `./data/scoreboard.db` - Default SQLite database location
- `./data/edge-config.json` - Edge configuration file

### Environment Variables
- `EDGE_MODE=true` - Enable SQLite storage instead of PostgreSQL
- `SQLITE_DB_PATH=./data/scoreboard.db` - Custom database location