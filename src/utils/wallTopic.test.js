import test from "node:test";
import assert from "node:assert/strict";
import { inferWallTopic } from "./wallTopic.js";
import { readWallDraft, saveWallDraft, clearWallDraft } from "../services/wallDraftStore.js";
test("prototype Auto inference precedence and all nine topics", () => {
  for (const [text, topic] of [["Need a tennis partner at a cafe","Meet people"],["Apartment for rent near a cafe","Housing"],["Babysitter for kids","Services"],["Hiring for work","Work"],["School for children","Kids & Family"],["Dinner at a restaurant","Food"],["Airport trip","Travel"],["Where is the beach?","Places"],["Hello neighbors","Community"],["  ",""]]) assert.equal(inferWallTopic(text),topic);
});
test("draft retains File data in memory and is isolated by account and explicit discard", () => {
  const file=new Blob(["photo"]);
  saveWallDraft("alice",{text:"Help",topic:"Housing",rightNow:true,files:[file]});
  assert.equal(readWallDraft("alice").files[0],file);
  assert.equal(readWallDraft("alice").topic,"Housing");
  assert.equal(readWallDraft("bob"),null);
  assert.equal(readWallDraft("alice"),null);
  saveWallDraft("alice",{text:"Draft"});
  clearWallDraft();
  assert.equal(readWallDraft("alice"),null);
});
