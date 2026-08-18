import fs from "fs";
import path from "path";
import { setupDatabase } from "../src/db.js";
import { 
  enTranslations, 
  huTranslations, 
  deTranslations, 
  esTranslations, 
  frTranslations 
} from "../src/lib/translations.js";

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

async function analyze() {
  const allFiles = getAllFiles("./src").concat(fs.existsSync("./server.ts") ? ["./server.ts"] : []);
  
  // Map of key -> { fallback: string, locations: string[] }
  const keyInfo: Record<string, { fallback?: string; occurrences: number; files: string[] }> = {};

  // Regex to match tUi("key", ...) || "Fallback String"
  // or tUi("key", ...) ?? "Fallback"
  const tUiCallRegex = /tUi\(\s*["']([^"'\r\n]+)["'](?:\s*,\s*[^,\)]+)?(?:\s*,\s*[^,\)]+)?(?:\s*,\s*[^,\)]+)?\s*\)(?:\s*(?:\|\||\?\?)\s*["']([^"'\r\n]+)["'])?/g;

  for (const file of allFiles) {
    if (file.includes("translations.ts")) continue;
    const content = fs.readFileSync(file, "utf-8");

    let match;
    while ((match = tUiCallRegex.exec(content)) !== null) {
      const key = match[1].trim();
      const fallback = match[2]?.trim();

      if (!keyInfo[key]) {
        keyInfo[key] = { occurrences: 0, files: [] };
      }
      keyInfo[key].occurrences++;
      if (!keyInfo[key].files.includes(file)) {
        keyInfo[key].files.push(file);
      }
      if (fallback && !keyInfo[key].fallback) {
        keyInfo[key].fallback = fallback;
      }
    }
  }

  // Also include all keys in enTranslations
  for (const [k, v] of Object.entries(enTranslations)) {
    if (!keyInfo[k]) {
      keyInfo[k] = { occurrences: 0, files: ["src/lib/translations.ts"] };
    }
    if (!keyInfo[k].fallback) {
      keyInfo[k].fallback = v;
    }
  }

  const allKeys = Object.keys(keyInfo).sort();
  console.log(`Found ${allKeys.length} total distinct translation keys.`);

  const missingInEn = allKeys.filter(k => !enTranslations[k]);
  const missingInHu = allKeys.filter(k => !huTranslations[k]);
  const missingInDe = allKeys.filter(k => !deTranslations[k]);
  const missingInEs = allKeys.filter(k => !esTranslations[k]);
  const missingInFr = allKeys.filter(k => !frTranslations[k]);

  console.log(`Missing in EN: ${missingInEn.length}`);
  console.log(`Missing in HU: ${missingInHu.length}`);
  console.log(`Missing in DE: ${missingInDe.length}`);
  console.log(`Missing in ES: ${missingInEs.length}`);
  console.log(`Missing in FR: ${missingInFr.length}`);

  // Save report to /scripts/missing-keys.json
  const report = {
    totalKeys: allKeys.length,
    missingInEn: missingInEn.map(k => ({ key: k, fallback: keyInfo[k].fallback || k, files: keyInfo[k].files })),
    missingInHu: missingInHu.map(k => ({ key: k, fallback: keyInfo[k].fallback || k })),
    missingInDe: missingInDe.map(k => ({ key: k, fallback: keyInfo[k].fallback || k })),
    missingInEs: missingInEs.map(k => ({ key: k, fallback: keyInfo[k].fallback || k })),
    missingInFr: missingInFr.map(k => ({ key: k, fallback: keyInfo[k].fallback || k })),
  };

  fs.writeFileSync("./scripts/missing-keys-report.json", JSON.stringify(report, null, 2));
  console.log("Saved report to scripts/missing-keys-report.json");
}

analyze();
