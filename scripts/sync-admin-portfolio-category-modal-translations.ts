import { translationService } from "../src/server/services/translationService.js";
import { adminPortfolioCategoryModalTranslations } from "../src/lib/adminPortfolioCategoryModalTranslations.js";

async function main() {
  const records = Object.entries(adminPortfolioCategoryModalTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.portfolio.category_modal" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminPortfolioCategoryModalTranslations.en).length, locales: Object.keys(adminPortfolioCategoryModalTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
