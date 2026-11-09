// Source migration only: never translate DOM contents, API values or controlled fields.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { filesIn, reason, normalize, textAttrs } from "./audit.mjs";

const traverse = traverseModule.default;
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const en = read("src/i18n/locales/en.json");
const aliases = read("src/i18n/aliases.json");
const registry = read("src/i18n/source-registry.json");
const existing = new Map(Object.entries(en).map(([key, text]) => [text, key]));
const excluded = /^(?:@seen|Atseen|Seen|Seens|Direct Access|WhatsApp|Telegram|Instagram|Facebook|YouTube|Stripe|CSV|PDF|JSON|JPEG|PNG|WebP|MP4|AI|IBAN|SWIFT|UTC|PPM|ID|Email|E-mail|URL|OTP|Georgia|Consolas|Arial|Roboto|Inter|OAuth|RSS|API|HD|JPG|GPS|HTML|OK|Admin|Google|Apple|English|Deutsch|Español|Português|Français|seen|G)$/;
function register(text, file) {
  const known = aliases[text] || existing.get(text) || registry[text];
  const key = known || `system.${path.basename(file).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z]/g, "")}.${crypto.createHash("sha1").update(text).digest("hex").slice(0, 10)}`;
  en[key] = text;
  aliases[text] = key;
  registry[text] = key;
  existing.set(text, key);
  return key;
}
const relative = (file, target) => {
  const value = path.relative(path.dirname(file), target).replaceAll("\\", "/");
  return JSON.stringify(value.startsWith(".") ? value : `./${value}`);
};
let changed = 0;
for (const file of filesIn("src").filter(file => /\.[jt]sx?$/.test(file) && !/\.test\.|[\\/]i18n[\\/]|atseenMockData|LanguageContext|uiLanguages|profileLanguages/.test(file))) {
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const edits = [];
  const add = (node, text) => edits.push({ start: node.start, end: node.end, text });
  const protectedPath = p => p.findParent(parent =>
    parent.isCallExpression() && ["__msg", "msg", "t", "label"].includes(parent.node.callee.name) ||
    parent.isJSXAttribute() && ["value", "defaultValue", "key", "id", "name", "className", "style", "to", "href", "src"].includes(parent.node.name.name));
  traverse(ast, {
    "JSXText|StringLiteral"(p) {
      if (protectedPath(p)) return;
      const kind = reason(p);
      if (!kind) return;
      const original = p.node.value, text = normalize(original);
      if (!/[a-zA-Z]{2}/.test(text) || excluded.test(text) || /^https?:|^data:|^\/|^[.#][\w-]+$/.test(text)) return;
      const parent = p.parentPath;
      if (kind === "copy-property" && p.findParent(a => a.isCallExpression() && /^(useState|setForm|setDraft|mutate|post|put|patch)$/.test(a.node.callee.name || a.node.callee.property?.name || ""))) return;
      const call = `__msg(${JSON.stringify(register(text, file))})`;
      if (kind === "copy-property" && !p.getFunctionParent()) {
        const property = parent.node;
        const key = source.slice(property.key.start, property.key.end);
        add(property, `get ${property.computed ? `[${key}]` : key}() { return ${call}; }`);
      } else if (kind === "jsx-text") {
        const leading = !original.includes("\n") && /^\s/.test(original) ? " " : "";
        const trailing = !original.includes("\n") && /\s$/.test(original) ? " " : "";
        add(p.node, `${leading}{${call}}${trailing}`);
      } else add(p.node, kind === "attribute" ? `{${call}}` : call);
    },
    TemplateLiteral(p) {
      if (protectedPath(p)) return;
      let out = p;
      while (out.parentPath?.isConditionalExpression() && out.key !== "test" || out.parentPath?.isLogicalExpression() && out.key === "right") out = out.parentPath;
      const parent = out.parentPath;
      const rendered = parent?.isJSXExpressionContainer() && (!parent.parentPath.isJSXAttribute() || textAttrs.has(parent.parentPath.node.name.name));
      const notification = parent?.isCallExpression() && /^(setError|setMessage|setNotice|setSuccess|setToast|showToast|notify|alert|confirm)$/.test(parent.node.callee.name || "");
      if (!rendered && !notification) return;
      const raw = p.node.quasis.map(q => q.value.cooked).join(" ");
      if (!/[A-Za-z]{2}/.test(raw)) return;
      let text = "";
      const values = [];
      p.node.quasis.forEach((q, i) => {
        text += (q.value.cooked || "").replaceAll("{", "'{' ").replaceAll("}", " '}'");
        if (i < p.node.expressions.length) {
          text += `{value${i}}`;
          const expr = p.node.expressions[i];
          values.push(`value${i}: ${source.slice(expr.start, expr.end)}`);
        }
      });
      add(p.node, `__msg(${JSON.stringify(register(text, file))}${values.length ? `, { ${values.join(", ")} }` : ""})`);
      p.skip();
    },
    CallExpression(p) {
      if (!["__msg", "msg", "t", "label"].includes(p.node.callee.name)) return;
      const first = p.node.arguments[0];
      if (first?.type === "StringLiteral" && !en[first.value] && !aliases[first.value] && /\s/.test(first.value)) register(first.value, file);
    },
  });
  if (!edits.length) continue;
  let output = source;
  let boundary = source.length + 1;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    if (edit.end > boundary) throw new Error(`Overlapping migration: ${file}:${edit.start}`);
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    boundary = edit.start;
  }
  if (!/\bmsg as __msg\b/.test(source)) output = `import { msg as __msg } from ${relative(file, "src/i18n/runtime.js")};\n${output}`;
  parse(output, { sourceType: "module", plugins: ["jsx"] });
  fs.writeFileSync(file, output);
  changed++;
}

// Bundled legal documents are system copy, not user-authored content.
const legal = read("src/components/auth/legalDocuments.json");
for (const document of Object.values(legal)) {
  document.titleKey = register(document.title, "legal");
  for (const section of document.sections) {
    section.titleKey = register(section.title, "legal");
    section.textKey = register(section.text, "legal");
  }
}
fs.writeFileSync("src/components/auth/legalDocuments.json", JSON.stringify(legal, null, 2) + "\n");
for (const [file, data] of [["src/i18n/locales/en.json", en], ["src/i18n/aliases.json", aliases], ["src/i18n/source-registry.json", registry]]) fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ changed, keys: Object.keys(en).length }));
