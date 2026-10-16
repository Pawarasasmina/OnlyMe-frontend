import test from "node:test";
import assert from "node:assert/strict";
import { transcriptAlreadyShown, wallPostCaption } from "./wallVoiceDisplay.js";

test("matching post text never needs a duplicate transcript", () => {
  assert.equal(transcriptAlreadyShown("Hi. How are you?", "Hi. How are you?"), true);
  assert.equal(transcriptAlreadyShown(" HI.  How are you? ", "Hi. How are you?"), true);
  assert.equal(transcriptAlreadyShown("My note\n\nHi. How are you?", "Hi. How are you?"), true);
});
test("voice-only posts and separate captions retain their optional transcript", () => {
  assert.equal(transcriptAlreadyShown("", "Hello"), false);
  assert.equal(transcriptAlreadyShown("My weekend", "Hello everyone"), false);
  assert.equal(transcriptAlreadyShown("This is a note", "hi"), false);
  assert.equal(transcriptAlreadyShown("Hello", ""), false);
});


test("old converted voice posts become audio first without changing separate captions", () => {
  const audio = { type: "audio", transcript: "Hi. How are you?" };
  assert.equal(wallPostCaption("Hi. How are you?", [audio]), "");
  assert.equal(wallPostCaption("A separate caption\n\nHi. How are you?", [audio]), "A separate caption");
  assert.equal(wallPostCaption("A separate caption", [audio]), "A separate caption");
  assert.equal(wallPostCaption("Text only", []), "Text only");
});
