import test from "node:test";
import assert from "node:assert/strict";
import { dreamFallbackCover, dreamProgress } from "./dreamPresentation.js";

test("Dream progress rounds actual contributions and clamps valid totals", () => {
  assert.equal(dreamProgress({ receivedStars: 570, goalStars: 1500 }), 38);
  assert.equal(dreamProgress({ receivedStars: 1125, goalStars: 1500 }), 75);
  assert.equal(dreamProgress({ receivedStars: 1, goalStars: 1500 }), 0);
  assert.equal(dreamProgress({ receivedStars: 2000, goalStars: 1500 }), 100);
  assert.equal(dreamProgress({ receivedStars: -50, goalStars: 1500 }), 0);
});

test("missing or invalid totals never produce a false percentage", () => {
  for (const dream of [null, {}, { receivedStars: 5, goalStars: 0 }, { receivedStars: Infinity, goalStars: 500 }, { receivedStars: 5, goalStars: "invalid" }]) assert.equal(dreamProgress(dream), 0);
});

test("missing-photo cover is deterministic and never embeds authored markup", () => {
  const title = '<script>alert("x")</script>';
  const cover = dreamFallbackCover(title);
  assert.equal(cover, dreamFallbackCover(title));
  assert.match(cover, /^data:image\/svg\+xml,/);
  assert.ok(!decodeURIComponent(cover).includes("<script>"));
});
