import assert from "node:assert/strict";
import test from "node:test";
import { fallbackMessages, normalizeApiError } from "./apiErrors.js";

test("normalizes network errors without leaking raw error objects", () => {
  const normalized = normalizeApiError(new Error("Network Error"));
  assert.equal(normalized.message, fallbackMessages.network);
  assert.deepEqual(normalized.errors, {});
});

test("normalizes API messages and field errors", () => {
  const normalized = normalizeApiError({
    response: {
      status: 400,
      data: {
        message: "Please enter a valid email address.",
        errors: { email: "Please enter a valid email address." },
      },
    },
  });

  assert.equal(normalized.message, "Please enter a valid email address.");
  assert.equal(normalized.errors.email, "Please enter a valid email address.");
});

test("normalizes rate limits and ignores HTML error bodies", () => {
  assert.equal(
    normalizeApiError({ response: { status: 429, data: {} } }).message,
    fallbackMessages.rateLimit
  );

  assert.equal(
    normalizeApiError({ response: { status: 500, data: { message: "<html>boom</html>" } } }, fallbackMessages.server).message,
    fallbackMessages.server
  );
});
