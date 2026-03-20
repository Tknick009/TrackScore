# Testing TrackScore

## Local Development Setup

### Starting the App
- Run `EDGE_MODE=true npm run dev` from the repo root
- The app starts on port 5000
- `EDGE_MODE=true` is required to use SQLite instead of PostgreSQL (which requires `DATABASE_URL`)
- The SQLite database is at `./data/scoreboard.db`

### Devin Secrets Needed
- None required for local testing (SQLite mode needs no credentials)

## Database

### Key Tables
- `meets` - Meet definitions (id is TEXT UUID, has name, location, start_date, etc.)
- `events` - Events belong to meets (id TEXT UUID, meet_id, event_number, name, event_type, gender)
- `record_books` - Record book containers (id INTEGER, name, scope: meet/facility/national/international/custom, is_active)
- `records` - Individual records (record_book_id, event_type, gender, performance, athlete_name, team, date)
- `athletes` - Athletes with bib numbers (bibNumber used for FinishLynx matching)
- `athlete_bests` - Personal/season bests for PB/SB tag computation

### Event Types
When imported from HyTek MDB, event_type uses specific values:
- Track: `100m`, `200m`, `400m`, `800m`, `1500m`, `3000m`, `5000m`, `10000m`
- Field: `high_jump`, `pole_vault`, `long_jump`, `triple_jump`, `shot_put`, `discus`, `hammer`, `javelin`, `weight_throw`
- Generic fallback: `field_event`

**Important**: Records must use these same specific event_type values to match events on the schedule. Using broad "track" or "field" will cause records to match ALL events of that category rather than the specific event.

### Gender Values
- Events use `M` or `W` (not `male`/`female`)
- Records imported from HyTek MDB may use `male`/`female` - check the import code for mapping

## Testing the Schedule Records Feature

### Seeding Test Data
Since there's no POST /api/record-books endpoint, create record books and records via SQLite:

```sql
-- Create record books with different scopes
INSERT INTO record_books (name, description, scope, is_active) VALUES ('Meet Record', 'Current meet records', 'meet', 1);
INSERT INTO record_books (name, description, scope, is_active) VALUES ('Facility Record', 'Facility records', 'facility', 1);

-- Create records matching specific event types
INSERT INTO records (record_book_id, event_type, gender, performance, athlete_name, team, date)
VALUES (1, '100m', 'M', '10.12', 'John Smith', 'University A', '2025-03-15');
```

### Verification Steps
1. Check API: `curl http://localhost:5000/api/records/all` returns records from active books only
2. Navigate to `/control/{meetId}/schedule` to see records inline on events
3. Hover over badges to verify tooltips show athlete name, team, performance, date
4. Verify inactive record books (is_active=0) are filtered out

### Color Coding
- Meet records: amber/yellow badges
- Facility records: blue badges
- National records: purple badges
- International records: red badges
- Custom: gray badges

## Key Architecture Notes

### Record Matching
- Schedule page matches records to events using `eventType|gender` key
- Records are fetched via `/api/records/all` which returns all active records with book info
- Client builds a Map<string, RecordEntry[]> for O(1) lookup per event

### PB/SB Tag Pipeline
- FinishLynx entries have `bib` but NOT `athleteId`
- The enrichment function (`enrichEntriesWithRecordTags`) requires `athleteId` for PB/SB lookup
- Before enrichment, the server resolves athleteId from bib by looking up athletes in the active meet
- This happens in two locations: `track_mode_change` handler and `start_list` accumulation in `integrations.ts`
- Testing PB/SB tags requires live FinishLynx data or simulated TCP connections

### WebSocket Errors
- The control panel may show WebSocket connection errors in the console - these are pre-existing and unrelated to records/schedule features
- These appear when no display device token is configured

## Common Issues
- If the app crashes on startup with "DATABASE_URL must be set", add `EDGE_MODE=true` before the command
- If records don't match events, check that both use the same specific event_type values (e.g., '100m' not 'track')
- The record_books table requires `is_active=1` for records to appear on the schedule
