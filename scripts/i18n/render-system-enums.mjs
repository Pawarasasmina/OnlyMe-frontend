// Render finite API codes in the selected language; leave stored values intact.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { filesIn } from "./audit.mjs";
const traverse = traverseModule.default;
const fields = new Set(["status", "kind", "visibility", "accessLevel", "moderationStatus", "reviewStatus", "paymentStatus", "role", "publicationType", "documentType", "contentType", "mediaType", "accountType", "settlementStatus", "approvalStatus"]);
let changed = 0;
for (const file of filesIn("src").filter(file => file.endsWith(".jsx") && !file.includes("i18n"))) {
  let source = fs.readFileSync(file, "utf8");
  const edits = [];
  traverse(parse(source, { sourceType: "module", plugins: ["jsx"] }), {
    JSXExpressionContainer(p) {
      if (p.parentPath.isJSXAttribute()) return;
      const n = p.node.expression;
      const raw = source.slice(n.start, n.end);
      const direct = ["MemberExpression", "OptionalMemberExpression"].includes(n.type) && fields.has(n.property.name);
      const formatted = ["CallExpression", "OptionalCallExpression"].includes(n.type) && ["MemberExpression", "OptionalMemberExpression"].includes(n.callee.type) && ["replace", "replaceAll"].includes(n.callee.property.name) && /\b(?:status|accessLevel|contentType|mediaType)\b/.test(raw);
      if (direct || formatted) edits.push([n.start, n.end, `__enumLabel(${raw})`]);
    },
  });
  if (!edits.length) continue;
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) source = source.slice(0, start) + text + source.slice(end);
  if (!source.includes("enumLabel as __enumLabel")) {
    const rel = path.relative(path.dirname(file), "src/i18n/runtime.js").replaceAll("\\", "/");
    source = `import { enumLabel as __enumLabel } from ${JSON.stringify(rel.startsWith(".") ? rel : `./${rel}`)};\n${source}`;
  }
  fs.writeFileSync(file, source);
  changed++;
}
console.log(`${changed} modules render localized system codes`);
