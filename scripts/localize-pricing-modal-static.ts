import fs from "node:fs";
import ts from "typescript";

const file = process.argv[2] || "src/components/admin/PricingModal.tsx";
const keyPrefix = process.argv[3] || "admin.pricing.modal";
const outputPath = process.argv[4] || "src/lib/adminPricingModalTranslations.ts";
const exportName = process.argv[5] || "adminPricingModalTranslations";
const source = fs.readFileSync(file, "utf8");
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const ignored = /^(?:USD|EUR|HUF|GBP|CAD|CHF|AUD)(?:\s*\([^)]*\))?$|^[\d\s.,:+\-–—/#%()*]+$/;
const attributes = new Set(["placeholder", "title", "aria-label"]);
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const candidates = new Map<string, { key: string; ranges: Array<{ start: number; end: number }> }>();
const usedKeys = new Set<string>();

function slug(value: string) {
  const base = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 54) || "text";
  let key = `${keyPrefix}.${base}`;
  let suffix = 2;
  while (usedKeys.has(key)) key = `${keyPrefix}.${base}_${suffix++}`;
  usedKeys.add(key);
  return key;
}

function visit(node: ts.Node) {
  let value: string | undefined;
  let range: { start: number; end: number } | undefined;
  if (ts.isJsxText(node)) { value = normalize(node.text); range = { start: node.getStart(ast), end: node.getEnd() }; }
  if (ts.isJsxAttribute(node) && attributes.has(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer)) { value = normalize(node.initializer.text); range = { start: node.initializer.getStart(ast), end: node.initializer.getEnd() }; }
  if (value && range && value.length >= 3 && /[A-Za-z]/.test(value) && !ignored.test(value)) {
    const existing = candidates.get(value);
    if (existing) existing.ranges.push(range); else candidates.set(value, { key: slug(value), ranges: [range] });
  }
  ts.forEachChild(node, visit);
}
visit(ast);

async function translate(value: string, target: string) {
  if (process.env.LOCALIZE_KEYS_ONLY === "1") return value;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(value)}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      const body = await response.json() as any;
      return String((body?.[0] || []).map((part: any[]) => part?.[0] || "").join("") || value).replaceAll("&quot;", '"').replaceAll("&#39;", "'");
    }
    if (response.status !== 429 || attempt === 5) throw new Error(`Translation failed: ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return value;
}

async function main() {
  if (candidates.size === 0) throw new Error(`No static localization candidates found in ${file}.`);
  const locales: Record<string, Record<string, string>> = { en: {}, hu: {}, de: {}, es: {}, fr: {} };
  const entries = [...candidates.entries()];
  for (const [value, item] of entries) locales.en[item.key] = value;
  const tasks = entries.flatMap(([value, item]) => ["hu", "de", "es", "fr"].map((locale) => async () => { locales[locale][item.key] = await translate(value, locale); }));
  for (let index = 0; index < tasks.length; index += 2) {
    await Promise.all(tasks.slice(index, index + 2).map((task) => task()));
    if (process.env.LOCALIZE_KEYS_ONLY !== "1") await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const outputFile = `export const ${exportName}: Record<string, Record<string, string>> = ${JSON.stringify(locales, null, 2)};\n`;
  fs.writeFileSync(outputPath, outputFile);
  const edits = [...candidates.values()].flatMap((item) => item.ranges.map((range) => ({ ...range, text: `{tUi(${JSON.stringify(item.key)})}` })));
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  fs.writeFileSync(file, output);
  console.log(`Localized ${candidates.size} unique static strings in PricingModal.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
