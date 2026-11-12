import { test, expect } from "@playwright/test";
import fs from "node:fs";
const matrix = JSON.parse(fs.readFileSync("docs/i18n/route-matrix.json", "utf8"));
const routes = matrix.filter(row => !row.redirect);

async function setup(page, language, route = "/settings", role = "creator") {
  await page.addInitScript(lang => {
    localStorage.setItem("atseen_language", lang);
    localStorage.removeItem("atseen_language_choice");
    localStorage.removeItem("atseen_account_languages");
  }, language);
  await page.route("**/api/**", async intercepted => {
    const path = new URL(intercepted.request().url()).pathname;
    if (!path.startsWith("/api/")) return intercepted.continue();
    if (path === "/api/settings/account") return intercepted.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { account: {}, preferences: { preferredLanguage: language, timezone: "UTC" } } }) });
    await intercepted.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "TEST_UNAVAILABLE", message: "Service unavailable" }) });
  });
  const concrete = route.replace(/:username/g, "original-user").replace(/:section/g, "help").replace(/:[a-zA-Z]+/g, "507f1f77bcf86cd799439011");
  await page.goto(`/tests/fixtures/i18n-app.html?route=${encodeURIComponent(concrete)}&role=${role}`);
  await expect(page.getByTestId("active-language")).toHaveText(language, { timeout: 15000 });
  const loading = await page.evaluate(() => window.i18nTest.msg("routes.loadingPage"));
  // Route modules are loaded lazily; wait for the route itself, not just the
  // shared shell, especially on a cold development server.
  await expect(page.getByRole("status", { name: loading, exact: true })).toHaveCount(0, { timeout: 20000 });
}

for (const language of ["en", "ru", "ar"]) {
  test(`all active routes render their unavailable/error state in ${language}`, async ({ page }) => {
    test.setTimeout(240000);
    const results = [];
    for (const row of routes) {
      await setup(page, language, row.path, row.role);
      await page.waitForTimeout(350);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect.soft(page.getByTestId("route-crash"), row.path).toHaveCount(0);
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      results.push({ route: row.path, role: row.role, state: "API unavailable" });
    }
    await test.info().attach(`routes-${language}`, { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  });
}

for (const language of ["en", "ar", "ru", "uk", "es", "pt", "fr", "de"]) {
  test(`switching to ${language} updates mounted screens and preserves data`, async ({ page }) => {
    await setup(page, "en");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({ timeout: 20000 });
    const expected = await page.evaluate(async lang => { await window.i18nTest.setLanguage(lang); return window.i18nTest.msg("Settings"); }, language);
    await expect(page.getByRole("heading", { name: expected, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
    await expect(page.getByText("English User اسم", { exact: true }).first()).toBeVisible();
    await page.evaluate(() => window.i18nTest.setLanguage("en"));
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
}

test("login labels switch in every language without clearing typed credentials", async ({ page }) => {
  await setup(page, "en", "/login", "guest");
  const email = page.locator('input[autocomplete="email"]');
  const password = page.locator('input[autocomplete="current-password"]');
  await email.fill("original@example.com");
  await password.fill("Unchanged-password-123");
  for (const language of ["ar", "ru", "uk", "es", "pt", "fr", "de", "en"]) {
    const labels = await page.evaluate(async language => {
      await window.i18nTest.setLanguage(language);
      return { email: window.i18nTest.msg("system.LoginPage.5a698f5f3b"), password: window.i18nTest.msg("Password") };
    }, language);
    await expect(email).toHaveAttribute("placeholder", labels.email);
    await expect(password).toHaveAttribute("placeholder", labels.password);
    await expect(email).toHaveValue("original@example.com");
    await expect(password).toHaveValue("Unchanged-password-123");
    await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
  }
});

test("onboarding keeps saved interest codes when the display language changes", async ({ page }) => {
  await setup(page, "en", "/start/interests", "guest");
  const add = await page.evaluate(() => `${window.i18nTest.msg("publication.add")} Travel`);
  await page.getByRole("button", { name: add, exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("atseen_pre_auth_interests") || "[]"))).toContain("Travel");
  await page.evaluate(async () => { await window.i18nTest.setLanguage("ar"); });
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("atseen_pre_auth_interests") || "[]"))).toEqual(["Travel"]);
  const heading = await page.evaluate(() => window.i18nTest.msg("system.InterestStoryPicker.a041eddb3b"));
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await expect(page.getByTestId("route-crash")).toHaveCount(0);
});

test("mobile Arabic settings fit the viewport and keep the language sheet usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, "ar");
  const label = await page.evaluate(() => window.i18nTest.msg("Language"));
  await page.getByRole("button", { name: `${label} العربية`, exact: true }).click();
  await expect(page.getByRole("radio")).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: "tmp/i18n-settings-arabic.png" });
});

test("welcome navigation mirrors in Arabic and language changes preserve the active slide", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("atseen_language", "ar"));
  await page.goto("/tests/fixtures/i18n-app.html?role=guest&view=welcome");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  const tabs = page.locator("footer button[aria-pressed]");
  await page.locator("main").focus();
  await page.keyboard.press("Home");
  await expect(tabs.nth(0)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.nth(1)).toHaveAttribute("aria-pressed", "true");
  const picker = page.getByRole("combobox");
  await picker.focus();
  await picker.selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(tabs.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.locator("main").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("authored moderation feedback stays unchanged even when it matches an interface label", async ({ page }) => {
  await page.goto("/tests/fixtures/i18n-app.html?role=guest&view=feedback");
  for (const language of ["ar", "ru", "fr", "de"]) {
    await page.evaluate(lang => window.i18nTest.setLanguage(lang), language);
    await expect(page.getByText("Save", { exact: true })).toBeVisible();
    await expect(page.getByText("Save", { exact: true })).toHaveAttribute("dir", "auto");
  }
});

test("translated moderation reasons submit original API codes and preserve typed feedback", async ({ page }) => {
  await page.goto("/tests/fixtures/i18n-app.html?role=guest&view=decision");
  await page.getByRole("checkbox").first().check();
  await page.locator("textarea").first().fill("Save");
  await page.evaluate(() => window.i18nTest.setLanguage("de"));
  await expect(page.getByText("Problem mit Titel oder Beschreibung", { exact: true })).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue("Save");
  const submit = await page.evaluate(() => window.i18nTest.msg("admin.requestContentChanges"));
  await page.getByRole("button", { name: submit, exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.i18nSubmission?.reasonCodes)).toEqual(["TITLE_OR_DESCRIPTION_ISSUE"]);
  expect(await page.evaluate(() => window.i18nSubmission.creatorVisibleMessage)).toBe("Save");
});
