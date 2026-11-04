import test from "node:test";
import assert from "node:assert/strict";
import { memberTicketData, showMemberNumber } from "./memberTicket.js";

test("member numbers come from account data and are never fabricated", () => {
  for (const memberNumber of [undefined, null, "", 0, -1, 1.5, "bad", Infinity]) {
    assert.equal(memberTicketData({ memberNumber }), null);
  }
  assert.equal(memberTicketData({}, { memberNumber: 2121 }).label, "№2,121");
});
test("only the first 10,000 members qualify for the profile badge", () => {
  assert.equal(memberTicketData({ memberNumber: 10000 }).badgeEligible, true);
  assert.equal(memberTicketData({ memberNumber: 10001 }).badgeEligible, false);
});
test("ticket uses the join date and location without demo fallbacks", () => {
  const ticket = memberTicketData({ memberNumber: 12, city: "Colombo", joinedAt: "invalid" });
  assert.equal(ticket.city, "Colombo");
  assert.equal(ticket.date, "");
  assert.equal(memberTicketData({ memberNumber: 12 }).city, "");
});
test("visibility respects the saved account preference", () => {
  assert.equal(showMemberNumber({ showMemberNumber: false }), false);
  assert.equal(showMemberNumber({ showMemberNumber: true }), true);
  assert.equal(showMemberNumber({}), true);
});
