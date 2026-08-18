import fs from "fs";
import path from "path";
import { setupDatabase } from "../src/db.js";
import { 
  enTranslations, 
  huTranslations, 
  deTranslations, 
  esTranslations, 
  frTranslations, 
  defaultLocales 
} from "../src/lib/translations.js";
import { newTranslationsData } from "./new-translations-data.js";
import { translationService } from "../src/server/services/translationService.js";

// Common translation terms dictionary to provide authentic localized strings for missing keys in DE, ES, FR, HU
const commonLexicon: Record<string, { de: string; es: string; fr: string; hu: string }> = {
  "Dashboard": { de: "Übersicht", es: "Panel de Control", fr: "Tableau de bord", hu: "Vezérlőpult" },
  "Settings": { de: "Einstellungen", es: "Ajustes", fr: "Paramètres", hu: "Beállítások" },
  "Portfolios": { de: "Portfolios", es: "Portafolios", fr: "Portfolios", hu: "Portfóliók" },
  "Projects": { de: "Projekte", es: "Proyectos", fr: "Projets", hu: "Projektek" },
  "Galleries": { de: "Galerien", es: "Galerías", fr: "Galeries", hu: "Galériák" },
  "Clients": { de: "Kunden", es: "Clientes", fr: "Clients", hu: "Ügyfelek" },
  "Inquiries": { de: "Anfragen", es: "Consultas", fr: "Demandes", hu: "Érdeklődések" },
  "Save": { de: "Speichern", es: "Guardar", fr: "Enregistrer", hu: "Mentés" },
  "Cancel": { de: "Abbrechen", es: "Cancelar", fr: "Annuler", hu: "Mégse" },
  "Delete": { de: "Löschen", es: "Eliminar", fr: "Supprimer", hu: "Törlés" },
  "Edit": { de: "Bearbeiten", es: "Editar", fr: "Modifier", hu: "Szerkesztés" },
  "Create": { de: "Erstellen", es: "Crear", fr: "Créer", hu: "Létrehozás" },
  "Back": { de: "Zurück", es: "Atrás", fr: "Retour", hu: "Vissza" },
  "Loading...": { de: "Wird geladen...", es: "Cargando...", fr: "Chargement...", hu: "Betöltés..." },
  "Status": { de: "Status", es: "Estado", fr: "Statut", hu: "Állapot" },
  "Actions": { de: "Aktionen", es: "Acciones", fr: "Actions", hu: "Műveletek" },
  "Success": { de: "Erfolg", es: "Éxito", fr: "Succès", hu: "Siker" },
  "Error": { de: "Fehler", es: "Error", fr: "Erreur", hu: "Hiba" },
  "Search": { de: "Suchen", es: "Buscar", fr: "Rechercher", hu: "Keresés" },
  "Filter": { de: "Filtern", es: "Filtrar", fr: "Filtrer", hu: "Szűrés" },
};

async function buildCompleteTranslations() {
  console.log("==================================================");
  console.log("🛠️ Building Complete 5-Locale Translation Master...");
  console.log("==================================================");

  await setupDatabase();

  // Create mutable copies of each locale
  const mergedEn: Record<string, string> = { ...enTranslations };
  const mergedHu: Record<string, string> = { ...huTranslations };
  const mergedDe: Record<string, string> = { ...deTranslations };
  const mergedEs: Record<string, string> = { ...esTranslations };
  const mergedFr: Record<string, string> = { ...frTranslations };

  // 1. Merge the newly audited translation data
  for (const [key, trans] of Object.entries(newTranslationsData)) {
    mergedEn[key] = trans.en;
    mergedHu[key] = trans.hu;
    mergedDe[key] = trans.de;
    mergedEs[key] = trans.es;
    mergedFr[key] = trans.fr;
  }

  // 2. Identify all master keys
  const allMasterKeys = Array.from(
    new Set([
      ...Object.keys(mergedEn),
      ...Object.keys(mergedHu),
      ...Object.keys(mergedDe),
      ...Object.keys(mergedEs),
      ...Object.keys(mergedFr),
    ])
  ).sort();

  console.log(`Total Master Translation Keys to harmonize: ${allMasterKeys.length}`);

  // Helper translation rules for admin and specialized namespaces when missing in DE, ES, FR, HU
  function translateFallback(key: string, enVal: string, lang: "hu" | "de" | "es" | "fr"): string {
    if (!enVal) return key;

    // Check direct lexical match
    if (commonLexicon[enVal] && commonLexicon[enVal][lang]) {
      return commonLexicon[enVal][lang];
    }

    // Contextual translation mapping for admin templates & categories
    if (key.startsWith("admin.")) {
      if (key.includes(".th_") || key.includes(".tab_") || key.includes(".status_") || key.includes(".btn_")) {
        // Return English fallback for deep admin tooling when no translation exists
        return enVal;
      }
    }

    // Default to enVal as safe fallback
    return enVal;
  }

  // Ensure every key is populated in every locale
  let filledCount = 0;
  for (const key of allMasterKeys) {
    const enVal = mergedEn[key] || key;
    if (!mergedEn[key]) {
      mergedEn[key] = enVal;
      filledCount++;
    }

    if (!mergedHu[key] || mergedHu[key].trim() === "") {
      mergedHu[key] = translateFallback(key, enVal, "hu");
      filledCount++;
    }

    if (!mergedDe[key] || mergedDe[key].trim() === "") {
      mergedDe[key] = translateFallback(key, enVal, "de");
      filledCount++;
    }

    if (!mergedEs[key] || mergedEs[key].trim() === "") {
      mergedEs[key] = translateFallback(key, enVal, "es");
      filledCount++;
    }

    if (!mergedFr[key] || mergedFr[key].trim() === "") {
      mergedFr[key] = translateFallback(key, enVal, "fr");
      filledCount++;
    }
  }

  console.log(`Harmonized and filled ${filledCount} missing locale entries.`);

  // 3. Re-serialize src/lib/translations.ts
  const fileContent = `export interface TranslationDictionary {
  [key: string]: string;
}

export interface LocalePackage {
  code: string;
  name: string;
  translations: TranslationDictionary;
}

// Built-in English (default fallback)
export const enTranslations: TranslationDictionary = ${JSON.stringify(mergedEn, null, 2)};

// Hungarian (Magyar) Translations
export const huTranslations: TranslationDictionary = ${JSON.stringify(mergedHu, null, 2)};

// German (Deutsch) Translations
export const deTranslations: TranslationDictionary = ${JSON.stringify(mergedDe, null, 2)};

// Spanish (Español) Translations
export const esTranslations: TranslationDictionary = ${JSON.stringify(mergedEs, null, 2)};

// French (Français) Translations
export const frTranslations: TranslationDictionary = ${JSON.stringify(mergedFr, null, 2)};

// Supported Locales Map
export const defaultLocales: Record<string, TranslationDictionary> = {
  en: enTranslations,
  hu: huTranslations,
  de: deTranslations,
  es: esTranslations,
  fr: frTranslations,
};

export const supportedLocalesList: Array<{ code: string; name: string; nativeName: string; flag: string }> = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
];
`;

  fs.writeFileSync("./src/lib/translations.ts", fileContent, "utf-8");
  console.log("✅ Updated src/lib/translations.ts successfully!");

  // 4. Force batch upsert into SQLite database
  console.log("Importing complete translations into SQLite database 'translations' table...");
  const recordsToInsert: Array<{ locale: string; key: string; value: string; group_name?: string }> = [];

  const targetDicts: Record<string, Record<string, string>> = {
    en: mergedEn,
    hu: mergedHu,
    de: mergedDe,
    es: mergedEs,
    fr: mergedFr,
  };

  for (const [loc, dict] of Object.entries(targetDicts)) {
    for (const [key, val] of Object.entries(dict)) {
      recordsToInsert.push({
        locale: loc,
        key,
        value: val,
      });
    }
  }

  const insertedCount = await translationService.batchUpsert(recordsToInsert);
  console.log(`✅ Imported ${insertedCount} records for ${allMasterKeys.length} distinct keys into SQLite.`);

  // 5. Verify stats
  const stats = await translationService.getStats();
  console.log("\n📊 Final Database Statistics:");
  console.log(`  - Total Keys: ${stats.totalKeys}`);
  console.log(`  - Total Records: ${stats.totalTranslations}`);
  console.log("  - Locales:", stats.locales);
  console.log("  - Missing Counts:", stats.missingCounts);

  console.log("\n✨ Translation Master Build & Database Sync Complete!");
}

buildCompleteTranslations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to build translations:", err);
    process.exit(1);
  });
