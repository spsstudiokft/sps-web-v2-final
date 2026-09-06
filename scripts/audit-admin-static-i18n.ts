import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = ["src/pages", "src/components"];
const localizedAttributes = new Set(["placeholder", "title", "aria-label", "alt"]);
const ignoredText = /^(?:USD|EUR|HUF|GBP|CAD|CHF|AUD|SPS STUDIO|PayPal|date|datetime-local)(?:\s*\([^)]*\))?$|^[\d\s.,:+\-–—/#%()*]+$/;
const ignoredFiles = new Set(["src/components/admin/ThemePreview.tsx"]);

type Finding = { file: string; line: number; kind: "text" | "attribute" | "expression"; value: string };
const findings: Finding[] = [];

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isCandidate(value: string): boolean {
  return value.length >= 2 && /[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]/.test(value) && !ignoredText.test(value);
}

function isInsideTranslationCall(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isCallExpression(current)) {
      const callee = current.expression.getText();
      if (callee === "tUi" || callee === "i18n.t" || callee === "$t" || callee === "t") return true;
    }
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) return false;
    current = current.parent;
  }
  return false;
}

for (const absoluteFile of roots.flatMap(walk)) {
  const file = absoluteFile.replaceAll("\\", "/");
  if (ignoredFiles.has(file)) continue;
  const source = fs.readFileSync(absoluteFile, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function add(node: ts.Node, kind: Finding["kind"], rawValue: string) {
    const value = normalize(rawValue);
    if (!isCandidate(value) || isInsideTranslationCall(node)) return;
    findings.push({ file, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind, value });
  }

  function inspect(node: ts.Node) {
    if (ts.isJsxText(node)) add(node, "text", node.text);
    if (ts.isJsxAttribute(node) && localizedAttributes.has(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer)) add(node, "attribute", node.initializer.text);
    if (ts.isJsxExpression(node) && node.expression) {
      if (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)) add(node, "expression", node.expression.text);
      if (ts.isConditionalExpression(node.expression)) {
        for (const branch of [node.expression.whenTrue, node.expression.whenFalse]) {
          if (ts.isStringLiteral(branch) || ts.isNoSubstitutionTemplateLiteral(branch)) add(branch, "expression", branch.text);
        }
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
}

const unique = [...new Map(findings.map((item) => [`${item.file}:${item.line}:${item.kind}:${item.value}`, item])).values()];
const byArea = new Map<string, number>();
const byFile = new Map<string, number>();
for (const finding of unique) {
  const area = finding.file.includes("/admin/") ? "admin" : finding.file.includes("/client/") ? "client" : "public/shared";
  byArea.set(area, (byArea.get(area) || 0) + 1);
  byFile.set(finding.file, (byFile.get(finding.file) || 0) + 1);
}

console.log(`Static localization candidates: ${unique.length} in ${byFile.size} files`);
for (const [area, count] of [...byArea].sort()) console.log(`${String(count).padStart(5)}  ${area}`);
for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`${String(count).padStart(5)}  ${file}`);
if (process.argv.includes("--details")) for (const item of unique) console.log(`${item.file}:${item.line} [${item.kind}] ${item.value}`);
if (unique.length > 0) process.exitCode = 1;
