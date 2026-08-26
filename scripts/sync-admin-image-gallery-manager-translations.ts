import { translationService } from "../src/server/services/translationService.js";
import { adminImageGalleryManagerTranslations } from "../src/lib/adminImageGalleryManagerTranslations.js";

async function main() {
  const records = Object.entries(adminImageGalleryManagerTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.portfolio.gallery_manager" })));
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminImageGalleryManagerTranslations.en).length, locales: Object.keys(adminImageGalleryManagerTranslations), missingCounts: stats.missingCounts });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
