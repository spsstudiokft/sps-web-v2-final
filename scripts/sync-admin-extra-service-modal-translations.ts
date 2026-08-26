import { translationService } from "../src/server/services/translationService.js";
import { adminExtraServiceModalTranslations } from "../src/lib/adminExtraServiceModalTranslations.js";

async function main() {
  const records = Object.entries(adminExtraServiceModalTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.pricing.extra_modal" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminExtraServiceModalTranslations.en).length, locales: Object.keys(adminExtraServiceModalTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
