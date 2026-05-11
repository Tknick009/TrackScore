# Test Plan: Pre-meet display modes (Meet Schedule, Meet Records, Sponsors, Team Preview)

## Scope
Verify the 4 new pre-meet display modes can be sent from Display Control to a connected Display Device and render correctly (built-in template fallback).

## Code paths referenced
- UI trigger: `client/src/pages/display-control.tsx` (mode tiles + Send buttons)
- Server endpoints: `server/routes/displays.ts`
  - `POST /api/display-devices/:id/meet-schedule`
  - `POST /api/display-devices/:id/meet-records`
  - `POST /api/display-devices/:id/sponsor-rotation`
  - `POST /api/display-devices/:id/team-preview`
- Display renderer: `client/src/pages/display-device.tsx` (template IDs: `meet-schedule`, `meet-records`, `sponsor-rotation`, `team-scores` with `mode: team_preview`)

## Primary end-to-end flow
1. Start the app locally (server + client) so it’s reachable at `http://localhost:5000/`.
2. Open a Display Device page:
   - Navigate to `http://localhost:5000/display`.
   - Complete the device setup (pick the active meet and set display type to **P10**).
   - Confirm it registers (device appears online in the device list in Display Control).
3. Open Display Control:
   - Navigate to `http://localhost:5000/control/{MEET_ID}/displays/control`.
   - Click the registered device in the device list so its detail panel opens.
4. Meet Schedule mode:
   - Click the **Meet Schedule** tile.
   - Click **Send Schedule to Display**.
   - Verify the display shows a schedule list (event numbers + names), and auto-pages.
   - Capture a screenshot.
5. Meet Records mode:
   - Click the **Meet Records** tile.
   - Leave Record Book as **All Record Books**.
   - Click **Send Records to Display**.
   - Verify the display shows record rows with colored scope badges.
   - Capture a screenshot.
6. Sponsor Rotation mode:
   - Click the **Sponsor Rotation** tile.
   - Enter 2–3 image URLs (use local paths like `/logos/NCAA/Navy.png`, `/logos/NCAA/Army.png`, `/logos/NCAA/Bucknell.png`).
   - Set interval to 3–5 seconds.
   - Click **Start Sponsor Rotation**.
   - Verify the sponsor image rotates.
   - Capture a screenshot.
7. Team Preview mode:
   - Click the **Team Preview** tile.
   - Select **Men** (or Women).
   - Click **Send Team Preview to Display**.
   - Verify the display shows a team standings list and auto-pages.
   - Capture a screenshot.

## Artifacts to collect
- 4 screenshots (one per mode) from the Display Device.
- Optional: a short screen recording showing schedule paging + sponsor rotation.
