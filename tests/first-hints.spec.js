import { test, expect } from "@playwright/test";
const hint = page => page.locator("[data-first-hint-bubble]");
async function open(page, query = "") {
  await page.clock.install();
  await page.goto(`/tests/fixtures/first-hints.html${query}`);
  await expect(page.getByRole("button", { name: "Toggle sheet" })).toBeVisible();
}
test("delays 1.1 seconds, marks on display, and hides after 4.5 seconds", async ({ page }) => {
  await open(page);
  await page.clock.runFor(1000); await expect(hint(page)).toHaveCount(0);
  await page.clock.runFor(101); await expect(hint(page)).toHaveText("Tap a label to see only those posts");
  expect(await page.evaluate(() => localStorage.getItem("atseen:first-hint:v1:person-a:wall"))).toBe("1");
  await page.clock.runFor(4500); await expect(hint(page)).toHaveCount(0);
  await page.reload(); await page.clock.runFor(1200); await expect(hint(page)).toHaveCount(0);
});
test("seen memory belongs to each account and pointer dismissal preserves the action", async ({ page }) => {
  await open(page); await page.clock.runFor(1200); await expect(hint(page)).toBeVisible();
  await page.getByRole("button", { name: "Switch account" }).click();
  await expect(hint(page)).toHaveCount(0); await page.clock.runFor(1200); await expect(hint(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("atseen:first-hint:v1:person-b:wall"))).toBe("1");
  await page.getByRole("link", { name: "Filter Wall by Question" }).click();
  await expect(page).toHaveURL(/\/wall\?type=question$/); await expect(hint(page)).toHaveCount(0);
});
test("a sheet defers an unseen hint, and opening a sheet hides a visible hint", async ({ page }) => {
  await open(page, "?blocked=1"); await page.clock.runFor(1200); await expect(hint(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("atseen:first-hint:v1:person-a:wall"))).toBeNull();
  await page.getByRole("button", { name: "Toggle sheet" }).click(); await expect(hint(page)).toBeVisible();
  // Open without a pointer event to exercise overlay detection itself.
  await page.getByRole("button", { name: "Toggle sheet" }).evaluate(button => button.click());
  await expect(hint(page)).toHaveCount(0);
});
test("onboarding and absent targets do not consume hints", async ({ page }) => {
  await open(page, "?onboarding=1&missing=1"); await page.clock.runFor(1200); await expect(hint(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle onboarding" }).click(); await page.clock.runFor(1200); await expect(hint(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle target" }).click(); await expect(hint(page)).toBeVisible();
});
for (const [kind, text] of Object.entries({ highlights: "Keep your best stories here — they stay after 24 hours", gift: "Send a gift right from the chat", photo: "Tap the photo to see today’s stories", save: "Save it — find it later in your Library", swipe: "Swipe to read", ask: "Ask — people nearby answer", react: "Double-tap to react" })) test(`${kind} stays within the mobile column`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, `?kind=${kind}`); await page.clock.runFor(1200);
  await expect(hint(page)).toHaveText(text);
  const box = await hint(page).locator("span").boundingBox(); expect(box.x).toBeGreaterThanOrEqual(10); expect(box.x + box.width).toBeLessThanOrEqual(380);
  await page.screenshot({ path: test.info().outputPath(`${kind}-hint.png`), animations: "disabled" });
  await page.keyboard.press("Escape"); await expect(hint(page)).toHaveCount(0);
});

test("supplementary hints wait for a later visit rather than queueing popups", async ({ page }) => {
  await open(page, "?kind=multiple"); await page.clock.runFor(1200);
  await expect(hint(page)).toHaveText("Send a gift right from the chat");
  await page.clock.runFor(5000); await expect(hint(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("atseen:first-hint:v1:person-a:react"))).toBeNull();
  await page.reload(); await page.clock.runFor(1200);
  await expect(hint(page)).toHaveText("Double-tap to react");
  await page.reload(); await page.clock.runFor(1200); await expect(hint(page)).toHaveCount(0);
});
