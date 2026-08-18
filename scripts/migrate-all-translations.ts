import { getDb } from "../src/db";
import { translationService } from "../src/server/services/translationService";

async function run() {
  console.log("[Migration] Starting translation database synchronization...");
  const result = await translationService.importFromHardcoded(true);
  console.log(`[Migration] Completed! Total imported records: ${result.importedCount}, total unique keys: ${result.keysCount}`);

  const stats = await translationService.getStats();
  console.log("\n[Migration] Final Translation Stats in Database:");
  console.log(`- Total Unique Keys: ${stats.totalKeys}`);
  console.log(`- Total DB Records: ${stats.totalTranslations}`);
  console.log("- Counts per Locale:", stats.locales);
  console.log("- Missing counts per locale:", stats.missingCounts);

  const missingReport = await translationService.getMissingReport();
  console.log(`\n[Migration] Codebase Missing in DB: ${missingReport.missingInDb.length}`);
  if (missingReport.missingInDb.length > 0) {
    console.log("  Missing in DB:", missingReport.missingInDb);
  } else {
    console.log("  ALL codebase keys are 100% present in the database!");
  }
}

run().catch(console.error);
