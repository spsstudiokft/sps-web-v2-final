import fs from "fs";
import path from "path";
import { enTranslations, huTranslations, deTranslations, esTranslations, frTranslations } from "../src/lib/translations.js";
import { newKeyAdditions } from "./new-translations.js";

// Merge
const updatedEn: Record<string, string> = { ...enTranslations };
const updatedHu: Record<string, string> = { ...huTranslations };
const updatedDe: Record<string, string> = { ...deTranslations };
const updatedEs: Record<string, string> = { ...esTranslations };
const updatedFr: Record<string, string> = { ...frTranslations };

for (const [key, trans] of Object.entries(newKeyAdditions)) {
  updatedEn[key] = trans.en;
  updatedHu[key] = trans.hu;
  updatedDe[key] = trans.de;
  updatedEs[key] = trans.es;
  updatedFr[key] = trans.fr;
}

// Generate the TypeScript file content
function serializeDictionary(dict: Record<string, string>): string {
  const sortedKeys = Object.keys(dict).sort();
  const lines = sortedKeys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(dict[k])},`);
  return `{\n${lines.join("\n")}\n}`;
}

const fileContent = `export type TranslationDictionary = Record<string, string>;

export const enTranslations: TranslationDictionary = ${serializeDictionary(updatedEn)};

export const huTranslations: TranslationDictionary = ${serializeDictionary(updatedHu)};

export const deTranslations: TranslationDictionary = ${serializeDictionary(updatedDe)};

export const esTranslations: TranslationDictionary = ${serializeDictionary(updatedEs)};

export const frTranslations: TranslationDictionary = ${serializeDictionary(updatedFr)};

export const defaultLocales: Record<string, TranslationDictionary> = {
  en: enTranslations,
  hu: huTranslations,
  de: deTranslations,
  es: esTranslations,
  fr: frTranslations,
};
`;

fs.writeFileSync(path.resolve("./src/lib/translations.ts"), fileContent, "utf-8");
console.log("Successfully updated src/lib/translations.ts!");
console.log("New EN keys total:", Object.keys(updatedEn).length);
console.log("New HU keys total:", Object.keys(updatedHu).length);
console.log("New DE keys total:", Object.keys(updatedDe).length);
console.log("New ES keys total:", Object.keys(updatedEs).length);
console.log("New FR keys total:", Object.keys(updatedFr).length);
