import { readFileSync } from "fs";
import MDBReader from "mdb-reader";
import { db } from "./db";
import { athletes, events, meets } from "@shared/schema";

async function importMDB(filePath: string) {
  console.log(`Reading MDB file: ${filePath}`);
  
  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);
  
  const tableNames = reader.getTableNames();
  console.log("Available tables:", tableNames);
  
  // Import meet information (if exists)
  try {
    const meetTable = reader.getTable("Meet") || reader.getTable("MEET") || reader.getTable("meet");
    if (meetTable) {
      const meetData = meetTable.getData();
      console.log(`Found ${meetData.length} meet records`);
      
      for (const row of meetData) {
        await db.insert(meets).values({
          name: row.name || row.Name || row.NAME || "Unknown Meet",
          location: row.location || row.Location || row.LOCATION,
          date: row.date || row.Date || row.DATE || new Date(),
          trackLength: row.trackLength || row.TrackLength || row.TRACK_LENGTH || 400,
        }).onConflictDoNothing();
      }
      console.log("Meet data imported");
    }
  } catch (error) {
    console.log("No meet table found, skipping");
  }
  
  // Import athletes
  try {
    const athleteTable = reader.getTable("Athlete");
    const athleteData = athleteTable.getData();
    console.log(`Found ${athleteData.length} athlete records`);
    console.log("Sample athlete:", athleteData[0]);
    
    // Batch insert for better performance
    const batchSize = 100;
    const athleteValues = [];
    
    for (const row of athleteData) {
      const athleteId = row.Ath_no || row.ath_no || row.AthleteID || row.ID || 0;
      const firstName = row.First_name || row.First || row.FirstName || row.first || "";
      const lastName = row.Last_name || row.Last || row.LastName || row.last || "";
      const name = `${firstName} ${lastName}`.trim() || row.Name || "Unknown";
      
      athleteValues.push({
        athleteIdNumber: athleteId,
        name: name,
        bib: String(row.Comp_no || row.comp_no || row.Bib || row.bib || ""),
        team: row.Team_abbr || row.team_abbr || row.Team || row.team || null,
        country: row.Country || row.country || null,
      });
      
      // Insert in batches
      if (athleteValues.length >= batchSize) {
        await db.insert(athletes).values(athleteValues).onConflictDoNothing();
        console.log(`Imported ${athleteValues.length} athletes...`);
        athleteValues.length = 0; // Clear array
      }
    }
    
    // Insert remaining athletes
    if (athleteValues.length > 0) {
      await db.insert(athletes).values(athleteValues).onConflictDoNothing();
      console.log(`Imported final ${athleteValues.length} athletes`);
    }
    
    console.log("Athletes imported successfully");
  } catch (error) {
    console.error("Error importing athletes:", error);
  }
  
  // Import events
  try {
    const eventTable = reader.getTable("Event");
    const eventData = eventTable.getData();
    console.log(`Found ${eventData.length} event records`);
    console.log("Sample event:", eventData[0]);
    
    const eventValues = [];
    
    for (const row of eventData) {
      // Map event type from database
      const eventNum = row.Event_no || row.event_no || row.EventNum || row.ID || 0;
      const eventName = row.Event_name || row.event_name || row.Name || `Event ${eventNum}`;
      
      // Try to extract event type from name or use default
      let eventType = "100m";
      if (eventName.includes("100") && eventName.includes("Hurdles")) eventType = "110m_hurdles";
      else if (eventName.includes("400") && eventName.includes("Hurdles")) eventType = "400m_hurdles";
      else if (eventName.includes("100")) eventType = "100m";
      else if (eventName.includes("200")) eventType = "200m";
      else if (eventName.includes("400")) eventType = "400m";
      else if (eventName.includes("800")) eventType = "800m";
      else if (eventName.includes("1500")) eventType = "1500m";
      else if (eventName.includes("3000")) eventType = "3000m";
      else if (eventName.includes("5000")) eventType = "5000m";
      else if (eventName.includes("10000")) eventType = "10000m";
      else if (eventName.includes("4x100")) eventType = "4x100m";
      else if (eventName.includes("4x400")) eventType = "4x400m";
      else if (eventName.toLowerCase().includes("high jump")) eventType = "high_jump";
      else if (eventName.toLowerCase().includes("long jump")) eventType = "long_jump";
      else if (eventName.toLowerCase().includes("triple jump")) eventType = "triple_jump";
      else if (eventName.toLowerCase().includes("pole vault")) eventType = "pole_vault";
      else if (eventName.toLowerCase().includes("shot put")) eventType = "shot_put";
      else if (eventName.toLowerCase().includes("discus")) eventType = "discus";
      else if (eventName.toLowerCase().includes("javelin")) eventType = "javelin";
      else if (eventName.toLowerCase().includes("hammer")) eventType = "hammer";
      
      // Determine gender from event sex field or event name
      let gender = "mixed";
      const sexField = row.Event_sex || row.Event_gender || "";
      if (sexField === "M" || sexField === "m") gender = "men";
      else if (sexField === "F" || sexField === "f" || sexField === "W" || sexField === "w") gender = "women";
      else if (eventName.toLowerCase().includes("men") || eventName.toLowerCase().includes("boy")) gender = "men";
      else if (eventName.toLowerCase().includes("women") || eventName.toLowerCase().includes("girl")) gender = "women";
      
      eventValues.push({
        eventNumber: eventNum,
        name: eventName,
        eventType: eventType,
        gender: gender,
        heat: row.Heat || row.heat || 1,
        round: row.Round || row.round || "Final",
        status: "scheduled",
      });
    }
    
    // Batch insert all events
    if (eventValues.length > 0) {
      await db.insert(events).values(eventValues).onConflictDoNothing();
      console.log(`Imported ${eventValues.length} events`);
    }
    
    console.log("Events imported successfully");
  } catch (error) {
    console.error("Error importing events:", error);
  }
  
  console.log("Import completed!");
}

export { importMDB };

// Run import if called directly
const filePath = process.argv[2] || "attached_assets/BisonOutdoorClassic2024_1762991318163.mdb";
importMDB(filePath)
  .then(() => {
    console.log("Import completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
