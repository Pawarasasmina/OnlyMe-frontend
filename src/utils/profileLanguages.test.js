import test from "node:test";
import assert from "node:assert/strict";
import { profileLanguageCode } from "./profileLanguages.js";

test("selectors match shorthand, locale case, and provider options", () => {
  assert.equal(profileLanguageCode("SI-lk"), "si-LK");
  assert.equal(profileLanguageCode("en"), "en-US");
  assert.equal(profileLanguageCode("de", [{ code: "de-DE", name: "German" }]), "de-DE");
});
