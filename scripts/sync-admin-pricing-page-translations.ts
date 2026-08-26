import { translationService } from "../src/server/services/translationService.js";
import { adminPricingPageTranslations } from "../src/lib/adminPricingPageTranslations.js";
async function main() {
  const records = Object.entries(adminPricingPageTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: key.split(".").slice(0, 2).join(".") })));
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminPricingPageTranslations.en).length, locales: Object.keys(adminPricingPageTranslations), missingCounts: stats.missingCounts });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
