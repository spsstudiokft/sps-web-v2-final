import { translationService } from "../src/server/services/translationService.js";
import { adminPortfolioModalStaticTranslations } from "../src/lib/adminPortfolioModalStaticTranslations.js";
import { adminPortfolioModalExistingTranslations } from "../src/lib/adminPortfolioModalExistingTranslations.js";
async function main() {
  const merged = Object.fromEntries(Object.keys(adminPortfolioModalStaticTranslations).map(locale => [locale, { ...adminPortfolioModalStaticTranslations[locale], ...adminPortfolioModalExistingTranslations[locale] }]));
  const records = Object.entries(merged).flatMap(([locale, dictionary]) => Object.entries(dictionary as Record<string,string>).map(([key,value]) => ({ locale,key,value,group_name:"admin.portfolio.modal" })));
  const count = await translationService.batchUpsert(records); const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(merged.en).length, locales: Object.keys(merged), missingCounts: stats.missingCounts });
}
main().catch(error => { console.error(error); process.exitCode=1; });
