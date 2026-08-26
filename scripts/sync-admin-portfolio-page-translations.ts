import { translationService } from "../src/server/services/translationService.js";
import { adminPortfolioPageTranslations } from "../src/lib/adminPortfolioPageTranslations.js";
async function main() { const records=Object.entries(adminPortfolioPageTranslations).flatMap(([locale,dictionary])=>Object.entries(dictionary).map(([key,value])=>({locale,key,value,group_name:"admin.portfolio.page"}))); const count=await translationService.batchUpsert(records); const stats=await translationService.getStats(); console.log({updated:count,keys:Object.keys(adminPortfolioPageTranslations.en).length,locales:Object.keys(adminPortfolioPageTranslations),missingCounts:stats.missingCounts}); }
main().catch(error=>{console.error(error);process.exitCode=1;});
