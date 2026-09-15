import assert from "node:assert/strict";
import test from "node:test";
import { isSeenOwner, normalizeId } from "./seenOwnership.js";

test("normalizeId supports strings and Mongo-style objects", () => {
  assert.equal(normalizeId("abc"), "abc");
  assert.equal(normalizeId({ _id: "abc" }), "abc");
  assert.equal(normalizeId({ id: "def" }), "def");
  assert.equal(normalizeId({ user: { _id: "ghi" } }), "ghi");
});

test("isSeenOwner matches auth id against populated creator id", () => {
  assert.equal(isSeenOwner({ id: "user-1" }, { creator: { _id: "user-1" } }), true);
  assert.equal(isSeenOwner({ _id: "user-1" }, { creator: { id: "user-2" } }), false);
});

test("isSeenOwner matches auth id against flat creator fields", () => {
  assert.equal(isSeenOwner({ _id: "507f1f77bcf86cd799439011" }, { creatorId: "507f1f77bcf86cd799439011" }), true);
  assert.equal(isSeenOwner({ user: { _id: "owner" } }, { ownerId: "owner" }), true);
});
