const fs = require("fs");
const path = require("path");

function walk(dir, fileList = []) {
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
    } else if (/\.(tsx?|jsx?|vue|html|json)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk("./src").concat(walk("./server.ts"));
const keysFound = new Set();
const keyOccurrences = {};

// Regex patterns to match tUi("..."), t("..."), __('...'), $t('...'), etc.
const patterns = [
  /\btUi\s*\(\s*["'`]?([a-zA-Z0-9_\-\.\s:?!\/]+)["'`]?/g,
  /\bt\s*\(\s*["'`]?([a-zA-Z0-9_\-\.\s:?!\/]+)["'`]?/g,
  /\b__\s*\(\s*["'`]?([a-zA-Z0-9_\-\.\s:?!\/]+)["'`]?/g,
  /\b\$t\s*\(\s*["'`]?([a-zA-Z0-9_\-\.\s:?!\/]+)["'`]?/g,
  /\btranslate\s*\(\s*["'`]?([a-zA-Z0-9_\-\.\s:?!\/]+)["'`]?/g
];

// Strict regex matching literal strings inside calls
const callRegexes = [
  /\btUi\s*\(\s*["']([^"'\n\r\\]+)["']/g,
  /\bt\s*\(\s*["']([a-zA-Z0-9_.-]+(?:\.[a-zA-Z0-9_.-]+)+)["']/g, // dotted keys
  /\b__\s*\(\s*["']([^"'\n\r\\]+)["']/g,
  /\b\$t\s*\(\s*["']([^"'\n\r\\]+)["']/g
];

for (const file of allFiles) {
  if (file.includes("translations.ts") || file.includes("i18n.ts") || file.includes("scan-translations")) continue;
  try {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of callRegexes) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1].trim();
        // Skip template variables, empty, long sentences or numbers
        if (key && !key.includes("${") && key.length < 150 && !/^\d+$/.test(key)) {
          // If it's t('...') and looks like a single plain English word like 'true' or 'id', skip unless dotted
          if (pattern.toString().includes("t\\s*\\(")) {
            // Only keep if dotted or clearly a translation key
            if (!key.includes(".")) continue;
          }
          keysFound.add(key);
          if (!keyOccurrences[key]) keyOccurrences[key] = [];
          keyOccurrences[key].push(file);
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

console.log("Total unique translation keys found across codebase in calls:", keysFound.size);

// Load lib/translations.ts to check existing keys in all locales
// Let's import or parse translations.ts
const translationsCode = fs.readFileSync("./src/lib/translations.ts", "utf8");

// Extract keys defined in enTranslations
const enKeys = new Set();
const huKeys = new Set();
const deKeys = new Set();
const esKeys = new Set();
const frKeys = new Set();

const keyRegex = /"([^"\\]+)":/g;
let m;
// Let's match within sections if possible
console.log("Translations.ts total length:", translationsCode.length);

const missingFromEn = [];
for (const key of Array.from(keysFound).sort()) {
  const checkStr = `"${key}":`;
  if (!translationsCode.includes(checkStr)) {
    missingFromEn.push(key);
  }
}

console.log("\nKeys found in code but missing from en dictionary in translations.ts:", missingFromEn.length);
console.log(missingFromEn);
