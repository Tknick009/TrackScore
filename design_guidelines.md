# Track and Field Stadium Display System - Design Guidelines

## Design Approach

**Reference-Based Approach:** Professional sports broadcast scoreboards (NBA, NFL, Olympics, ESPN)
**Rationale:** High-visibility public display requiring instant readability from 50+ meters, broadcast-quality visual hierarchy, and minimal cognitive load for spectators

**Key Design Principles:**
- Maximum contrast and readability at distance
- Information density balanced with breathing room
- Professional sports broadcast aesthetic
- Instant comprehension of critical data (positions, times, athletes)

## Core Design Elements

### Typography

**Font Families:**
- Primary: Barlow Semi Condensed Extra Bold (Google Fonts) - extreme weight for maximum impact
- Numbers/Times: Bebas Neue or Roboto Mono Bold - monospace for alignment, massive scale
- Supporting Text: Barlow Semi Condensed Medium/SemiBold - secondary information

**Type Scale:**
- Event Names: 700-900 weight, 64-96px
- Athlete Names: 700 weight, 48-72px
- Times/Results: 900 weight, 96-200px (monospace, tabular figures)
- Lane/Position Numbers: 900 weight, 80-120px
- Status Labels: 700 weight, 36-48px (all caps)
- Supplementary Info: 600 weight, 28-40px (country codes, wind readings)

**Critical:** All text must render with pixel-perfect clarity. Use whole numbers for font sizes, avoid decimals.

### Layout System

**Spacing Units:** Tailwind units of 4, 8, 12, 16, 24, 32
- Tight spacing (p-4, gap-4): Within data rows, between label and value
- Standard spacing (p-8, p-12): Section padding, row separation
- Generous spacing (p-16, p-24): Major section breaks, board margins
- Extra spacing (p-32): Top/bottom margins for full-screen boards

**Grid Structure:**
- Full viewport utilization (100vw × 100vh)
- Consistent 32-unit padding on all edges for breathing room
- Flexible row heights based on content (avoid fixed vh constraints)
- Multi-column layouts for results grids (2-3 columns for field events, single column for running)

### Component Library

#### Header System
**Primary Event Header:**
- Full-width bar spanning viewport
- Event name (left-aligned, 64-96px)
- Round/Heat indicator (right-aligned, 48-64px)
- Meet logo (absolute positioned, top-right, 120×80px max)
- Height: 120-160px with generous internal padding

**Status Bar:**
- Positioned below event header
- Live status indicator ("LIVE" / "OFFICIAL RESULTS" / "IN PROGRESS")
- Timer/clock display for running events
- Wind reading for applicable events
- Height: 80-100px

#### Results Display Components

**Live Results Board (Running Events):**
- Lane-based rows (8 lanes standard)
- Each row structure (left to right):
  - Lane number (120px width, 80-120px font)
  - Team color bar (16px vertical stripe)
  - Athlete name (flexible width, 48-72px font)
  - Country code (80px, 36px font, uppercase)
  - Time/Result (280px, 96-200px font, right-aligned)
  - Position indicator (80px, 64px font) - shown post-finish

**Row Heights:** 120-160px per athlete with 8-12px gap between rows
**Visual Treatment:** Alternate row subtle background distinction, current leader emphasized with stronger background intensity

**Field Events Board:**
- Tabular layout with attempt history
- Columns: Position, Athlete, Country, Best Mark, Attempt 1-6
- Each athlete row: 100-140px height
- Current athlete highlighted with full-width background treatment
- Best attempts emphasized with visual indicator (star/badge)

**Single Athlete Spotlight:**
- Full-screen focus during critical moments
- Massive athlete name (96-120px)
- Giant result display (160-240px, centered)
- Personal/Season Best comparison
- Country flag (large format, 120×80px)
- Record indicator if applicable

**Compiled Standings/Leaderboard:**
- Podium visualization for top 3 (larger sizing, distinct treatment)
- Ranked list for positions 4-8
- Team scoring section (separate area, 2-3 columns)
- Position numbers with pronounced visual weight

#### Branding Elements

**Meet Logo Placement:**
- Top-right corner, 120×80px maximum
- Consistent position across all board types
- 32-unit margin from edges

**Sponsor Logos:**
- Bottom ticker bar (80px height)
- Rotating display if multiple sponsors
- Subtle, non-distracting integration
- 24-unit padding from bottom edge

**Team Colors:**
- 12-16px vertical bar on left edge of athlete rows
- Full-width subtle background tint for active athlete (10-15% opacity)
- Never compromise text readability

### Visual Hierarchy

**Information Priority System:**
1. **Critical:** Times/Results, Position Numbers (largest, highest contrast)
2. **Primary:** Athlete Names, Event Name (large, prominent)
3. **Secondary:** Lane Numbers, Country Codes, Status Labels (medium, clear)
4. **Tertiary:** Supplementary data (wind, timestamps, rounds)

**Contrast Requirements:**
- All text: Minimum 10:1 contrast ratio
- Active/leading athlete: Additional 20-30% background intensity
- Position indicators (1st/2nd/3rd): Maximum visual emphasis

### Board Type Specifications

**Live Results Board:**
- Real-time updates during event progression
- 6-8 visible athlete rows simultaneously
- Scrolling behavior if >8 competitors (slow, 3-second pause between cycles)

**Field Events Board:**
- Attempt-by-attempt tracking (horizontal scroll for 6 attempts)
- Current athlete highlighted with animated indicator
- Best mark prominently featured in dedicated column

**Final Results/Podium:**
- Top 3 displayed with enhanced visual treatment (20% larger sizing)
- Positions 4-8 in standard grid
- Race recap data (winning time, margin of victory)

**Schedule/Up Next:**
- Upcoming events timeline
- Event name, scheduled time, current status
- 4-6 events visible, vertical list format
- Next event emphasized

### Responsive Behavior

**Aspect Ratio Optimization:**
- Primary: 16:9 (1920×1080, 3840×2160)
- Secondary: 21:9 ultrawide support
- Minimum resolution: 1280×720

**Dynamic Scaling:**
- Font sizes scale proportionally with viewport
- Maintain minimum 60px for smallest text at 720p
- Maximum 240px for largest elements at 4K
- Grid columns adjust based on available width (3-col at >2400px, 2-col standard, 1-col at <1200px)

### Animations

**Permitted Animations:**
- Result reveal: 400ms slide-in from right for new times
- Leader change: 600ms highlight pulse on position indicator
- Board transitions: 500ms crossfade between different board types
- Live status: Subtle 2-second pulse cycle

**Forbidden:**
- Scroll-triggered animations
- Decorative motion graphics
- Distracting background effects

### Accessibility

- High contrast mode (automatically enabled for stadium displays)
- Text rendering: antialiased, optimized for large screens
- No reliance on color alone for information (use icons, position indicators, text labels)
- Consistent positioning of elements across board types for quick scanning

## Images

**Required Images:**
- **Meet Logo:** SVG or high-res PNG (240×160px @2x), top-right corner placement
- **Sponsor Logos:** SVG preferred, 120×60px maximum, bottom ticker integration
- **Country Flags:** 48×32px PNGs via flagcdn.com for athlete identification
- **Team Logos:** Optional, 60×60px, displayed next to athlete names for relay events

**No Hero Images:** This is a functional data display system, not a marketing page.