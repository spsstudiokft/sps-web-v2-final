import { translationService } from "../src/server/services/translationService.js";
import { adminThemesTranslations } from "../src/lib/adminThemesTranslations.js";

async function main() {
  const records = Object.entries(adminThemesTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "themeManager" })));
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminThemesTranslations.en).length, locales: Object.keys(adminThemesTranslations), missingCounts: stats.missingCounts });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
