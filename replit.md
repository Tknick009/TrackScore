# Track and Field Scoreboard Application

## Overview
This project is a real-time track and field scoreboard system designed to centralize event management, athlete result recording, and live data broadcasting. It supports multi-display output via WebSocket connections, providing a comprehensive solution for meet organizers. Built as a full-stack TypeScript application with React for the frontend and Express for the backend, the system aims to be robust, scalable, and user-friendly, enhancing the experience for both organizers and spectators at athletic events. The business vision includes providing a reliable platform for athletic events, with market potential in various athletic organizations and event management companies seeking advanced, real-time scoring and display solutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with shadcn/ui on Radix UI and Tailwind CSS for styling, adhering to Material Design principles for control interfaces and high-visibility design for displays. Typography utilizes Inter/Roboto for control panels and Roboto Condensed for display boards. The architecture separates a control dashboard (`/control`) from various display boards (`/display`, `/scene-display`).

### Technical Implementations
**Frontend:**
- **Framework:** React 18 with TypeScript, Vite, Wouter for routing.
- **State Management:** TanStack Query for server state, real-time updates via WebSocket with a 5-second polling fallback.
- **Form Management:** React Hook Form with Zod for validation.

**Backend:**
- **Server Framework:** Express.js with TypeScript and `ws` for WebSockets.
- **API Design:** RESTful endpoints (`/api`) and a WebSocket endpoint (`/ws`) for real-time updates.
- **Data Storage:** In-memory storage (`MemStorage`) with an `IStorage` abstraction, designed for future PostgreSQL migration via Drizzle ORM.
- **WebSocket Broadcasting:** Manages connected display clients, broadcasting event state updates triggered by control dashboard actions.
- **Remote Display Control:** Allows operators to assign specific events to different registered display devices.

### Feature Specifications
**Scene-Based Layout System (ResulTV-Style):**
- **Database Schema:** `layout_scenes` for canvases and `layout_objects` for display components with percentage-based positioning, z-index, and JSONB fields for data bindings and styling.
- **Object Type Registry:** 14 distinct object types (e.g., results-table, timer, athlete-card) with specific data binding capabilities (e.g., 'static', 'events', 'live-data').
- **Scene Editor UI:** A visual canvas editor at `/control/:meetId/scene-editor` for managing scenes, dragging and dropping objects, and configuring properties.
- **Scene Display Runtime:** `/scene-display/:sceneId` renders scenes with live data by subscribing objects to configured data sources via WebSockets.

**Asset Management System:**
- Manages athlete photos and team logos with metadata storage and `FileStorage` for image processing (resize, optimize).
- API endpoints for CRUD operations on assets.

**HyTek MDB Import System:**
- Parses HyTek MDB files for event scheduling and generating comprehensive event names.

**Lynx Protocol Integration:**
- JSON-based parser for "S", "T", "F" message types from Lynx systems (FinishLynx, FieldLynx).
- Auto-starts Lynx listeners from saved configurations.
- Stores live event data in `live_event_data` table.
- Aggregates multiple athlete entries before storage.
- HTTP Forward Endpoint (`/api/lynx/forward`) for receiving forwarded TCP data from remote networks.
- TCP Forwarder Scripts are provided for cross-network connectivity.

**Athlete Bests (Personal Records):**
- `athlete_bests` table stores college and season personal records per athlete and event type.
- API endpoints for managing athlete bests and UI integration for viewing/editing.

**Data Ingestion System:**
- Uses `chokidar` to monitor directories for FinishLynx LIF and FieldLynx LFF files.
- Parses LIF and LFF files, mapping results to athletes.
- Configurable polling for HyTek MDB file changes, triggering full database re-import.
- UI component for configuring ingestion settings.

### System Design Choices
**Database Schema (Drizzle ORM):**
- Core tables: `athletes`, `events`, `track_results`, `field_results`, `meets`.
- Uses Drizzle Kit for PostgreSQL schema management.

**Data Flow Patterns:**
- **Control Dashboard:** User interaction -> Frontend REST API -> Backend updates storage -> Backend broadcasts via WebSocket to displays.
- **Display Board:** WebSocket connection -> Listens for `board_update` -> Falls back to polling API -> Renders UI.

**Styling & Design System:**
- CSS custom properties, Tailwind CSS, custom design tokens, elevation system.
- Mobile-first responsive design.

**Local-First Architecture (Edge Mode):**
- Supports both **Cloud Mode** (Replit server, PostgreSQL) and **Edge Mode** (local server, SQLite).
- A storage factory detects the operating mode via `EDGE_MODE` environment variable.
- **SQLite Storage Adapter:** Implements `IStorage` for local operations with a sync journal.
- **Sync System:** Bidirectional sync (local ↔ cloud) with conflict resolution (last-writer-wins) and exponential backoff.
- **Electron Desktop App:** Provides a standalone desktop application with an embedded Node.js server for edge operations.
- **Edge Setup CLI:** Command-line tools for configuring local edge servers.

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