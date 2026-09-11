import test from "node:test";
import assert from "node:assert/strict";
import { PROFILE_STATUS_SUGGESTIONS, STATUS_LABEL_MAX_LENGTH } from "../constants/statusPresets.js";

test("profile status suggestions match the v113 status screen list", () => {
  assert.equal(STATUS_LABEL_MAX_LENGTH, 120);
  assert.deepEqual(PROFILE_STATUS_SUGGESTIONS, [
    "\uD83D\uDC41 At seen",
    "\uD83C\uDFBE Tennis?",
    "\uD83C\uDF05 Morning person",
    "\uD83D\uDCAA At the gym",
    "\uD83D\uDCDA Reading",
    "\u2615 Coffee walk",
    "\uD83C\uDFA7 Deep work",
    "\u2708\uFE0F Traveling",
    "\u270D\uFE0F New Seen soon",
    "\uD83D\uDCD6 Writing a chapter",
    "\uD83D\uDCAC Replying to everyone",
    "\uD83D\uDCDE Open for calls",
    "\uD83C\uDF0D My World is open",
  ]);
  assert.equal(new Set(PROFILE_STATUS_SUGGESTIONS).size, PROFILE_STATUS_SUGGESTIONS.length);
});
