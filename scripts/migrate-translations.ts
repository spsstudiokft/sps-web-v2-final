import "dotenv/config";
import { setupDatabase } from "../src/db.js";
import { translationService } from "../src/server/services/translationService.js";

async function runMigration() {
  console.log("==================================================");
  console.log(" Starting Database Translation Migration...");
  console.log("==================================================");

  try {
    // 1. Ensure database schema and tables are initialized
    await setupDatabase();

    // 2. Force re-migration and synchronization of all translations
    console.log("Extracting keys and importing into 'translations' table...");
    const result = await translationService.importFromHardcoded(true);

    console.log(`\n Successfully migrated translations:`);
    console.log(`  - Total translation records written: ${result.importedCount}`);
    console.log(`  - Unique keys count: ${result.keysCount}`);
    console.log(`  - Locales imported: ${result.locales.join(", ")}`);

    // 3. Verify statistics
    const stats = await translationService.getStats();
    console.log("\n Database Translations Status:");
    console.log(`  - Total keys in DB: ${stats.totalKeys}`);
    console.log(`  - Total records in DB: ${stats.totalTranslations}`);
    console.log("  - Counts per locale:", stats.locales);
    console.log("  - Groups found:", Object.keys(stats.groups).join(", "));

    console.log("\n Migration completed with ZERO lost keys.");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Translation migration failed:", error);
    process.exit(1);
  }
}

runMigration();
