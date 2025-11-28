# Track and Field Scoreboard Application

## Overview

A real-time track and field scoreboard system with centralized control dashboard and multi-display broadcasting. The application enables meet organizers to manage events, record athlete results, and broadcast live data to multiple display boards via WebSocket connections. Built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (routes: `/`, `/control`, `/display`)

**UI Framework:**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Material Design foundation for control dashboard, custom high-visibility design for display boards
- Typography: Inter/Roboto for control interface, Roboto Condensed for display boards

**State Management:**
- TanStack Query (React Query) for server state management and caching
- Real-time updates via WebSocket connection for display boards
- Polling fallback (5-second intervals) when WebSocket unavailable

**Key Frontend Patterns:**
- Separation of concerns: Control dashboard (`/control`) vs. Display board (`/display`) interfaces
- Form validation using React Hook Form with Zod schema resolvers
- Component composition with shadcn/ui building blocks
- Real-time connection status monitoring

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for REST API endpoints
- HTTP server upgraded with WebSocket support using `ws` library
- Session-based architecture (though authentication not yet implemented)

**API Design:**
- RESTful endpoints under `/api` prefix for CRUD operations
- WebSocket endpoint at `/ws` for real-time display board updates
- Broadcast pattern: Control dashboard mutations trigger WebSocket broadcasts to all connected displays

**Data Storage Strategy:**
- In-memory storage implementation (`MemStorage` class) as current data layer
- Designed for PostgreSQL migration via Drizzle ORM (schema defined, not yet connected)
- Storage interface abstraction (`IStorage`) allows swapping implementations without affecting business logic

**WebSocket Broadcasting:**
- Server maintains set of connected display clients
- Control dashboard actions trigger `broadcastToDisplays()` with current event state
- Message types: `board_update` with `DisplayBoardState` payload
- Automatic reconnection handling on client side

**Remote Display Control:**
- Display devices register themselves via WebSocket when connecting (`register_display_device` message)
- Each display gets a unique device ID and can be assigned to show specific events
- Control panel at `/control/{meetId}/displays/control` shows all connected display devices
- Operators can assign different events to different displays from the control panel
- Device status tracking: online/offline with IP address and last seen timestamp
- Heartbeat messages every 30 seconds to maintain online status
- Database table `display_devices` tracks: meetId, deviceName, lastIp, lastSeenAt, assignedEventId, status

### Database Schema (Drizzle ORM)

**Core Tables:**
- `athletes` - Athlete roster with bib numbers, teams, countries
- `events` - Track/field events with type, gender, status, round/heat information
- `track_results` - Timing data with lane assignments, reaction times, positions
- `field_results` - Jump/throw measurements across up to 6 attempts
- `meets` - Competition metadata with name, date, location, venue

**Schema Design Decisions:**
- Event types as enum: Covers sprints, distance, hurdles, relays, jumps, throws
- Separate result tables for track vs. field events (different data structures)
- Status tracking: `scheduled`, `in_progress`, `completed`
- Support for heats and rounds in event organization

**Migration Strategy:**
- Drizzle Kit configured for PostgreSQL dialect
- Migration files outputted to `./migrations` directory
- Schema in shared directory (`shared/schema.ts`) for use across frontend/backend
- Currently using Neon serverless PostgreSQL driver (not yet connected)

### Data Flow Patterns

**Control Dashboard Flow:**
1. User creates/updates event or result via form submission
2. Frontend calls REST API endpoint with validated data
3. Backend updates in-memory storage
4. Backend broadcasts updated state via WebSocket
5. All connected display boards receive real-time update

**Display Board Flow:**
1. Establishes WebSocket connection on mount
2. Listens for `board_update` messages
3. Falls back to polling `/api/events/current` if WebSocket fails
4. Renders high-visibility scoreboard UI with current event data

### Styling & Design System

**CSS Architecture:**
- CSS custom properties for theme variables (light/dark mode support)
- Tailwind utility classes for component styling
- Custom design tokens: spacing (2-16 units), border radius (3-9px), shadows
- Elevation system using subtle box shadows and transparency

**Responsive Design:**
- Mobile-first approach with breakpoint at 768px
- Sidebar layout for control dashboard (280px fixed sidebar)
- Full viewport display boards with consistent margins
- Touch-friendly controls (minimum 44px button height)

**Typography System:**
- Control dashboard: Inter/Roboto at 14-32px with 400-700 weights
- Display boards: Roboto Condensed at 36-72px with 600-800 weights
- Monospace variant for timing data

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **shadcn/ui**: Pre-built component library on top of Radix
- **Lucide React**: Icon set for UI elements

### Development Tools
- **Vite**: Build tool with development server and HMR
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (Replit environment only)

### Database & ORM
- **Drizzle ORM**: Type-safe database toolkit with schema validation
- **Drizzle Zod**: Schema-to-Zod validator generation
- **@neondatabase/serverless**: PostgreSQL driver (configured but not actively used)
- **connect-pg-simple**: PostgreSQL session store (configured for future use)

### Form Management
- **React Hook Form**: Form state and validation
- **@hookform/resolvers**: Zod integration for schema validation
- **Zod**: Runtime type validation and schema definition

### Real-Time Communication
- **ws (WebSocket)**: Server-side WebSocket implementation
- Native browser WebSocket API on client

### Utilities
- **date-fns**: Date manipulation and formatting
- **clsx & tailwind-merge**: Conditional className utilities
- **class-variance-authority**: Variant-based component styling
- **nanoid**: Unique ID generation

### Build & Runtime
- **TypeScript**: Static typing across entire codebase
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production server build
- **PostCSS & Autoprefixer**: CSS processing
- **mdb-reader**: HyTek/FinishLynx .mdb database file parser

### Image Processing
- **Sharp**: High-performance image processing library for resizing, format conversion, and optimization
- **Multer**: Multipart/form-data handling for file uploads

## Asset Management System

### Database Schema

**Asset Tables:**
- `athletePhotos` - One-to-one relationship with athletes table
  - Stores: storageKey, originalFilename, contentType, width, height, byteSize, uploadedAt
  - Unique constraint on athleteId for atomic upserts
- `teamLogos` - One-to-one relationship with teams table
  - Stores: storageKey, originalFilename, contentType, width, height, byteSize, uploadedAt
  - Unique constraint on teamId for atomic upserts

**Design Patterns:**
- Foreign key cascade deletes: Photo/logo deleted when athlete/team deleted
- Atomic upserts via PostgreSQL INSERT ... ON CONFLICT DO UPDATE
- storageKey references filesystem location for cleanup operations

### File Storage Infrastructure

**FileStorage Class** (`server/file-storage.ts`):
- **Image Processing:** Resizes images to 1024px maximum dimension, strips EXIF data, optimizes quality
- **Format Support:** JPEG (quality 85), PNG (compression 9), GIF
- **Directory Structure:** 
  - Athlete photos: `uploads/athletes/{meetId}/{athleteId}/photo.{ext}`
  - Team logos: `uploads/teams/{meetId}/{teamId}/logo.{ext}`
- **Public URL Generation:** Maps storage keys to web-accessible paths

**Upload Workflow:**
1. Multer receives multipart upload and writes to temp location
2. Sharp processes image (resize, auto-rotate, optimize)
3. FileStorage saves processed image to organized directory
4. Database upsert creates/updates metadata record atomically
5. Old file cleaned up from disk (if replacement)

### API Endpoints

**Athlete Photos:**
- `POST /api/athletes/:id/photo` - Upload/replace athlete photo
- `GET /api/athletes/:id/photo` - Retrieve photo metadata and URL
- `DELETE /api/athletes/:id/photo` - Delete photo from database and disk

**Team Logos:**
- `POST /api/teams/:id/logo` - Upload/replace team logo
- `GET /api/teams/:id/logo` - Retrieve logo metadata and URL
- `DELETE /api/teams/:id/logo` - Delete logo from database and disk

**Validation:**
- File type: JPEG, PNG, GIF only (MIME type validation)
- File size: 5MB maximum
- Entity existence: Verifies athlete/team exists before upload
- HTTP status codes: 400 (validation), 404 (not found), 500 (server error)

**Concurrency Handling:**
- Atomic upserts prevent most race conditions
- Known limitation: Simultaneous uploads for same athlete/team can orphan intermediate files on disk (extremely rare edge case, affects disk hygiene not data accuracy)
- Database always has single consistent record per athlete/team
- File cleanup targets storageKey from pre-upload SELECT

### Storage Layer Interface

**IStorage Extensions:**
- `getAthletePhoto(athleteId)` - Retrieve photo metadata
- `createAthletePhoto(photo)` - Upsert photo metadata, returns `{ newPhoto, oldPhoto }`
- `deleteAthletePhoto(athleteId)` - Delete photo metadata, returns old record with storageKey
- `bulkGetAthletePhotos(athleteIds[])` - Efficient batch retrieval
- Same four methods for team logos

**DatabaseStorage Implementation:**
- Uses Drizzle ORM for type-safe database operations
- Returns old storageKey for file cleanup operations
- Atomic upserts leverage PostgreSQL's ON CONFLICT clause

## HyTek MDB Import System

### Event Scheduling Implementation

**Multi-Source Scheduling Strategy:**
The importer extracts event dates and times from multiple sources in the HyTek MDB database:

1. **Meet Start Date** (Primary baseline)
   - Read from `Meet` table's `Meet_start` field
   - Provides the base date for all events without session assignment
   - Sample data: April 12, 2024

2. **Session-Based Dates** (For multi-day meets)
   - Session table stores `Sess_ptr` (session ID) and `Sess_day` (day offset: 1, 2, 3...)
   - Events link to sessions via `Event.Event_ptr = Session.Sess_ptr`
   - Date calculation: `eventDate = meetStartDate + (sessDay - 1) days`
   - Only 3/56 events in sample data have session linkage (Heptathlon, Decathlon, Women's 1500m)
   - Example: Event with Sess_day=2 → April 13, 2024 (meetStart + 1 day)

3. **Comm_1 Time Parsing** (Text-based scheduling hints)
   - Extracts times from free-text `Comm_1` field
   - Patterns supported:
     - "run at 8:10" / "runs at 9:15"
     - "goes off 10:30" / "go off 11:45"  
     - "@ 8:05" / "@9:30"
     - Bare times: "8:10" / "9:15 AM"
   - Handles AM/PM markers and 12/24-hour formats
   - Sample coverage: 3/56 events have parsed times

4. **CCracestart Fields** (Individual event scheduling)
   - `CCracestart_date` and `CCracestart_time` fields on Event table
   - Sample data: 0/56 events use this field (all null)
   - Future enhancement opportunity

**Fallback Hierarchy:**
- Events WITH sessions → Use Sess_day offset from Meet_start
- Events WITHOUT sessions → Use Meet_start date
- Times: CCracestart_time (if present) → Comm_1 parsing → null

**Coverage in Sample Data:**
- Events with dates: 56/56 (100%)
- Events with session-based dates: 3/56 (5.4%)
- Events with times: 5/56 (8.9%)
- Events with Comm_1 parsed times: 3/56

### Event Name Generation

**Comprehensive Gender Code Support:**
- Uppercase: M, W, F, G, B, X (Men, Women, Girls, Boys, Mixed)
- Lowercase: m, w, f, g, b, x
- Word variants: "women", "girls", "coed", "mixed", "both"
- Relay detection: Case-insensitive check for "R"/"r" in `Ind_rel` field

**Event Type Coverage:**
- Track events: Sprints (100m-400m), middle distance (800m-1500m), distance (3000m-10000m), hurdles, steeplechase, relays
- Field events: Jumps (high, long, triple, pole vault), throws (shot put, discus, javelin, hammer)
- Multi-events: Heptathlon, Decathlon

**Name Generation Strategy:**
- 53/56 events generated from Event table fields (gender + distance/type)
- 3/56 events use Session.Sess_name for multi-event competitions
- Format: "{Gender} {Distance/Type}" (e.g., "Women's 1500m Run", "Men's High Jump")