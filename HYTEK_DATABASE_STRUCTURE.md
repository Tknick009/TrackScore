# HyTek Meet Manager Database Structure

**Generated:** 2025-11-13  
**Source:** Analysis of BisonOutdoorClassic2024.mdb using mdb-reader

## Overview

HyTek Meet Manager uses a Microsoft Access (.mdb) database with a **denormalized structure** where scheduling and results data are stored together in the Entry table rather than in separate Heat/Result tables.

## Core Tables

### 1. **Meet** (Metadata)
- Contains meet-level information
- Fields likely include: meet name, date, location, venue

### 2. **Team** (139 rows in sample)
**Purpose:** Team/school information

**Key Fields:**
- `Team_no` - Primary key, unique team identifier
- `Team_name` - Full team name
- `Team_short` - Short name
- `Team_abbr` - Abbreviation
- `Team_div` - Division
- Plus address, contact info, coach names

### 3. **Athlete** (8,719 rows in sample)
**Purpose:** Athlete roster

**Key Fields:**
- `Ath_no` - Primary key, unique athlete identifier (matches external timing software)
- `Last_name`, `First_name`, `Initial`
- `Ath_Sex` - Gender ("M"/"F")
- `Team_no` - Foreign key to Team
- `Comp_no` - Competitor/bib number
- `Schl_yr` - School year (FR, SO, JR, SR)
- `Reg_no` - Registration number
- `Birth_date` - Date of birth (often null)

### 4. **Event** (56 rows in sample)
**Purpose:** Event definitions and scheduling

**Key Fields:**
- `Event_no` - Event number (used in external systems like FinishLynx)
- `Event_ptr` - Primary key, internal pointer
- `Event_dist` - Distance in meters
- `Event_sex`/`Event_gender` - Gender
- `Trk_Field` - "T" for track, "F" for field
- `Event_rounds` - Number of rounds
- `Num_prelanes`, `Num_finlanes` - Lane counts
- `CCracestart_date`, `CCracestart_time` - Individual event start date/time
- `Pre_time`, `Qtr_time`, `Sem_time`, `Fin_time` - Round times (usually null)

**Important:** Event_ptr is used for linking, NOT Event_no

### 5. **Session** (6 rows in sample)
**Purpose:** Grouping events into scheduled sessions

**Key Fields:**
- `Sess_no` - Session number
- `Sess_ptr` - Links to Event.Event_ptr
- `Sess_name` - Session name (e.g., "Sunday Field", "Saturday Track")
- `Sess_starttime` - Start time as seconds since midnight (37800 = 10:30 AM)
- `Sess_day` - Day number

**Time Conversion:**
```javascript
const hours = Math.floor(seconds / 3600);
const minutes = Math.floor((seconds % 3600) / 60);
const ampm = hours >= 12 ? 'PM' : 'AM';
const displayHours = hours % 12 || 12;
const time = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
```

### 6. **Entry** (3,355 rows in sample) ⭐ MOST IMPORTANT
**Purpose:** Athlete-event registrations AND results for ALL rounds

**Structure:** One row per athlete per event, containing:
- Registration data
- Seed times
- Heat/lane assignments for all rounds
- Results for all rounds

**Key Fields:**

**Linking:**
- `Event_ptr` - Links to Event.Event_ptr (NOT Event_no!)
- `Ath_no` - Links to Athlete.Ath_no

**Seed Data:**
- `ActualSeed_time` - Seed time in seconds (e.g., 671.21 = 11:11.21)
- `ConvSeed_time` - Converted seed time
- `Seed_place` - Seed ranking

**Status:**
- `Scr_stat` - Scratched status (boolean)
- `Alt_stat` - Alternate status (boolean)
- `Dec_stat` - Declaration status

**PRELIMINARY ROUND:**
- `Pre_heat` - Heat number (null if not assigned)
- `Pre_lane` - Lane number (null if not assigned)
- `Pre_Time` - Result time in seconds (null if not run)
- `Pre_place` - Overall place
- `Pre_heatplace` - Place within heat
- `Pre_wind` - Wind reading
- `Pre_stat` - Status (DQ, DNS, DNF, etc.)

**QUARTERFINAL ROUND:**
- `Qtr_heat`, `Qtr_lane`, `Qtr_Time`, `Qtr_place`, `Qtr_wind`, `Qtr_stat`

**SEMIFINAL ROUND:**
- `Sem_heat`, `Sem_lane`, `Sem_Time`, `Sem_place`, `Sem_wind`, `Sem_stat`

**FINAL ROUND:**
- `Fin_heat`, `Fin_lane`, `Fin_Time`, `Fin_place`, `Fin_wind`, `Fin_stat`

**Example Entry Row:**
```json
{
  "Event_ptr": 27,
  "Ath_no": 54836,
  "ActualSeed_time": 671.21,
  "Fin_heat": 2,
  "Fin_lane": 9,
  "Fin_Time": null,
  "Fin_place": null,
  "entry_note": "Bison Outdoor Classic (4/14/2023)"
}
```

### 7. **Relay** (128 rows in sample)
**Purpose:** Relay team information
**Note:** Separate from Entry table, requires special handling

## Tables That DO NOT EXIST

The following tables were expected but **do not exist** in HyTek:
- ❌ Round
- ❌ Heat
- ❌ Lane
- ❌ Result
- ❌ Splits (split times stored differently)

## Key Relationships

```
Session.Sess_ptr → Event.Event_ptr
         ↓
     Event.Event_ptr ← Entry.Event_ptr
         ↓
     Athlete.Ath_no ← Entry.Ath_no
         ↓
     Team.Team_no ← Athlete.Team_no
```

## Critical Mapping Rules

1. **Session to Event:** Use `Sess_ptr` → `Event_ptr` (NOT Event_no)
2. **Entry to Event:** Use `Event_ptr` (NOT Event_no)
3. **Entry to Athlete:** Use `Ath_no`
4. **Athlete to Team:** Use `Team_no`

## Data Types

- **Times:** Stored as `number` (seconds with decimal)
  - Example: 11.28 seconds = 11.28
  - Example: 11:11.21 = 671.21 seconds
- **Dates:** Stored as `Date` objects
- **Pointers:** Stored as `number` (integer IDs)
- **Status flags:** Stored as `boolean` or `string`

## Common Patterns

### Finding Heat Assignments
```sql
SELECT Ath_no, Fin_heat, Fin_lane 
FROM Entry 
WHERE Event_ptr = ? AND Fin_heat IS NOT NULL
ORDER BY Fin_heat, Fin_lane
```

### Finding Results
```sql
SELECT Ath_no, Fin_Time, Fin_place, Fin_wind
FROM Entry
WHERE Event_ptr = ? AND Fin_Time IS NOT NULL
ORDER BY Fin_place
```

### Determining Active Round
- Check which round has non-null times: Pre_Time, Qtr_Time, Sem_Time, or Fin_Time
- Check Event.Event_rounds to know how many rounds exist

## Import Strategy

1. **Import Teams** - Build Team_no → teamId map
2. **Import Athletes** - Build Ath_no → athleteId map, link to teams
3. **Import Sessions** - Build Sess_ptr → session data map
4. **Import Events** - Use Event_ptr as key, map to Sess_ptr for scheduling
5. **Import Entries** - Link via Event_ptr and Ath_no, extract:
   - Registration data
   - Heat/lane assignments (all rounds)
   - Results (all rounds)
6. **Import Relays** - Separate handling for relay teams

## Time Formats

**HyTek stores times as decimal seconds:**
- Sprint (100m): 11.28 seconds → 11.28
- Middle distance (800m): 1:54.32 → 114.32 seconds
- Long distance (5000m): 15:23.45 → 923.45 seconds

**Display format conversion:**
```javascript
function formatTime(seconds) {
  if (seconds < 60) {
    return seconds.toFixed(2); // "11.28"
  }
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`; // "1:54.32"
}
```

## Field Events

Field events (jumps, throws) use the Entry table with:
- Distance/height in `Fin_Time` field (despite the name!)
- Multiple attempts may be in separate fields or require analysis of attempt-specific columns
- Need to investigate: `Mark` field and attempt fields

## Status Codes

Common values in `*_stat` fields:
- null - Normal completion
- "DNS" - Did Not Start
- "DNF" - Did Not Finish
- "DQ" - Disqualified
- "SCR" - Scratched

## Notes

- Event numbers (Event_no) must match external timing systems like FinishLynx
- Athlete numbers (Ath_no) must match external timing systems
- Internal pointers (Event_ptr, Sess_ptr) are for database relationships only
- Most scheduling data comes from Session + Event tables
- ALL results data comes from Entry table
- Entry table is denormalized - one row contains all rounds for one athlete/event
