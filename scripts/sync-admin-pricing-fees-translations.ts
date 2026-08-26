import { translationService } from "../src/server/services/translationService.js";
import { adminPricingFeesTranslations } from "../src/lib/adminPricingFeesTranslations.js";
async function main() { const records = Object.entries(adminPricingFeesTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.pricing.fees" }))); const count = await translationService.batchUpsert(records); const stats = await translationService.getStats(); console.log({ updated: count, keys: Object.keys(adminPricingFeesTranslations.en).length, locales: Object.keys(adminPricingFeesTranslations), missingCounts: stats.missingCounts }); }
main().catch((error) => { console.error(error); process.exitCode = 1; });
