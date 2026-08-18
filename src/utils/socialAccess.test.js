import assert from "node:assert/strict";
import test from "node:test";
import { canAccessSharedSocial, defaultDestinationFor, socialCapabilitiesFor } from "./socialAccess.js";

test("fan and creator default to Wall while admin remains in Admin", () => {
  assert.equal(defaultDestinationFor("fan"), "/wall");
  assert.equal(defaultDestinationFor("creator"), "/wall");
  assert.equal(defaultDestinationFor("admin"), "/admin/dashboard");
});

test("only fan and creator roles can enter authenticated shared social routes", () => {
  assert.equal(canAccessSharedSocial("fan"), true);
  assert.equal(canAccessSharedSocial("creator"), true);
  assert.equal(canAccessSharedSocial("admin"), false);
  assert.equal(canAccessSharedSocial(undefined), false);
});

test("approved creators receive Create and Studio capabilities", () => {
  const capabilities = socialCapabilitiesFor({ role: "creator", creatorApprovalStatus: "approved" });
  assert.equal(capabilities.canCreate, true);
  assert.equal(capabilities.canAccessStudio, true);
  assert.equal(capabilities.canAccessVerification, true);
});

test("pending applicants retain free social creation and verification without Studio", () => {
  const capabilities = socialCapabilitiesFor({ role: "fan", creatorApprovalStatus: "pending" });
  assert.equal(capabilities.canCreate, true);
  assert.equal(capabilities.canAccessStudio, false);
  assert.equal(capabilities.canAccessVerification, true);
});

test("normal accounts receive free creation and application access without creator management", () => {
  const capabilities = socialCapabilitiesFor({ role: "fan" });
  assert.equal(capabilities.canCreate, true);
  assert.equal(capabilities.canAccessStudio, false);
  assert.equal(capabilities.canAccessVerification, true);
});

test("approved unified accounts receive creator capabilities without changing role", () => {
  const capabilities = socialCapabilitiesFor({ role: "fan", creatorApprovalStatus: "approved" });
  assert.equal(capabilities.isApprovedCreator, true);
  assert.equal(capabilities.canAccessStudio, true);
});
