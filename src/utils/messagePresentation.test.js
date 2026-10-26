import assert from "node:assert/strict";
import test from "node:test";
import { classifySharedUrl, isGiftRequestMessage, shouldKeepLatestVisible } from "./messagePresentation.js";

test("gift request detection is contextual and ignores outgoing or gift messages", () => {
  assert.equal(isGiftRequestMessage({ body: "Would you send me a gift?" }), true);
  assert.equal(isGiftRequestMessage({ body: "I liked your gift guide" }), false);
  assert.equal(isGiftRequestMessage({ body: "Gift me", mediaType: "gift" }), false);
  assert.equal(isGiftRequestMessage({ body: "Send a gift" }, true), false);
});

test("shared URLs distinguish gift, profile, and ordinary links", () => {
  assert.equal(classifySharedUrl("https://atseen.com/@maya/gift").kind, "gift");
  assert.equal(classifySharedUrl("https://atseen.com/@maya").kind, "profile");
  assert.equal(classifySharedUrl("https://example.com/story").kind, "link");
  assert.equal(classifySharedUrl("not a link"), null);
});

test("late media only follows the bottom during initial positioning or near the latest message", () => {
  assert.equal(shouldKeepLatestVisible({ distanceFromBottom: 500, initialPositioning: true }), true);
  assert.equal(shouldKeepLatestVisible({ distanceFromBottom: 80, initialPositioning: false }), true);
  assert.equal(shouldKeepLatestVisible({ distanceFromBottom: 500, initialPositioning: false }), false);
});
