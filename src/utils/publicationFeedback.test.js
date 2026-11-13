import test from "node:test";
import assert from "node:assert/strict";
import { publicationFeedback } from "./publicationFeedback.js";

test("only confirmed live publications produce success feedback", () => {
  for (const status of ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", undefined]) {
    assert.equal(publicationFeedback({ id: "seen" }, { publication: { status } }), null);
  }
  assert.equal(publicationFeedback({}, undefined), null);
});

test("revisions are updates and AI rewards require an explicit server confirmation", () => {
  const publication = { id: "seen", title: "Live", status: "PUBLISHED", aiAssistance: { generated: true } };
  assert.equal(publicationFeedback({}, { publication }).aiBonusGranted, false);
  assert.equal(publicationFeedback({}, { publication, aiBonusGranted: "true" }).aiBonusGranted, false);
  assert.equal(publicationFeedback({}, { publication, aiBonusGranted: true }).aiBonusGranted, true);
  assert.equal(publicationFeedback({ publishedVersion: 1 }, { publication }).updated, true);
  assert.equal(publicationFeedback({ publishedAt: "2026-11-12" }, { publication }).updated, true);
  assert.equal(publicationFeedback({}, { publication }).updated, false);
});
