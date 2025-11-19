import { readFileSync } from "fs";
import MDBReader from "mdb-reader";
import { db } from "./db";
import { meets, teams, divisions, athletes, events, entries, entrySplits } from "@shared/schema";
import { sql } from "drizzle-orm";
import { parseComm1 } from "./parse-comm1";

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
}

export function generateEventName(mdbEvent: MDBEvent): string {
  // Normalize gender (handle uppercase, lowercase, and word variants)
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
  const stroke = mdbEvent.Event_stroke || "";
  const isRelay = (mdbEvent.Ind_rel || '').toString().toUpperCase() === 'R';
  
  if (isRelay) {
    if (distance === 400) return `${genderPrefix} 4x100m Relay`;
    if (distance === 800) return `${genderPrefix} 4x200m Relay`;
    if (distance === 1600) return `${genderPrefix} 4x400m Relay`;
    if (distance === 3200) return `${genderPrefix} 4x800m Relay`;
    return `${genderPrefix} ${distance}m Relay`;
  }
  
  if (distance === 0) {
    switch (stroke) {
      case "K": return `${genderPrefix} High Jump`;
      case "L": return `${genderPrefix} Long Jump`;
      case "M": return `${genderPrefix} Shot Put`;
      case "N": return `${genderPrefix} Discus`;
      case "O": return `${genderPrefix} Hammer`;
      case "P": return `${genderPrefix} Pole Vault`;
      case "Q": return `${genderPrefix} Javelin`;
      case "R": return `${genderPrefix} Triple Jump`;
      default: return `${genderPrefix} Field Event`;
    }
  }
  
  let eventTypeText = "";
  switch (stroke) {
    case "A":
      eventTypeText = "Dash";
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

export async function importCompleteMDB(filePath: string, meetId: string): Promise<ImportStatistics> {
  console.log(`\n=== IMPORTING MDB FILE: ${filePath} ===\n`);
  console.log(`📍 Target Meet ID: ${meetId}\n`);
  
  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);
  
  // ID mapping dictionaries (Access number → PostgreSQL UUID)
  const teamIdMap = new Map<number, string>();
  const divisionIdMap = new Map<number, string>();
  const athleteIdMap = new Map<number, string>();
  const eventIdMap = new Map<number, string>();
  
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
      const insertedTeams = await db.insert(teams).values(teamBatch)
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
      const insertedDivisions = await db.insert(divisions).values(divisionBatch)
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
      
      const insertedAthletes = await db.insert(athletes).values(athleteBatch)
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
  try {
    const meetRecord = await db.query.meets.findFirst({
      where: (meets, { eq }) => eq(meets.id, meetId)
    });
    if (meetRecord?.startDate) {
      meetStartDate = meetRecord.startDate;
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
    
    const eventBatch = [];
    let datesFound = 0;
    let timesFound = 0;
    let namesFound = 0;
    let ccTimesFound = 0;
    let comm1TimesFound = 0;
    let generatedNamesCount = 0;
    
    // Try to read Session table for scheduling information
    const sessionMap = new Map();
    try {
      console.log("\n📋 Attempting to read Session table...");
      const sessionTable = reader.getTable("Session");
      const sessionData = sessionTable.getData();
      
      // DEBUG: Log table info
      console.log(`   📊 Session table has ${sessionData.length} rows`);
      
      // DEBUG: If there's at least one row, show all available column names
      if (sessionData.length > 0) {
        const firstRow = sessionData[0];
        const columnNames = Object.keys(firstRow);
        console.log(`   📝 Available columns: ${columnNames.join(', ')}`);
        console.log(`   📝 Sample first row data:`, JSON.stringify(firstRow, null, 2));
      }
      
      // Create a map of event_ptr -> session data for quick lookup
      sessionData.forEach((session) => {
        // Use correct FinishLynx field names
        const eventPtr = session.Sess_ptr;
        if (eventPtr) {
          const sessionInfo = {
            sessDay: session.Sess_day ? Number(session.Sess_day) : null,
            time: null as string | null,
            name: session.Sess_name || null,
          };
          
          // Convert Sess_starttime (seconds since midnight) to readable time
          if (session.Sess_starttime != null) {
            const totalSeconds = Number(session.Sess_starttime);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            sessionInfo.time = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          }
          
          // Only add to map if we found something
          if (sessionInfo.time || sessionInfo.name || sessionInfo.sessDay) {
            sessionMap.set(eventPtr, sessionInfo);
          }
        }
      });
      
      console.log(`   ✅ Session table found, extracted ${sessionMap.size} session records`);
    } catch (sessionError) {
      console.log("   ⚠️  Session table not found, using Event table only");
    }
    
    // Track Event_ptr → Event_no mapping for building eventIdMap later
    const ptrToNumMap = new Map<number, number>();
    
    for (const row of eventData) {
      const eventNum = typeof row.Event_no === 'number' ? row.Event_no : Number(row.Event_no || 0);
      const eventPtr = typeof row.Event_ptr === 'number' ? row.Event_ptr : Number(row.Event_ptr || 0);
      
      // Track the mapping between Event_ptr and Event_no
      ptrToNumMap.set(eventPtr, eventNum);
      
      const distance = row.Event_dist ? Number(row.Event_dist) : null;
      const genderRaw = row.Event_sex || row.Event_gender || "M";
      const gender = String(genderRaw);
      const trkField = row.Trk_Field || "T"; // T = Track, F = Field
      
      // Extract HyTek event status and determine if results are locked
      const hytekStatusRaw = row.Event_status || row.Event_Status || row.STATUS || null;
      let hytekStatus: string | null = null;
      let isScored = false;
      
      if (hytekStatusRaw) {
        const statusStr = String(hytekStatusRaw).trim().toLowerCase();
        // Map HyTek status values to our enum
        if (statusStr === 'unseeded' || statusStr === 'un-seeded') {
          hytekStatus = 'unseeded';
        } else if (statusStr === 'seeded') {
          hytekStatus = 'seeded';
        } else if (statusStr === 'done') {
          hytekStatus = 'done';
          isScored = true; // Lock results when event is done
        } else if (statusStr === 'scored') {
          hytekStatus = 'scored';
          isScored = true; // Lock results when event is scored
        }
      }
      
      // Get session info for this event (if available) - use Event_ptr to match Sess_ptr
      const sessionInfo = sessionMap.get(eventPtr);
      
      // Determine event type from distance and track/field indicator
      let eventType = "100m"; // default
      
      if (trkField === "F") {
        // Field events - default to appropriate type
        eventType = "long_jump"; // Will need better logic here
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
      
      // Priority 5: Use event name from session or generate descriptive name
      if (sessionInfo?.name) {
        eventName = String(sessionInfo.name);
        namesFound++;
      } else {
        const rawEventName = row.Event_name || row.Event_desc || row.Event_description || row.Name || row.Description || null;
        // Check if raw name is meaningful (not just "Event N")
        const isGenericName = rawEventName && /^Event\s+\d+$/i.test(String(rawEventName).trim());
        
        if (rawEventName && !isGenericName) {
          eventName = String(rawEventName);
          namesFound++;
        } else {
          // Generate descriptive name from event data
          eventName = generateEventName(row);
          generatedNamesCount++;
          namesFound++;
        }
      }
      
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
        hytekStatus, // NEW: HyTek status from MDB
        isScored,    // NEW: Derived lock flag
      });
    }
    
    if (eventBatch.length > 0) {
      const insertedEvents = await db.insert(events).values(eventBatch)
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
            hytekStatus: sql`excluded.hytek_status`, // NEW
            isScored: sql`excluded.is_scored`,       // NEW
          }
        })
        .returning();
      
      // Build eventIdMap using Event_ptr as the key (not eventNumber)
      // This is critical because Entry table references events via Event_ptr
      insertedEvents.forEach((event) => {
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
    }
  } catch (error) {
    console.error("   ❌ Error importing events:", error);
  }
  
  // ===========================
  // 5. IMPORT ENTRIES (THE BIG ONE!)
  // ===========================
  console.log("\n🎯 Importing Entries (athlete-event registrations & results)...");
  
  // Get event details for result type determination
  const eventDetailsMap = new Map<string, { eventType: string }>();
  const allEvents = await db.query.events.findMany();
  allEvents.forEach((event) => {
    eventDetailsMap.set(event.id, { eventType: event.eventType });
  });
  
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
        let resultType = "time"; // default for track events
        if (eventDetails) {
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
          preliminaryPlace: row.Pre_place ? Number(row.Pre_place) : null,
          preliminaryWind: row.Pre_wind ? Number(row.Pre_wind) : null,
          
          // Quarterfinal round
          quarterfinalHeat: row.Qtr_heat ? Number(row.Qtr_heat) : null,
          quarterfinalLane: row.Qtr_lane ? Number(row.Qtr_lane) : null,
          quarterfinalMark: row.Qtr_Time ? Number(row.Qtr_Time) : null,
          quarterfinalPlace: row.Qtr_place ? Number(row.Qtr_place) : null,
          quarterfinalWind: row.Qtr_wind ? Number(row.Qtr_wind) : null,
          
          // Semifinal round
          semifinalHeat: row.Sem_heat ? Number(row.Sem_heat) : null,
          semifinalLane: row.Sem_lane ? Number(row.Sem_lane) : null,
          semifinalMark: row.Sem_Time ? Number(row.Sem_Time) : null,
          semifinalPlace: row.Sem_place ? Number(row.Sem_place) : null,
          semifinalWind: row.Sem_wind ? Number(row.Sem_wind) : null,
          
          // Final round
          finalHeat: row.Fin_heat ? Number(row.Fin_heat) : null,
          finalLane: row.Fin_lane ? Number(row.Fin_lane) : null,
          finalMark: row.Fin_Time ? Number(row.Fin_Time) : null,
          finalPlace: row.Fin_place ? Number(row.Fin_place) : null,
          finalWind: row.Fin_wind ? Number(row.Fin_wind) : null,
          
          // Flags (proper boolean parsing)
          isDisqualified: row.dq_type !== null && row.dq_type !== undefined && row.dq_type !== "",
          isScratched: row.Scr_stat === true || row.Scr_stat === "Y" || row.Scr_stat === "y",
          
          notes: null,
        });
      }
      
      if (entryBatch.length > 0) {
        // CRITICAL: Only update registration data, NEVER result data
        // This prevents MDB imports from overwriting timing system results
        await db.insert(entries).values(entryBatch)
          .onConflictDoUpdate({
            target: [entries.eventId, entries.athleteId],
            set: {
              // Update registration data only
              seedMark: sql`excluded.seed_mark`,
              resultType: sql`excluded.result_type`,
              teamId: sql`excluded.team_id`,
              divisionId: sql`excluded.division_id`,
              
              // Update heat/lane assignments (these may change before event starts)
              preliminaryHeat: sql`excluded.preliminary_heat`,
              preliminaryLane: sql`excluded.preliminary_lane`,
              quarterfinalHeat: sql`excluded.quarterfinal_heat`,
              quarterfinalLane: sql`excluded.quarterfinal_lane`,
              semifinalHeat: sql`excluded.semifinal_heat`,
              semifinalLane: sql`excluded.semifinal_lane`,
              finalHeat: sql`excluded.final_heat`,
              finalLane: sql`excluded.final_lane`,
              
              // DO NOT UPDATE: marks, places, wind readings - these come from timing system only
              // This ensures timing system results are never overwritten by MDB imports
            }
          });
        imported += entryBatch.length;
      }
      
      if ((i + batchSize) % 500 === 0 || i + batchSize >= entryData.length) {
        console.log(`   📝 Imported ${imported}/${entryData.length} entries...`);
      }
    }
    stats.entries = imported;
    console.log(`   ✅ Imported ${imported} entries`);
    if (skippedMissingAthlete > 0 || skippedMissingEvent > 0) {
      console.log(`   ⚠️  Skipped ${skippedMissingAthlete} entries (missing athlete), ${skippedMissingEvent} entries (missing event)`);
    }
  } catch (error) {
    console.error("   ❌ Error importing entries:", error);
  }
  
  console.log("\n✅ IMPORT COMPLETE!\n");
  console.log("Summary:");
  console.log(`  - Teams: ${stats.teams}`);
  console.log(`  - Divisions: ${stats.divisions}`);
  console.log(`  - Athletes: ${stats.athletes}`);
  console.log(`  - Events: ${stats.events}`);
  console.log(`  - Entries: ${stats.entries}`);
  
  return stats;
}

// Run import when executed directly (CLI mode)
// In ES modules, use import.meta.url to detect direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2] || "attached_assets/BisonOutdoorClassic2024_1762991952128.mdb";
  const meetId = process.argv[3];
  
  if (!meetId) {
    console.error("❌ Usage: tsx server/import-mdb-complete.ts <filePath> <meetId>");
    console.error("Example: tsx server/import-mdb-complete.ts data.mdb abc123-def456-...");
    process.exit(1);
  }
  
  importCompleteMDB(filePath, meetId)
    .then(() => {
      console.log("\n🎉 Import script finished successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Import failed:", err);
      process.exit(1);
    });
}
