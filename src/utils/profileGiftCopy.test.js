import test from "node:test";
import assert from "node:assert/strict";
import { profileGiftCopy } from "./profileGiftCopy.js";

test("gift tagline comes from the catalog while sender and note come from the received gift", () => {
  assert.deepEqual(profileGiftCopy({ name: "Retail Therapy", sender: { name: "Omar" }, message: "Happy birthday" }), { caption: "Treat yourself", senderName: "Omar", note: "Happy birthday" });
  assert.equal(profileGiftCopy({ name: "Aura", sender: { name: "Kenji Sato" } }).caption, "You are magic");
});
test("custom gifts do not inherit unrelated demo taglines or senders", () => {
  assert.deepEqual(profileGiftCopy({ name: "Custom gift", message: "For your launch" }), { caption: "", senderName: "a supporter", note: "For your launch" });
  assert.equal(profileGiftCopy({ name: "Custom gift", tagline: "Your own caption" }).caption, "Your own caption");
});
test("private sender and message are visible only to the recipient or sender", () => {
  const gift = { name: "Aura", visibility: "RECIPIENT_ONLY", sender: { id: "sender", name: "Kenji" }, message: "Private note" };
  assert.equal(profileGiftCopy(gift, { isOwner: true }).senderName, "Kenji");
  assert.equal(profileGiftCopy(gift, { viewerId: "sender" }).note, "Private note");
  assert.deepEqual(profileGiftCopy(gift, { viewerId: "other" }), { caption: "You are magic", senderName: "a private supporter", note: "" });
});
