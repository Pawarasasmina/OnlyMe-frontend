import assert from "node:assert/strict";
import test from "node:test";
import {
  SAVED_PEOPLE_DETAIL_TITLE,
  SAVED_PEOPLE_EMPTY_STATE,
  followInvalidationKeys,
  savedPeopleCount,
} from "./savedPeople.js";

test("saved people uses prototype terminology", () => {
  assert.equal(SAVED_PEOPLE_DETAIL_TITLE, "Favorite Creators");
  assert.equal(SAVED_PEOPLE_EMPTY_STATE, "Follow creators to keep them close.");
});

test("saved people count is derived from overview counts", () => {
  assert.equal(savedPeopleCount({ people: 4 }), 4);
  assert.equal(savedPeopleCount({ people: "0" }), 0);
  assert.equal(savedPeopleCount({}), 0);
});

test("follow success invalidates saved people and related surfaces", () => {
  assert.deepEqual(followInvalidationKeys(), [
    ["unified-profile"],
    ["saved"],
    ["discover"],
    ["search"],
    ["orbit"],
  ]);
});
