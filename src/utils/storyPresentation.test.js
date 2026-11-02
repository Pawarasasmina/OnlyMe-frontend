import test from "node:test";
import assert from "node:assert/strict";
import { storyActivityRoute, storyTextStyle } from "./storyPresentation.js";
const id = "507f1f77bcf86cd799439011";
const actor = "507f1f77bcf86cd799439012";
test("story activities resolve an exact story or reply message", () => {
  assert.equal(storyActivityRoute({ type: "story_mention", target: { type: "STORY", id } }), `/stories/${id}`);
  assert.equal(storyActivityRoute({ type: "story_reaction", target: { type: "STORY", id } }), `/stories/${id}`);
  assert.equal(storyActivityRoute({ type: "story_reply", target: { type: "STORY", id, conversationUserId: actor, messageId: id } }), `/messages?with=${actor}&message=${id}`);
  assert.equal(storyActivityRoute({ target: { type: "STORY", id: "../../admin" } }), null);
  assert.equal(storyActivityRoute({ target: { type: "WORLD", id } }), null);
});
test("legacy plates and new independent backgrounds render consistently", () => {
  assert.equal(storyTextStyle({ style: 2, color: "#FFFFFF" }).backgroundColor, "#FFFFFF");
  assert.equal(storyTextStyle({ style: 5, color: "#9CCBFF" }).color, "#fff");
  assert.equal(storyTextStyle({ style: 4, backgroundMode: 2, color: "#9CCBFF" }).backgroundColor, "#9CCBFF66");
  assert.equal(storyTextStyle({ style: 3, align: "right" }).textAlign, "right");
});
