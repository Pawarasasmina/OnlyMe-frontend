import test from "node:test";
import assert from "node:assert/strict";
import { wallLifetimeMessage, wallExpiryPrompt } from "./wallLifetimePresentation.js";

test("composer lifetime follows category and Right now takes precedence", () => {
  for (const [category, days] of [["Need Help", 7], ["Looking for", 14], ["Question", 30], ["Buy & Sell", 30], ["Offering", 30]]) {
    assert.deepEqual(wallLifetimeMessage(category), { key: "wallLifetime.days", values: { days } });
    assert.deepEqual(wallLifetimeMessage(category, true), { key: "wallLifetime.rightNow" });
  }
  assert.equal(wallLifetimeMessage("Event").key, "wallLifetime.event");
  assert.equal(wallLifetimeMessage("Recommendation").key, "wallLifetime.recommendation");
});

test("expiry prompt copy distinguishes requests, availability and recommendations", () => {
  const now = Date.parse("2026-11-16T00:00:00Z");
  const request = wallExpiryPrompt({ needsExpiryPrompt: true, expiryPromptKind: "request", expiresAt: new Date(now + 9 * 3600000).toISOString() }, now);
  assert.equal(request.title, "wallLifetime.stillNeedIt");
  assert.equal(request.keep, "wallLifetime.keepIt");
  assert.equal(request.close, "social.solved");
  assert.equal(request.hours, 9);
  assert.equal(wallExpiryPrompt({ canBump: true }).hours, null);
  assert.equal(wallExpiryPrompt({ needsExpiryPrompt: true, expiryPromptKind: "recommendation" }).title, "wallLifetime.stillTrue");
  assert.equal(wallExpiryPrompt({ needsExpiryPrompt: true, expiryPromptKind: "recommendation" }).close, "wallResolution.outdated");
});

test("Right now and Events never show expiry prompts even with stale API flags", () => {
  for (const post of [{ postType: "Right Now" }, { postType: "Question", rightNow: true }, { context: "Right now" }, { postType: "Event" }, { context: "Events" }]) {
    assert.equal(wallExpiryPrompt({ ...post, canBump: true, needsExpiryPrompt: true }), null);
  }
  assert.equal(wallExpiryPrompt({ postType: "Question" }), null);
});

test("mounted notes derive newly due prompts despite stale API flags", () => {
 const publishedAt = "2026-11-01T00:00:00Z";
 const now = Date.parse("2026-11-07T12:00:00Z");
 const prompt = wallExpiryPrompt({ postType: "Need Help", publishedAt, canBump: false, needsExpiryPrompt: false }, now);
 assert.equal(prompt.title, "wallLifetime.stillNeedIt");
 assert.equal(prompt.hours, 12);
 assert.equal(prompt.canBump, true);
 assert.equal(wallExpiryPrompt({ postType: "Need Help", publishedAt, bumpCount: 3 }, now).canBump, false);
});

test("stale prompt flags cannot revive ended, hidden, deleted or draft notes", () => {
 const now = Date.parse("2026-11-08T00:00:00Z");
 const post = { postType: "Need Help", publishedAt: "2026-11-01T00:00:00Z", canBump: true, needsExpiryPrompt: true };
 assert.equal(wallExpiryPrompt(post, now), null);
 for (const state of [{ resolvedAt: new Date(now) }, { deletedAt: new Date(now) }, { status: "draft" }, { moderationHiddenAt: new Date(now) }, { moderationStatus: "PENDING_REVIEW" }]) {
  assert.equal(wallExpiryPrompt({ ...post, publishedAt: new Date(now - 6.5 * 86400000), ...state }, now), null);
 }
});
