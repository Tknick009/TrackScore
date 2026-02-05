# Track and Field Scoreboard Application

## Overview
This project is a real-time track and field scoreboard system designed for centralizing event management, athlete result recording, and live data broadcasting. It supports multi-display output via WebSocket connections, providing a comprehensive solution for meet organizers. The system, built as a full-stack TypeScript application with React and Express, aims to be robust, scalable, and user-friendly. The business vision is to provide a reliable platform for athletic events, with market potential in athletic organizations and event management companies seeking advanced, real-time scoring and display solutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React with shadcn/ui, Radix UI, and Tailwind CSS, adhering to Material Design principles for control interfaces and high-visibility design for displays. Typography uses Inter/Roboto for control panels and Roboto Condensed for display boards. The architecture separates a control dashboard (`/control`) from various display boards (`/display`, `/scene-display`).

### Technical Implementations
**Frontend:**
- **Framework:** React 18 with TypeScript, Vite, Wouter for routing.
- **State Management:** TanStack Query for server state, with WebSocket real-time updates and a 5-second polling fallback.
- **Form Management:** React Hook Form with Zod for validation.

**Backend:**
- **Server Framework:** Express.js with TypeScript and `ws` for WebSockets.
- **API Design:** RESTful endpoints (`/api`) and a WebSocket endpoint (`/ws`) for real-time updates.
- **Data Storage:** In-memory storage (`MemStorage`) with an `IStorage` abstraction, designed for future PostgreSQL migration via Drizzle ORM.
- **WebSocket Broadcasting:** Manages connected display clients and broadcasts event state updates.
- **Remote Display Control:** Allows operators to assign specific events to registered display devices.

**Feature Specifications:**
- **Scene-Based Layout System (ResulTV-Style):** Manages dynamic display layouts via `layout_scenes` and `layout_objects`. Includes a visual Scene Editor UI for design and configuration, supporting RTV file import.
- **Default Layouts System:** Editable default layouts for each display type (BigBoard, P10, P6, Broadcast). Auto-created per meet with pre-configured objects. Schema adds `isDefault` and `defaultDisplayType` fields to `layout_scenes`. API endpoints: `GET/POST /api/meets/:meetId/default-layouts`. Scene Editor shows "Default Layouts" section at top of scene list.
- **Asset Management System:** Manages athlete photos and team logos with metadata and image processing.
- **HyTek MDB Import System:** Parses HyTek MDB files for event scheduling.
- **Lynx Protocol Integration (ResulTV/LSS Format):** Integrates with FinishLynx via a binary protocol, supporting dual-port architecture for big board and small board displays. The server handles parsing of LSS binary format, broadcasting updates via WebSockets.
- **Scene Layout Mapping System:** Displays switch scenes based on FinishLynx layout commands using configurable `scene_template_mappings` that associate (meetId, displayType, displayMode) to a specific scene.
- **Auto-Mode Track Display System:** Displays automatically switch templates based on live Lynx timing data, managing four auto states (idle, armed, running, results).
- **Display Content Modes:** Provides FinishLynx Results (automatic), Hytek Results (manual push), and Team Scores (aggregated scoring) via a tile-based interface.
- **Total Heats and Round Name Display:** WebSocket broadcasts include `totalHeats` and `roundName` for enhanced event context.
- **Broadcast Display Type:** Full-screen overlay display for streaming, featuring an animated ticker, running clock, and meet logo.
- **Athlete Bests (Personal Records):** Stores and displays college and season personal records.
- **Data Ingestion System:** Monitors directories for FinishLynx LIF and FieldLynx LFF files for parsing and result mapping.
- **LFF Export System:** Exports field event results in FieldLynx LFF format with API endpoints for download/export and auto-export.
- **EVT File Import System:** Directory-based import of .evt files for events and athletes, including auto-provisioning of field sessions.
- **Vertical Event Support:** Configurable bar heights, attempt recording, elimination logic, and vertical standings calculation for high jump/pole vault.

### System Design Choices
**Database Schema:** Uses Drizzle ORM for PostgreSQL schema management with core tables for athletes, events, results, and meets.
**Data Flow Patterns:** Control Dashboard interacts with Frontend REST API, which updates backend storage and broadcasts via WebSocket to displays.
**Styling & Design System:** Employs CSS custom properties, Tailwind CSS, custom design tokens, and a mobile-first responsive design.
**Local-First Architecture (Edge Mode):** Supports Cloud Mode (PostgreSQL) and Edge Mode (local server, SQLite) via a storage factory and environment variables, featuring a SQLite Storage Adapter and a bidirectional sync system.

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