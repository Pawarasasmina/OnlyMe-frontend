import test from "node:test";
import assert from "node:assert/strict";
import { analyticsDubaiDate, analyticsRangeForPreset } from "./analyticsReportingRange.js";

test("Dubai today crosses the UTC date boundary independent of the viewer timezone", () => {
  const now = new Date("2026-11-23T21:30:00.000Z");
  assert.equal(analyticsDubaiDate(now), "2026-11-24");
  assert.deepEqual(analyticsRangeForPreset("today", "", "", now), { startDate: "2026-11-23T20:00:00.000Z", endDate: "2026-11-24T19:59:59.999Z" });
});
test("custom dates and last month use Dubai midnight through 23:59", () => {
  assert.deepEqual(analyticsRangeForPreset("custom", "2026-11-01", "2026-11-02"), { startDate: "2026-10-31T20:00:00.000Z", endDate: "2026-11-02T19:59:59.999Z" });
  assert.deepEqual(analyticsRangeForPreset("last_month", "", "", new Date("2026-03-31T10:00:00Z")), { startDate: "2026-01-31T20:00:00.000Z", endDate: "2026-02-28T19:59:59.999Z" });
});
