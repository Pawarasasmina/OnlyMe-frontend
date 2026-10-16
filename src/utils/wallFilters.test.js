import test from "node:test";
import assert from "node:assert/strict";
import { readWallFilters, writeWallFilters, mergeWallPages } from "./wallFilters.js";
import { DEFAULT_WALL_FILTERS } from "../data/wallFilters.js";

test("filter URLs roundtrip combined selections and keep unrelated state", () => {
  const filters = { type: "looking_for", topic: "services", scope: "nearby", sort: "popular", location: "Dubai", near: "Dubai" };
  const params = writeWallFilters(new URLSearchParams("filter=travel&city=Paris&compose=note&q=plumber"), filters);
  assert.deepEqual(readWallFilters(params), filters);
  assert.equal(params.get("compose"), "note");
  assert.equal(params.get("q"), "plumber");
  assert.equal(params.has("filter"), false);
  assert.equal(params.has("city"), false);
});
test("reset removes active filter URL state", () => {
  const params = writeWallFilters(new URLSearchParams("type=offering&topic=work&scope=city&location=Dubai&sort=popular&near=Dubai"), DEFAULT_WALL_FILTERS);
  assert.equal(params.toString(), "");
  assert.deepEqual(readWallFilters(params), DEFAULT_WALL_FILTERS);
});
test("location links and invalid option values are handled safely", () => {
  assert.equal(readWallFilters(new URLSearchParams("city=Paris")).scope, "custom");
  assert.equal(readWallFilters(new URLSearchParams("sort=invalid&type=invalid&topic=invalid")).sort, "recent");
});
test("page merging preserves server popularity order and replaces duplicates", () => {
  const posts = mergeWallPages([{ id: "old", text: "popular" }, { id: "new", text: "recent" }], [{ id: "new", text: "updated" }, { id: "share-old" }]);
  assert.deepEqual(posts.map((post) => post.id), ["old", "new", "share-old"]);
  assert.equal(posts[1].text, "updated");
});
