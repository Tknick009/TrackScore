import { readFileSync } from "fs";
import MDBReader from "mdb-reader";
import { db } from "./db";
import { meets, teams, divisions, athletes, events, entries, entrySplits, meetScoringRules, recordBooks, records } from "@shared/schema";
import { sql } from "drizzle-orm";
import { parseComm1 } from "./parse-comm1";
import { randomUUID } from "crypto";

export interface ImportStatistics {
  teams: number;
  divisions: number;
  athletes: number;
  events: number;
  entries: number;
}

export interface MDBEvent {
  Event_no?: number;
  Event_ptr?: number;
  Event_sex?: string;
  Event_gender?: string;
  Event_dist?: number;
  Event_stroke?: string;
  Ind_rel?: string;
  Comm_1?: string;
  Trk_Field?: string;
}

const OUTDOOR_STROKE_MAP: Record<string, string> = {
  "K": "High Jump",
  "L": "Long Jump",
  "M": "Shot Put",
  "N": "Discus",
  "O": "Hammer",
  "P": "Pole Vault",
  "Q": "Javelin",
  "R": "Triple Jump",
  "S": "Weight Throw",
};

const INDOOR_STROKE_MAP: Record<string, string> = {
  "K": "High Jump",
  "L": "Pole Vault",
  "M": "Long Jump",
  "N": "Triple Jump",
  "O": "Shot Put",
  "P": "Weight Throw",
  "Q": "Hammer",
  "R": "Shot Put",
  "S": "Weight Throw",
};

const FIELD_EVENT_TYPE_MAP: Record<string, string> = {
  "High Jump": "high_jump",
  "Pole Vault": "pole_vault",
  "Long Jump": "long_jump",
  "Triple Jump": "triple_jump",
  "Shot Put": "shot_put",
  "Discus": "discus",
  "Hammer": "hammer",
  "Javelin": "javelin",
  "Weight Throw": "weight_throw",
};

export function getFieldEventFromStroke(stroke: string, isIndoor: boolean): string | null {
  const map = isIndoor ? INDOOR_STROKE_MAP : OUTDOOR_STROKE_MAP;
  return map[stroke] || null;
}

export function getFieldEventType(stroke: string, isIndoor: boolean): string {
  const eventName = getFieldEventFromStroke(stroke, isIndoor);
  if (eventName) {
    return FIELD_EVENT_TYPE_MAP[eventName] || "field_event";
  }
  return "field_event";
}

export function generateEventName(mdbEvent: MDBEvent, isIndoor: boolean = false): string {
  const normalizedGender = (mdbEvent.Event_sex || mdbEvent.Event_gender || '')
    .toString()
    .toLowerCase()
    .trim();

  let genderPrefix = "Men's";
  if (normalizedGender === 'w' || normalizedGender === 'f' || normalizedGender === 'g' ||
      normalizedGender === 'women' || normalizedGender === 'female' || 
      normalizedGender === 'girls' || normalizedGender === 'girl') {
    genderPrefix = "Women's";
  } else if (normalizedGender === 'mixed' || normalizedGender === 'x' ||
             normalizedGender === 'coed' || normalizedGender === 'co-ed' ||
             normalizedGender === 'both') {
    genderPrefix = "Mixed";
  } else if (normalizedGender === 'b' || normalizedGender === 'boys' || normalizedGender === 'boy') {
    genderPrefix = "Men's";
  }
  
  const distance = mdbEvent.Event_dist || 0;
  const stroke = (mdbEvent.Event_stroke || "").trim();
  const isRelay = (mdbEvent.Ind_rel || '').toString().toUpperCase() === 'R';
  const trkField = (mdbEvent.Trk_Field || "T").trim().toUpperCase();
  
  if (trkField === 'M') {
    if (stroke === '1') return `${genderPrefix} Decathlon`;
    if (stroke === '2') return `${genderPrefix} Heptathlon`;
    if (stroke === '3') return `${genderPrefix} Pentathlon`;
    return `${genderPrefix} Combined Event`;
  }
  
  if (isRelay) {
    if (distance === 400) return `${genderPrefix} 4x100m Relay`;
    if (distance === 800) return `${genderPrefix} 4x200m Relay`;
    if (distance === 1600) return `${genderPrefix} 4x400m Relay`;
    if (distance === 3200) return `${genderPrefix} 4x800m Relay`;
    return `${genderPrefix} ${distance}m Relay`;
  }
  
  if (stroke === 'C') {
    if (distance === 1) return `${genderPrefix} Mile`;
    if (distance === 2) return `${genderPrefix} 2 Mile`;
    if (distance === 3) return `${genderPrefix} 3 Mile`;
    return `${genderPrefix} Cross Country`;
  }
  
  if (distance === 0) {
    const fieldEvent = getFieldEventFromStroke(stroke, isIndoor);
    if (fieldEvent) {
      return `${genderPrefix} ${fieldEvent}`;
    }
    return `${genderPrefix} Field Event`;
  }
  
  if (stroke === 'H' && distance >= 2000) {
    return `${genderPrefix} ${distance}m Steeplechase`;
  }
  
  let eventTypeText = "";
  switch (stroke) {
    case "A":
      eventTypeText = distance <= 400 ? "Dash" : "Run";
      break;
    case "B":
      eventTypeText = "Run";
      break;
    case "H":
    case "E":
      eventTypeText = "Hurdles";
      break;
    case "W":
      eventTypeText = "Walk";
      break;
    case "D":
      eventTypeText = "Steeplechase";
      break;
    default:
      eventTypeText = "Run";
  }
  
  return `${genderPrefix} ${distance}m ${eventTypeText}`;
}

// Generate a sub-event name from Eventmulti row data (stroke + distance)
// Used for pentathlon/heptathlon sub-events like "60m Hurdles", "High Jump", etc.
export function generateSubEventName(distance: number, stroke: string, trkField: string, isIndoor: boolean): string {
  stroke = (stroke || '').trim();
  trkField = (trkField || 'T').trim().toUpperCase();
  
  // Field events (Trk_Field = "F")
  if (trkField === 'F') {
    const fieldName = getFieldEventFromStroke(stroke, isIndoor);
    if (fieldName) return fieldName;
    return 'Field Event';
  }
  
  // Track events (Trk_Field = "T")
  if (stroke === 'E' || stroke === 'H') {
    // Hurdles
    if (distance > 0) return `${distance}m Hurdles`;
    return 'Hurdles';
  }
  if (stroke === 'A') {
    // Dash/Sprint
    if (distance > 0) return `${distance}m`;
    return 'Sprint';
  }
  if (stroke === 'B') {
    // Distance run
    if (distance > 0) return `${distance}m`;
    return 'Run';
  }
  if (stroke === 'W') {
    if (distance > 0) return `${distance}m Walk`;
    return 'Walk';
  }
  if (stroke === 'D') {
    if (distance > 0) return `${distance}m Steeplechase`;
    return 'Steeplechase';
  }
  
  // Fallback
  if (distance > 0) return `${distance}m`;
  return 'Event';
}

export async function importCompleteMDB(filePath: string, meetId: string): Promise<ImportStatistics> {
  console.log(`\n=== IMPORTING MDB FILE: ${filePath} ===\n`);
  console.log(`📍 Target Meet ID: ${meetId}\n`);
  
  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);
  
  const isEdgeMode = process.env.EDGE_MODE === 'true';
  let sqliteDb: any = null;
  if (isEdgeMode) {
    const { storage } = await import('./storage');
    const { SQLiteStorage } = await import('./storage/sqlite-adapter');
    if (storage instanceof SQLiteStorage) {
      sqliteDb = storage.getSqliteDb();
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS meet_scoring_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meet_id TEXT NOT NULL,
          gender TEXT NOT NULL,
          place INTEGER NOT NULL,
          ind_score REAL NOT NULL DEFAULT 0,
          rel_score REAL NOT NULL DEFAULT 0,
          combevt_score REAL NOT NULL DEFAULT 0,
          UNIQUE(meet_id, gender, place)
        );
      `);
      try { sqliteDb.exec('ALTER TABLE meets ADD COLUMN ind_max_scorers_per_team INTEGER DEFAULT 0'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE meets ADD COLUMN rel_max_scorers_per_team INTEGER DEFAULT 0'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE events ADD COLUMN advance_by_place INTEGER'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE events ADD COLUMN advance_by_time INTEGER'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE events ADD COLUMN advancement_json TEXT'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE events ADD COLUMN is_multi_event INTEGER DEFAULT 0'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE entries ADD COLUMN preliminary_points REAL'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE entries ADD COLUMN quarterfinal_points REAL'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE entries ADD COLUMN semifinal_points REAL'); } catch(e) {}
      try { sqliteDb.exec('ALTER TABLE entries ADD COLUMN final_points REAL'); } catch(e) {}
    }
  }
  
  // ID mapping dictionaries (Access number → PostgreSQL UUID)
  const teamIdMap = new Map<number, string>();
  const divisionIdMap = new Map<number, string>();
  const athleteIdMap = new Map<number, string>();
  const eventIdMap = new Map<number, string>();
  const ptrToNumMap = new Map<number, number>();
  const multiEventPtrs = new Set<number>(); // Track which Event_ptrs are multi-events (heptathlon, pentathlon, etc.)
  const multiEventMetaMap = new Map<number, { name: string; gender: string; eventNum: number }>(); // Event_ptr → parent event metadata
  const subEventIdMap = new Map<string, string>(); // "eventPtr_multPtr" → child event ID (for Entrymulti import)
  // Track events that have an explicit Event_stat — these should NOT be overridden by Ev_score inference
  // "Done" (Event_stat='D') does NOT mean "Scored" — only 'S' or 'C' should be marked as scored
  const eventsWithExplicitStatus = new Set<number>();
  
  // Statistics tracking
  const stats: ImportStatistics = {
    teams: 0,
    divisions: 0,
    athletes: 0,
    events: 0,
    entries: 0,
  };
  
  // ===========================
  // 1. IMPORT TEAMS
  // ===========================
  console.log("\n🏫 Importing Teams...");
  try {
    const teamTable = reader.getTable("Team");
    const teamData = teamTable.getData();
    const teamBatch = [];
    
    for (const row of teamData) {
      const teamNo = typeof row.Team_no === 'number' ? row.Team_no : Number(row.Team_no || 0);
      const teamName = String(row.Team_name || "Unknown Team");
      const teamAbbr = row.Team_abbr ? (typeof row.Team_abbr === 'string' ? row.Team_abbr.trim() : String(row.Team_abbr)) : null;
      
      teamBatch.push({
        meetId,
        teamNumber: teamNo,
        name: teamName,
        shortName: row.Team_short ? String(row.Team_short) : null,
        abbreviation: teamAbbr,
      });
    }
    
    if (teamBatch.length > 0) {
      if (isEdgeMode && sqliteDb) {
        const upsertStmt = sqliteDb.prepare(`
          INSERT INTO teams (id, meet_id, team_number, name, short_name, abbreviation)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(meet_id, team_number) DO UPDATE SET
            name=excluded.name, short_name=excluded.short_name, abbreviation=excluded.abbreviation
        `);
        const insertMany = sqliteDb.transaction((items: any[]) => {
          for (const item of items) {
            upsertStmt.run(randomUUID(), item.meetId, item.teamNumber, item.name, item.shortName, item.abbreviation);
          }
        });
        insertMany(teamBatch);
        const insertedTeams = sqliteDb.prepare('SELECT * FROM teams WHERE meet_id = ?').all(meetId);
        insertedTeams.forEach((team: any) => {
          teamIdMap.set(team.team_number, team.id);
        });
        stats.teams = insertedTeams.length;
        console.log(`   ✅ Imported ${insertedTeams.length} teams`);
      } else {
        const insertedTeams = await db!.insert(teams).values(teamBatch)
          .onConflictDoUpdate({
            target: [teams.meetId, teams.teamNumber],
            set: {
              name: sql`excluded.name`,
              shortName: sql`excluded.short_name`,
              abbreviation: sql`excluded.abbreviation`,
            }
          })
          .returning();
        insertedTeams.forEach((team) => {
          teamIdMap.set(team.teamNumber, team.id);
        });
        stats.teams = insertedTeams.length;
        console.log(`   ✅ Imported ${insertedTeams.length} teams`);
      }
    }
  } catch (error) {
    console.error("   ❌ Error importing teams:", error);
  }
  
  // ===========================
  // 2. IMPORT DIVISIONS
  // ===========================
  console.log("\n📊 Importing Divisions...");
  try {
    const divisionTable = reader.getTable("Divisions");
    const divisionData = divisionTable.getData();
    const divisionBatch = [];
    
    for (const row of divisionData) {
      const divNo = typeof row.Div_no === 'number' ? row.Div_no : Number(row.Div_no || 0);
      const divName = String(row.Div_name || "Unknown Division");
      const divAbbr = row.Div_abbr ? (typeof row.Div_abbr === 'string' ? row.Div_abbr.trim() : String(row.Div_abbr)) : null;
      
      divisionBatch.push({
        meetId,
        divisionNumber: divNo,
        name: divName,
        abbreviation: divAbbr,
        lowAge: row.low_age ? Number(row.low_age) : null,
        highAge: row.high_age ? Number(row.high_age) : null,
      });
    }
    
    if (divisionBatch.length > 0) {
      if (isEdgeMode && sqliteDb) {
        const upsertStmt = sqliteDb.prepare(`
          INSERT INTO divisions (id, meet_id, division_number, name, abbreviation, low_age, high_age)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(meet_id, division_number) DO UPDATE SET
            name=excluded.name, abbreviation=excluded.abbreviation, low_age=excluded.low_age, high_age=excluded.high_age
        `);
        const insertMany = sqliteDb.transaction((items: any[]) => {
          for (const item of items) {
            upsertStmt.run(randomUUID(), item.meetId, item.divisionNumber, item.name, item.abbreviation, item.lowAge, item.highAge);
          }
        });
        insertMany(divisionBatch);
        const insertedDivisions = sqliteDb.prepare('SELECT * FROM divisions WHERE meet_id = ?').all(meetId);
        insertedDivisions.forEach((division: any) => {
          divisionIdMap.set(division.division_number, division.id);
        });
        stats.divisions = insertedDivisions.length;
        console.log(`   ✅ Imported ${insertedDivisions.length} divisions`);
      } else {
        const insertedDivisions = await db!.insert(divisions).values(divisionBatch)
          .onConflictDoUpdate({
            target: [divisions.meetId, divisions.divisionNumber],
            set: {
              name: sql`excluded.name`,
              abbreviation: sql`excluded.abbreviation`,
              lowAge: sql`excluded.low_age`,
              highAge: sql`excluded.high_age`,
            }
          })
          .returning();
        insertedDivisions.forEach((division) => {
          divisionIdMap.set(division.divisionNumber, division.id);
        });
        stats.divisions = insertedDivisions.length;
        console.log(`   ✅ Imported ${insertedDivisions.length} divisions`);
      }
    }
  } catch (error) {
    console.error("   ❌ Error importing divisions:", error);
  }
  
  // ===========================
  // 3. IMPORT ATHLETES
  // ===========================
  console.log("\n🏃 Importing Athletes...");
  try {
    const athleteTable = reader.getTable("Athlete");
    const athleteData = athleteTable.getData();
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < athleteData.length; i += batchSize) {
      const batch = athleteData.slice(i, i + batchSize);
      const athleteBatch = batch.map((row) => {
        const athNo = typeof row.Ath_no === 'number' ? row.Ath_no : Number(row.Ath_no || 0);
        const teamNo = typeof row.Team_no === 'number' ? row.Team_no : Number(row.Team_no || 0);
        const divNo = typeof row.Div_no === 'number' ? row.Div_no : Number(row.Div_no || 0);
        
        return {
          meetId,
          athleteNumber: athNo,
          firstName: String(row.First_name || ""),
          lastName: String(row.Last_name || ""),
          teamId: teamIdMap.get(teamNo) || null,
          divisionId: divisionIdMap.get(divNo) || null,
          bibNumber: row.Comp_no ? String(row.Comp_no) : null,
          gender: row.Ath_Sex ? String(row.Ath_Sex) : null,
        };
      });
      
      if (isEdgeMode && sqliteDb) {
        const upsertStmt = sqliteDb.prepare(`
          INSERT INTO athletes (id, meet_id, athlete_number, first_name, last_name, team_id, division_id, bib_number, gender)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(meet_id, athlete_number) DO UPDATE SET
            first_name=excluded.first_name, last_name=excluded.last_name, team_id=excluded.team_id,
            division_id=excluded.division_id, bib_number=excluded.bib_number, gender=excluded.gender
        `);
        const insertBatch = sqliteDb.transaction((items: any[]) => {
          for (const item of items) {
            upsertStmt.run(randomUUID(), item.meetId, item.athleteNumber, item.firstName, item.lastName, item.teamId, item.divisionId, item.bibNumber, item.gender);
          }
        });
        insertBatch(athleteBatch);
        const rows = sqliteDb.prepare('SELECT * FROM athletes WHERE meet_id = ? AND athlete_number IN (' + athleteBatch.map(() => '?').join(',') + ')').all(meetId, ...athleteBatch.map((a: any) => a.athleteNumber));
        rows.forEach((athlete: any) => {
          athleteIdMap.set(athlete.athlete_number, athlete.id);
        });
        imported += rows.length;
      } else {
        const insertedAthletes = await db!.insert(athletes).values(athleteBatch)
          .onConflictDoUpdate({
            target: [athletes.meetId, athletes.athleteNumber],
            set: {
              firstName: sql`excluded.first_name`,
              lastName: sql`excluded.last_name`,
              teamId: sql`excluded.team_id`,
              divisionId: sql`excluded.division_id`,
              bibNumber: sql`excluded.bib_number`,
              gender: sql`excluded.gender`,
            }
          })
          .returning();
        insertedAthletes.forEach((athlete) => {
          athleteIdMap.set(athlete.athleteNumber, athlete.id);
        });
        imported += insertedAthletes.length;
      }
      
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= athleteData.length) {
        console.log(`   📝 Imported ${imported}/${athleteData.length} athletes...`);
      }
    }
    stats.athletes = imported;
    console.log(`   ✅ Imported ${imported} athletes`);
  } catch (error) {
    console.error("   ❌ Error importing athletes:", error);
  }
  
  // ===========================
  // 4. IMPORT EVENTS
  // ===========================
  console.log("\n🏁 Importing Events...");
  
  // Get meet start date for fallback
  let meetStartDate: Date | null = null;
  let isIndoorMeet = false;
  try {
    if (isEdgeMode && sqliteDb) {
      const meetRow = sqliteDb.prepare('SELECT * FROM meets WHERE id = ?').get(meetId);
      if (meetRow?.start_date) {
        meetStartDate = new Date(meetRow.start_date);
      }
    } else {
      const meetRecord = await db!.query.meets.findFirst({
        where: (meets: any, { eq }: any) => eq(meets.id, meetId)
      });
      if (meetRecord?.startDate) {
        meetStartDate = meetRecord.startDate;
      }
    }
  } catch (error) {
    console.log("   ⚠️  Could not retrieve meet start date");
  }
  
  // Read Meet table to get actual meet dates from MDB
  try {
    console.log("\n📅 Reading Meet table for actual meet dates...");
    const meetTable = reader.getTable("Meet");
    const meetData = meetTable.getData();
    
    if (meetData && meetData.length > 0) {
      const mdbMeet = meetData[0]; // Should only be 1 row
      console.log(`   📝 Meet table has ${meetData.length} row(s)`);
      
      const arenaVal = ((mdbMeet as any).meet_arena || '').toString().trim().toUpperCase();
      if (arenaVal === 'I') {
        isIndoorMeet = true;
        console.log(`   🏟️  Meet arena: INDOOR`);
      } else if (arenaVal === 'O') {
        console.log(`   🏟️  Meet arena: OUTDOOR`);
      } else {
        console.log(`   🏟️  Meet arena: "${arenaVal}" (defaulting to outdoor)`);
      }
      
      if (mdbMeet.Meet_start) {
        if (mdbMeet.Meet_start instanceof Date) {
          meetStartDate = mdbMeet.Meet_start;
        } else if (typeof mdbMeet.Meet_start === 'string' || typeof mdbMeet.Meet_start === 'number') {
          const parsed = new Date(mdbMeet.Meet_start);
          if (!isNaN(parsed.getTime())) {
            meetStartDate = parsed;
          }
        }
        if (meetStartDate) {
          console.log(`   📅 Meet start date from MDB: ${meetStartDate.toISOString().split('T')[0]}`);
        }
      }
    }
  } catch (meetError) {
    console.log("   ⚠️  Meet table not found or could not be read, using fallback date");
  }
  
  // Declare eventBatch at function scope so it's accessible from the records import section (section 7)
  const eventBatch: any[] = [];
  
  try {
    const eventTable = reader.getTable("Event");
    const eventData = eventTable.getData();
    
    // DEBUG: Show Event table structure
    console.log(`   📊 Event table has ${eventData.length} rows`);
    if (eventData.length > 0) {
      const firstRow = eventData[0];
      const columnNames = Object.keys(firstRow);
      console.log(`   📝 Available columns in Event table: ${columnNames.join(', ')}`);
      console.log(`   📝 Sample first event row:`, JSON.stringify(firstRow, null, 2));
    }
    let datesFound = 0;
    let timesFound = 0;
    let namesFound = 0;
    let ccTimesFound = 0;
    let comm1TimesFound = 0;
    let generatedNamesCount = 0;
    
    // Step 1: Read Session table to get session metadata (Sess_ptr → session info)
    const sessionMetaMap = new Map<number, { sessDay: number | null; name: string | null; defaultTime: string | null }>();
    try {
      console.log("\n📋 Attempting to read Session table...");
      const sessionTable = reader.getTable("Session");
      const sessionData = sessionTable.getData();
      
      console.log(`   📊 Session table has ${sessionData.length} rows`);
      
      if (sessionData.length > 0) {
        const firstRow = sessionData[0];
        const columnNames = Object.keys(firstRow);
        console.log(`   📝 Available columns: ${columnNames.join(', ')}`);
        console.log(`   📝 Sample first row data:`, JSON.stringify(firstRow, null, 2));
      }
      
      // Build Sess_ptr → session metadata map
      sessionData.forEach((session) => {
        const sessPtr = session.Sess_ptr ? Number(session.Sess_ptr) : null;
        if (sessPtr) {
          let defaultTime: string | null = null;
          
          // Convert Sess_starttime (seconds since midnight) to readable time
          if (session.Sess_starttime != null) {
            const totalSeconds = Number(session.Sess_starttime);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            defaultTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          }
          
          sessionMetaMap.set(sessPtr, {
            sessDay: session.Sess_day ? Number(session.Sess_day) : null,
            name: session.Sess_name ? String(session.Sess_name) : null,
            defaultTime,
          });
        }
      });
      
      console.log(`   ✅ Session table found, extracted ${sessionMetaMap.size} session records`);
    } catch (sessionError) {
      console.log("   ⚠️  Session table not found");
    }
    
    // Step 2: Read Sessitem table to get Event_ptr → (Sess_ptr, Start_time) mapping
    // This is the critical link between events and sessions with actual start times!
    const eventScheduleMap = new Map<number, { sessPtr: number; startTime: string | null; sessDay: number | null; sessName: string | null }>();
    let sessitemTimesFound = 0;
    try {
      console.log("\n📋 Attempting to read Sessitem table (event-to-session mapping)...");
      const sessitemTable = reader.getTable("Sessitem");
      const sessitemData = sessitemTable.getData();
      
      console.log(`   📊 Sessitem table has ${sessitemData.length} rows`);
      
      if (sessitemData.length > 0) {
        const firstRow = sessitemData[0];
        const columnNames = Object.keys(firstRow);
        console.log(`   📝 Available columns: ${columnNames.join(', ')}`);
        console.log(`   📝 Sample first row:`, JSON.stringify(firstRow, null, 2));
      }
      
      // Build Event_ptr → schedule info map
      sessitemData.forEach((item) => {
        const eventPtr = item.Event_ptr ? Number(item.Event_ptr) : null;
        const sessPtr = item.Sess_ptr ? Number(item.Sess_ptr) : null;
        
        if (eventPtr && sessPtr) {
          // Get time from Sessitem (Start_time + am_pm)
          let startTime: string | null = null;
          if (item.Start_time) {
            const timeStr = String(item.Start_time).trim();
            const amPm = item.am_pm ? String(item.am_pm).trim().toUpperCase() : '';
            if (timeStr && amPm) {
              startTime = `${timeStr} ${amPm}`;
              sessitemTimesFound++;
            } else if (timeStr) {
              startTime = timeStr;
              sessitemTimesFound++;
            }
          }
          
          // Get session metadata
          const sessionMeta = sessionMetaMap.get(sessPtr);
          
          // Only store the first (or best) entry per event
          // If we already have this event, only update if this entry has a time and the existing one doesn't
          const existing = eventScheduleMap.get(eventPtr);
          if (!existing || (startTime && !existing.startTime)) {
            eventScheduleMap.set(eventPtr, {
              sessPtr,
              startTime: startTime || sessionMeta?.defaultTime || null,
              sessDay: sessionMeta?.sessDay || null,
              sessName: sessionMeta?.name || null,
            });
          }
        }
      });
      
      console.log(`   ✅ Sessitem table found, mapped ${eventScheduleMap.size} events to sessions`);
      console.log(`   ⏰ Events with explicit times from Sessitem: ${sessitemTimesFound}`);
    } catch (sessitemError) {
      console.log("   ⚠️  Sessitem table not found, falling back to Session table only");
      
      // Fallback: if no Sessitem, use Session table directly (less accurate)
      // This won't work well but provides some data
    }
    
    // Create combined sessionMap for backward compatibility (Event_ptr → session info)
    const sessionMap = new Map<number, { sessDay: number | null; time: string | null; name: string | null }>();
    eventScheduleMap.forEach((schedule, eventPtr) => {
      sessionMap.set(eventPtr, {
        sessDay: schedule.sessDay,
        time: schedule.startTime,
        name: schedule.sessName,
      });
    });
    
    // Track Event_ptr → Event_no mapping for building eventIdMap later
    
    for (const row of eventData) {
      const eventNum = typeof row.Event_no === 'number' ? row.Event_no : Number(row.Event_no || 0);
      const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
      
      // Track the mapping between Event_ptr and Event_no
      ptrToNumMap.set(eventPtr, eventNum);
      
      const distance = row.Event_dist ? Number(row.Event_dist) : null;
      const genderRaw = row.Event_sex || row.Event_gender || "M";
      const gender = String(genderRaw);
      const trkField = row.Trk_Field || "T"; // T = Track, F = Field
      
      const hytekStatusRaw = row.Event_stat || row.Event_status || row.Event_Status || null;
      let hytekStatus: string | null = null;
      // Score_event means "eligible for team scoring" (i.e. points are awarded for this event)
      // This is NOT the same as "event has been scored/completed" — don't use it as isScored
      // isScored should only be true when Event_stat indicates the event is actually scored/done
      let isScored = false;
      
      if (hytekStatusRaw != null) {
        const statusStr = String(hytekStatusRaw).trim();
        switch (statusStr) {
          case 'U':
          case 'u':
          case 'unseeded':
            hytekStatus = 'unseeded';
            eventsWithExplicitStatus.add(eventPtr);
            break;
          case '1':
          case 'seeded':
            hytekStatus = 'seeded';
            eventsWithExplicitStatus.add(eventPtr);
            break;
          case 'A':
          case 'a':
          case 'D':
          case 'd':
          case 'done':
            hytekStatus = 'done';
            // "Done" does NOT mean "Scored" — do NOT set isScored here
            eventsWithExplicitStatus.add(eventPtr);
            break;
          case 'S':
          case 's':
          case 'C':
          case 'c':
          case 'scored':
            hytekStatus = 'scored';
            isScored = true;
            eventsWithExplicitStatus.add(eventPtr);
            break;
          default:
            hytekStatus = statusStr;
            break;
        }
      }
      
      if (eventNum > 0) {
        console.log(`   📊 Event ${eventNum}: Event_stat=${JSON.stringify(hytekStatusRaw)}, hytekStatus=${hytekStatus}, isScored=${isScored}`);
      }
      
      // Get session info for this event (if available) - use Event_ptr to match Sess_ptr
      const sessionInfo = sessionMap.get(eventPtr);
      
      // Determine event type from distance and track/field indicator
      let eventType = "100m"; // default
      
      if (trkField === "M") {
        // Multi-events (Decathlon, Heptathlon, Pentathlon) — trkField="M" in HyTek
        const stroke = (row.Event_stroke || "").toString().trim();
        if (stroke === '1') eventType = 'decathlon';
        else if (stroke === '2') eventType = 'heptathlon';
        else if (stroke === '3') eventType = 'pentathlon';
        else eventType = 'combined_event';
      } else if (trkField === "F") {
        const stroke = (row.Event_stroke || "").toString().trim();
        eventType = getFieldEventType(stroke, isIndoorMeet);
      } else if (distance) {
        // Track events - use distance
        if (distance === 100) eventType = "100m";
        else if (distance === 200) eventType = "200m";
        else if (distance === 400) eventType = "400m";
        else if (distance === 800) eventType = "800m";
        else if (distance === 1500) eventType = "1500m";
        else if (distance === 3000) eventType = "3000m";
        else if (distance === 5000) eventType = "5000m";
        else if (distance === 10000) eventType = "10000m";
        else eventType = `${distance}m`;
      }
      
      // Extract individual event date/time from Event table
      let eventDate: Date | null = null;
      let eventTime: string | null = null;
      let eventName = `Event ${eventNum}`;
      
      // Priority 1: Individual event date/time from CCracestart fields
      if (row.CCracestart_date) {
        if (row.CCracestart_date instanceof Date) {
          eventDate = row.CCracestart_date;
          datesFound++;
        } else if (typeof row.CCracestart_date === 'string' || typeof row.CCracestart_date === 'number') {
          const parsed = new Date(row.CCracestart_date);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed;
            datesFound++;
          }
        }
      }
      
      if (row.CCracestart_time) {
        if (typeof row.CCracestart_time === 'number') {
          // Convert seconds since midnight to time string
          const totalSeconds = row.CCracestart_time;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          eventTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          ccTimesFound++;
          timesFound++;
        } else if (row.CCracestart_time instanceof Date) {
          const hours = row.CCracestart_time.getHours();
          const minutes = row.CCracestart_time.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          eventTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          ccTimesFound++;
          timesFound++;
        } else {
          eventTime = String(row.CCracestart_time);
          ccTimesFound++;
          timesFound++;
        }
      }
      
      // Priority 2: Parse Comm_1 field for time information
      if (!eventTime && row.Comm_1) {
        const comm1Text = String(row.Comm_1).trim();
        if (comm1Text) {
          const parsed = parseComm1(comm1Text);
          if (parsed.time) {
            // Convert 24-hour time to 12-hour format
            const [hours24, minutes] = parsed.time.split(':').map(Number);
            const ampm = hours24 >= 12 ? 'PM' : 'AM';
            const displayHours = hours24 % 12 || 12;
            eventTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
            comm1TimesFound++;
            timesFound++;
          }
        }
      }
      
      // Priority 3: Fall back to session time if no individual event time or Comm_1 time
      if (!eventTime && sessionInfo?.time) {
        eventTime = sessionInfo.time;
        timesFound++;
      }
      
      // Priority 4: Calculate date from session Sess_day or fallback to meet start date
      if (!eventDate) {
        if (sessionInfo?.sessDay && meetStartDate) {
          // Calculate event date based on which day of the meet (Sess_day is 1-based)
          eventDate = new Date(meetStartDate);
          eventDate.setDate(eventDate.getDate() + (sessionInfo.sessDay - 1));
          datesFound++;
        } else if (meetStartDate) {
          // Fallback to meet start date if no session match
          eventDate = meetStartDate;
          datesFound++;
        }
      }
      
      // Generate event name from event data (NOT from session name)
      const rawEventName = row.Event_name || row.Event_desc || row.Event_description || row.Name || row.Description || null;
      // Check if raw name is meaningful (not just "Event N")
      const isGenericName = rawEventName && /^Event\s+\d+$/i.test(String(rawEventName).trim());
      
      // DEBUG: Log raw stroke data for every event
      const eventTypeVal = (row as any).Event_Type || '';
      const eventType2Val = (row as any).Event_Type2 || '';
      const eventLtr = (row as any).Event_ltr || '';
      const eventNote = (row as any).event_note || '';
      console.log(`   🔍 Event #${eventNum} (ptr=${eventPtr}): stroke="${row.Event_stroke}" dist=${distance} trk_field="${trkField}" gender="${gender}" ind_rel="${row.Ind_rel}" Event_Type="${eventTypeVal}" Event_Type2="${eventType2Val}" Event_ltr="${eventLtr}" event_note="${eventNote}"`);
      
      if (rawEventName && !isGenericName) {
        eventName = String(rawEventName);
        namesFound++;
      } else {
        // Generate descriptive name from event data
        eventName = generateEventName(row, isIndoorMeet);
        generatedNamesCount++;
        namesFound++;
      }
      
      console.log(`   📝 Event #${eventNum} → "${eventName}"`);
      
      // Priority 4: Final fallback to other Event table fields
      if (!eventDate) {
        const rawEventDate = row.Event_date || row.Start_date || row.Sched_date || null;
        if (rawEventDate) {
          if (rawEventDate instanceof Date) {
            eventDate = rawEventDate;
            datesFound++;
          } else if (typeof rawEventDate === 'string') {
            const parsed = new Date(rawEventDate);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed;
              datesFound++;
            }
          } else {
            const parsed = new Date(String(rawEventDate));
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed;
              datesFound++;
            }
          }
        }
      }
      
      if (!eventTime) {
        const rawEventTime = row.Event_time || row.Start_time || row.Sched_time || row.Event_Starttime || null;
        if (rawEventTime) {
          if (rawEventTime instanceof Date) {
            eventTime = rawEventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            timesFound++;
          } else {
            eventTime = String(rawEventTime);
            timesFound++;
          }
        }
      }
      
      const numRounds = row.Event_rounds ? Number(row.Event_rounds) : 1;
      const numLanes = row.Num_finlanes ? Number(row.Num_finlanes) : 8;
      
      // Extract advancement formula from HyTek (per-round)
      // Top_no1/Next_Best1 = prelims→next, Top_no2/Next_Best2 = quarters→next, Top_no3/Next_Best3 = semis→finals
      let advanceByPlace: number | null = null;
      let advanceByTime: number | null = null;
      let advancementJson: string | null = null;
      
      if (numRounds > 1) {
        // Extract advancement from first round (prelims to next round) — stored in legacy columns
        if (row.Top_no1 !== null && row.Top_no1 !== undefined) {
          advanceByPlace = Number(row.Top_no1) || null;
        }
        if (row.Next_Best1 !== null && row.Next_Best1 !== undefined) {
          advanceByTime = Number(row.Next_Best1) || null;
        }
        // Build per-round advancement JSON — keys must match the dataRounds mapping
        // in displays.ts so that the correct advancement data is found for each round.
        // HyTek stores: Top_no1/Next_Best1 = round 1→2, Top_no2/Next_Best2 = round 2→3, Top_no3/Next_Best3 = round 3→4
        // displays.ts dataRounds mapping:
        //   2 rounds: ['preliminary', 'final']
        //   3 rounds: ['preliminary', 'semifinal', 'final']  (skips quarterfinal)
        //   4 rounds: ['preliminary', 'quarterfinal', 'semifinal', 'final']
        const advancement: Record<string, { place: number; time: number }> = {};
        if (numRounds === 2) {
          // 2 rounds: Top_no1 = prelims→final
          if (row.Top_no1 || row.Next_Best1) {
            advancement.preliminary = { place: Number(row.Top_no1) || 0, time: Number(row.Next_Best1) || 0 };
          }
        } else if (numRounds === 3) {
          // 3 rounds: Top_no1 = prelims→semis, Top_no2 = semis→finals
          if (row.Top_no1 || row.Next_Best1) {
            advancement.preliminary = { place: Number(row.Top_no1) || 0, time: Number(row.Next_Best1) || 0 };
          }
          if (row.Top_no2 || row.Next_Best2) {
            advancement.semifinal = { place: Number(row.Top_no2) || 0, time: Number(row.Next_Best2) || 0 };
          }
        } else {
          // 4 rounds: Top_no1 = prelims→quarters, Top_no2 = quarters→semis, Top_no3 = semis→finals
          if (row.Top_no1 || row.Next_Best1) {
            advancement.preliminary = { place: Number(row.Top_no1) || 0, time: Number(row.Next_Best1) || 0 };
          }
          if (row.Top_no2 || row.Next_Best2) {
            advancement.quarterfinal = { place: Number(row.Top_no2) || 0, time: Number(row.Next_Best2) || 0 };
          }
          if (row.Top_no3 || row.Next_Best3) {
            advancement.semifinal = { place: Number(row.Top_no3) || 0, time: Number(row.Next_Best3) || 0 };
          }
        }
        if (Object.keys(advancement).length > 0) {
          advancementJson = JSON.stringify(advancement);
        }
      }
      
      // Auto-detect multi-event (Decathlon, Heptathlon, Pentathlon) from event name
      // Supports abbreviations: "Hept", "Pent", "Dec" as used in FinishLynx
      const isMultiEvent = /\b(dec(athlon)?|hept(athlon)?|pent(athlon)?)\b/i.test(eventName);
      
      // Track which Event_ptrs are multi-events so we can set resultType='points' during entry import
      if (isMultiEvent) {
        multiEventPtrs.add(eventPtr);
        // Store parent event metadata for sub-event name generation
        multiEventMetaMap.set(eventPtr, { name: eventName, gender, eventNum });
      }
      
      eventBatch.push({
        meetId,
        eventNumber: eventNum,
        name: eventName,
        eventType,
        gender,
        distance,
        status: "scheduled",
        numRounds,
        numLanes,
        eventDate,
        eventTime,
        sessionName: sessionInfo?.name || null, // Session name from HyTek
        hytekStatus, // NEW: HyTek status from MDB
        isScored,    // NEW: Derived lock flag
        advanceByPlace, // Advancement by place (Q qualifiers)
        advanceByTime,  // Advancement by time (q qualifiers)
        advancementJson, // Per-round advancement JSON
        isMultiEvent,   // Auto-detected from event name
      });
    }
    
    if (eventBatch.length > 0) {
      let insertedEvents: any[];
      if (isEdgeMode && sqliteDb) {
        const upsertStmt = sqliteDb.prepare(`
          INSERT INTO events (id, meet_id, event_number, name, event_type, gender, distance, status, num_rounds, num_lanes, event_date, event_time, session_name, hytek_status, is_scored, advance_by_place, advance_by_time, advancement_json, is_multi_event)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(meet_id, event_number) DO UPDATE SET
            name=excluded.name, event_type=excluded.event_type, gender=excluded.gender, distance=excluded.distance,
            status=excluded.status, num_rounds=excluded.num_rounds, num_lanes=excluded.num_lanes, event_date=excluded.event_date,
            event_time=excluded.event_time, session_name=excluded.session_name, hytek_status=excluded.hytek_status,
            is_scored=excluded.is_scored, advance_by_place=excluded.advance_by_place, advance_by_time=excluded.advance_by_time,
            advancement_json=excluded.advancement_json, is_multi_event=excluded.is_multi_event
        `);
        const insertMany = sqliteDb.transaction((items: any[]) => {
          for (const item of items) {
            upsertStmt.run(
              randomUUID(), item.meetId, item.eventNumber, item.name, item.eventType, item.gender,
              item.distance, item.status, item.numRounds, item.numLanes,
              item.eventDate instanceof Date ? item.eventDate.toISOString().split('T')[0] : item.eventDate,
              item.eventTime, item.sessionName, item.hytekStatus, item.isScored ? 1 : 0,
              item.advanceByPlace, item.advanceByTime, item.advancementJson, item.isMultiEvent ? 1 : 0
            );
          }
        });
        insertMany(eventBatch);
        insertedEvents = sqliteDb.prepare('SELECT * FROM events WHERE meet_id = ?').all(meetId);
        insertedEvents = insertedEvents.map((e: any) => ({
          ...e,
          eventNumber: e.event_number,
          eventType: e.event_type,
        }));
      } else {
        insertedEvents = await db!.insert(events).values(eventBatch)
          .onConflictDoUpdate({
            target: [events.meetId, events.eventNumber],
            set: {
              name: sql`excluded.name`,
              eventType: sql`excluded.event_type`,
              gender: sql`excluded.gender`,
              distance: sql`excluded.distance`,
              status: sql`excluded.status`,
              numRounds: sql`excluded.num_rounds`,
              numLanes: sql`excluded.num_lanes`,
              eventDate: sql`excluded.event_date`,
              eventTime: sql`excluded.event_time`,
              sessionName: sql`excluded.session_name`,
              hytekStatus: sql`excluded.hytek_status`,
              isScored: sql`excluded.is_scored`,
              advanceByPlace: sql`excluded.advance_by_place`,
              advanceByTime: sql`excluded.advance_by_time`,
              isMultiEvent: sql`excluded.is_multi_event`,
            }
          })
          .returning();
      }
      
      // Build eventIdMap using Event_ptr as the key (not eventNumber)
      // This is critical because Entry table references events via Event_ptr
      insertedEvents.forEach((event: any) => {
        // Find the Event_ptr that corresponds to this eventNumber
        for (const [ptr, num] of Array.from(ptrToNumMap.entries())) {
          if (num === event.eventNumber) {
            eventIdMap.set(ptr, event.id);  // Map by Event_ptr, not eventNumber
            break;
          }
        }
      });
      
      stats.events = insertedEvents.length;
      console.log(`   ✅ Imported ${insertedEvents.length} events`);
      console.log(`   📊 Track events: ${eventBatch.filter(e => !e.eventType.includes('jump') && !e.eventType.includes('throw')).length}`);
      console.log(`   📊 Field events: ${eventBatch.filter(e => e.eventType.includes('jump') || e.eventType.includes('throw')).length}`);
      console.log(`   📝 Events with names from database: ${namesFound}`);
      console.log(`   📝 Events with generated names: ${generatedNamesCount}`);
      console.log(`   📅 Events with dates: ${datesFound}`);
      console.log(`   ⏰ Events with times: ${timesFound}`);
      console.log(`   ⏰ Events with individual CCracestart times: ${ccTimesFound}`);
      console.log(`   ⏰ Events with Comm_1 parsed times: ${comm1TimesFound}`);
      console.log(`   🔒 Events marked as scored/done: ${eventBatch.filter(e => e.isScored).length}`);
      console.log(`   📝 Events with HyTek status: ${eventBatch.filter(e => e.hytekStatus).length}`);
      console.log(`   🏃 Multi-round events: ${eventBatch.filter(e => e.numRounds > 1).length}`);
      console.log(`   🎯 Events with advancement formula: ${eventBatch.filter(e => e.advanceByPlace || e.advanceByTime).length}`);
      console.log(`   🎯 Events with per-round advancement JSON: ${eventBatch.filter(e => e.advancementJson).length}`);
      eventBatch.filter(e => e.advancementJson).forEach(e => {
        console.log(`      📋 Event #${e.eventNumber} (${e.name}): ${e.advancementJson}`);
      });
    }
  } catch (error) {
    console.error("   ❌ Error importing events:", error);
  }
  
  // ===========================
  // 4b. IMPORT MULTI-EVENT SUB-EVENTS (Pentathlon/Heptathlon/Decathlon components)
  // ===========================
  // Read Eventmulti table to create child events for each sub-event component
  // e.g., "Women's Pentathlon - 60m Hurdles", "Women's Pentathlon - High Jump", etc.
  console.log("\n🏅 Importing Multi-Event Sub-Events...");
  try {
    const eventMultiTable = reader.getTable("Eventmulti");
    const eventMultiData = eventMultiTable.getData();
    console.log(`   📊 Eventmulti table has ${eventMultiData.length} rows`);
    
    if (eventMultiData.length > 0 && multiEventMetaMap.size > 0) {
      const subEventBatch: any[] = [];
      
      for (const row of eventMultiData) {
        const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
        const multPtr = typeof row.Mult_ptr === 'number' ? row.Mult_ptr : Number(row.Mult_ptr || 0);
        const distance = typeof row.Event_dist === 'number' ? row.Event_dist : Number(row.Event_dist || 0);
        const stroke = String(row.Event_stroke || '').trim();
        const trkField = String(row.Trk_Field || 'T').trim();
        const multiEventNo = typeof row.MultiEvent_no === 'number' ? row.MultiEvent_no : Number(row.MultiEvent_no || 0);
        
        // Get parent event metadata
        const parentMeta = multiEventMetaMap.get(eventPtr);
        if (!parentMeta) {
          console.log(`   ⚠️  Skipping sub-event Mult_ptr ${multPtr}: no parent event found for Event_ptr ${eventPtr}`);
          continue;
        }
        
        // Generate sub-event name from stroke/distance
        const subEventName = generateSubEventName(distance, stroke, trkField, isIndoorMeet);
        const fullName = `${parentMeta.name} - ${subEventName}`;
        
        // Generate unique event number: parentEventNum * 1000 + sub-event sequence number
        const subEventNumber = parentMeta.eventNum * 1000 + multiEventNo;
        
        // Determine event type for the sub-event
        let subEventType = 'multi_sub';
        if (trkField === 'F') {
          subEventType = getFieldEventType(stroke, isIndoorMeet);
        } else if (distance > 0) {
          subEventType = `${distance}m`;
        }
        
        console.log(`   📝 Sub-event: ${fullName} (eventNum=${subEventNumber}, type=${subEventType})`);
        
        subEventBatch.push({
          meetId,
          eventNumber: subEventNumber,
          name: fullName,
          eventType: subEventType,
          gender: parentMeta.gender,
          distance: distance || null,
          status: "scheduled",
          numRounds: 1,
          numLanes: row.Num_finlanes ? Number(row.Num_finlanes) : 8,
          eventDate: null,
          eventTime: null,
          sessionName: null,
          hytekStatus: 'done',
          isScored: false,
          advanceByPlace: null,
          advanceByTime: null,
          isMultiEvent: false, // Sub-events themselves are not multi-events
          // Extra metadata for mapping
          _eventPtr: eventPtr,
          _multPtr: multPtr,
        });
      }
      
      if (subEventBatch.length > 0) {
        if (isEdgeMode && sqliteDb) {
          const subUpsertStmt = sqliteDb.prepare(`
            INSERT INTO events (id, meet_id, event_number, name, event_type, gender, distance, status, num_rounds, num_lanes, event_date, event_time, session_name, hytek_status, is_scored, advance_by_place, advance_by_time, is_multi_event)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(meet_id, event_number) DO UPDATE SET
              name=excluded.name, event_type=excluded.event_type, gender=excluded.gender, distance=excluded.distance,
              status=excluded.status, num_rounds=excluded.num_rounds, num_lanes=excluded.num_lanes,
              hytek_status=excluded.hytek_status, is_multi_event=excluded.is_multi_event
          `);
          const subInsertMany = sqliteDb.transaction((items: any[]) => {
            for (const item of items) {
              subUpsertStmt.run(
                randomUUID(), item.meetId, item.eventNumber, item.name, item.eventType, item.gender,
                item.distance, item.status, item.numRounds, item.numLanes,
                null, null, null, item.hytekStatus, 0, null, null, 0
              );
            }
          });
          subInsertMany(subEventBatch);
          
          // Build subEventIdMap: look up the inserted sub-events by event_number
          const allSubEvents = sqliteDb.prepare('SELECT id, event_number FROM events WHERE meet_id = ?').all(meetId);
          for (const sub of subEventBatch) {
            const inserted = allSubEvents.find((e: any) => e.event_number === sub.eventNumber);
            if (inserted) {
              const key = `${sub._eventPtr}_${sub._multPtr}`;
              subEventIdMap.set(key, inserted.id);
            }
          }
        } else {
          const subInserted = await db!.insert(events).values(
            subEventBatch.map(({ _eventPtr, _multPtr, ...rest }) => rest)
          )
            .onConflictDoUpdate({
              target: [events.meetId, events.eventNumber],
              set: {
                name: sql`excluded.name`,
                eventType: sql`excluded.event_type`,
                gender: sql`excluded.gender`,
                distance: sql`excluded.distance`,
                status: sql`excluded.status`,
                numRounds: sql`excluded.num_rounds`,
                numLanes: sql`excluded.num_lanes`,
                hytekStatus: sql`excluded.hytek_status`,
                isMultiEvent: sql`excluded.is_multi_event`,
              }
            })
            .returning();
          
          // Build subEventIdMap from returned rows
          for (const sub of subEventBatch) {
            const inserted = subInserted.find((e: any) => e.eventNumber === sub.eventNumber);
            if (inserted) {
              const key = `${sub._eventPtr}_${sub._multPtr}`;
              subEventIdMap.set(key, inserted.id);
            }
          }
        }
        
        stats.events += subEventBatch.length;
        console.log(`   ✅ Imported ${subEventBatch.length} multi-event sub-events`);
        console.log(`   📊 Sub-event ID mappings: ${subEventIdMap.size}`);
      }
    } else {
      console.log(`   ℹ️  No multi-events found to import sub-events for`);
    }
  } catch (e) {
    console.log(`   ⚠️  Eventmulti table not found or could not be read: ${(e as Error).message}`);
  }
  
  // ===========================
  // 5. IMPORT ENTRIES (THE BIG ONE!)
  // ===========================
  console.log("\n🎯 Importing Entries (athlete-event registrations & results)...");
  
  // Build multi-event points map from Entrymulti table
  // Entrymulti has per-component event points (Fin_points) for each athlete in a multi-event
  // We sum them to get the total points per athlete per parent event
  const multiEventPointsMap = new Map<string, number>(); // key: "eventPtr_athNo" -> total points
  try {
    const entryMultiTable = reader.getTable("Entrymulti");
    const entryMultiData = entryMultiTable.getData();
    console.log(`   \n📊 Reading Entrymulti table (${entryMultiData.length} rows) for multi-event points...`);
    
    for (const row of entryMultiData) {
      const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
      const athNo = typeof row.Ath_no === 'number' ? row.Ath_no : Number(row.Ath_no || 0);
      const finPoints = typeof row.Fin_points === 'number' ? row.Fin_points : Number(row.Fin_points || 0);
      
      if (eventPtr > 0 && athNo > 0 && finPoints > 0) {
        const key = `${eventPtr}_${athNo}`;
        multiEventPointsMap.set(key, (multiEventPointsMap.get(key) || 0) + finPoints);
      }
    }
    
    console.log(`   🏅 Multi-event points computed for ${multiEventPointsMap.size} athlete-event combinations`);
  } catch (e) {
    console.log(`   ⚠️  Entrymulti table not found or could not be read: ${(e as Error).message}`);
  }
  
  // Get event details for result type determination
  const eventDetailsMap = new Map<string, { eventType: string }>();
  if (isEdgeMode && sqliteDb) {
    const allEventRows = sqliteDb.prepare('SELECT id, event_type FROM events').all();
    allEventRows.forEach((event: any) => {
      eventDetailsMap.set(event.id, { eventType: event.event_type });
    });
  } else {
    const allEvents = await db!.query.events.findMany();
    allEvents.forEach((event: any) => {
      eventDetailsMap.set(event.id, { eventType: event.eventType });
    });
  }
  
  try {
    const entryTable = reader.getTable("Entry");
    const entryData = entryTable.getData();
    const batchSize = 100;
    let imported = 0;
    let skippedMissingAthlete = 0;
    let skippedMissingEvent = 0;
    
    for (let i = 0; i < entryData.length; i += batchSize) {
      const batch = entryData.slice(i, i + batchSize);
      const entryBatch = [];
      
      for (const row of batch) {
        const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
        const athNo = typeof row.Ath_no === 'number' ? row.Ath_no : Number(row.Ath_no || 0);
        
        const eventId = eventIdMap.get(eventPtr);
        const athleteId = athleteIdMap.get(athNo);
        
        if (!eventId) {
          skippedMissingEvent++;
          continue;
        }
        if (!athleteId) {
          skippedMissingAthlete++;
          continue;
        }
        
        // Determine result type from event type
        const eventDetails = eventDetailsMap.get(eventId);
        const isMultiEventEntry = multiEventPtrs.has(eventPtr);
        let resultType = "time"; // default for track events
        if (isMultiEventEntry) {
          resultType = "points"; // Multi-event entries use points as their mark
        } else if (eventDetails) {
          const et = eventDetails.eventType;
          if (et.includes('jump') || et.includes('vault')) {
            resultType = "distance"; // or "height" for high jump/pole vault
          } else if (et.includes('throw') || et.includes('shot') || et.includes('discus') || et.includes('hammer') || et.includes('javelin')) {
            resultType = "distance";
          }
        }
        
        // Get teamId and divisionId from the Entry row
        const teamNo = row.Team_no ? (typeof row.Team_no === 'number' ? row.Team_no : Number(row.Team_no)) : null;
        const divNo = row.Div_no ? (typeof row.Div_no === 'number' ? row.Div_no : Number(row.Div_no)) : null;
        const teamId = teamNo ? teamIdMap.get(teamNo) || null : null;
        const divisionId = divNo ? divisionIdMap.get(divNo) || null : null;
        
        // Convert seedMark to number
        const seedMark = row.ActualSeed_time ? (typeof row.ActualSeed_time === 'number' ? row.ActualSeed_time : parseFloat(String(row.ActualSeed_time))) : null;
        
        entryBatch.push({
          eventId,
          athleteId,
          teamId,
          divisionId,
          
          // Registration
          seedMark,
          resultType,
          
          // Preliminary round
          preliminaryHeat: row.Pre_heat ? Number(row.Pre_heat) : null,
          preliminaryLane: row.Pre_lane ? Number(row.Pre_lane) : null,
          preliminaryMark: row.Pre_Time ? Number(row.Pre_Time) : null,
          preliminaryPlace: row.Pre_jdplace ? Number(row.Pre_jdplace) : (row.Pre_place ? Number(row.Pre_place) : null),
          preliminaryWind: row.Pre_wind ? Number(row.Pre_wind) : null,
          
          // Quarterfinal round
          quarterfinalHeat: row.Qtr_heat ? Number(row.Qtr_heat) : null,
          quarterfinalLane: row.Qtr_lane ? Number(row.Qtr_lane) : null,
          quarterfinalMark: row.Qtr_Time ? Number(row.Qtr_Time) : null,
          quarterfinalPlace: row.Qtr_jdplace ? Number(row.Qtr_jdplace) : (row.Qtr_place ? Number(row.Qtr_place) : null),
          quarterfinalWind: row.Qtr_wind ? Number(row.Qtr_wind) : null,
          
          // Semifinal round
          semifinalHeat: row.Sem_heat ? Number(row.Sem_heat) : null,
          semifinalLane: row.Sem_lane ? Number(row.Sem_lane) : null,
          semifinalMark: row.Sem_Time ? Number(row.Sem_Time) : null,
          semifinalPlace: row.Sem_jdplace ? Number(row.Sem_jdplace) : (row.Sem_place ? Number(row.Sem_place) : null),
          semifinalWind: row.Sem_wind ? Number(row.Sem_wind) : null,
          
          // Final round
          finalHeat: row.Fin_heat ? Number(row.Fin_heat) : null,
          finalLane: row.Fin_lane ? Number(row.Fin_lane) : null,
          // For multi-events, Fin_Time contains total points (e.g., 3915).
          // If Fin_Time is 0 or missing, try to get total from Entrymulti sum.
          finalMark: (() => {
            const finTime = row.Fin_Time ? Number(row.Fin_Time) : null;
            if (isMultiEventEntry) {
              // Use Fin_Time if it has a positive value (HyTek stores total points there)
              if (finTime && finTime > 0) return finTime;
              // Otherwise compute from Entrymulti component points
              const key = `${eventPtr}_${athNo}`;
              const multiPts = multiEventPointsMap.get(key);
              return multiPts && multiPts > 0 ? multiPts : null;
            }
            return finTime;
          })(),
          finalPlace: row.Fin_jdplace ? Number(row.Fin_jdplace) : (row.Fin_place ? Number(row.Fin_place) : null),
          finalWind: row.Fin_wind ? Number(row.Fin_wind) : null,
          
          finalPoints: row.Ev_score != null && Number(row.Ev_score) > 0 ? Number(row.Ev_score) : null,
          scoredPoints: row.Ev_score != null && Number(row.Ev_score) > 0 ? Number(row.Ev_score) : null,
          
          // Flags (proper boolean parsing)
          // Only set isDisqualified for actual DQ (Fin_stat='D'), NOT for DNF or other status types
          // HyTek's dq_type field is used for ALL non-standard finishes, not just DQs
          isDisqualified: [row.Fin_stat, row.Sem_stat, row.Qtr_stat, row.Pre_stat].some(
            s => s != null && String(s).trim().toUpperCase() === 'D'
          ),
          isScratched: row.Scr_stat === true || row.Scr_stat === "Y" || row.Scr_stat === "y" ||
            [row.Fin_stat, row.Sem_stat, row.Qtr_stat, row.Pre_stat].some(s => s != null && String(s).trim().toUpperCase() === 'S'),
          
          notes: (() => {
            const statFields = [
              { stat: row.Fin_stat, round: 'final' },
              { stat: row.Sem_stat, round: 'semifinal' },
              { stat: row.Qtr_stat, round: 'quarterfinal' },
              { stat: row.Pre_stat, round: 'preliminary' },
            ];
            for (const { stat } of statFields) {
              if (stat != null && String(stat).trim() !== '') {
                const code = String(stat).trim().toUpperCase();
                const isVertical = eventDetails && (eventDetails.eventType.includes('high_jump') || eventDetails.eventType.includes('pole_vault'));
                if (code === 'N') return isVertical ? 'NH' : 'NM';
                if (code === 'F') return 'FOUL';
                if (code === 'S') return 'SCR';
                if (code === 'D') return 'DQ';
                if (code === 'X') return 'DNS';
                return code;
              }
            }
            if (row.dq_type != null && String(row.dq_type).trim() !== '') {
              return String(row.dq_type).trim().toUpperCase();
            }
            return null;
          })(),
        });
      }
      
      if (entryBatch.length > 0) {
        if (isEdgeMode && sqliteDb) {
          const upsertStmt = sqliteDb.prepare(`
            INSERT INTO entries (id, event_id, athlete_id, team_id, division_id, seed_mark, result_type,
              preliminary_heat, preliminary_lane, preliminary_mark, preliminary_place, preliminary_wind,
              quarterfinal_heat, quarterfinal_lane, quarterfinal_mark, quarterfinal_place, quarterfinal_wind,
              semifinal_heat, semifinal_lane, semifinal_mark, semifinal_place, semifinal_wind,
              final_heat, final_lane, final_mark, final_place, final_wind,
              scored_points,
              is_disqualified, is_scratched, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(event_id, athlete_id) DO UPDATE SET
              team_id=excluded.team_id, division_id=excluded.division_id, seed_mark=excluded.seed_mark, result_type=excluded.result_type,
              preliminary_heat=excluded.preliminary_heat, preliminary_lane=excluded.preliminary_lane,
              preliminary_mark=excluded.preliminary_mark, preliminary_place=excluded.preliminary_place, preliminary_wind=excluded.preliminary_wind,
              quarterfinal_heat=excluded.quarterfinal_heat, quarterfinal_lane=excluded.quarterfinal_lane,
              quarterfinal_mark=excluded.quarterfinal_mark, quarterfinal_place=excluded.quarterfinal_place, quarterfinal_wind=excluded.quarterfinal_wind,
              semifinal_heat=excluded.semifinal_heat, semifinal_lane=excluded.semifinal_lane,
              semifinal_mark=excluded.semifinal_mark, semifinal_place=excluded.semifinal_place, semifinal_wind=excluded.semifinal_wind,
              final_heat=excluded.final_heat, final_lane=excluded.final_lane,
              final_mark=excluded.final_mark, final_place=excluded.final_place, final_wind=excluded.final_wind,
              scored_points=excluded.scored_points,
              is_disqualified=excluded.is_disqualified, is_scratched=excluded.is_scratched, notes=excluded.notes
          `);
          const insertBatch = sqliteDb.transaction((items: any[]) => {
            for (const item of items) {
              upsertStmt.run(
                randomUUID(), item.eventId, item.athleteId, item.teamId, item.divisionId,
                item.seedMark, item.resultType,
                item.preliminaryHeat, item.preliminaryLane, item.preliminaryMark, item.preliminaryPlace, item.preliminaryWind,
                item.quarterfinalHeat, item.quarterfinalLane, item.quarterfinalMark, item.quarterfinalPlace, item.quarterfinalWind,
                item.semifinalHeat, item.semifinalLane, item.semifinalMark, item.semifinalPlace, item.semifinalWind,
                item.finalHeat, item.finalLane, item.finalMark, item.finalPlace, item.finalWind,
                item.finalPoints,
                item.isDisqualified ? 1 : 0, item.isScratched ? 1 : 0, item.notes
              );
            }
          });
          insertBatch(entryBatch);
          imported += entryBatch.length;
        } else {
          await db!.insert(entries).values(entryBatch)
            .onConflictDoUpdate({
              target: [entries.eventId, entries.athleteId],
              set: {
                seedMark: sql`excluded.seed_mark`,
                resultType: sql`excluded.result_type`,
                teamId: sql`excluded.team_id`,
                divisionId: sql`excluded.division_id`,
                
                preliminaryHeat: sql`excluded.preliminary_heat`,
                preliminaryLane: sql`excluded.preliminary_lane`,
                preliminaryMark: sql`excluded.preliminary_mark`,
                preliminaryPlace: sql`excluded.preliminary_place`,
                preliminaryWind: sql`excluded.preliminary_wind`,
                
                quarterfinalHeat: sql`excluded.quarterfinal_heat`,
                quarterfinalLane: sql`excluded.quarterfinal_lane`,
                quarterfinalMark: sql`excluded.quarterfinal_mark`,
                quarterfinalPlace: sql`excluded.quarterfinal_place`,
                quarterfinalWind: sql`excluded.quarterfinal_wind`,
                
                semifinalHeat: sql`excluded.semifinal_heat`,
                semifinalLane: sql`excluded.semifinal_lane`,
                semifinalMark: sql`excluded.semifinal_mark`,
                semifinalPlace: sql`excluded.semifinal_place`,
                semifinalWind: sql`excluded.semifinal_wind`,
                
                finalHeat: sql`excluded.final_heat`,
                finalLane: sql`excluded.final_lane`,
                finalMark: sql`excluded.final_mark`,
                finalPlace: sql`excluded.final_place`,
                finalWind: sql`excluded.final_wind`,
                
                preliminaryPoints: sql`excluded.preliminary_points`,
                quarterfinalPoints: sql`excluded.quarterfinal_points`,
                semifinalPoints: sql`excluded.semifinal_points`,
                finalPoints: sql`excluded.final_points`,
                scoredPoints: sql`excluded.scored_points`,
                
                isDisqualified: sql`excluded.is_disqualified`,
                isScratched: sql`excluded.is_scratched`,
                notes: sql`excluded.notes`,
              }
            });
          imported += entryBatch.length;
        }
      }
      
      if ((i + batchSize) % 500 === 0 || i + batchSize >= entryData.length) {
        console.log(`   📝 Imported ${imported}/${entryData.length} entries...`);
      }
    }
    stats.entries = imported;
    console.log(`   ✅ Imported ${imported} entries`);
    
    const withFinResults = entryData.filter(r => r.Fin_Time != null).length;
    const withPreResults = entryData.filter(r => r.Pre_Time != null).length;
    const withSemResults = entryData.filter(r => r.Sem_Time != null).length;
    const withQtrResults = entryData.filter(r => r.Qtr_Time != null).length;
    const withFinPoints = entryData.filter(r => r.Fin_points != null).length;
    const withPrePoints = entryData.filter(r => r.Pre_points != null).length;
    const withJdplace = entryData.filter(r => r.Fin_jdplace != null).length;
    console.log(`   📊 Entries with Final results: ${withFinResults}, Prelim: ${withPreResults}, Semi: ${withSemResults}, Quarter: ${withQtrResults}`);
    console.log(`   🏆 Entries with Final points: ${withFinPoints}, Prelim points: ${withPrePoints}`);
    console.log(`   ⚖️  Entries with judge's decision (Fin_jdplace): ${withJdplace}`);
    
    if (skippedMissingAthlete > 0 || skippedMissingEvent > 0) {
      console.log(`   ⚠️  Skipped ${skippedMissingAthlete} entries (missing athlete), ${skippedMissingEvent} entries (missing event)`);
    }
    
    // 5b. IMPORT RELAY ENTRIES
    // Relay results live in a separate "Relay" table in HyTek MDB
    // Each row represents one relay team's entry in a relay event, with Ev_score for team scoring
    let relayImported = 0;
    try {
      const relayTable = reader.getTable("Relay");
      const relayData = relayTable.getData();
      console.log(`\n   🏃‍♂️ Importing Relay entries (${relayData.length} rows)...`);
      
      // Get relay member mapping from RelayNames table
      // We need at least one athlete per relay to create an entry (entries require athlete_id)
      const relayMemberMap = new Map<number, number>(); // Relay_no -> first Ath_no
      try {
        const relayNamesTable = reader.getTable("RelayNames");
        const relayNamesData = relayNamesTable.getData();
        for (const rn of relayNamesData) {
          const relayNo = Number(rn.Relay_no || 0);
          const athNo = Number(rn.Ath_no || 0);
          if (relayNo > 0 && athNo > 0 && !relayMemberMap.has(relayNo)) {
            relayMemberMap.set(relayNo, athNo);
          }
        }
        console.log(`   📋 Found relay members for ${relayMemberMap.size} relay teams`);
      } catch (e) {
        console.log(`   ⚠️  RelayNames table not found, will use team-based fallback`);
      }
      
      const relayEntryBatch: any[] = [];
      let relaySkipped = 0;
      
      for (const row of relayData) {
        const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
        const teamNo = typeof row.Team_no === 'number' ? row.Team_no : Number(row.Team_no || 0);
        const relayNo = typeof row.Relay_no === 'number' ? row.Relay_no : Number(row.Relay_no || 0);
        
        const eventId = eventIdMap.get(eventPtr);
        const teamId = teamNo ? teamIdMap.get(teamNo) || null : null;
        
        if (!eventId) { relaySkipped++; continue; }
        
        // Find an athlete for this relay entry
        // First try RelayNames, then find any athlete on this team
        let athleteId: string | null = null;
        const memberAthNo = relayMemberMap.get(relayNo);
        if (memberAthNo) {
          athleteId = athleteIdMap.get(memberAthNo) || null;
        }
        
        // Fallback: find any athlete on this team that we have mapped
        if (!athleteId && teamNo) {
          const athEntries = Array.from(athleteIdMap.entries());
          for (const [athNo, id] of athEntries) {
            const athEntry = entryData.find((e: any) => Number(e.Ath_no) === athNo && Number(e.Team_no) === teamNo);
            if (athEntry) {
              athleteId = id;
              break;
            }
          }
        }
        
        if (!athleteId) { relaySkipped++; continue; }
        
        const seedMark = row.ActualSeed_time ? (typeof row.ActualSeed_time === 'number' ? row.ActualSeed_time : parseFloat(String(row.ActualSeed_time))) : null;
        const evScore = row.Ev_score != null && Number(row.Ev_score) > 0 ? Number(row.Ev_score) : null;
        
        relayEntryBatch.push({
          eventId,
          athleteId,
          teamId,
          divisionId: null,
          seedMark,
          resultType: "time",
          preliminaryHeat: row.Pre_heat ? Number(row.Pre_heat) : null,
          preliminaryLane: row.Pre_lane ? Number(row.Pre_lane) : null,
          preliminaryMark: row.Pre_Time ? Number(row.Pre_Time) : null,
          preliminaryPlace: row.Pre_jdplace ? Number(row.Pre_jdplace) : (row.Pre_place ? Number(row.Pre_place) : null),
          preliminaryWind: null,
          quarterfinalHeat: null, quarterfinalLane: null, quarterfinalMark: null, quarterfinalPlace: null, quarterfinalWind: null,
          semifinalHeat: null, semifinalLane: null, semifinalMark: null, semifinalPlace: null, semifinalWind: null,
          finalHeat: row.Fin_heat ? Number(row.Fin_heat) : null,
          finalLane: row.Fin_lane ? Number(row.Fin_lane) : null,
          finalMark: row.Fin_Time ? Number(row.Fin_Time) : null,
          finalPlace: row.Fin_jdplace ? Number(row.Fin_jdplace) : (row.Fin_place ? Number(row.Fin_place) : null),
          finalWind: null,
          finalPoints: evScore,
          scoredPoints: evScore,
          isDisqualified: row.Fin_stat != null && String(row.Fin_stat).trim().toUpperCase() === 'D',
          isScratched: row.Scr_stat === true || row.Scr_stat === "Y",
          notes: row.Fin_stat != null && String(row.Fin_stat).trim() !== '' && String(row.Fin_stat).trim() !== ' ' 
            ? String(row.Fin_stat).trim().toUpperCase() : null,
        });
      }
      
      if (relayEntryBatch.length > 0) {
        if (isEdgeMode && sqliteDb) {
          const upsertStmt = sqliteDb.prepare(`
            INSERT INTO entries (id, event_id, athlete_id, team_id, division_id, seed_mark, result_type,
              preliminary_heat, preliminary_lane, preliminary_mark, preliminary_place, preliminary_wind,
              quarterfinal_heat, quarterfinal_lane, quarterfinal_mark, quarterfinal_place, quarterfinal_wind,
              semifinal_heat, semifinal_lane, semifinal_mark, semifinal_place, semifinal_wind,
              final_heat, final_lane, final_mark, final_place, final_wind,
              scored_points,
              is_disqualified, is_scratched, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(event_id, athlete_id) DO UPDATE SET
              team_id=excluded.team_id, division_id=excluded.division_id, seed_mark=excluded.seed_mark, result_type=excluded.result_type,
              preliminary_heat=excluded.preliminary_heat, preliminary_lane=excluded.preliminary_lane,
              preliminary_mark=excluded.preliminary_mark, preliminary_place=excluded.preliminary_place, preliminary_wind=excluded.preliminary_wind,
              quarterfinal_heat=excluded.quarterfinal_heat, quarterfinal_lane=excluded.quarterfinal_lane,
              quarterfinal_mark=excluded.quarterfinal_mark, quarterfinal_place=excluded.quarterfinal_place, quarterfinal_wind=excluded.quarterfinal_wind,
              semifinal_heat=excluded.semifinal_heat, semifinal_lane=excluded.semifinal_lane,
              semifinal_mark=excluded.semifinal_mark, semifinal_place=excluded.semifinal_place, semifinal_wind=excluded.semifinal_wind,
              final_heat=excluded.final_heat, final_lane=excluded.final_lane,
              final_mark=excluded.final_mark, final_place=excluded.final_place, final_wind=excluded.final_wind,
              scored_points=excluded.scored_points,
              is_disqualified=excluded.is_disqualified, is_scratched=excluded.is_scratched, notes=excluded.notes
          `);
          const insertBatch = sqliteDb.transaction((items: any[]) => {
            for (const item of items) {
              upsertStmt.run(
                randomUUID(), item.eventId, item.athleteId, item.teamId, item.divisionId,
                item.seedMark, item.resultType,
                item.preliminaryHeat, item.preliminaryLane, item.preliminaryMark, item.preliminaryPlace, item.preliminaryWind,
                item.quarterfinalHeat, item.quarterfinalLane, item.quarterfinalMark, item.quarterfinalPlace, item.quarterfinalWind,
                item.semifinalHeat, item.semifinalLane, item.semifinalMark, item.semifinalPlace, item.semifinalWind,
                item.finalHeat, item.finalLane, item.finalMark, item.finalPlace, item.finalWind,
                item.scoredPoints,
                item.isDisqualified ? 1 : 0, item.isScratched ? 1 : 0, item.notes
              );
            }
          });
          insertBatch(relayEntryBatch);
        } else {
          await db!.insert(entries).values(relayEntryBatch)
            .onConflictDoUpdate({
              target: [entries.eventId, entries.athleteId],
              set: {
                seedMark: sql`excluded.seed_mark`,
                resultType: sql`excluded.result_type`,
                teamId: sql`excluded.team_id`,
                divisionId: sql`excluded.division_id`,
                finalHeat: sql`excluded.final_heat`,
                finalLane: sql`excluded.final_lane`,
                finalMark: sql`excluded.final_mark`,
                finalPlace: sql`excluded.final_place`,
                finalPoints: sql`excluded.final_points`,
                scoredPoints: sql`excluded.scored_points`,
                isDisqualified: sql`excluded.is_disqualified`,
                isScratched: sql`excluded.is_scratched`,
                notes: sql`excluded.notes`,
              }
            });
        }
        relayImported = relayEntryBatch.length;
        stats.entries += relayImported;
      }
      console.log(`   ✅ Imported ${relayImported} relay entries`);
      if (relaySkipped > 0) {
        console.log(`   ⚠️  Skipped ${relaySkipped} relay entries (missing event/athlete)`);
      }
    } catch (relayError) {
      console.log(`   ⚠️  Relay table not found or could not be read: ${(relayError as Error).message}`);
    }
    
    // 5c. IMPORT MULTI-EVENT SUB-EVENT ENTRIES FROM Entrymulti
    // Each row in Entrymulti has per-sub-event results (time/mark, points, place) for each athlete
    if (subEventIdMap.size > 0) {
      console.log(`\n   🏅 Importing multi-event sub-event entries from Entrymulti...`);
      let multiEntryImported = 0;
      let multiEntrySkipped = 0;
      try {
        const entryMultiTable2 = reader.getTable("Entrymulti");
        const entryMultiData2 = entryMultiTable2.getData();
        
        const multiEntryBatch: any[] = [];
        
        for (const row of entryMultiData2) {
          const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
          const multPtr = typeof row.Mult_ptr === 'number' ? row.Mult_ptr : Number(row.Mult_ptr || 0);
          const athNo = typeof row.Ath_no === 'number' ? row.Ath_no : Number(row.Ath_no || 0);
          
          const subEventKey = `${eventPtr}_${multPtr}`;
          const subEventId = subEventIdMap.get(subEventKey);
          const athleteId = athleteIdMap.get(athNo);
          
          if (!subEventId || !athleteId) {
            multiEntrySkipped++;
            continue;
          }
          
          // Get team info from the athlete's main entry
          const teamNo = row.Team_no ? Number(row.Team_no) : null;
          const teamId = teamNo ? teamIdMap.get(teamNo) || null : null;
          
          // Determine result type from the sub-event type
          const subEventDetails = eventDetailsMap.get(subEventId);
          let resultType = 'time'; // default for track sub-events
          if (subEventDetails) {
            const et = subEventDetails.eventType;
            if (et.includes('jump') || et.includes('vault')) {
              resultType = 'distance';
            } else if (et.includes('throw') || et.includes('shot') || et.includes('discus') || et.includes('hammer') || et.includes('javelin')) {
              resultType = 'distance';
            }
          }
          
          const finTime = row.Fin_time ? Number(row.Fin_time) : null;
          const finPlace = row.Fin_jdplace ? Number(row.Fin_jdplace) : (row.Fin_place ? Number(row.Fin_place) : null);
          const finPoints = row.Fin_points ? Number(row.Fin_points) : null;
          const finWind = row.Fin_wind ? Number(row.Fin_wind) : null;
          const finHeat = row.Fin_heat ? Number(row.Fin_heat) : null;
          const finLane = row.Fin_lane ? Number(row.Fin_lane) : null;
          
          multiEntryBatch.push({
            eventId: subEventId,
            athleteId,
            teamId,
            divisionId: null,
            seedMark: row.ActualSeed_time ? Number(row.ActualSeed_time) : null,
            resultType,
            preliminaryHeat: null, preliminaryLane: null, preliminaryMark: null, preliminaryPlace: null, preliminaryWind: null,
            quarterfinalHeat: null, quarterfinalLane: null, quarterfinalMark: null, quarterfinalPlace: null, quarterfinalWind: null,
            semifinalHeat: null, semifinalLane: null, semifinalMark: null, semifinalPlace: null, semifinalWind: null,
            finalHeat: finHeat,
            finalLane: finLane,
            finalMark: finTime,
            finalPlace: finPlace,
            finalWind: finWind,
            finalPoints: finPoints,
            scoredPoints: null, // Sub-events don't have team scoring points
            isDisqualified: row.Fin_stat != null && String(row.Fin_stat).trim().toUpperCase() === 'D',
            isScratched: false,
            notes: row.Fin_stat != null && String(row.Fin_stat).trim() !== '' && String(row.Fin_stat).trim() !== ' '
              ? String(row.Fin_stat).trim().toUpperCase() : null,
          });
        }
        
        if (multiEntryBatch.length > 0) {
          if (isEdgeMode && sqliteDb) {
            const multiUpsertStmt = sqliteDb.prepare(`
              INSERT INTO entries (id, event_id, athlete_id, team_id, division_id, seed_mark, result_type,
                preliminary_heat, preliminary_lane, preliminary_mark, preliminary_place, preliminary_wind,
                quarterfinal_heat, quarterfinal_lane, quarterfinal_mark, quarterfinal_place, quarterfinal_wind,
                semifinal_heat, semifinal_lane, semifinal_mark, semifinal_place, semifinal_wind,
                final_heat, final_lane, final_mark, final_place, final_wind,
                scored_points,
                is_disqualified, is_scratched, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(event_id, athlete_id) DO UPDATE SET
                team_id=excluded.team_id, seed_mark=excluded.seed_mark, result_type=excluded.result_type,
                final_heat=excluded.final_heat, final_lane=excluded.final_lane,
                final_mark=excluded.final_mark, final_place=excluded.final_place, final_wind=excluded.final_wind,
                scored_points=excluded.scored_points,
                is_disqualified=excluded.is_disqualified, is_scratched=excluded.is_scratched, notes=excluded.notes
            `);
            const multiInsertBatch = sqliteDb.transaction((items: any[]) => {
              for (const item of items) {
                multiUpsertStmt.run(
                  randomUUID(), item.eventId, item.athleteId, item.teamId, item.divisionId,
                  item.seedMark, item.resultType,
                  item.preliminaryHeat, item.preliminaryLane, item.preliminaryMark, item.preliminaryPlace, item.preliminaryWind,
                  item.quarterfinalHeat, item.quarterfinalLane, item.quarterfinalMark, item.quarterfinalPlace, item.quarterfinalWind,
                  item.semifinalHeat, item.semifinalLane, item.semifinalMark, item.semifinalPlace, item.semifinalWind,
                  item.finalHeat, item.finalLane, item.finalMark, item.finalPlace, item.finalWind,
                  item.scoredPoints,
                  item.isDisqualified ? 1 : 0, item.isScratched ? 1 : 0, item.notes
                );
              }
            });
            multiInsertBatch(multiEntryBatch);
          } else {
            await db!.insert(entries).values(multiEntryBatch)
              .onConflictDoUpdate({
                target: [entries.eventId, entries.athleteId],
                set: {
                  seedMark: sql`excluded.seed_mark`,
                  resultType: sql`excluded.result_type`,
                  teamId: sql`excluded.team_id`,
                  finalHeat: sql`excluded.final_heat`,
                  finalLane: sql`excluded.final_lane`,
                  finalMark: sql`excluded.final_mark`,
                  finalPlace: sql`excluded.final_place`,
                  finalWind: sql`excluded.final_wind`,
                  scoredPoints: sql`excluded.scored_points`,
                  isDisqualified: sql`excluded.is_disqualified`,
                  isScratched: sql`excluded.is_scratched`,
                  notes: sql`excluded.notes`,
                }
              });
          }
          multiEntryImported = multiEntryBatch.length;
          stats.entries += multiEntryImported;
        }
        console.log(`   ✅ Imported ${multiEntryImported} multi-event sub-event entries`);
        if (multiEntrySkipped > 0) {
          console.log(`   ⚠️  Skipped ${multiEntrySkipped} multi-event entries (missing sub-event or athlete)`);
        }
      } catch (multiEntryError) {
        console.log(`   ⚠️  Could not import multi-event sub-event entries: ${(multiEntryError as Error).message}`);
      }
    }
    
    // Post-import: Infer is_scored from Ev_score values (both individual AND relay entries)
    // IMPORTANT: Only infer scoring for events that do NOT have an explicit Event_stat.
    // "Done" (Event_stat='D') does NOT mean "Scored" — HyTek distinguishes these states.
    // Events with Event_stat='D' have finished running but are NOT yet officially scored.
    // Only events with Event_stat='S' or 'C' should be marked as scored.
    // The Ev_score inference is a fallback for events where Event_stat is missing entirely.
    const eventsWithScores = new Set<number>();
    const withEvScore = entryData.filter(r => r.Ev_score != null && Number(r.Ev_score) > 0);
    // Also check relay data for Ev_score
    try {
      const relayData2 = reader.getTable("Relay").getData();
      const relayWithScore = relayData2.filter((r: any) => r.Ev_score != null && Number(r.Ev_score) > 0);
      for (const row of relayWithScore) {
        const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
        // Only add if the event does NOT have an explicit Event_stat
        if (eventPtr > 0 && !eventsWithExplicitStatus.has(eventPtr)) eventsWithScores.add(eventPtr);
      }
    } catch (e) { /* relay table already processed above */ }
    console.log(`   🔍 Entries with Ev_score > 0: ${withEvScore.length} individual + relay`);
    for (const row of withEvScore) {
      const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
      // Only add if the event does NOT have an explicit Event_stat
      if (eventPtr > 0 && !eventsWithExplicitStatus.has(eventPtr)) eventsWithScores.add(eventPtr);
    }
    
    if (eventsWithScores.size > 0) {
      const scoredPtrs = Array.from(eventsWithScores);
      const eventNums = scoredPtrs.map(ptr => ptrToNumMap.get(ptr)).filter(n => n != null);
      console.log(`   🏆 Events WITHOUT explicit Event_stat but with Ev_score data (inferred scored): ${eventsWithScores.size} events (Event_no: ${eventNums.join(', ')})`);
      
      // Build list of event IDs to mark as scored
      // eventIdMap is keyed by Event_ptr (not Event_no)
      const eventIdsToMark: string[] = [];
      for (const ptr of scoredPtrs) {
        const eventId = eventIdMap.get(ptr);
        if (eventId) eventIdsToMark.push(eventId);
      }
      
      if (eventIdsToMark.length > 0) {
        if (isEdgeMode && sqliteDb) {
          const placeholders = eventIdsToMark.map(() => '?').join(',');
          const updateResult = sqliteDb.prepare(`UPDATE events SET is_scored = 1 WHERE id IN (${placeholders}) AND (is_scored IS NULL OR is_scored = 0)`).run(...eventIdsToMark);
          console.log(`   ✅ Marked ${updateResult.changes} additional events as scored (from Ev_score inference, only for events without explicit status)`);
        } else if (db) {
          for (const eid of eventIdsToMark) {
            await db.execute(sql`UPDATE events SET is_scored = true WHERE id = ${eid} AND (is_scored IS NULL OR is_scored = false)`);
          }
          console.log(`   ✅ Marked up to ${eventIdsToMark.length} additional events as scored (from Ev_score inference, only for events without explicit status)`);
        }
      }
    } else {
      const skippedCount = withEvScore.length > 0 ? eventsWithExplicitStatus.size : 0;
      if (skippedCount > 0) {
        console.log(`   ℹ️  Skipped Ev_score inference for ${skippedCount} events that have explicit Event_stat (respecting Done vs Scored distinction)`);
      }
    }
  } catch (error) {
    console.error("   ❌ Error importing entries:", error);
  }
  
  // ===========================
  // 6. IMPORT SCORING RULES FROM MDB
  // ===========================
  console.log("\n🏆 Importing Scoring Rules...");
  try {
    const scoringTable = reader.getTable("Scoring");
    const scoringData = scoringTable.getData();
    console.log(`   📊 Scoring table has ${scoringData.length} rows`);

    const meetTable = reader.getTable("Meet");
    const meetRow = meetTable.getData()[0] as any;
    const diffPtsGender = Boolean(Number(meetRow?.diffpts_malefemale || 0));
    const indMaxScorers = meetRow?.indmaxscorers_perteam != null ? Number(meetRow.indmaxscorers_perteam) : 0;
    const relMaxScorers = meetRow?.relmaxscorers_perteam != null ? Number(meetRow.relmaxscorers_perteam) : 0;

    console.log(`   ⚙️  Different points per gender: ${diffPtsGender}`);
    console.log(`   ⚙️  Ind max scorers/team: ${indMaxScorers}, Relay max scorers/team: ${relMaxScorers}`);

    if (isEdgeMode && sqliteDb) {
      sqliteDb.prepare('UPDATE meets SET ind_max_scorers_per_team = ?, rel_max_scorers_per_team = ? WHERE id = ?')
        .run(indMaxScorers, relMaxScorers, meetId);
      sqliteDb.prepare('DELETE FROM meet_scoring_rules WHERE meet_id = ?').run(meetId);
    } else {
      await db!.update(meets).set({
        indMaxScorersPerTeam: indMaxScorers,
        relMaxScorersPerTeam: relMaxScorers,
      }).where(sql`${meets.id} = ${meetId}`);
      await db!.delete(meetScoringRules).where(sql`${meetScoringRules.meetId} = ${meetId}`);
    }

    const ruleBatch: { meetId: string; gender: string; place: number; indScore: number; relScore: number; combevtScore: number }[] = [];

    if (diffPtsGender) {
      for (const row of scoringData) {
        const indScore = Number(row.ind_score || 0);
        const relScore = Number(row.rel_score || 0);
        const combevtScore = Number(row.combevt_score || 0);
        if (indScore === 0 && relScore === 0 && combevtScore === 0) continue;
        const gender = String(row.score_sex || "").toUpperCase();
        if (gender !== "M" && gender !== "F") continue;
        ruleBatch.push({
          meetId,
          gender,
          place: Number(row.score_place),
          indScore,
          relScore,
          combevtScore,
        });
      }
    } else {
      const maleRows = scoringData.filter((r: any) => String(r.score_sex || "").toUpperCase() === "M");
      for (const row of maleRows) {
        const indScore = Number(row.ind_score || 0);
        const relScore = Number(row.rel_score || 0);
        const combevtScore = Number(row.combevt_score || 0);
        if (indScore === 0 && relScore === 0 && combevtScore === 0) continue;
        ruleBatch.push({
          meetId,
          gender: "ALL",
          place: Number(row.score_place),
          indScore,
          relScore,
          combevtScore,
        });
      }
    }

    if (ruleBatch.length > 0) {
      if (isEdgeMode && sqliteDb) {
        const upsertStmt = sqliteDb.prepare(`
          INSERT INTO meet_scoring_rules (meet_id, gender, place, ind_score, rel_score, combevt_score)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(meet_id, gender, place) DO UPDATE SET
            ind_score=excluded.ind_score, rel_score=excluded.rel_score, combevt_score=excluded.combevt_score
        `);
        const insertMany = sqliteDb.transaction((items: any[]) => {
          for (const item of items) {
            upsertStmt.run(item.meetId, item.gender, item.place, item.indScore, item.relScore, item.combevtScore);
          }
        });
        insertMany(ruleBatch);
      } else {
        await db!.insert(meetScoringRules).values(ruleBatch)
          .onConflictDoUpdate({
            target: [meetScoringRules.meetId, meetScoringRules.gender, meetScoringRules.place],
            set: {
              indScore: sql`excluded.ind_score`,
              relScore: sql`excluded.rel_score`,
              combevtScore: sql`excluded.combevt_score`,
            },
          });
      }
      console.log(`   ✅ Imported ${ruleBatch.length} scoring rules`);
    } else {
      console.log("   ⚠️  No non-zero scoring rules found");
    }
  } catch (error) {
    console.log("   ⚠️  Scoring table not found or could not be read:", (error as Error).message);
  }

  // ===========================
  // 7. IMPORT RECORDS (Meet/Facility Records from RecordsbyEvent table)
  // ===========================
  console.log("\n🏆 Importing Records (Meet/Facility Records)...");
  let recordsImported = 0;
  try {
    const recordsTable = reader.getTable("RecordsbyEvent");
    const recordsData = recordsTable.getData();
    console.log(`   📊 RecordsbyEvent table has ${recordsData.length} rows`);
    
    if (recordsData.length > 0) {
      // Group records by tag_ptr to create separate record books
      const tagGroups = new Map<number, any[]>();
      for (const row of recordsData) {
        const tagPtr = Number(row.tag_ptr || 0);
        if (!tagGroups.has(tagPtr)) {
          tagGroups.set(tagPtr, []);
        }
        tagGroups.get(tagPtr)!.push(row);
      }
      
      console.log(`   📝 Found ${tagGroups.size} record type(s): tag_ptrs = [${Array.from(tagGroups.keys()).join(', ')}]`);
      
      // Try to read the HyTek RecordTags table for tag abbreviations/names
      // HyTek uses "RecordTags" (some older versions may use "RecTag")
      // Fields: tag_ptr, tag_order, tag_name, tag_flag (abbreviation: F=Facility, M=Meet, C=Collegiate, etc.)
      const tagNameMap: Record<number, { name: string; scope: 'meet' | 'facility' | 'national' | 'international' | 'custom' }> = {};
      let recTagFound = false;
      for (const tableName of ['RecordTags', 'RecTag']) {
        try {
          const recTagTable = reader.getTable(tableName);
          const recTagData = recTagTable.getData();
          console.log(`   📋 ${tableName} table has ${recTagData.length} rows`);
          recTagFound = true;
          for (const tagRow of recTagData) {
            const ptr = Number(tagRow.tag_ptr || tagRow.Tag_ptr || 0);
            // tag_flag is the abbreviation in HyTek RecordTags (F, M, C, etc.)
            // Also try tag_abbr for older formats
            const abbr = String(tagRow.tag_flag || tagRow.Tag_flag || tagRow.tag_abbr || tagRow.Tag_abbr || tagRow.Abbr || tagRow.abbr || '').trim().toUpperCase();
            const tagName = String(tagRow.tag_name || tagRow.Tag_name || tagRow.Name || tagRow.name || '').trim();
            const tagNameUpper = tagName.toUpperCase();
            console.log(`   📋 ${tableName}: ptr=${ptr}, flag/abbr="${abbr}", name="${tagName}"`);
            
            // Auto-map by flag/abbreviation first, then by tag_name string
            if (abbr === 'F' || abbr === 'FR' || abbr.includes('FAC')) {
              tagNameMap[ptr] = { name: tagName || 'Facility Record', scope: 'facility' };
            } else if (abbr === 'M' || abbr === 'MR' || abbr.includes('MEET')) {
              tagNameMap[ptr] = { name: tagName || 'Meet Record', scope: 'meet' };
            } else if (abbr === 'N' || abbr === 'NR' || abbr.includes('NAT')) {
              tagNameMap[ptr] = { name: tagName || 'National Record', scope: 'national' };
            } else if (abbr === 'C' || abbr === 'CR' || abbr.includes('COL') || abbr.includes('CONF')) {
              // Collegiate/Conference records — map to national scope (closest category)
              tagNameMap[ptr] = { name: tagName || 'Collegiate Record', scope: 'national' };
            } else if (abbr === 'I' || abbr === 'IR' || abbr === 'WR' || abbr.includes('INT') || abbr.includes('WORLD')) {
              tagNameMap[ptr] = { name: tagName || 'International Record', scope: 'international' };
            } else if (tagNameUpper.includes('FACILITY') || tagNameUpper.includes('VENUE') || tagNameUpper.includes('ARENA')) {
              tagNameMap[ptr] = { name: tagName, scope: 'facility' };
            } else if (tagNameUpper.includes('MEET')) {
              tagNameMap[ptr] = { name: tagName, scope: 'meet' };
            } else if (tagNameUpper.includes('COLLEGIATE') || tagNameUpper.includes('CONFERENCE') || tagNameUpper.includes('NCAA')) {
              tagNameMap[ptr] = { name: tagName, scope: 'national' };
            } else if (tagNameUpper.includes('NATIONAL') || tagNameUpper.includes('AMERICAN')) {
              tagNameMap[ptr] = { name: tagName, scope: 'national' };
            } else if (tagNameUpper.includes('WORLD') || tagNameUpper.includes('INTERNATIONAL') || tagNameUpper.includes('OLYMPIC')) {
              tagNameMap[ptr] = { name: tagName, scope: 'international' };
            } else if (tagName) {
              // Has a name but unrecognized abbreviation — use the name, mark as custom
              tagNameMap[ptr] = { name: tagName, scope: 'custom' };
            }
          }
          break; // Found and processed the table, no need to try other names
        } catch (e) {
          // Table not found with this name, try next
        }
      }
      if (!recTagFound) {
        console.log('   ⚠️  RecordTags/RecTag table not found — falling back to tag_ptr-based mapping');
        // Only use hardcoded fallbacks when no RecordTags table exists at all
        // These are default HyTek conventions but can be wrong for specific meets
        if (!tagNameMap[6]) tagNameMap[6] = { name: 'Meet Record', scope: 'meet' };
        if (!tagNameMap[14]) tagNameMap[14] = { name: 'Facility Record', scope: 'facility' };
      }
      
      // Default display order by scope (lower = higher priority)
      const scopeDisplayOrder: Record<string, number> = { meet: 1, facility: 2, national: 3, international: 4, custom: 5 };
      
      // Build event name lookup from eventIdMap (Event_ptr -> event name/type)
      // We already have ptrToNumMap (Event_ptr -> eventNumber) and eventBatch has names
      const eventNameByPtr = new Map<number, { name: string; eventType: string; gender: string }>();
      for (const evt of eventBatch) {
        for (const [ptr, num] of Array.from(ptrToNumMap.entries())) {
          if (num === evt.eventNumber) {
            eventNameByPtr.set(ptr, { name: evt.name, eventType: evt.eventType, gender: evt.gender });
            break;
          }
        }
      }
      
      for (const [tagPtr, tagRecords] of Array.from(tagGroups.entries())) {
        const tagInfo = tagNameMap[tagPtr] || { name: `Record Book (Tag ${tagPtr})`, scope: 'custom' as const };
        
        // Create or find record book
        let bookId: number;
        if (!isEdgeMode || !sqliteDb) {
          // PostgreSQL mode - create record book
          const existingBooks = await db!.select().from(recordBooks).where(sql`${recordBooks.name} = ${tagInfo.name}`);
          if (existingBooks.length > 0) {
            bookId = existingBooks[0].id;
            // Delete existing records for re-import
            await db!.delete(records).where(sql`${records.recordBookId} = ${bookId}`);
          } else {
            const [newBook] = await db!.insert(recordBooks).values({
              name: tagInfo.name,
              description: `Imported from HyTek MDB (tag_ptr=${tagPtr})`,
              scope: tagInfo.scope,
              isActive: true,
              displayOrder: scopeDisplayOrder[tagInfo.scope] ?? 99,
            }).returning();
            bookId = newBook.id;
          }
          
          // Insert records for this book
          const recordBatch = [];
          for (const row of tagRecords) {
            const eventPtr = Number(row.event_ptr || 0);
            const eventInfo = eventNameByPtr.get(eventPtr);
            if (!eventInfo) continue;
            
            // Skip multi-event records — their performance values are point totals
            // (e.g. 6639 for heptathlon), not times, and would corrupt enrichment
            const multiEventTypes = ['decathlon', 'heptathlon', 'pentathlon', 'combined_event'];
            if (multiEventTypes.includes(eventInfo.eventType)) continue;
            
            const holder = String(row.Record_Holder || '').trim();
            if (!holder) continue;
            
            const team = String(row.Record_Holderteam || '').trim();
            const rawTime = Number(row.Record_Time || 0);
            const year = Number(row.Record_year || 0);
            const month = Number(row.Record_month || 1);
            const day = Number(row.Record_day || 1);
            const gender = String(row.tag_gender || '').trim().toUpperCase();
            
            // Convert HyTek time format (hundredths of seconds stored as float) to display format
            let performance: string;
            if (rawTime > 0) {
              const totalSeconds = rawTime;
              if (totalSeconds >= 60) {
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds - (minutes * 60);
                performance = `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
              } else {
                performance = totalSeconds.toFixed(2);
              }
            } else {
              performance = '0.00';
            }
            
            // Use short gender codes (M/F) to match events table format
            // Events table stores gender as 'M'/'F' from HyTek Event_sex field
            const recordGender = gender === 'M' ? 'M' : (gender === 'F' || gender === 'W') ? 'F' : gender;
            
            // Build date
            const recordDate = new Date(year > 0 ? year : 2000, month > 0 ? month - 1 : 0, day > 0 ? day : 1);
            
            recordBatch.push({
              recordBookId: bookId,
              eventType: eventInfo.eventType,
              gender: recordGender,
              performance,
              athleteName: holder,
              team: team || null,
              date: recordDate,
              location: null,
              wind: null,
              notes: `Event: ${eventInfo.name}`,
              verifiedBy: 'HyTek MDB Import',
            });
          }
          
          if (recordBatch.length > 0) {
            await db!.insert(records).values(recordBatch);
            recordsImported += recordBatch.length;
            console.log(`   ✅ Imported ${recordBatch.length} records for "${tagInfo.name}" (tag_ptr=${tagPtr})`);
          }
        } else {
          // SQLite/Edge mode
          sqliteDb.exec(`
            CREATE TABLE IF NOT EXISTS record_books (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              description TEXT,
              scope TEXT NOT NULL DEFAULT 'custom',
              is_active INTEGER DEFAULT 1,
              display_order INTEGER DEFAULT 99,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS records (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              record_book_id INTEGER NOT NULL REFERENCES record_books(id) ON DELETE CASCADE,
              event_type TEXT NOT NULL,
              gender TEXT NOT NULL,
              performance TEXT NOT NULL,
              athlete_name TEXT NOT NULL,
              team TEXT,
              date TEXT NOT NULL,
              location TEXT,
              wind TEXT,
              notes TEXT,
              verified_by TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          // Find or create record book
          let existingBook = sqliteDb.prepare('SELECT id FROM record_books WHERE name = ?').get(tagInfo.name);
          if (existingBook) {
            bookId = existingBook.id;
            sqliteDb.prepare('DELETE FROM records WHERE record_book_id = ?').run(bookId);
          } else {
            const result = sqliteDb.prepare('INSERT INTO record_books (name, description, scope, is_active, display_order) VALUES (?, ?, ?, 1, ?)').run(
              tagInfo.name, `Imported from HyTek MDB (tag_ptr=${tagPtr})`, tagInfo.scope, scopeDisplayOrder[tagInfo.scope] ?? 99
            );
            bookId = result.lastInsertRowid as number;
          }
          
          const insertRecordStmt = sqliteDb.prepare(`
            INSERT INTO records (record_book_id, event_type, gender, performance, athlete_name, team, date, notes, verified_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const insertRecords = sqliteDb.transaction((rows: any[]) => {
            for (const row of rows) {
              const eventPtr = Number(row.event_ptr || 0);
              const eventInfo = eventNameByPtr.get(eventPtr);
              if (!eventInfo) continue;
              
              // Skip multi-event records — their performance values are point totals
              // (e.g. 6639 for heptathlon), not times, and would corrupt enrichment
              const multiEventTypes = ['decathlon', 'heptathlon', 'pentathlon', 'combined_event'];
              if (multiEventTypes.includes(eventInfo.eventType)) continue;
              
              const holder = String(row.Record_Holder || '').trim();
              if (!holder) continue;
              
              const team = String(row.Record_Holderteam || '').trim();
              const rawTime = Number(row.Record_Time || 0);
              const year = Number(row.Record_year || 0);
              const month = Number(row.Record_month || 1);
              const day = Number(row.Record_day || 1);
              const gender = String(row.tag_gender || '').trim().toUpperCase();
              
              let performance: string;
              if (rawTime > 0) {
                const totalSeconds = rawTime;
                if (totalSeconds >= 60) {
                  const minutes = Math.floor(totalSeconds / 60);
                  const seconds = totalSeconds - (minutes * 60);
                  performance = `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
                } else {
                  performance = totalSeconds.toFixed(2);
                }
              } else {
                performance = '0.00';
              }
              
              // Use short gender codes (M/W) to match events table format
              const recordGender = gender === 'M' ? 'M' : (gender === 'F' || gender === 'W') ? 'W' : gender;
              const recordDate = `${year > 0 ? year : 2000}-${String(month > 0 ? month : 1).padStart(2, '0')}-${String(day > 0 ? day : 1).padStart(2, '0')}`;
              
              insertRecordStmt.run(bookId, eventInfo.eventType, recordGender, performance, holder, team || null, recordDate, `Event: ${eventInfo.name}`, 'HyTek MDB Import');
              recordsImported++;
            }
          });
          
          insertRecords(tagRecords);
          console.log(`   ✅ Imported records for "${tagInfo.name}" (tag_ptr=${tagPtr})`);
        }
      }
    }
    
    if (recordsImported > 0) {
      console.log(`   ✅ Total records imported: ${recordsImported}`);
    } else {
      console.log("   ⚠️  No records found to import");
    }
  } catch (error) {
    console.log("   ⚠️  RecordsbyEvent table not found or could not be read:", (error as Error).message);
  }

  console.log("\n✅ IMPORT COMPLETE!\n");
  console.log("Summary:");
  console.log(`  - Teams: ${stats.teams}`);
  console.log(`  - Divisions: ${stats.divisions}`);
  console.log(`  - Athletes: ${stats.athletes}`);
  console.log(`  - Events: ${stats.events}`);
  console.log(`  - Entries: ${stats.entries}`);
  console.log(`  - Records: ${recordsImported}`);
  
  return stats;
}

// CLI runner moved to tools/import-mdb-cli.ts to avoid bundling issues
// Run with: npx tsx tools/import-mdb-cli.ts <filePath> <meetId>
