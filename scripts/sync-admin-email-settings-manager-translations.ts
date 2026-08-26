import { translationService } from "../src/server/services/translationService.js";
import { adminEmailSettingsManagerTranslations } from "../src/lib/adminEmailSettingsManagerTranslations.js";
import { adminEmailTemplatesListTranslations } from "../src/lib/adminEmailTemplatesListTranslations.js";
import { adminEmailSenderTranslations } from "../src/lib/adminEmailSenderTranslations.js";
import { adminEmailTestingDnsTranslations } from "../src/lib/adminEmailTestingDnsTranslations.js";
import { adminEmailLogsPreviewTranslations } from "../src/lib/adminEmailLogsPreviewTranslations.js";
import { adminEmailRuntimeTranslations } from "../src/lib/adminEmailRuntimeTranslations.js";

async function main() {
  const sets = [
    adminEmailSettingsManagerTranslations,
    adminEmailTemplatesListTranslations,
    adminEmailSenderTranslations,
    adminEmailTestingDnsTranslations,
    adminEmailLogsPreviewTranslations,
    adminEmailRuntimeTranslations,
  ];
  const locales = ["en", "hu", "de", "es", "fr"];
  const merged = Object.fromEntries(
    locales.map((locale) => [
      locale,
      Object.assign({}, ...sets.map((set) => set[locale])),
    ]),
  );
  const records = Object.entries(merged).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary as Record<string, string>).map(([key, value]) => ({
      locale,
      key,
      value,
      group_name: "admin.email.settings",
    })),
  );
  const count = await translationService.batchUpsert(records);
  const stats = await translationService.getStats();
  console.log({
    updated: count,
    keys: Object.keys(merged.en).length,
    locales,
    missingCounts: stats.missingCounts,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
