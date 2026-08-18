import "dotenv/config";

import { setupDatabase } from "../src/db.js";
import { translationService } from "../src/server/services/translationService.js";

async function main() {
  await setupDatabase();

  // Deliberately keep force=false: existing translations edited in the
  // translation manager remain untouched; only absent locale/key rows are added.
  const result = await translationService.importFromHardcoded(false);
  const stats = await translationService.getStats();

  console.log("Missing translations synchronized:", result);
  console.log("Translation database stats:", stats);
}

main().catch((error) => {
  console.error("Translation synchronization failed:", error);
  process.exitCode = 1;
});
