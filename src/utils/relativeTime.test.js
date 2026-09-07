import assert from "node:assert/strict";
import test from "node:test";
import { relativeTime } from "./relativeTime.js";

test("relativeTime renders compact same-day distances", () => {
  const originalNow = Date.now;
  Date.now = () => new Date("2026-08-31T10:00:00.000Z").getTime();

  try {
    assert.equal(relativeTime("2026-08-31T09:59:30.000Z"), "30s");
    assert.equal(relativeTime("2026-08-31T09:30:00.000Z"), "30m");
    assert.equal(relativeTime("2026-08-31T05:00:00.000Z"), "5h");
  } finally {
    Date.now = originalNow;
  }
});

test("relativeTime handles invalid or future values gracefully", () => {
  const originalNow = Date.now;
  Date.now = () => new Date("2026-08-31T10:00:00.000Z").getTime();

  try {
    assert.equal(relativeTime(""), "now");
    assert.equal(relativeTime("not-a-date"), "now");
    assert.equal(relativeTime("2026-08-31T10:01:00.000Z"), "0s");
  } finally {
    Date.now = originalNow;
  }
});
