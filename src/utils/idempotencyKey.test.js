import test from "node:test";
import assert from "node:assert/strict";
import { createIdempotencyKey } from "./idempotencyKey.js";

test("financial action keys are non-empty, scoped, and unique", () => {
  const first = createIdempotencyKey("world-purchase");
  const second = createIdempotencyKey("world-purchase");
  assert.match(first, /^world-purchase:/);
  assert.notEqual(first, second);
});
