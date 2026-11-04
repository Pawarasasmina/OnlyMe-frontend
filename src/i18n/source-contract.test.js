import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { filesIn } from "../../scripts/i18n/audit.mjs";

const traverse = traverseModule.default;

test("localization never rewrites controlled input values or authored moderation feedback", () => {
  const violations = [];
  for (const file of filesIn("src").filter(file => file.endsWith(".jsx"))) {
    const ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });
    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.name !== "__systemMessage") return;
        const attribute = path.findParent(parent => parent.isJSXAttribute());
        if (["value", "defaultValue"].includes(attribute?.node.name.name)) violations.push(`${file}:${path.node.loc.start.line}: controlled value`);
        if (path.node.arguments[0]?.name === "feedback") violations.push(`${file}:${path.node.loc.start.line}: authored feedback`);
      },
    });
  }
  assert.deepEqual(violations, []);
});
