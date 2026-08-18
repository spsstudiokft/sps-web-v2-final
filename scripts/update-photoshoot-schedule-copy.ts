import "dotenv/config";

import { getDb, setupDatabase } from "../src/db.js";
import { defaultLocales } from "../src/lib/translations.js";

const scheduleLabel = {
  en: "When I would like to schedule the photoshoot",
  hu: "Ekkor szeretném a fotózást kérni",
  de: "Wann ich das Fotoshooting buchen möchte",
  es: "Cuándo me gustaría solicitar la sesión de fotos",
  fr: "Quand je souhaite réserver la séance photo",
};

const scheduleHelp = {
  en: "Please specify your preferred date and time window for the photoshoot.",
  hu: "Kérjük, add meg a fotózás kívánt dátumát és időtartamát.",
  de: "Bitte geben Sie Ihr gewünschtes Datum und Zeitfenster für das Fotoshooting an.",
  es: "Indique la fecha y el horario que prefiere para la sesión de fotos.",
  fr: "Veuillez indiquer la date et la plage horaire souhaitées pour la séance photo.",
};

async function main() {
  await setupDatabase();
  const client = getDb();
  const translationKeys = [
    "admin.settings.form_availability_enable",
    "contact.availability_field",
    "contact.availability_help_default",
    "contact.when_contacted",
  ];

  const statements = [
    {
      sql: "UPDATE settings SET value = ? WHERE key = 'contact_form_availability_label'",
      args: [JSON.stringify(scheduleLabel)],
    },
    {
      sql: "UPDATE settings SET value = ? WHERE key = 'contact_form_availability_help_text'",
      args: [JSON.stringify(scheduleHelp)],
    },
    ...Object.entries(defaultLocales).flatMap(([locale, dictionary]) =>
      translationKeys.map((key) => ({
        sql: "UPDATE translations SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE locale = ? AND key = ?",
        args: [dictionary[key], locale, key],
      }))
    ),
  ];

  await client.batch(statements, "write");
  console.log("Updated the photoshoot scheduling copy in settings and translations.");
}

main().catch((error) => {
  console.error("Photoshoot scheduling copy update failed:", error);
  process.exitCode = 1;
});
