import { translationService } from "../src/server/services/translationService.js";
import { adminSocialLinksPageTranslations } from "../src/lib/adminSocialLinksPageTranslations.js";

async function main() {
  const records = Object.entries(adminSocialLinksPageTranslations).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary).map(([key, value]) => ({ locale, key, value, group_name: "admin.social.page" }))
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({ updated: count, keys: Object.keys(adminSocialLinksPageTranslations.en).length, locales: Object.keys(adminSocialLinksPageTranslations), missingCounts: stats.missingCounts });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
