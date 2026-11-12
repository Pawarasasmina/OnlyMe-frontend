import { test, expect } from "@playwright/test";

for (const automatic of [false, true]) test(`real story row keeps order after marking viewed, automatic ${automatic}`, async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/**", async route => {
    if (!new URL(route.request().url()).pathname.startsWith("/api/")) return route.continue();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: {} }) });
  });
  await page.goto("/tests/fixtures/story-row.html");
  await page.getByRole("button", { name: /View Lina/ }).click();
  await expect(page.getByText("Lina story", { exact: true })).toBeVisible();
  await page.clock.runFor(1200);
  await expect(page.locator(".wall-story-strip button").filter({ hasText: "Lina" }).locator(".wall-story-ring-viewed")).toHaveCount(1);
  if (automatic) await page.clock.runFor(4100);
  else await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Mia story", { exact: true })).toBeVisible();
  await page.clock.runFor(1200);
  await expect(page.locator(".wall-story-strip button").filter({ hasText: "Mia" }).locator(".wall-story-ring-viewed")).toHaveCount(1);
  if (automatic) await page.clock.runFor(4100);
  else await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Zoe story", { exact: true })).toBeVisible();
  if (!automatic) {
    await page.keyboard.press("ArrowLeft"); await expect(page.getByText("Mia story", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight"); await expect(page.getByText("Zoe story", { exact: true })).toBeVisible();
  }
  if (automatic) await page.clock.runFor(5300);
  else await page.keyboard.press("ArrowRight");
  await expect(page.locator(".story-viewer-surface")).toHaveCount(0);
});
for (const reduced of [false, true]) test(`person transition, reduced motion ${reduced}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.addInitScript(() => {
    window.storyTurns = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.classList.contains("story-viewer-surface")) window.storyTurns.push({ frames, options, direction: this.dataset.storyTurn });
      return animate.call(this, frames, options);
    };
  });
  await page.goto("/tests/fixtures/story-turn.html");
  await page.getByRole("button", { name: "Open stories" }).click();
  expect(await page.evaluate(() => window.storyTurns.length)).toBe(0);
  await page.getByRole("button", { name: "Next story", exact: true }).click();
  await expect(page.getByText("Lina story 2", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.storyTurns.length)).toBe(0);
  await page.getByRole("button", { name: "Next story", exact: true }).click();
  await expect(page.getByText("Mia story 1", { exact: true })).toBeVisible();
  if (!reduced) {
    const turns = await page.evaluate(() => window.storyTurns);
    expect(turns).toHaveLength(1); expect(turns[0].options.duration).toBe(180);
    expect(turns[0].frames[0].transform).toContain("rotateY(65deg)");
  }
  await page.getByRole("button", { name: "Previous story", exact: true }).click();
  await expect(page.getByText("Lina story 1", { exact: true })).toBeVisible();
  const turns = await page.evaluate(() => window.storyTurns);
  expect(turns).toHaveLength(reduced ? 0 : 2);
  if (!reduced) expect(turns[1].frames[0].transform).toContain("rotateY(-65deg)");
});
