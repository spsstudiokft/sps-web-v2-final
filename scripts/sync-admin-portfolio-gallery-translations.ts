import { translationService } from "../src/server/services/translationService.js";
import { adminPortfolioGalleryTranslations } from "../src/lib/adminPortfolioGalleryTranslations.js";

async function main() {
  const records = Object.entries(adminPortfolioGalleryTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.portfolio.gallery" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminPortfolioGalleryTranslations.en).length, locales: Object.keys(adminPortfolioGalleryTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
