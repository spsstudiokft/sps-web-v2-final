import { translationService } from "../src/server/services/translationService.js";
import { adminFeeRuleModalTranslations } from "../src/lib/adminFeeRuleModalTranslations.js";
async function main() { const records = Object.entries(adminFeeRuleModalTranslations).flatMap(([locale, dictionary]) => Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.pricing.fee_modal" }))); const count = await translationService.batchUpsert(records); const stats = await translationService.getStats(); console.log({ updated: count, keys: Object.keys(adminFeeRuleModalTranslations.en).length, locales: Object.keys(adminFeeRuleModalTranslations), missingCounts: stats.missingCounts }); }
main().catch((error) => { console.error(error); process.exitCode = 1; });
