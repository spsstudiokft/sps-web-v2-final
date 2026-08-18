import "dotenv/config";
import fs from "fs";
import path from "path";
import { setupDatabase, db } from "../src/db.js";
import { 
  enTranslations, 
  defaultLocales 
} from "../src/lib/translations.js";
import { translationService } from "../src/server/services/translationService.js";

interface AuditResult {
  codeKeys: Set<string>;
  fileMap: Map<string, string[]>;
  localeStats: Record<string, { total: number; missing: string[]; present: number }>;
  missingInAny: Set<string>;
  missingInDb: Record<string, string[]>;
}

function getAllFiles(dir: string, extensions = [".ts", ".tsx", ".js", ".jsx"]): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== "dist" &&
        entry.name !== ".git" &&
        entry.name !== ".next"
      ) {
        files = files.concat(getAllFiles(fullPath, extensions));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export async function runI18nAudit(): Promise<AuditResult> {
  console.log("==================================================");
  console.log("🔍 Running Comprehensive i18n Codebase Audit...");
  console.log("==================================================");

  await setupDatabase();

  const codeKeys = new Set<string>();
  const fileMap = new Map<string, string[]>();

  // 1. Scan codebase for translation keys
  const targetDirs = [path.resolve("./src"), path.resolve("./server.ts")];
  const allFiles: string[] = [];
  
  if (fs.existsSync("./src")) {
    allFiles.push(...getAllFiles("./src"));
  }
  if (fs.existsSync("./server.ts")) {
    allFiles.push("./server.ts");
  }

  // Robust regex patterns to capture translation keys matching both single and double quotes cleanly
  const patterns = [
    /tUi\(\s*"((?:[^"\\]|\\.)*)"/g,
    /tUi\(\s*'((?:[^'\\]|\\.)*)'/g,
    /\$t\(\s*"((?:[^"\\]|\\.)*)"/g,
    /\$t\(\s*'((?:[^'\\]|\\.)*)'/g,
    /i18n\.t\(\s*"((?:[^"\\]|\\.)*)"/g,
    /i18n\.t\(\s*'((?:[^'\\]|\\.)*)'/g,
  ];

  for (const file of allFiles) {
    // Skip translations file itself to only measure actual application consumption
    if (file.includes("translations.ts") || file.includes("i18n.ts")) continue;

    const content = fs.readFileSync(file, "utf-8");

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const rawKey = match[1];
        const key = rawKey.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
        // Ignore dynamic interpolation strings or invalid tokens
        if (key && !key.includes("${") && key.length > 1) {
          codeKeys.add(key);
          const currentFiles = fileMap.get(key) || [];
          if (!currentFiles.includes(file)) {
            currentFiles.push(file);
            fileMap.set(key, currentFiles);
          }
        }
      }
    }
  }

  console.log(`\n📁 Total source files scanned: ${allFiles.length}`);
  console.log(`🔑 Distinct translation keys extracted from code: ${codeKeys.size}`);

  // 2. Check each locale dictionary in translations.ts
  const supportedLocales = ["en", "hu", "de", "es", "fr"];
  const dictionaries: Record<string, Record<string, string>> = {
    en: enTranslations,
    hu: defaultLocales.hu || {},
    de: defaultLocales.de || {},
    es: defaultLocales.es || {},
    fr: defaultLocales.fr || {},
  };

  const localeStats: Record<string, { total: number; missing: string[]; present: number }> = {};
  const missingInAny = new Set<string>();

  // Also collect all master keys from code AND enTranslations
  const allMasterKeys = new Set<string>([...codeKeys, ...Object.keys(enTranslations)]);

  for (const loc of supportedLocales) {
    const dict = dictionaries[loc] || {};
    const missing: string[] = [];
    let present = 0;

    for (const key of allMasterKeys) {
      if (dict[key] !== undefined && dict[key] !== "") {
        present++;
      } else {
        missing.push(key);
        missingInAny.add(key);
      }
    }

    localeStats[loc] = {
      total: allMasterKeys.size,
      present,
      missing,
    };
  }

  // 3. Check DB status
  const dbDicts = await translationService.getAllDictionaries(true);
  const missingInDb: Record<string, string[]> = {};

  for (const loc of supportedLocales) {
    const dbDict = dbDicts[loc] || {};
    const missingKeys: string[] = [];

    for (const key of allMasterKeys) {
      if (dbDict[key] === undefined || dbDict[key] === "") {
        missingKeys.push(key);
      }
    }
    missingInDb[loc] = missingKeys;
  }

  console.log("\n📊 Locale Coverage in 'src/lib/translations.ts':");
  for (const loc of supportedLocales) {
    const st = localeStats[loc];
    const pct = ((st.present / st.total) * 100).toFixed(1);
    console.log(`  - [${loc.toUpperCase()}]: ${st.present} / ${st.total} keys (${pct}%) — Missing: ${st.missing.length}`);
  }

  console.log("\n🗄️ Database Translations Status:");
  for (const loc of supportedLocales) {
    const missing = missingInDb[loc] || [];
    console.log(`  - [${loc.toUpperCase()}]: In DB: ${allMasterKeys.size - missing.length} / ${allMasterKeys.size} — Missing: ${missing.length}`);
  }

  const missingDetails = new Set<string>();
  for (const loc of supportedLocales) {
    for (const key of localeStats[loc].missing) missingDetails.add(`[file:${loc}] ${key}`);
    for (const key of missingInDb[loc]) missingDetails.add(`[db:${loc}] ${key}`);
  }
  if (missingDetails.size > 0) {
    console.log("\n⚠️ Missing translation details:");
    for (const item of Array.from(missingDetails).sort()) console.log(`  - ${item}`);
  }

  const getTokens = (value: string | undefined): string[] =>
    Array.from(String(value || "").matchAll(/\{([A-Za-z0-9_]+)\}/g), (m) => m[1]).sort();
  const tokenIssues: string[] = [];
  const suspiciousJsonValues: string[] = [];

  for (const key of allMasterKeys) {
    const expectedTokens = getTokens(dictionaries.en[key]);
    for (const loc of supportedLocales) {
      const fileValue = dictionaries[loc]?.[key];
      const dbValue = dbDicts[loc]?.[key];
      if (fileValue !== undefined && getTokens(fileValue).join("|") !== expectedTokens.join("|")) {
        tokenIssues.push(`[file:${loc}] ${key}: expected {${expectedTokens.join(",")}}, got {${getTokens(fileValue).join(",")}}`);
      }
      if (dbValue !== undefined && getTokens(dbValue).join("|") !== expectedTokens.join("|")) {
        tokenIssues.push(`[db:${loc}] ${key}: expected {${expectedTokens.join(",")}}, got {${getTokens(dbValue).join(",")}}`);
      }
      for (const [source, value] of [["file", fileValue], ["db", dbValue]] as const) {
        const trimmed = String(value || "").trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") suspiciousJsonValues.push(`[${source}:${loc}] ${key}`);
          } catch {}
        }
      }
    }
  }

  console.log(`\n🧩 Placeholder token issues: ${tokenIssues.length}`);
  for (const issue of tokenIssues) console.log(`  - ${issue}`);
  console.log(`\n🧪 JSON-shaped translation values: ${suspiciousJsonValues.length}`);
  for (const issue of suspiciousJsonValues) console.log(`  - ${issue}`);

  return {
    codeKeys,
    fileMap,
    localeStats,
    missingInAny,
    missingInDb,
  };
}

if (process.argv[1] && process.argv[1].endsWith("audit-i18n.ts")) {
  runI18nAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Audit failed:", err);
      process.exit(1);
    });
}
