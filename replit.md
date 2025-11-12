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