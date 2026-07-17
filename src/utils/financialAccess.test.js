import test from "node:test";
import assert from "node:assert/strict";
import { hasFullPublicationAccess, publicationFinancialAction } from "./financialAccess.js";

test("only server access states grant full publication access", () => {
  for (const access of ["OWNER", "ADMIN", "ENTITLED_WORLD", "ACTIVE_PREMIUM_MEMBER"]) assert.equal(hasFullPublicationAccess(access), true);
  for (const access of [undefined, "PUBLIC_PREVIEW", "LOCKED", "REFUNDED"]) assert.equal(hasFullPublicationAccess(access), false);
});

test("locked publication action follows its backend kind", () => {
  assert.equal(publicationFinancialAction({ kind: "WORLD", access: "LOCKED" }), "PURCHASE_WORLD");
  assert.equal(publicationFinancialAction({ kind: "PREMIUM_WORLD", access: "LOCKED" }), "JOIN_PREMIUM");
  assert.equal(publicationFinancialAction({ kind: "WORLD", access: "ENTITLED_WORLD" }), null);
});
