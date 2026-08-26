import { translationService } from "../src/server/services/translationService.js";
import { adminPortfolioSortableItemTranslations } from "../src/lib/adminPortfolioSortableItemTranslations.js";

async function main() {
  const records = Object.entries(adminPortfolioSortableItemTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.portfolio.card" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminPortfolioSortableItemTranslations.en).length, locales: Object.keys(adminPortfolioSortableItemTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
