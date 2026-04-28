# Archived Features

This folder contains code for features that have been disabled to simplify the application. The code is preserved here for reference or potential future restoration.

## Archived Date
February 2026

## Archived Features

### Server Files (`archived/server/`)

1. **certificate-generator.ts** - PDF certificate generation for podium finishers
   - Generated award certificates for 1st/2nd/3rd place athletes
   - Used PDFKit library

2. **scoring-calculator.ts** - Team scoring calculation engine
   - Calculated team points based on placing (10-8-6-5-4-3-2-1 system)
   - Scoring presets management
   - NOTE: MDB import of pre-calculated team scores is still active in the main app

### Client Pages (`archived/client/pages/`)

1. **record-books.tsx** - Record book management UI
   - Create/edit record books
   - Add/remove records
   - Compare results to records

2. **spectator.tsx** - Public spectator view
   - Read-only view of meet results for fans
   - QR code access

3. **print-results.tsx** - Event print layout
   - Printable event results

4. **print-meet.tsx** - Full meet print layout
   - Printable meet summary with all events

5. **officials.tsx** - Officials management
   - Assign officials to events

6. **season-manager.tsx** - Season management
   - Create/manage seasons
   - Link meets to seasons

7. **scoring.tsx** - Team scoring UI
   - View team standings
   - Configure scoring rules

## Routes Commented Out in `server/routes.ts`

The following API routes have been commented out:

- `/api/certificates/*` - Certificate generation
- `/api/qr/*` - QR code generation
- `/api/judge-tokens` - Judge token system
- `/api/seasons/*` - Season CRUD
- `/api/record-books/*` - Record books CRUD
- `/api/records/*` - Records CRUD
- `/api/scoring/presets/*` - Scoring presets
- `/api/meets/:meetId/scoring/standings` - Team standings calculation
- `/api/meets/:meetId/scoring/recalculate` - Recalculate scores
- `/api/sponsors/*` - Sponsor management
- `/api/sponsor-assignments/*` - Sponsor assignments
- `/api/rotation-profiles/*` - Sponsor rotation

## Restoring Features

To restore a feature:

1. Move the file(s) back to their original location
2. Uncomment the relevant routes in `server/routes.ts`
3. Re-add any page imports/routes in `client/src/App.tsx`
4. Re-add sidebar links if needed in `client/src/components/app-sidebar.tsx`

## Database Tables

Note: The database tables for these features still exist (seasons, record_books, records, sponsors, etc.). They are not being deleted, just unused. If you want to clean up the database, you can drop these tables, but that would require updating the schema.
