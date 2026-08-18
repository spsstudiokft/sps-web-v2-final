import fs from "fs";
import path from "path";
import { enTranslations } from "../src/lib/translations.js";

const enKeys = new Set(Object.keys(enTranslations));

// Recursively find all tsx/ts files in src
function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist") {
        getAllFiles(fullPath, fileList);
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      if (!file.includes("translations.ts") && !file.includes("test")) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const files = getAllFiles("./src");

const foundKeysInCode = new Set<string>();
const missingKeysFromEnDict: { file: string; key: string }[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");

  // Regex patterns to capture tUi("key"), t("key"), translationKey: "key", etc.
  const tUiMatches = content.matchAll(/tUi\(\s*["']([^"']+)["']/g);
  for (const m of tUiMatches) {
    const key = m[1];
    foundKeysInCode.add(key);
    if (!enKeys.has(key)) {
      missingKeysFromEnDict.push({ file, key });
    }
  }

  const tMatches = content.matchAll(/\bt\(\s*["']([a-zA-Z0-9_.-]+\.[a-zA-Z0-9_.-]+)["']/g);
  for (const m of tMatches) {
    const key = m[1];
    foundKeysInCode.add(key);
    if (!enKeys.has(key)) {
      missingKeysFromEnDict.push({ file, key });
    }
  }

  const transKeyMatches = content.matchAll(/translationKey:\s*["']([^"']+)["']/g);
  for (const m of transKeyMatches) {
    const key = m[1];
    foundKeysInCode.add(key);
    if (!enKeys.has(key)) {
      missingKeysFromEnDict.push({ file, key });
    }
  }
}

console.log("Total unique translation keys referenced in codebase:", foundKeysInCode.size);
console.log("Missing keys in enTranslations that are called in code:", missingKeysFromEnDict.length);
if (missingKeysFromEnDict.length > 0) {
  console.log("Details of missing keys:");
  for (const item of missingKeysFromEnDict) {
    console.log(`  - [${item.key}] in ${item.file}`);
  }
}
