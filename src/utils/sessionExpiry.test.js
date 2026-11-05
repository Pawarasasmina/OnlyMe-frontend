import test from "node:test";
import assert from "node:assert/strict";
import { safeSessionReturnTo } from "./sessionExpiry.js";
test("expired sessions retain only safe local return paths", () => {
  assert.equal(safeSessionReturnTo("/profile/lucas?tab=seen"), "/profile/lucas?tab=seen");
  assert.equal(safeSessionReturnTo("https://evil.example"), "");
  assert.equal(safeSessionReturnTo("//evil.example"), "");
  assert.equal(safeSessionReturnTo("/login"), "");
});
