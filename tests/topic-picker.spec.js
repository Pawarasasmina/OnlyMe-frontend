import { test, expect } from "@playwright/test";
async function open(page, ready = false) {
  await page.route("**/api/**", async route => { if (!new URL(route.request().url()).pathname.startsWith("/api/")) return route.continue(); await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [] } }) }); });
  await page.goto(`/tests/fixtures/topic-picker.html${ready ? "?ready" : ""}`);
  await expect(page.locator('.interest-topic-card[data-topic="Travel"]').first()).toBeVisible();
}
const travel = page => page.locator('.interest-topic-card[data-topic="Travel"]');
const toggle = card => card.locator("button[aria-pressed]");
const selected = async page => JSON.parse(await page.getByTestId("selected-topics").textContent());
test("added card, pulse and topic marker show immediately", async ({ page }) => {
  await page.addInitScript(() => { window.topicMotion = []; const animate = Element.prototype.animate; Element.prototype.animate = function(frames, options) { window.topicMotion.push({ duration: options.duration, target: this.className }); return animate.call(this, frames, options); }; });
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: "no-preference" }); await open(page, true);
  const card = travel(page).first();
  await toggle(card).click();
  await expect(card).toHaveAttribute("data-added", "true"); await expect(toggle(card)).toHaveAttribute("aria-pressed", "true");
  await expect(card).toHaveCSS("border-color", "rgb(156, 203, 255)");
  const animations = await page.evaluate(() => window.topicMotion);
  expect(animations.some(animation => animation.duration === 450)).toBe(true);
  expect(animations.some(animation => animation.duration === 300 && animation.target.includes("interest-topic-tab"))).toBe(true);
  await expect(page.locator(".interest-topic-tab").first().locator(".interest-topic-selected-dot")).toHaveCount(1);
  await expect(card.locator(".interest-swipe-cue")).toHaveCSS("animation-duration", "1.8s");
  await page.screenshot({ path: test.info().outputPath("added-topic.png"), animations: "disabled" });
});
test("per-video selections count each topic once and survive reload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await open(page, true);
  const cards = travel(page);
  await toggle(cards.nth(0)).click(); expect(await selected(page)).toHaveLength(4);
  await expect(cards.nth(1)).toHaveAttribute("data-added", "false");
  await cards.nth(0).getByRole("button", { name: "Next chapter" }).click();
  await toggle(cards.nth(1)).click(); expect(await selected(page)).toHaveLength(4);
  await expect(cards.filter({ has: page.locator('button[aria-pressed="true"]') })).toHaveCount(2);
  await page.reload();
  await expect(cards.nth(0)).toHaveAttribute("data-added", "true"); await expect(cards.nth(1)).toHaveAttribute("data-added", "true");
  await toggle(cards.nth(0)).click(); expect(await selected(page)).toContain("Travel");
  await cards.nth(0).getByRole("button", { name: "Next chapter" }).click();
  await toggle(cards.nth(1)).click(); expect(await selected(page)).not.toContain("Travel");
  await expect(page.locator(".interest-topic-tab").first().locator(".interest-topic-selected-dot")).toHaveCount(0);
});
test("auto-advance waits for the selection feedback", async ({ page }) => {
  await page.clock.install(); await page.emulateMedia({ reducedMotion: "no-preference" }); await open(page);
  await toggle(travel(page).first()).click();
  await page.clock.runFor(400); await expect(page.locator(".interest-topic-tab").first()).toHaveAttribute("aria-current", "true");
  await page.clock.runFor(800); await expect(page.locator(".interest-topic-tab").nth(1)).toHaveAttribute("aria-current", "true");
});
test("reduced motion keeps selection feedback without pulse, nudge or automatic movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.clock.install(); await open(page);
  const card = travel(page).first(); await toggle(card).click();
  await expect(card).toHaveAttribute("data-added", "true");
  expect(await toggle(card).evaluate(button => button.getAnimations().length)).toBe(0);
  await expect(card.locator(".interest-swipe-cue")).toHaveCSS("animation-name", "none");
  await page.clock.runFor(1400); await expect(page.locator(".interest-topic-tab").first()).toHaveAttribute("aria-current", "true");
  await card.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.locator(".interest-swipe-cue")).toHaveCount(0);
});
test("topic typography and separate search controls match the prototype", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 925 });
  await open(page, true);
  const tabs = page.locator(".interest-topic-tabs");
  const first = tabs.locator("button").first();
  await expect(first).toHaveCSS("font-size", "14px");
  await expect(first).toHaveCSS("font-weight", "700");
  await expect(first).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(tabs.locator("button").nth(1)).toHaveCSS("color", "rgba(255, 255, 255, 0.4)");
  await expect(tabs).toHaveCSS("column-gap", "18px");
  await page.locator(".interest-search-open").click();
  const input = page.locator(".interest-search-field input");
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS("font-size", "14px");
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(page.locator(".interest-search-field button")).toHaveCount(0);
  await expect(page.locator(".interest-search-close")).toHaveCSS("border-radius", "50%");
  await input.fill("Travel");
  await expect(tabs.locator("button")).toHaveCount(1);
  await page.screenshot({ path: test.info().outputPath("topic-search.png"), animations: "disabled" });
  await page.locator(".interest-search-close").click();
  await expect(page.locator(".interest-heading-copy")).toBeVisible();
  await expect(tabs.locator("button")).toHaveCount(4);
});

