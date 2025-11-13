import { readFileSync } from "fs";
import MDBReader from "mdb-reader";
import { db } from "./db";
import { meets, teams, divisions, athletes, events, entries, entrySplits } from "@shared/schema";

export interface ImportStatistics {
  teams: number;
  divisions: number;
  athletes: number;
  events: number;
  entries: number;
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
      teamBatch.push({
        meetId,
        teamNumber: row.Team_no,
        name: row.Team_name || "Unknown Team",
        shortName: row.Team_short || null,
        abbreviation: row.Team_abbr?.trim() || null,
      });
    }
    
    if (teamBatch.length > 0) {
      const insertedTeams = await db.insert(teams).values(teamBatch).returning();
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
      divisionBatch.push({
        meetId,
        divisionNumber: row.Div_no,
        name: row.Div_name || "Unknown Division",
        abbreviation: row.Div_abbr?.trim() || null,
        lowAge: row.low_age || null,
        highAge: row.high_age || null,
      });
    }
    
    if (divisionBatch.length > 0) {
      const insertedDivisions = await db.insert(divisions).values(divisionBatch).returning();
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
      const athleteBatch = batch.map((row) => ({
        meetId,
        athleteNumber: row.Ath_no,
        firstName: row.First_name || "",
        lastName: row.Last_name || "",
        teamId: teamIdMap.get(row.Team_no) || null,
        divisionId: divisionIdMap.get(row.Div_no) || null,
        bibNumber: row.Comp_no ? String(row.Comp_no) : null,
        gender: row.Ath_Sex || null,
      }));
      
      const insertedAthletes = await db.insert(athletes).values(athleteBatch).returning();
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
  try {
    const eventTable = reader.getTable("Event");
    const eventData = eventTable.getData();
    const eventBatch = [];
    
    for (const row of eventData) {
      const eventNum = row.Event_no;
      const distance = row.Event_dist || null;
      const gender = row.Event_sex || row.Event_gender || "M";
      const trkField = row.Trk_Field || "T"; // T = Track, F = Field
      
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
      
      eventBatch.push({
        meetId,
        eventNumber: eventNum,
        name: `Event ${eventNum}`,
        eventType,
        gender,
        distance,
        status: "scheduled",
        numRounds: row.Event_rounds || 1,
        numLanes: row.Num_finlanes || 8,
      });
    }
    
    if (eventBatch.length > 0) {
      const insertedEvents = await db.insert(events).values(eventBatch).returning();
      insertedEvents.forEach((event) => {
        eventIdMap.set(event.eventNumber, event.id);
      });
      stats.events = insertedEvents.length;
      console.log(`   ✅ Imported ${insertedEvents.length} events`);
      console.log(`   📊 Track events: ${eventBatch.filter(e => !e.eventType.includes('jump') && !e.eventType.includes('throw')).length}`);
      console.log(`   📊 Field events: ${eventBatch.filter(e => e.eventType.includes('jump') || e.eventType.includes('throw')).length}`);
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
        const eventId = eventIdMap.get(row.Event_ptr);
        const athleteId = athleteIdMap.get(row.Ath_no);
        
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
        
        // Get teamId from the athlete's Team_no in the Entry row
        const teamId = row.Team_no ? teamIdMap.get(row.Team_no) || null : null;
        
        entryBatch.push({
          eventId,
          athleteId,
          teamId,
          divisionId: divisionIdMap.get(row.Div_no) || null,
          
          // Registration
          seedMark: row.ActualSeed_time || null,
          resultType,
          
          // Preliminary round
          preliminaryHeat: row.Pre_heat || null,
          preliminaryLane: row.Pre_lane || null,
          preliminaryMark: row.Pre_Time || null,
          preliminaryPlace: row.Pre_place || null,
          preliminaryWind: row.Pre_wind || null,
          
          // Quarterfinal round
          quarterfinalHeat: row.Qtr_heat || null,
          quarterfinalLane: row.Qtr_lane || null,
          quarterfinalMark: row.Qtr_Time || null,
          quarterfinalPlace: row.Qtr_place || null,
          quarterfinalWind: row.Qtr_wind || null,
          
          // Semifinal round
          semifinalHeat: row.Sem_heat || null,
          semifinalLane: row.Sem_lane || null,
          semifinalMark: row.Sem_Time || null,
          semifinalPlace: row.Sem_place || null,
          semifinalWind: row.Sem_wind || null,
          
          // Final round
          finalHeat: row.Fin_heat || null,
          finalLane: row.Fin_lane || null,
          finalMark: row.Fin_Time || null,
          finalPlace: row.Fin_place || null,
          finalWind: row.Fin_wind || null,
          
          // Flags (proper boolean parsing)
          isDisqualified: row.dq_type !== null && row.dq_type !== undefined && row.dq_type !== "",
          isScratched: row.Scr_stat === true || row.Scr_stat === "Y" || row.Scr_stat === "y",
          
          notes: null,
        });
      }
      
      if (entryBatch.length > 0) {
        await db.insert(entries).values(entryBatch).onConflictDoNothing();
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
