import fs from "node:fs";
import ts from "typescript";

const file = process.argv[2];
if (!file) throw new Error("Usage: remove-inline-i18n-fallbacks <tsx-file>");
const source = fs.readFileSync(file, "utf8");
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const edits: Array<{ start: number; end: number; text: string }> = [];

function containsTUi(node: ts.Node): boolean {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "tUi") return true;
  return node.getChildren(ast).some(containsTUi);
}
function visit(node: ts.Node) {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken && containsTUi(node.left) && (ts.isStringLiteral(node.right) || ts.isNoSubstitutionTemplateLiteral(node.right) || ts.isTemplateExpression(node.right))) {
    edits.push({ start: node.getStart(ast), end: node.getEnd(), text: node.left.getText(ast) });
    return;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
let output = source;
for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
fs.writeFileSync(file, output);
console.log(`Removed ${edits.length} inline translation fallbacks from ${file}.`);
