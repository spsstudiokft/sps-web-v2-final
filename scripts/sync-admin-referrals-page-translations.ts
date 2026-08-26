import { translationService } from "../src/server/services/translationService.js";
import { adminReferralsPageTranslations } from "../src/lib/adminReferralsPageTranslations.js";
import { adminReferralsOverviewTranslations } from "../src/lib/adminReferralsOverviewTranslations.js";
import { adminReferralsLogTranslations } from "../src/lib/adminReferralsLogTranslations.js";
import { adminReferralsRewardsTranslations } from "../src/lib/adminReferralsRewardsTranslations.js";
import { adminReferralsSettingsTranslations } from "../src/lib/adminReferralsSettingsTranslations.js";
import { adminReferralsModalsTranslations } from "../src/lib/adminReferralsModalsTranslations.js";
import { adminReferralsRuntimeTranslations } from "../src/lib/adminReferralsRuntimeTranslations.js";
async function main(){const sets=[adminReferralsPageTranslations,adminReferralsOverviewTranslations,adminReferralsLogTranslations,adminReferralsRewardsTranslations,adminReferralsSettingsTranslations,adminReferralsModalsTranslations,adminReferralsRuntimeTranslations];const merged=Object.fromEntries(["en","hu","de","es","fr"].map(locale=>[locale,Object.assign({},...sets.map(set=>set[locale]))]));const records=Object.entries(merged).flatMap(([locale,dictionary])=>Object.entries(dictionary as Record<string,string>).map(([key,value])=>({locale,key,value,group_name:"admin.referrals.page"})));const count=await translationService.batchUpsert(records);const stats=await translationService.getStats();console.log({updated:count,keys:Object.keys(merged.en).length,locales:Object.keys(merged),missingCounts:stats.missingCounts});}
main().catch(error=>{console.error(error);process.exitCode=1;});
