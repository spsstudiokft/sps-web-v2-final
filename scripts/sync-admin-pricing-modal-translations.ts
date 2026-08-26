import { translationService } from "../src/server/services/translationService.js";
import { adminPricingModalTranslations } from "../src/lib/adminPricingModalTranslations.js";
async function main() {
  const records = Object.entries(adminPricingModalTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: key.split(".").slice(0, 2).join(".") })));
  const count = await translationService.batchUpsert(records); const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminPricingModalTranslations.en).length, locales: Object.keys(adminPricingModalTranslations), missingCounts: stats.missingCounts });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
