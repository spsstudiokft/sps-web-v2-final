import { translationService } from "../src/server/services/translationService.js";
import { adminProjectsTranslations } from "../src/lib/adminProjectsTranslations.js";

async function main() {
  const records = Object.entries(adminProjectsTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.projects" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminProjectsTranslations.en).length, locales: Object.keys(adminProjectsTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
