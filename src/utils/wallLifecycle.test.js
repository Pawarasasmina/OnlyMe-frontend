import test from "node:test";
import assert from "node:assert/strict";
import { activeWallPosts, wallIsClosed, wallSearchPost } from "./wallLifecycle.js";
import { wallClosedLabel } from "./wallResolution.js";
const now = Date.parse("2026-06-01T00:00:00Z");
const post = (type, days, extra = {}) => ({ id: type, postType: type, publishedAt: new Date(now - days * 86400000).toISOString(), ...extra });

test("Wall hides closures, expired shares and cached creations using canonical rules", () => {
  const active = post("Question", 1);
  const entries = [active, post("Buy & Sell", 1, { resolvedAt: new Date(now) }), post("Need Help", 7), post("Event", 7), post("Recommendation", 104), post("Question", 30, { id: "share", originalPostId: "original" })];
  assert.deepEqual(activeWallPosts(entries, now), [active]);
  assert.equal(entries.length, 6, "profile/search collections remain intact");
  assert.equal(wallIsClosed(post("Question", 0, { expiresAt: new Date(now) }), now), true);
});

test("search/detail category statuses distinguish sold, outdated and automatic expiry", () => {
  for (const [type, label] of [["Buy & Sell", "Sold"], ["Question", "Solved"], ["Event", "Ended"], ["Recommendation", "Outdated"]]) {
    const item = { category: type, createdAt: new Date(now), metadata: { postType: type, resolvedAt: new Date(now) } };
    assert.equal(wallClosedLabel(wallSearchPost(item), now), label);
  }
  assert.equal(wallClosedLabel(post("Recommendation", 104), now), "May be outdated");
  assert.equal(wallClosedLabel(post("Need Help", 7), now), "Expired");
  assert.equal(wallClosedLabel(post("Question", 0), now), "");
});
