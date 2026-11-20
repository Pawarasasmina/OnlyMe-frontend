import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { filesIn, normalize, reason } from "./audit.mjs";

const traverse = traverseModule.default;
const aliases = JSON.parse(fs.readFileSync("src/i18n/aliases.json", "utf8"));
const coverage = JSON.parse(fs.readFileSync("docs/i18n/coverage.json", "utf8"));
const audited = new Set(coverage.source.rawJsx.map(item => `${item.file.replaceAll("\\", "/")}:${item.text}`));
let changed = 0;

for (const file of filesIn("src").filter(file => /\.[jt]sx?$/.test(file) && !/\.test\.|[\\/]i18n[\\/]/.test(file))) {
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const edits = [];
  traverse(ast, {
    "JSXText|StringLiteral"(nodePath) {
      const kind = reason(nodePath);
      if (!kind) return;
      const original = nodePath.node.value;
      const text = normalize(original);
      if (!audited.has(`${file.replaceAll("\\", "/")}:${text}`) && !(kind === "attribute" && aliases[text])) return;
      const key = aliases[text];
      if (!key) return;
      const call = `__msg(${JSON.stringify(key)})`;
      if (kind === "jsx-text") {
        const leading = /^\s/.test(original) && !original.includes("\n") ? " " : "";
        const trailing = /\s$/.test(original) && !original.includes("\n") ? " " : "";
        edits.push({ start: nodePath.node.start, end: nodePath.node.end, value: `${leading}{${call}}${trailing}` });
      } else if (kind === "attribute") {
        edits.push({ start: nodePath.node.start, end: nodePath.node.end, value: `{${call}}` });
      }
    },
  });
  if (!edits.length) continue;
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
  if (!source.includes("msg as __msg")) {
    const runtime = path.relative(path.dirname(file), "src/i18n/runtime.js").replaceAll("\\", "/");
    output = `import { msg as __msg } from ${JSON.stringify(runtime.startsWith(".") ? runtime : `./${runtime}`)};\n${output}`;
  }
  parse(output, { sourceType: "module", plugins: ["jsx"] });
  fs.writeFileSync(file, output);
  changed += edits.length;
}

console.log(JSON.stringify({ migratedOccurrences: changed }));
