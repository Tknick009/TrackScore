# Track and Field Scoreboard Application - Design Guidelines

## Design Approach

**System Selection:** Material Design foundation for control dashboard, custom high-visibility design for display boards
**Rationale:** Utility-focused application requiring efficient data entry and maximum spectator readability

## Core Design Elements

### Typography

**Control Dashboard:**
- Primary: Inter or Roboto (Google Fonts)
- Headings: 600-700 weight, 24-32px
- Body: 400 weight, 14-16px
- Form labels: 500 weight, 13px
- Data values: 500-600 weight for emphasis

**Display Boards:**
- Primary: Roboto Condensed or Barlow Semi Condensed (high legibility)
- Event Names: 700 weight, 48-64px
- Athlete Names: 600 weight, 36-48px
- Times/Results: 700 weight, 56-72px (monospace variant)
- Lane/Position Numbers: 800 weight, 32-40px

### Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing (p-2, gap-2): Within form groups
- Standard spacing (p-4, p-6): Card padding, button groups
- Generous spacing (p-8, p-12): Section separation, display board margins

**Grid Structure:**
- Control Dashboard: Sidebar (280px) + Main content area (fluid)
- Display Boards: Full viewport with consistent 16-unit margins

### Component Library

**Control Dashboard Components:**

Navigation:
- Fixed left sidebar with event categories (Running, Jumping, Throwing)
- Top bar with meet name, current time, connection status indicator
- Breadcrumb navigation for event > heat > athlete hierarchy

Forms & Data Entry:
- Grouped input fields with clear labels
- Large touch-friendly buttons (min-height: 44px)
- Split-button dropdowns for event selection
- Time entry with dedicated number pad interface
- Quick-action buttons for common tasks (Start Heat, Record Result, Clear)

Data Tables:
- Sortable columns for athlete lists
- Inline editing for corrections
- Color-coded status indicators (Pending, Active, Complete)
- Sticky headers for long lists

Real-time Indicators:
- Live connection status badge (Connected/Disconnected)
- Pulsing indicator for active events
- Toast notifications for result updates
- Display preview panel showing current board state

**Display Board Components:**

Event Header:
- Event name and type (e.g., "Men's 100m - Heat 2")
- Current round/heat indicator
- Meet logo placement (top-right corner)

Results Grid:
- Lane-based layout for track events (8 lanes standard)
- Tabular format for field events (attempts visible)
- Clear position indicators (1st, 2nd, 3rd with visual emphasis)
- Athlete country flags (small, 24x16px)

Status Indicators:
- "ON DECK" / "IN PROGRESS" / "OFFICIAL" labels
- Wind reading display for sprint/jump events
- Record indicators (Meet Record, Personal Best) as colored badges

Display Modes:
- Live Results: Current event in progress
- Final Results: Podium/top 8 finishers
- Schedule Board: Upcoming events timeline
- Leaderboards: Overall team/individual standings

### Visual Hierarchy

**Control Dashboard:**
- Primary actions: Filled buttons with elevation
- Secondary actions: Outlined buttons
- Danger actions (Clear, Delete): Red outlined buttons
- Form focus: 2px accent color border

**Display Boards:**
- Contrast ratio: Minimum 7:1 for all text
- Positioning: 1st place 20% larger than others
- Active athlete: Highlighted background treatment
- Section dividers: 4px solid lines between event groups

### Responsive Behavior

**Control Dashboard:**
- Desktop (1280px+): Full sidebar + multi-column forms
- Tablet (768-1279px): Collapsible sidebar + single column
- Mobile (< 768px): Bottom navigation + stacked layout

**Display Boards:**
- Optimized for 16:9 and 4:3 aspect ratios
- Minimum font scaling: 32px at 720p resolution
- Dynamic grid columns based on number of competitors
- Horizontal scrolling for field event attempts table

### Animations

Use sparingly:
- Result entry: 200ms fade-in for new times
- Display updates: 300ms slide transition when switching boards
- Connection status: Gentle pulse (2s cycle) for "Broadcasting" indicator
- No scroll animations or decorative effects

### Accessibility

- High contrast mode toggle for display boards
- Keyboard navigation for all control dashboard forms
- Screen reader labels for all status indicators
- Focus visible on all interactive elements (3px outline)

## Images

No hero images or decorative photography. Use functional graphics only:
- Meet logo: SVG format, max 120x80px (top-right of display boards)
- Country flags: 24x16px PNGs via CDN (flagcdn.com)
- Event icons: Material Icons or Heroicons (32px for sidebar navigation)