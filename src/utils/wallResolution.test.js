import test from "node:test";
import assert from "node:assert/strict";
import { patchWallResolution } from "./wallResolution.js";

test("resolution patches original and shared posts without changing their engagement or identity", () => {
  const items = [{ id: "one", commentCount: 3 }, { id: "share-one", originalPostId: "one", shareCaption: "Read this", sharedBy: { id: "someone" }, commentCount: 8, feedCreatedAt: "2026-01-01" }, { id: "other" }];
  const updated = patchWallResolution({ items, pagination: { page: 2 } }, { id: "one", resolvedAt: "2026-10-16", canResolve: true, commentCount: 0 });
  assert.equal(updated.items[0].resolvedAt, "2026-10-16");
  assert.equal(updated.items[1].resolvedAt, "2026-10-16");
  assert.equal(updated.items[1].commentCount, 8);
  assert.equal(updated.items[1].shareCaption, "Read this");
  assert.equal(updated.items[1].id, "share-one");
  assert.equal(updated.items[1].feedCreatedAt, "2026-01-01");
  assert.equal(updated.items[2], items[2]);
  assert.equal(updated.pagination.page, 2);
});

test("post detail cache supports reopening and missing cache values", () => {
  const detail = { id: "one", resolvedAt: "2026-10-16", comments: ["help"] };
  assert.deepEqual(patchWallResolution(detail, { id: "one", resolvedAt: null, canResolve: true }), { ...detail, resolvedAt: null, canResolve: true });
  assert.equal(patchWallResolution(undefined, { id: "one" }), undefined);
});
