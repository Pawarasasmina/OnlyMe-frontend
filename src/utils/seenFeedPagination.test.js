import assert from "node:assert/strict";
import test from "node:test";
import { nextSeenFeedPage, updateSeenFeedPages } from "./seenFeedPagination.js";

test("continues after the first 30 Seens and ends only when the API is exhausted", () => {
  assert.equal(nextSeenFeedPage({ pagination: { page: 1, hasMore: true } }), 2);
  assert.equal(nextSeenFeedPage({ items: [], pagination: { page: 2, hasMore: true } }), 3);
  assert.equal(nextSeenFeedPage({ pagination: { page: 3, hasMore: false } }), undefined);
});

test("feed actions update later pages without losing pagination metadata", () => {
  const current = { pageParams: [1, 2], pages: [{ items: [{ id: "a" }], pagination: { page: 1, hasMore: true } }, { items: [{ id: "b" }, { id: "c" }], pagination: { page: 2, hasMore: false } }] };
  const updated = updateSeenFeedPages(current, (items) => items.filter((item) => item.id !== "b").map((item) => item.id === "c" ? { ...item, saved: true } : item));
  assert.deepEqual(updated.pages[1].items, [{ id: "c", saved: true }]);
  assert.deepEqual(updated.pages[1].pagination, current.pages[1].pagination);
  assert.deepEqual(updated.pageParams, [1, 2]);
  assert.equal(current.pages[1].items.length, 2);
  assert.equal(updateSeenFeedPages(undefined, (items) => items), undefined);
});
