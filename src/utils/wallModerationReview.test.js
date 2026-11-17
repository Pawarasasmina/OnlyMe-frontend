import test from "node:test";
import assert from "node:assert/strict";
import { canMarkFalseWallReport, isAutomatedWallReview, wallReviewDecision } from "./wallModerationReview.js";

test("dismissal does not penalize a reporter without an explicit confirmed false-report decision", () => {
  const report = { scope: "FEED_POST", source: "USER_REPORT", reporter: { id: "reporter" } };
  assert.equal(canMarkFalseWallReport(report, "NO_ACTION"), true);
  assert.deepEqual(wallReviewDecision(report, "NO_ACTION", false), {});
  assert.deepEqual(wallReviewDecision(report, "NO_ACTION", true), { falseReport: true });
  assert.deepEqual(wallReviewDecision(report, "HIDDEN", true), {});
  assert.deepEqual(wallReviewDecision({ ...report, scope: "PROFILE" }, "NO_ACTION", true), {});
});

test("automated copies and reporter-less records cannot reduce a user's reporting credibility", () => {
  const report = { scope: "FEED_POST", source: "AUTOMATED_DUPLICATE", reporter: null };
  assert.equal(isAutomatedWallReview(report), true);
  assert.deepEqual(wallReviewDecision(report, "NO_ACTION", true), {});
  assert.equal(canMarkFalseWallReport({ scope: "FEED_POST" }, "NO_ACTION"), false);
});
