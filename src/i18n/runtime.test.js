import assert from "node:assert/strict";
import test from "node:test";
import { activateLanguage, catalogs, formatCurrency, formatDate, formatNumber, formatRelative, getLanguage, msg, systemMessage } from "./runtime.js";
import { localizedValidationErrors } from "./errors.js";

test("all eight locales have the English key set", () => {
  const expected = Object.keys(catalogs.en).sort();
  for (const [locale, messages] of Object.entries(catalogs)) assert.deepEqual(Object.keys(messages).sort(), expected, locale);
});

test("ICU interpolation, gender, Arabic and Slavic plurals preserve names", () => {
  for (const locale of Object.keys(catalogs)) {
    activateLanguage(locale);
    for (const count of [0, 1, 2, 3, 5, 11, 21, 101]) assert.ok(msg("common.followersCount", { count }).length > 0);
    assert.ok(msg("common.actorAction", { gender: "female", name: "@original_name" }).includes("@original_name"));
    assert.equal(msg("Direct Access"), "Direct Access");
    assert.equal(msg("Seen"), "Seen");
  }
  activateLanguage("ru");
  assert.equal(msg("common.membersCount", { count: 2 }), "2 участника");
  activateLanguage("ar");
  assert.equal(msg("common.membersCount", { count: 2 }), "عضوان");
  activateLanguage("en");
});

test("dates, relative times, numbers and currencies use the active locale", () => {
  activateLanguage("de");
  assert.equal(formatNumber(1234.56), new Intl.NumberFormat("de-DE").format(1234.56));
  assert.equal(formatCurrency(12.34), new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(12.34));
  assert.equal(formatDate("2026-11-02T12:00:00Z", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }), "2. November 2026");
  assert.equal(formatRelative(-1, "day"), "gestern");
  assert.equal(formatDate("invalid"), "");
  activateLanguage("en");
});

test("known system state updates while arbitrary user text stays unchanged", () => {
  activateLanguage("en");
  const error = msg("common.errorNetwork");
  const content = "My private message stays in English — @alice محمد 1234";
  activateLanguage("ru");
  assert.notEqual(systemMessage(error), error);
  assert.equal(systemMessage(content), content);
  activateLanguage("invalid");
  assert.equal(getLanguage(), "en");
});

test("localized validation errors preserve API identifiers and submitted values", () => {
  activateLanguage("ar");
  const output = localizedValidationErrors({ email: "Unknown validation message", details: [{ path: "email", value: "original@example.com", code: "EMAIL_EXISTS", message: "Unknown validation message" }] });
  assert.notEqual(output.email, "Unknown validation message");
  assert.equal(output.details[0].path, "email");
  assert.equal(output.details[0].value, "original@example.com");
  assert.equal(output.details[0].code, "EMAIL_EXISTS");
  assert.equal(msg("missing.semanticKey"), catalogs.ar["common.textUnavailable"]);
  assert.ok(!msg("common.membersCount").includes("{count"));
  activateLanguage("en");
});

test("reviewed activity messages preserve the actor, recipient and amount", () => {
  for (const locale of Object.keys(catalogs)) {
    activateLanguage(locale);
    const text = msg("fan.youSentValue0TowardValue1SDream", { value0: "123.45", value1: "@recipient_اسم" });
    assert.ok(text.includes("123.45"), locale);
    assert.ok(text.includes("@recipient_اسم"), locale);
    assert.ok(msg("fan.value0SentYouAGift", { value0: "@sender" }).includes("@sender"), locale);
    assert.ok(msg("verification.bankEnding", { value0: "0042" }).includes("0042"), locale);
  }
  activateLanguage("pt");
  assert.equal(msg("fan.youSentAGiftToValue0", { value0: "@recipient" }), "Enviaste um presente a @recipient");
  activateLanguage("fr");
  assert.equal(msg("activity.mentionedYouInTheirStory"), "T’a mentionné dans sa story");
  activateLanguage("de");
  assert.equal(msg("fan.value0SentYouAGift", { value0: "@sender" }), "@sender hat dir ein Geschenk gesendet");
  activateLanguage("en");
});
