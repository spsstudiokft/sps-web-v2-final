import fs from "fs";
import path from "path";
import { enTranslations } from "../src/lib/translations.js";

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
const missingKeys = new Map<string, Set<string>>();

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const matches = [
    ...content.matchAll(/tUi\(\s*["'`]?([^"'`]+)["'`]?/g),
    ...content.matchAll(/\bt\(\s*["']([a-zA-Z0-9_.-]+)["']/g)
  ];
  for (const m of matches) {
    const key = m[1]?.trim();
    if (!key || key.includes("${") || key.length < 2) continue;
    // skip variable names or expressions
    if (key.includes(" ") && !key.includes(".")) {
      // it might be a literal fallback string passed to tUi
    }
    if (!(key in enTranslations)) {
      if (!missingKeys.has(key)) missingKeys.set(key, new Set());
      missingKeys.get(key)!.add(file);
    }
  }
}

console.log("Missing keys count:", missingKeys.size);
for (const [key, fileSet] of missingKeys.entries()) {
  console.log(`Key: "${key}" -> Used in: ${Array.from(fileSet).join(", ")}`);
}
