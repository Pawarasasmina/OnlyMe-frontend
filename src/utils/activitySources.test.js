import test from "node:test";
import assert from "node:assert/strict";
import { mergeActivitySources } from "./activitySources.js";
const activity = { id: "notice", type: "gift_sent", title: "You sent My Star to Arjun", direction: "sent", createdAt: "2026-10-23T10:00:00Z", relatedCreator: { id: "arjun", username: "arjun" }, metadata: { giftId: "star" }, reference: { type: "MESSAGE", id: "message-1" }, filterKeys: ["support"] };
const ledger = { id: "ledger-1", event: "CHAT_GIFT_DEBIT", direction: "sent", createdAt: activity.createdAt, relatedCreator: { id: "arjun", username: "arjun" }, reference: { type: "CHAT_GIFT", id: "message-1" }, starsChange: -7, metadata: { giftId: "star", giftImageUrl: "/star.png" }, filterKeys: ["support", "purchases"] };

test("one gift notification retains its name and ledger amount/image", () => {
  const rows = mergeActivitySources([activity], [ledger]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, activity.title);
  assert.equal(rows[0].id, activity.id);
  assert.equal(rows[0].starsChange, -7);
  assert.equal(rows[0].metadata.giftImageUrl, "/star.png");
  assert.deepEqual(rows[0].filterKeys, ["support", "purchases"]);
});
test("legacy gift dedupe key and ledger message reference identify the same send", () => {
  assert.equal(mergeActivitySources([{ ...activity, reference: undefined, dedupeKey: "chat-gift:message-1" }], [ledger]).length, 1);
});
test("two identical gifts sent together stay as two transactions", () => {
  const second = { ...activity, id: "notice-2", reference: { type: "MESSAGE", id: "message-2" } };
  const secondLedger = { ...ledger, id: "ledger-2", reference: { type: "CHAT_GIFT", id: "message-2" } };
  assert.equal(mergeActivitySources([activity, second], [ledger, secondLedger]).length, 2);
  assert.equal(mergeActivitySources([activity], [secondLedger]).length, 2);
});
test("legacy entries without transaction references pair one-to-one", () => {
  const notice = { ...activity, reference: undefined, starsChange: -7 };
  const entry = { ...ledger, reference: undefined };
  assert.equal(mergeActivitySources([notice], [entry, { ...entry, id: "ledger-2" }]).length, 2);
});
test("received and sent gifts, creator thanks, and unrelated ledger entries remain separate", () => {
  assert.equal(mergeActivitySources([activity], [{ ...ledger, direction: "received" }]).length, 2);
  assert.equal(mergeActivitySources([{ ...activity, type: "gift_thanked" }], [ledger]).length, 2);
  assert.equal(mergeActivitySources([activity], [{ ...ledger, event: "CHAT_GIFT_REFUND" }]).length, 2);
});
