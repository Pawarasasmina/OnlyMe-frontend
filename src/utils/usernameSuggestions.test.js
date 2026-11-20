import test from "node:test";
import assert from "node:assert/strict";
import { usernameSuggestions, usernameValidationError } from "./username.js";

test("username suggestions provide varied, unique, valid options", () => {
  const suggestions = usernameSuggestions("Maya", "Senanayake");
  assert.ok(suggestions.length >= 5);
  assert.equal(new Set(suggestions).size, suggestions.length);
  assert.ok(suggestions.includes("maya.senanayake"));
  assert.ok(suggestions.includes("mayasenanayake"));
  assert.ok(suggestions.includes("maya_senanayake"));
  assert.ok(suggestions.every(value => !usernameValidationError(value)));
});

test("username suggestions stay within the maximum length", () => {
  assert.ok(usernameSuggestions("Alexanderthegreat", "Verylongfamilynameindeed").every(value => value.length <= 30));
});
