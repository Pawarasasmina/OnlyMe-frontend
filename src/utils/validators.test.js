import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUsername, validateUsernameFormat } from "./validators.js";

test("normalizes editable usernames", () => {
  assert.equal(normalizeUsername("@Creator.Name"), "creator.name");
});

test("validates username format and reserved words", () => {
  assert.equal(validateUsernameFormat("creator.name").valid, true);
  assert.equal(validateUsernameFormat("admin").reason, "reserved");
  assert.equal(validateUsernameFormat("bad handle").reason, "invalid");
  assert.equal(validateUsernameFormat(".bad").reason, "separator");
  assert.equal(validateUsernameFormat("ab").reason, "length");
});
