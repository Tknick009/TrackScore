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