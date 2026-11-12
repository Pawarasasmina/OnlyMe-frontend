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
        if (["msg", "__msg", "t"].includes(path.node.callee.name) && path.parentPath.isCallExpression()) {
          const call = path.parentPath.node;
          if (call.callee.type === "MemberExpression" && call.callee.object.name === "repostService" && call.callee.property.name === "toggle" && call.arguments[2] === path.node) violations.push(`${file}:${path.node.loc.start.line}: API model name`);
        }
        if (path.node.callee.name !== "__systemMessage") return;
        const attribute = path.findParent(parent => parent.isJSXAttribute());
        if (["value", "defaultValue"].includes(attribute?.node.name.name)) violations.push(`${file}:${path.node.loc.start.line}: controlled value`);
        if (path.node.arguments[0]?.name === "feedback") violations.push(`${file}:${path.node.loc.start.line}: authored feedback`);
      },
    });
  }
  assert.deepEqual(violations, []);
});

test("system input labels and accessibility attributes use registered messages", () => {
  const violations = [];
  const textAttributes = new Set(["placeholder", "aria-label", "alt", "title", "label", "subtitle", "description", "emptyMessage", "loadingLabel", "confirmLabel", "cancelLabel", "helperText", "tooltip"]);
  const invariant = /^(?:@seen|Atseen|Seen|Seens|Direct Access|WhatsApp|Telegram|Instagram|Facebook|YouTube|Stripe|CSV|PDF|JSON|JPEG|PNG|WebP|MP4|AI|IBAN|SWIFT|UTC|PPM|ID|Email|E-mail|URL|OTP|Georgia|Consolas|Arial|Roboto|Inter|OAuth|RSS|API|HD|JPG|GPS|HTML|OK|Admin|Google|Apple)$/i;
  for (const file of filesIn("src").filter(file => file.endsWith(".jsx"))) {
    traverse(parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] }), {
      JSXAttribute(path) {
        const { name, value } = path.node;
        if (!textAttributes.has(name.name) || value?.type !== "StringLiteral") return;
        if (/[A-Za-z]{2}/.test(value.value) && !invariant.test(value.value) && !/^https?:\/\//.test(value.value)) violations.push(`${file}:${value.loc.start.line}: ${name.name}=${value.value}`);
      },
    });
  }
  assert.deepEqual(violations, []);
});
