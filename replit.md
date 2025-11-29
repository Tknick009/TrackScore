# Track and Field Scoreboard Application

## Overview

A real-time track and field scoreboard system designed to centralize event management, athlete result recording, and live data broadcasting. The application supports multi-display output via WebSocket connections, providing a comprehensive solution for meet organizers. It is built as a full-stack TypeScript application, utilizing React for the frontend and Express for the backend. The project aims to deliver a robust, scalable, and user-friendly platform for athletic events, enhancing the experience for both organizers and spectators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Framework & Build System:** React 18 with TypeScript, Vite for fast development, Wouter for routing.

**UI Framework:** shadcn/ui on Radix UI, Tailwind CSS for styling, Material Design for control, high-visibility design for displays. Typography uses Inter/Roboto for control and Roboto Condensed for displays.

**State Management:** TanStack Query for server state, real-time updates via WebSocket, with a 5-second polling fallback.

**Key Frontend Patterns:** Separation of control dashboard (`/control`) and display board (`/display`) interfaces, React Hook Form with Zod for validation, component composition, real-time connection monitoring.

### Backend

**Server Framework:** Express.js with TypeScript, `ws` library for WebSocket support.

**API Design:** RESTful endpoints (`/api`), WebSocket endpoint (`/ws`) for real-time updates. Control dashboard actions trigger WebSocket broadcasts to all connected displays.

**Data Storage Strategy:** In-memory storage (`MemStorage`) with an `IStorage` abstraction, designed for future PostgreSQL migration via Drizzle ORM.

**WebSocket Broadcasting:** Server manages connected display clients, broadcasting event state updates (`board_update` messages) triggered by control dashboard actions.

**Remote Display Control:** Display devices register via WebSocket, receiving unique IDs. A control panel allows operators to assign specific events to different displays. Devices track status (online/offline) and send heartbeats.

**Layout Template System:** Pre-built layout templates for LED displays (P10, P6) including Start List, Running Time, Results, Field Results, Field Standings, and Meet Logo. Templates use percentage-based positioning for resolution independence. API endpoints for listing and applying templates.

### Scene-Based Layout System (ResulTV-Style)

**Database Schema:** `layout_scenes` table defines display canvases with dimensions, background color/image, and template flags. `layout_objects` table contains individual display components within scenes, with percentage-based positioning (x, y, width, height), z-index layering, and JSONB fields for data bindings, component config, and styling.

**Object Type Registry:** 14 object types including results-table, timer, event-header, athlete-card, athlete-grid, team-standings, lane-graphic, attempt-tracker, logo, text, clock, wind-reading, split-times, and record-indicator. Each type categorized for palette organization.

**Data Binding System:** Objects support multiple data source types: 'static', 'events', 'current-track', 'current-field', 'live-data', and 'standings'. Bindings include eventIds, lynxPort, divisionId, heatNumber, and limit options for flexible data mapping.

**Scene Editor UI:** Visual canvas editor at `/control/:meetId/scene-editor` with:
- Scene list sidebar for managing multiple scenes per meet
- Drag-and-drop canvas with grid overlay for precise positioning
- Object palette organized by category (data display, timing, athletes, etc.)
- Property inspector for configuring data bindings and styling
- Preview mode and full-screen display launch

**Scene Display Runtime:** `/scene-display/:sceneId` renders scenes with live data by:
- Loading scene and objects from API
- Subscribing each object to its configured data sources via WebSocket
- Rendering appropriate display components based on object type
- Responding to real-time updates for events, live data, and standings

**API Endpoints:**
- `GET/POST /api/layout-scenes` - List/create scenes
- `GET/PATCH/DELETE /api/layout-scenes/:id` - Scene CRUD operations
- `GET/POST /api/layout-objects` - List/create objects for a scene
- `GET/PATCH/DELETE /api/layout-objects/:id` - Object CRUD operations
- `POST /api/layout-objects/reorder` - Reorder objects within scene

### Database Schema (Drizzle ORM)

**Core Tables:** `athletes`, `events`, `track_results`, `field_results`, `meets`.

**Schema Design Decisions:** Event types as enum, separate result tables for track/field, event status tracking (`scheduled`, `in_progress`, `completed`), support for heats and rounds.

**Migration Strategy:** Drizzle Kit for PostgreSQL, schema in `shared/schema.ts`.

### Data Flow Patterns

**Control Dashboard Flow:** User interaction -> Frontend REST API call -> Backend updates in-memory storage -> Backend broadcasts updated state via WebSocket to display boards.

**Display Board Flow:** WebSocket connection -> Listens for `board_update` messages -> Falls back to polling `/api/events/current` -> Renders UI with current event data.

### Styling & Design System

**CSS Architecture:** CSS custom properties for theming, Tailwind utility classes, custom design tokens, elevation system.

**Responsive Design:** Mobile-first approach with breakpoint at 768px, sidebar layout for control dashboard, full viewport display boards, touch-friendly controls.

**Typography System:** Inter/Roboto for control, Roboto Condensed for display boards; monospace for timing data.

### Asset Management System

**Database Schema:** `athletePhotos` and `teamLogos` tables store metadata (storageKey, filename, size, dimensions). Unique constraints ensure one-to-one relationships.

**File Storage Infrastructure:** `FileStorage` class handles image processing (resize, optimize), format support (JPEG, PNG, GIF), and organized directory structure for uploads.

**Upload Workflow:** Multer handles uploads, Sharp processes images, `FileStorage` saves, and database upserts metadata.

**API Endpoints:** Dedicated REST endpoints for `POST`, `GET`, `DELETE` operations for athlete photos and team logos, with validation for file type, size, and entity existence.

**Storage Layer Interface:** `IStorage` extensions for `get`, `create`, `delete`, and `bulkGet` operations on athlete photos and team logos.

### HyTek MDB Import System

**Event Scheduling Implementation:** Extracts event dates and times from HyTek MDB files using `Meet_start`, `Session` data, `Comm_1` field parsing, and `CCracestart` fields. A fallback hierarchy ensures all events receive a date, with times parsed where available.

**Event Name Generation:** Generates comprehensive event names based on gender codes, event types (track, field, multi-events), and session names where applicable.

### Lynx Protocol Integration

**Protocol Parser:** JSON-based Lynx protocol parser with streaming assembly and control character sanitization. Handles three message types: "S" (start list), "T" (track/timing), "F" (field) with structured data extraction.

**Auto-Start on Boot:** Lynx listeners automatically start on server boot by loading saved configurations from the `lynx_configs` database table. Falls back to environment variables (`LYNX_CLOCK_PORT`, `LYNX_RESULTS_PORT`, `LYNX_FIELD_PORT`) if no saved configs exist.

**Live Event Data Storage:** Incoming track and field results are stored to the `live_event_data` table indexed by event number, enabling support for concurrent events. Data includes mode, status, wind readings, entries, running time, and attempt details.

**Aggregation System:** 250ms timeout aggregates multiple athlete entries per event/heat/round before storage, using composite keys (event number, heat, flight, round, port type) to prevent collisions.

**API Endpoints:**
- `GET /api/live-events/:eventNumber` - Get live data for specific event
- `GET /api/live-events` - Get all live events (optionally filtered by meet)
- `DELETE /api/live-events` - Clear live event data
- `GET /api/lynx/saved-configs` - Get saved Lynx port configurations
- `POST /api/lynx/config` - Configure and save Lynx ports (auto-saves to database)

### Athlete Bests (Personal Records)

**Database Schema:** `athlete_bests` table stores college and season personal records per athlete and event type. Fields include `athleteId`, `eventType`, `bestType` (college or season), `mark` (in base units: seconds for track, meters for field), `seasonId`, `achievedAt`, `meetName`, and `source` (manual, import, calculated).

**API Endpoints:**
- `GET /api/athletes/:athleteId/bests` - Get all bests for an athlete
- `GET /api/meets/:meetId/athlete-bests` - Get all bests for athletes in a meet
- `POST /api/athlete-bests` - Create or update an athlete best
- `PATCH /api/athlete-bests/:id` - Update a best
- `DELETE /api/athlete-bests/:id` - Delete a best
- `POST /api/meets/:meetId/athlete-bests/import` - Bulk import bests from CSV data

**UI Integration:** Athletes page detail dialog includes a "Personal Bests" section for viewing and editing PR (college) and SB (season) marks. Display boards (FieldEventBoard) show PR and SB marks alongside athlete info when available.

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Component library based on Radix.
- **Lucide React**: Icon set.

### Development Tools
- **Vite**: Build tool and development server.
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner.

### Database & ORM
- **Drizzle ORM**: Type-safe database toolkit.
- **Drizzle Zod**: Schema-to-Zod validator generation.
- **@neondatabase/serverless**: PostgreSQL driver (configured).
- **connect-pg-simple**: PostgreSQL session store (configured).

### Form Management
- **React Hook Form**: Form state and validation.
- **@hookform/resolvers**: Zod integration.
- **Zod**: Runtime type validation.

### Real-Time Communication
- **ws**: Server-side WebSocket implementation.
- Native browser WebSocket API.

### Utilities
- **date-fns**: Date manipulation.
- **clsx & tailwind-merge**: Conditional className utilities.
- **class-variance-authority**: Variant-based component styling.
- **nanoid**: Unique ID generation.

### Build & Runtime
- **TypeScript**: Static typing.
- **tsx**: TypeScript execution for development.
- **esbuild**: Fast bundling.
- **PostCSS & Autoprefixer**: CSS processing.
- **mdb-reader**: HyTek/FinishLynx .mdb database file parser.

### Image Processing
- **Sharp**: High-performance image processing.
- **Multer**: Multipart/form-data handling.