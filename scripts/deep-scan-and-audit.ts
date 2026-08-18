import fs from "fs";
import path from "path";
import { getDb } from "../src/db";
import { defaultLocales, enTranslations } from "../src/lib/translations";

function walk(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    fileList.push(dir);
    return fileList;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist" && file !== "build") {
        walk(filePath, fileList);
      }
    } else if (/\.(tsx?|jsx?|vue|html)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  const allFiles = walk("./src").concat(walk("./server.ts"));
  const keysFoundInCode = new Map<string, { files: string[]; sampleUsage: string }>();

  // Patterns
  const patterns: Array<{ regex: RegExp; name: string }> = [
    { regex: /\btUi\s*\(\s*(['"`])([^'"`\n\r]+)\1/g, name: "tUi" },
    { regex: /\b__\s*\(\s*(['"`])([^'"`\n\r]+)\1/g, name: "__" },
    { regex: /\b\$t\s*\(\s*(['"`])([^'"`\n\r]+)\1/g, name: "$t" },
    { regex: /\bt\s*\(\s*(['"`])([a-zA-Z0-9_.-]+(?:\.[a-zA-Z0-9_.-]+)+)\1/g, name: "t(dotted)" },
  ];

  for (const file of allFiles) {
    if (file.includes("translations.ts") || file.includes("i18n.ts") || file.includes("scripts/")) continue;
    try {
      const content = fs.readFileSync(file, "utf8");
      for (const { regex } of patterns) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const key = match[2].trim();
          if (key && !key.includes("${") && key.length < 200) {
            if (!keysFoundInCode.has(key)) {
              keysFoundInCode.set(key, { files: [file], sampleUsage: match[0] });
            } else {
              keysFoundInCode.get(key)!.files.push(file);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error reading file:", file, e);
    }
  }

  console.log(`\n=== 1. Codebase Scan Results ===`);
  console.log(`Total unique translation keys extracted from code: ${keysFoundInCode.size}`);

  // Compare against enTranslations / defaultLocales
  const enKeys = new Set(Object.keys(enTranslations));
  const missingFromCodeInEnDict: string[] = [];
  keysFoundInCode.forEach((meta, key) => {
    if (!enKeys.has(key)) {
      missingFromCodeInEnDict.push(key);
    }
  });

  console.log(`\nKeys found in code but missing from enTranslations in translations.ts: ${missingFromCodeInEnDict.length}`);
  console.log(missingFromCodeInEnDict);

  // Check DB keys
  const db = getDb();
  const dbRows = await db.execute("SELECT locale, key, value FROM translations");
  const dbKeysByLocale: Record<string, Set<string>> = {
    en: new Set(),
    hu: new Set(),
    de: new Set(),
    es: new Set(),
    fr: new Set(),
  };
  const allDbKeys = new Set<string>();

  for (const row of dbRows.rows) {
    const loc = String(row.locale).toLowerCase();
    const key = String(row.key);
    allDbKeys.add(key);
    if (dbKeysByLocale[loc]) {
      dbKeysByLocale[loc].add(key);
    }
  }

  console.log(`\n=== 2. Database Keys Audit ===`);
  console.log(`Total distinct keys in DB: ${allDbKeys.size}`);
  for (const loc of Object.keys(dbKeysByLocale)) {
    console.log(`Locale '${loc}' keys in DB: ${dbKeysByLocale[loc].size}`);
  }

  // Find keys used in code but missing in DB
  const missingFromCodeInDb: string[] = [];
  keysFoundInCode.forEach((meta, key) => {
    if (!allDbKeys.has(key)) {
      missingFromCodeInDb.push(key);
    }
  });
  console.log(`\nKeys used in code but missing in DB: ${missingFromCodeInDb.length}`);
  console.log(missingFromCodeInDb);

  // Find keys in DB missing in one or more locales
  console.log(`\n=== 3. Missing Keys Per Locale in DB ===`);
  for (const loc of Object.keys(dbKeysByLocale)) {
    const missing: string[] = [];
    allDbKeys.forEach((key) => {
      if (!dbKeysByLocale[loc].has(key)) {
        missing.push(key);
      }
    });
    console.log(`Locale '${loc}' missing ${missing.length} keys out of ${allDbKeys.size} DB keys`);
    if (missing.length > 0 && missing.length <= 20) {
      console.log(`  Sample missing for ${loc}:`, missing);
    }
  }
}

main().catch(console.error);
