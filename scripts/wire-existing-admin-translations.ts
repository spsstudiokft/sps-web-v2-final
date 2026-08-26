import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { defaultLocales } from "../src/lib/translations";

const roots = ["src/pages/admin", "src/components/admin"];
const attributes = new Set(["placeholder", "title", "aria-label"]);
const ignored = /^(?:USD|EUR|HUF|GBP|CAD|CHF|AUD)(?:\s*\([^)]*\))?$|^[\d\s.,:+\-–—/#%()*]+$/;
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const quote = (value: string) => JSON.stringify(value);

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

function componentFor(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name && /^[A-Z]/.test(current.name.text)) return current;
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && current.parent && ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name) && /^[A-Z]/.test(current.parent.name.text)) return current;
    current = current.parent;
  }
}

const reverse = new Map<string, string>();
for (const [key, value] of Object.entries(defaultLocales.en)) {
  const normalized = normalize(String(value));
  const previous = reverse.get(normalized);
  if (!previous || (key.includes(".") && !previous.includes("."))) reverse.set(normalized, key);
}

let changedFiles = 0;
let replacements = 0;
for (const file of roots.flatMap(walk)) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const components = new Set<ts.FunctionLikeDeclaration>();

  function inspect(node: ts.Node) {
    let value: string | undefined;
    let range: { start: number; end: number } | undefined;
    let render: ((key: string) => string) | undefined;
    if (ts.isJsxText(node)) {
      value = normalize(node.text);
      range = { start: node.getStart(ast), end: node.getEnd() };
      render = (key) => `{tUi(${quote(key)})}`;
    } else if (ts.isJsxAttribute(node) && attributes.has(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      value = normalize(node.initializer.text);
      range = { start: node.initializer.getStart(ast), end: node.initializer.getEnd() };
      render = (key) => `{tUi(${quote(key)})}`;
    }
    if (value && range && render && value.length >= 3 && /[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]/.test(value) && !ignored.test(value)) {
      const key = reverse.get(value);
      const component = componentFor(node);
      if (key && component?.body && ts.isBlock(component.body)) {
        edits.push({ ...range, text: render(key) });
        components.add(component);
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
  if (!edits.length) continue;

  for (const component of components) {
    const body = component.body as ts.Block;
    const bodyText = source.slice(body.getStart(ast), body.getEnd());
    const hasTUiParameter = component.parameters.some((parameter) => /\btUi\b/.test(parameter.name.getText(ast)));
    if (!hasTUiParameter && !/\b(?:const|let|var)\s*\{[^}]*\btUi\b[^}]*\}\s*=\s*useLanguage\s*\(/s.test(bodyText)) {
      edits.push({ start: body.getStart(ast) + 1, end: body.getStart(ast) + 1, text: "\n  const { tUi } = useLanguage();" });
    }
  }

  if (!/from\s+["'][^"']*contexts\/LanguageContext["']/.test(source)) {
    const relative = path.relative(path.dirname(file), "src/contexts/LanguageContext").replaceAll("\\", "/");
    const specifier = relative.startsWith(".") ? relative : `./${relative}`;
    edits.push({ start: 0, end: 0, text: `import { useLanguage } from ${quote(specifier)};\n` });
  }

  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  fs.writeFileSync(file, output);
  changedFiles += 1;
  replacements += edits.length - components.size - (/from\s+["'][^"']*contexts\/LanguageContext["']/.test(source) ? 0 : 1);
}

console.log(`Wired ${replacements} existing translation usages across ${changedFiles} admin files.`);
