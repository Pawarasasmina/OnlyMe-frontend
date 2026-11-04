import test from "node:test";
import assert from "node:assert/strict";
import { isPlanet, worldCompleteness } from "./worldValidation.js";

const base = { title: "World", summary: "Summary", category: "Art", coverMedia: { secureUrl: "safe" }, planet: { emoji: "🌐" } };

test("free World allows one to seven fully open chapters", () => {
  const publication = { ...base, kind: "WORLD", pricing: { mode: "FREE", starsAmount: null }, chapters: [{ isPreview: true }, { isPreview: true }] };
  assert.deepEqual(worldCompleteness(publication), []);
  assert.ok(worldCompleteness({ ...publication, chapters: [{ isPreview: true }, { isPreview: false }] }).length);
  assert.ok(worldCompleteness({ ...publication, chapters: Array.from({ length: 8 }, () => ({ isPreview: true })) }).length);
});

test("Premium World accepts creator presets and stores at most one public story preview", () => {
  const publication = { ...base, kind: "PREMIUM_WORLD", pricing: { mode: "MONTHLY", starsAmount: 190 }, chapters: [{ isPreview: true }] };
  assert.deepEqual(worldCompleteness(publication), []);
  assert.deepEqual(worldCompleteness({ ...publication, pricing: { mode: "MONTHLY", starsAmount: 990 } }), []);
  assert.ok(worldCompleteness({ ...publication, pricing: { mode: "MONTHLY", starsAmount: 100 } }).length);
  assert.ok(worldCompleteness({ ...publication, chapters: [{ isPreview: false }] }).length);
  assert.ok(worldCompleteness({ ...publication, chapters: [{ isPreview: true }, { isPreview: true }] }).length);
  assert.equal(isPlanet(publication), true);
});
