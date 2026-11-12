import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { filesIn } from "./audit.mjs";
const traverse = traverseModule.default;
const en = JSON.parse(fs.readFileSync("src/i18n/locales/en.json", "utf8"));
const aliases = JSON.parse(fs.readFileSync("src/i18n/aliases.json", "utf8"));
const registry = JSON.parse(fs.readFileSync("src/i18n/source-registry.json", "utf8"));
const existing = new Map(Object.entries(en).map(([key, text]) => [text, key]));
const displaySlots = /^(label|title|heading|copy|description|detail|note|text|subtitle)$/;
const allCopy = new Set(["helpSections", "termsSections"]);
let changed = 0;
for (const file of filesIn("src").filter(f => /\.[jt]sx?$/.test(f) && !/\.test\.|[\\/]i18n[\\/]|MockData/.test(f))) {
  const source = fs.readFileSync(file, "utf8"), ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const selected = new Map(), arrays = new Map();
  function select(p) {
    if (!p?.node) return;
    if (p.isStringLiteral()) {
      if (/[A-Za-z]{2}/.test(p.node.value)) selected.set(p.node.start, p);
    } else if (p.isConditionalExpression()) {
      select(p.get("consequent")); select(p.get("alternate"));
    } else if (p.isLogicalExpression()) select(p.get("right"));
  }
  traverse(ast, {
    CallExpression(p) {
      const n = p.node;
      if (/^(setError|setMessage|setNotice|setSuccess|setToast|showToast|notify|failActiveCall|normalizeApiError)$/.test(n.callee.name || "")) select(p.get("arguments.0"));
      if (n.callee.type !== "MemberExpression" || n.callee.property.name !== "map") return;
      const callback = p.get("arguments.0");
      const pattern = callback?.node?.params?.[0];
      if (pattern?.type !== "ArrayPattern") return;
      let array = p.get("callee.object");
      if (array.isIdentifier()) {
        const binding = array.scope.getBinding(array.node.name);
        if (binding?.path.isVariableDeclarator()) array = binding.path.get("init");
      }
      if (!array.isArrayExpression()) return;
      for (const row of array.get("elements")) {
        const cells = row.isArrayExpression() ? row : row.isCallExpression() && row.node.callee.name === "__uiTuple" ? row.get("arguments.0") : null;
        if (!cells?.isArrayExpression()) continue;
        pattern.elements.forEach((slot, index) => {
          if (slot?.type === "Identifier" && displaySlots.test(slot.name)) select(cells.get(`elements.${index}`));
        });
      }
    },
    VariableDeclarator(p) {
      if (allCopy.has(p.node.id.name)) p.get("init").traverse({ StringLiteral: select });
      if (p.node.id.name === "copy" && file.endsWith("WaysToEarnPage.jsx")) p.get("init").traverse({ StringLiteral: select });
    },
  });
  const edits = [];
  for (const p of selected.values()) {
    if (p.findParent(a => a.isCallExpression() && ["__msg", "msg", "t"].includes(a.node.callee.name))) continue;
    if (p.parentPath.isObjectProperty() && p.parentPath.node.key.name === "__uiMessage") continue;
    const text = p.node.value;
    const key = aliases[text] || existing.get(text) || `system.copy.${crypto.createHash("sha1").update(text).digest("hex").slice(0, 12)}`;
    en[key] = text; aliases[text] = key; registry[text] = key; existing.set(text, key);
    if (!p.getFunctionParent() && p.parentPath.isArrayExpression()) {
      edits.push([p.node.start, p.node.end, `{ __uiMessage: ${JSON.stringify(key)} }`]);
      if (!(p.parentPath.parentPath.isCallExpression() && p.parentPath.parentPath.node.callee.name === "__uiTuple")) arrays.set(p.parentPath.node.start, p.parentPath.node);
    } else edits.push([p.node.start, p.node.end, `__msg(${JSON.stringify(key)})`]);
  }
  if (!edits.length) continue;
  for (const array of arrays.values()) {
    edits.push([array.start, array.start, "__uiTuple("]);
    edits.push([array.end, array.end, ")"]);
  }
  let output = source;
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0] || b[1] - a[1])) output = output.slice(0, start) + text + output.slice(end);
  const rel = path.relative(path.dirname(file), "src/i18n/runtime.js").replaceAll("\\", "/");
  const specifier = JSON.stringify(rel.startsWith(".") ? rel : `./${rel}`);
  if (!source.includes("msg as __msg")) output = `import { msg as __msg } from ${specifier};\n${output}`;
  if (arrays.size && !source.includes("localizedTuple as __uiTuple")) output = `import { localizedTuple as __uiTuple } from ${specifier};\n${output}`;
  try { parse(output, { sourceType: "module", plugins: ["jsx"] }); } catch (error) { throw new Error(`${file}: ${error.message}`); }
  fs.writeFileSync(file, output); changed++;
}
for (const [file, data] of [["src/i18n/locales/en.json", en], ["src/i18n/aliases.json", aliases], ["src/i18n/source-registry.json", registry]]) fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ changed, keys: Object.keys(en).length }));
