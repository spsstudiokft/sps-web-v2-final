import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { defaultLocales } from "../src/lib/translations";

const roots = ["src/pages/admin", "src/components/admin"];
const ignored = /^(?:USD|EUR|HUF|GBP|CAD|CHF|AUD)(?:\s*\([^)]*\))?$|^[\d\s.,:+\-–—/#%()*]+$/;

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

const reverse = new Map<string, string[]>();
for (const [key, value] of Object.entries(defaultLocales.en)) {
  const normalized = normalize(String(value));
  reverse.set(normalized, [...(reverse.get(normalized) || []), key]);
}

let matched = 0;
let unmatched = 0;
const files = new Map<string, { matched: number; unmatched: number }>();
const keyUsage = new Map<string, Set<string>>();
for (const file of roots.flatMap(walk)) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const record = { matched: 0, unmatched: 0 };
  const usedKeys = new Set<string>();
  function inspect(node: ts.Node) {
    let value: string | undefined;
    if (ts.isJsxText(node)) value = normalize(node.text);
    if (ts.isJsxAttribute(node) && ["placeholder", "title", "aria-label"].includes(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      value = normalize(node.initializer.text);
    }
    if (value && value.length >= 3 && /[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]/.test(value) && !ignored.test(value)) {
      const keys = reverse.get(value);
      if (keys?.length) {
        matched += 1;
        record.matched += 1;
        if (process.argv.includes("--details")) console.log(`MATCH\t${file.replaceAll("\\", "/")}\t${value}\t${keys[0]}`);
      } else {
        unmatched += 1;
        record.unmatched += 1;
        if (process.argv.includes("--details")) console.log(`NEW\t${file.replaceAll("\\", "/")}\t${value}`);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "tUi" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      usedKeys.add(node.arguments[0].text);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
  if (record.matched || record.unmatched) files.set(file.replaceAll("\\", "/"), record);
  if (usedKeys.size) keyUsage.set(file.replaceAll("\\", "/"), usedKeys);
}

console.log(`Existing-key matches: ${matched}`);
console.log(`New-key candidates: ${unmatched}`);
for (const [file, counts] of [...files].sort((a, b) => (b[1].matched + b[1].unmatched) - (a[1].matched + a[1].unmatched))) {
  const keys = keyUsage.get(file) || new Set<string>();
  const incomplete = [...keys].filter((key) => ["en", "hu", "de", "es", "fr"].some((locale) => defaultLocales[locale]?.[key] === undefined));
  const fallback = [...keys].filter((key) => ["hu", "de", "es", "fr"].some((locale) => defaultLocales[locale]?.[key] === defaultLocales.en?.[key]));
  if (process.argv.includes("--details")) for (const key of fallback) console.log(`FALLBACK\t${file}\t${key}`);
  console.log(`${String(keys.size).padStart(4)} keys ${String(incomplete.length).padStart(4)} missing ${String(fallback.length).padStart(4)} fallback ${String(counts.unmatched).padStart(4)} static  ${file}`);
}

for (const [file, keys] of [...keyUsage].filter(([file]) => !files.has(file)).sort((a, b) => b[1].size - a[1].size)) {
  const incomplete = [...keys].filter((key) => ["en", "hu", "de", "es", "fr"].some((locale) => defaultLocales[locale]?.[key] === undefined));
  const fallback = [...keys].filter((key) => ["hu", "de", "es", "fr"].some((locale) => defaultLocales[locale]?.[key] === defaultLocales.en?.[key]));
  if (process.argv.includes("--details")) for (const key of fallback) console.log(`FALLBACK\t${file}\t${key}`);
  console.log(`${String(keys.size).padStart(4)} keys ${String(incomplete.length).padStart(4)} missing ${String(fallback.length).padStart(4)} fallback ${String(0).padStart(4)} static  ${file}`);
}
