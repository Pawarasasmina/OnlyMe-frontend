import assert from "node:assert/strict";
import test from "node:test";
import { restoreSocialScroll, scrollPositionForNavigation } from "./socialScrollRestoration.js";

test("closing a reader restores that history entry rather than another visit to the same feed", () => {
  assert.deepEqual(scrollPositionForNavigation({ navigationType: "POP", entryPosition: { content: 2400, window: 0 }, routePosition: { content: 800, window: 0 } }), { content: 2400, window: 0 });
});

test("a fresh navigation starts at the top and explicit profile returns still restore", () => {
  const options = { entryPosition: { content: 2400, window: 0 }, routePosition: { content: 800, window: 0 } };
  assert.deepEqual(scrollPositionForNavigation({ ...options, navigationType: "PUSH" }), { content: 0, window: 0 });
  assert.deepEqual(scrollPositionForNavigation({ ...options, navigationType: "REPLACE", restoreScroll: true }), options.routePosition);
});

test("restoration waits for delayed content instead of treating a clamped scroll as complete", () => {
  const content = { scrollTop: 0, maximum: 100, scrollTo({ top }) { this.scrollTop = Math.min(top, this.maximum); } };
  const viewport = { scrollY: 0, scrollTo({ top }) { this.scrollY = top; } };
  const saved = { content: 2400, window: 0 };
  assert.equal(restoreSocialScroll(content, viewport, saved), false);
  content.maximum = 5000;
  assert.equal(restoreSocialScroll(content, viewport, saved), true);
  assert.equal(content.scrollTop, 2400);
  assert.equal(saved.content, 2400);
});

test("restores mobile viewport scroll as well as the desktop centre column", () => {
  const content = { scrollTop: 0, scrollTo({ top }) { this.scrollTop = top; } };
  const viewport = { scrollY: 0, scrollTo({ top }) { this.scrollY = top; } };
  assert.equal(restoreSocialScroll(content, viewport, { content: 0, window: 1800 }), true);
  assert.equal(viewport.scrollY, 1800);
});
