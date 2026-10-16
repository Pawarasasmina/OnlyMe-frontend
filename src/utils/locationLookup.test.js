import test from "node:test";
import assert from "node:assert/strict";
import { canLookupLocation, geolocationErrorMessage } from "./locationLookup.js";

test("coordinates trigger current area lookup without typed text", () => {
  assert.equal(canLookupLocation("", { latitude: 6.9, longitude: 79.8 }), true);
  assert.equal(canLookupLocation("", { latitude: 0, longitude: 0 }), true);
  assert.equal(canLookupLocation("", null), false);
  assert.equal(canLookupLocation("", { latitude: 91, longitude: 80 }), false);
  assert.equal(canLookupLocation("a", { latitude: 7, longitude: 80 }), false);
  assert.equal(canLookupLocation("Colombo", null), true);
});
test("permission denied, timeouts, and unavailable location have distinct messages", () => {
  assert.match(geolocationErrorMessage({ code: 1 }), /permission is blocked/);
  assert.match(geolocationErrorMessage({ code: 3 }), /timed out/);
  assert.match(geolocationErrorMessage({ code: 2 }), /could not determine/);
});
