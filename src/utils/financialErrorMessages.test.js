import test from "node:test";
import assert from "node:assert/strict";
import { financialErrorCode, financialErrorMessage } from "./financialErrorMessages.js";

test("financial errors use backend codes without exposing internals", () => {
  const error = { response: { data: { code: "INSUFFICIENT_STARS" } } };
  assert.equal(financialErrorCode(error), "INSUFFICIENT_STARS");
  assert.match(financialErrorMessage(error), /Stars/i);
  assert.match(financialErrorMessage({}), /unavailable/i);
  assert.match(financialErrorMessage({ response: { data: { code: "CREATOR_REVERSAL_INSUFFICIENT_STARS" } } }), /manual review/i);
});
