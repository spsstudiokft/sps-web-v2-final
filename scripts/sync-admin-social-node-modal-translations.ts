import { translationService } from "../src/server/services/translationService.js";
import { adminSocialNodeModalTranslations } from "../src/lib/adminSocialNodeModalTranslations.js";

async function main() {
  const records = Object.entries(adminSocialNodeModalTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.social.modal" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminSocialNodeModalTranslations.en).length, locales: Object.keys(adminSocialNodeModalTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
