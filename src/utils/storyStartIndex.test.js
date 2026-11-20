import test from "node:test";
import assert from "node:assert/strict";
import { storyStartIndex } from "./storyStartIndex.js";
const old = { createdAt: "2026-11-20T08:00:00Z", viewed: false };
const latest = { createdAt: "2026-11-20T09:00:00Z", viewed: true };
test("own stories open newest regardless of viewed state or response order", () => {
  assert.equal(storyStartIndex([old, latest], true), 1);
  assert.equal(storyStartIndex([latest, old], true), 0);
  assert.equal(storyStartIndex([{ ...old, viewed: true }, latest], true), 1);
});
test("other people's stories also open newest regardless of viewed state", () => {
  assert.equal(storyStartIndex([latest, old]), 0);
  assert.equal(storyStartIndex([latest, { ...old, viewed: true }]), 0);
});
test("empty, single and legacy undated stories have safe opening positions", () => {
  assert.equal(storyStartIndex([], true), 0);
  assert.equal(storyStartIndex([old], true), 0);
  assert.equal(storyStartIndex([{}, {}], true), 1);
});
