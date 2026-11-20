import test from "node:test";
import assert from "node:assert/strict";
import { wallEditMinutesRemaining } from "./wallEditTime.js";
const now = Date.parse("2026-11-20T10:00:00Z");
test("Wall edit countdown is capped at 15 minutes with future server timestamps or stale clocks", () => {
  assert.equal(wallEditMinutesRemaining({ publishedAt: new Date(now + 30000).toISOString() }, now), 15);
  assert.equal(wallEditMinutesRemaining({ editUntil: new Date(now + 16 * 60000).toISOString() }, now), 15);
});
test("Wall edit countdown rounds up, expires at the deadline and handles invalid dates", () => {
  const post = { publishedAt: new Date(now).toISOString() };
  assert.equal(wallEditMinutesRemaining(post, now), 15);
  assert.equal(wallEditMinutesRemaining(post, now + 60000), 14);
  assert.equal(wallEditMinutesRemaining(post, now + 899999), 1);
  assert.equal(wallEditMinutesRemaining(post, now + 900000), 0);
  assert.equal(wallEditMinutesRemaining(post, now + 960000), 0);
  assert.equal(wallEditMinutesRemaining({}), 0);
});
