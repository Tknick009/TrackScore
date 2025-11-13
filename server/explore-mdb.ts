import { readFileSync } from "fs";
import MDBReader from "mdb-reader";

async function exploreMDB(filePath: string) {
  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);
  
  const tableNames = reader.getTableNames();
  console.log("=== MDB FILE STRUCTURE ===\n");
  
  // Explore key tables
  const keyTables = ["Event", "Athlete", "Entry", "Team", "Result", "Split", "Meet"];
  
  for (const tableName of tableNames) {
    try {
      const table = reader.getTable(tableName);
      const data = table.getData();
      const columnNames = table.getColumnNames();
      
      console.log(`\n📋 Table: ${tableName}`);
      console.log(`   Records: ${data.length}`);
      console.log(`   Columns: ${columnNames.join(", ")}`);
      
      if (data.length > 0 && keyTables.includes(tableName)) {
        console.log(`   Sample record:`, JSON.stringify(data[0], null, 2));
      }
    } catch (err) {
      console.log(`\n❌ Table: ${tableName} - Error: ${err}`);
    }
  }
}

const filePath = process.argv[2] || "attached_assets/BisonOutdoorClassic2024_1762991952128.mdb";
exploreMDB(filePath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
