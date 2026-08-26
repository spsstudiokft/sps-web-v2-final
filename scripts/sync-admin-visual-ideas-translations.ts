import { translationService } from "../src/server/services/translationService.js";
import { adminVisualIdeasTranslations } from "../src/lib/adminVisualIdeasTranslations.js";

async function main() {
  const records = Object.entries(adminVisualIdeasTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.visual_ideas" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminVisualIdeasTranslations.en).length, locales: Object.keys(adminVisualIdeasTranslations), missingCounts: stats.missingCounts });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
