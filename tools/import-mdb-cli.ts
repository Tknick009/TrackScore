#!/usr/bin/env npx tsx
/**
 * CLI tool for importing HyTek MDB files
 * Usage: npx tsx tools/import-mdb-cli.ts <filePath> <meetId>
 * Example: npx tsx tools/import-mdb-cli.ts data.mdb abc123-def456-...
 */
import { importCompleteMDB } from "../server/import-mdb-complete";

const filePath = process.argv[2];
const meetId = process.argv[3];

if (!filePath || !meetId) {
  console.error("❌ Usage: npx tsx tools/import-mdb-cli.ts <filePath> <meetId>");
  console.error("Example: npx tsx tools/import-mdb-cli.ts data.mdb abc123-def456-...");
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
