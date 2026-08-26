import fs from "node:fs";
import path from "node:path";

const roots = ["src/pages/admin", "src/components/admin"];
const ignoredText = /^(?:USD|EUR|HUF|GBP|CAD|CHF|AUD)(?:\s*\([^)]*\))?$|^[\d\s.,:+\-–—/#%()*]+$/;
const textPattern = />\s*([A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű][^<{\r\n]{2,})\s*</g;
const attributePattern = /\b(placeholder|title|aria-label)\s*=\s*(["'])([A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű][^"']{2,})\2/g;

type Finding = { file: string; line: number; kind: "text" | "attribute"; value: string };
const findings: Finding[] = [];

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

for (const file of roots.flatMap(walk)) {
  const source = fs.readFileSync(file, "utf8");
  for (const [pattern, kind] of [[textPattern, "text"], [attributePattern, "attribute"]] as const) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const value = (kind === "text" ? match[1] : match[3]).trim();
      if (!value || ignoredText.test(value)) continue;
      findings.push({ file: file.replaceAll("\\", "/"), line: source.slice(0, match.index).split("\n").length, kind, value });
    }
  }
}

const byFile = new Map<string, number>();
for (const finding of findings) byFile.set(finding.file, (byFile.get(finding.file) || 0) + 1);
console.log(`Admin static localization candidates: ${findings.length} in ${byFile.size} files`);
for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`${String(count).padStart(4)}  ${file}`);
if (process.argv.includes("--details")) for (const item of findings) console.log(`${item.file}:${item.line} [${item.kind}] ${item.value}`);
if (findings.length > 0) process.exitCode = 1;
