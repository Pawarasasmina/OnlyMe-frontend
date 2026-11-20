import test from "node:test";
import assert from "node:assert/strict";
import { clearReadReceipts, isAtSeenStatus } from "./privacyPresentation.js";
test("privacy refresh clears older cached read indicators and keeps delivery state", () => {
  const cache = { messages: [{ readAt: true, body: "older message", readBy: [{ userId: "reader" }] }] };
  assert.deepEqual(clearReadReceipts(cache), { messages: [{ readAt: null, body: "older message", readBy: [], delivered: true }] });
  assert.equal(cache.messages[0].readAt, true);
});
test("only the chosen At seen status has a public online dot", () => {
  assert.equal(isAtSeenStatus({ label: "At seen" }), true);
  assert.equal(isAtSeenStatus({ label: "At seen", isActive: false }), false);
  assert.equal(isAtSeenStatus({ label: "Working" }), false);
});
