import { readFileSync, writeFileSync } from "fs";
import MDBReader from "mdb-reader";

/**
 * Comprehensive HyTek .mdb database explorer
 * Generates a complete data dictionary showing all tables, columns, and sample data
 */

async function exploreMDB(filePath: string) {
  console.log('📖 HyTek Database Explorer');
  console.log('=' .repeat(80));
  console.log(`File: ${filePath}\n`);

  const buffer = readFileSync(filePath);
  const reader = new MDBReader(buffer);

  // Get all table names
  const tables = reader.getTableNames();
  console.log(`📊 Found ${tables.length} tables\n`);

  const dataDictionary: any = {
    file: filePath,
    analyzedAt: new Date().toISOString(),
    totalTables: tables.length,
    tables: {}
  };

  // Analyze each table
  for (const tableName of tables) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TABLE: ${tableName}`);
    console.log('='.repeat(80));
    
    try {
      const table = reader.getTable(tableName);
      const data = table.getData();
      const columns = table.getColumnNames();
      
      console.log(`Rows: ${data.length}`);
      console.log(`Columns: ${columns.length}`);
      console.log(`\nColumn Names:`);
      columns.forEach((col, idx) => {
        console.log(`  ${idx + 1}. ${col}`);
      });
      
      // Analyze column types from first few rows
      const columnTypes: { [key: string]: Set<string> } = {};
      const columnSamples: { [key: string]: any[] } = {};
      
      columns.forEach(col => {
        columnTypes[col] = new Set();
        columnSamples[col] = [];
      });
      
      // Sample first 10 rows to understand data types and values
      const sampleSize = Math.min(10, data.length);
      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        columns.forEach(col => {
          const value = row[col];
          const type = value === null ? 'null' : typeof value;
          columnTypes[col].add(value instanceof Date ? 'Date' : type);
          
          // Store unique sample values (up to 5)
          if (columnSamples[col].length < 5 && value !== null && value !== '') {
            if (!columnSamples[col].some(s => JSON.stringify(s) === JSON.stringify(value))) {
              columnSamples[col].push(value);
            }
          }
        });
      }
      
      // Print first row as complete sample
      if (data.length > 0) {
        console.log(`\n📝 Sample Row #1:`);
        console.log(JSON.stringify(data[0], null, 2));
      }
      
      // Show column type analysis
      console.log(`\n📊 Column Analysis:`);
      columns.forEach(col => {
        const types = Array.from(columnTypes[col]).join(' | ');
        const samples = columnSamples[col].slice(0, 3).map(v => {
          if (v instanceof Date) return v.toISOString();
          if (typeof v === 'string') return `"${v.substring(0, 50)}"`;
          return String(v);
        }).join(', ');
        
        console.log(`  ${col}:`);
        console.log(`    Types: ${types}`);
        if (samples) {
          console.log(`    Samples: ${samples}`);
        }
      });
      
      // Check for pointer fields (likely foreign keys)
      const pointerFields = columns.filter(c => 
        c.includes('_ptr') || c.includes('_no') || c.endsWith('_id')
      );
      
      if (pointerFields.length > 0) {
        console.log(`\n🔗 Potential Foreign Keys/Pointers:`);
        pointerFields.forEach(field => {
          const uniqueValues = new Set();
          data.slice(0, 100).forEach(row => {
            if (row[field] != null) uniqueValues.add(row[field]);
          });
          console.log(`  ${field}: ${uniqueValues.size} unique values (from first 100 rows)`);
        });
      }
      
      // Store in data dictionary
      dataDictionary.tables[tableName] = {
        rowCount: data.length,
        columns: columns.map(col => ({
          name: col,
          types: Array.from(columnTypes[col]),
          samples: columnSamples[col].slice(0, 3)
        })),
        sampleRow: data[0] || null,
        pointerFields
      };
      
    } catch (error: any) {
      console.error(`❌ Error analyzing table ${tableName}:`, error.message);
      dataDictionary.tables[tableName] = {
        error: error.message
      };
    }
  }

  // Save data dictionary to JSON file
  const outputPath = 'hytek-data-dictionary.json';
  writeFileSync(outputPath, JSON.stringify(dataDictionary, null, 2));
  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Data dictionary saved to: ${outputPath}`);
  console.log('='.repeat(80));

  // Print summary of key tables
  console.log(`\n📋 KEY TABLES SUMMARY:`);
  const keyTables = [
    'Session',
    'Event', 
    'EventRound',
    'Round',
    'Heat',
    'Lane',
    'Entry',
    'Result',
    'Athlete',
    'Team',
    'Relay',
    'Splits'
  ];

  keyTables.forEach(tableName => {
    if (dataDictionary.tables[tableName]) {
      const table = dataDictionary.tables[tableName];
      console.log(`  ✓ ${tableName}: ${table.rowCount} rows, ${table.columns?.length || 0} columns`);
    } else {
      console.log(`  ✗ ${tableName}: NOT FOUND`);
    }
  });

  console.log(`\n💡 Next Steps:`);
  console.log(`1. Review hytek-data-dictionary.json for complete schema`);
  console.log(`2. Identify the correct table relationships (pointer fields)`);
  console.log(`3. Update shared/schema.ts to match HyTek structure`);
  console.log(`4. Redesign import-mdb-complete.ts to extract from all relevant tables`);
}

const filePath = process.argv[2] || "uploads/8df8ab1108ac242e04c7ee9bcdc28bf1";
exploreMDB(filePath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
