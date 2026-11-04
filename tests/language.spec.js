import { test, expect } from "@playwright/test";

async function fixture(page, { preferredLanguage = "en", fail = false, device = "en-US" } = {}) {
  const writes = [];
  await page.addInitScript(value => Object.defineProperty(navigator, "languages", { get: () => [value] }), device);
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (path === "/api/settings/account" && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (fail) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unable to save. Try again." }) });
      preferredLanguage = body.preferredLanguage;
    }
    const data = { account: {}, preferences: { preferredLanguage, timezone: "Asia/Colombo", phoneNumber: "" }, privacySettings: {}, items: [] };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/ownership.html");
  await expect(page.locator(".settings-index-row").filter({ hasText: "English" })).toBeVisible();
  return writes;
}

test("picker matches the prototype and closes without writing", async ({ page }) => {
  const writes = await fixture(page);
  await page.getByRole("button", { name: "Language English", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio")).toHaveCount(8);
  await expect(dialog.getByRole("radio", { name: "English", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByText("Portuguese (Portugal)")).toBeVisible();
  const center = await page.locator(".social-center-scroll").boundingBox();
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBe(center.x);
  expect(bounds.width).toBe(center.width);
  await page.screenshot({ path: "tmp/language-desktop.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(writes).toHaveLength(0);
});

test("device suggestion saves Portuguese locale and survives reload", async ({ page }) => {
  const writes = await fixture(page, { device: "pt-BR" });
  await page.getByRole("button", { name: "Language English", exact: true }).click();
  const suggested = page.getByRole("radiogroup", { name: "Suggested", exact: true });
  await suggested.getByRole("radio").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes).toEqual([{ preferredLanguage: "pt-PT" }]);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await page.reload();
  await expect(page.getByRole("button", { name: "Idioma Português", exact: true })).toBeVisible();
});

test("Arabic changes direction and reopens a right-to-left picker", async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Language English", exact: true }).click();
  await page.getByRole("radio", { name: "العربية Arabic", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "اللغة العربية", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("dir", "rtl");
  await page.screenshot({ path: "tmp/language-arabic-mobile.png" });
});

test("failed preference save keeps the local language and retries after reconnect", async ({ page }) => {
  const writes = await fixture(page, { fail: true });
  await page.getByRole("button", { name: "Language English", exact: true }).click();
  await page.getByRole("radio", { name: "Français French", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("atseen_account_languages")).owner.pending)).toBe(true);
  await page.route("**/api/settings/account", async route => {
    const preferences = route.request().postDataJSON();
    writes.push(preferences);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { preferences } }) });
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("atseen_account_languages")).owner.pending)).toBe(false);
  expect(writes.at(-1).preferredLanguage).toBe("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});
