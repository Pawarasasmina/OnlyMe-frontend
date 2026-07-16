import assert from "node:assert/strict";
import test from "node:test";
import { profileOwnerActionKeys } from "./profileCapabilities.js";

test("public viewers never receive owner actions", () => {
  assert.deepEqual(profileOwnerActionKeys({ isOwner: false, canCreate: true }, "creator"), []);
});

test("fan owners receive only account management actions", () => {
  assert.deepEqual(profileOwnerActionKeys({ isOwner: true }, "fan"), ["edit", "settings", "security"]);
});

test("approved creator owners receive management actions", () => {
  const actions = profileOwnerActionKeys({ isOwner: true, canCreate: true, canAccessStudio: true, canAccessVerification: true }, "creator");
  assert.equal(actions.includes("create"), true);
  assert.equal(actions.includes("studio"), true);
  assert.equal(actions.includes("verification"), true);
});

test("pending creator owners receive verification without creation", () => {
  const actions = profileOwnerActionKeys({ isOwner: true, canCreate: false, canAccessStudio: false, canAccessVerification: true }, "creator");
  assert.equal(actions.includes("create"), false);
  assert.equal(actions.includes("studio"), false);
  assert.equal(actions.includes("verification"), true);
});
