import { translationService } from "../src/server/services/translationService.js";
import { adminPricingAddonsTranslations } from "../src/lib/adminPricingAddonsTranslations.js";
async function main() { const records = Object.entries(adminPricingAddonsTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: key.split(".").slice(0, 3).join(".") }))); const count = await translationService.batchUpsert(records); const stats = await translationService.getStats(); console.log({ updated: count, keys: Object.keys(adminPricingAddonsTranslations.en).length, locales: Object.keys(adminPricingAddonsTranslations), missingCounts: stats.missingCounts }); }
main().catch((error) => { console.error(error); process.exitCode = 1; });
