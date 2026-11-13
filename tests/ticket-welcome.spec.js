import { test, expect } from "@playwright/test";

test("onboarding card has the one-second tilted entrance and delayed five-second sweep", async ({ page }) => {
  await page.goto("/tests/fixtures/ticket-welcome.html?overlay=1");
  const card = page.locator(".ticket-motion-card");
  await expect(card).toHaveCSS("animation-duration", "1s");
  const sweep = await card.evaluate(element => {
    const style = getComputedStyle(element, "::after");
    const animation = element.getAnimations({ subtree: true }).find(item => item.animationName === "ticketCardSweep");
    return { duration: style.animationDuration, delay: style.animationDelay, repeat: style.animationIterationCount, pointer: style.pointerEvents, keyframes: animation.effect.getKeyframes().map(frame => ({ offset: frame.offset, left: frame.left })) };
  });
  expect(sweep).toMatchObject({ duration: "5s", delay: "1s", repeat: "infinite", pointer: "none" });
  expect(sweep.keyframes).toEqual([{ offset: 0, left: "-90%" }, { offset: .6, left: "-90%" }, { offset: .85, left: "140%" }, { offset: 1, left: "140%" }]);
  await expect(card).toContainText("1,292");
  await expect(card).toContainText("2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Continued")).toBeVisible();
});

test("profile ticket uses the same card animation and can close", async ({ page }) => {
  await page.goto("/tests/fixtures/ticket-welcome.html?mode=profile");
  await page.getByRole("button", { name: /Open your member ticket/ }).click();
  await expect(page.locator(".member-ticket-card")).toHaveCSS("animation-name", "ticketCardIn");
  await expect(page.locator(".member-ticket-card")).toContainText("1,292");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("missing member data never becomes a fabricated number or city", async ({ page }) => {
  await page.goto("/tests/fixtures/ticket-welcome.html?missing=1");
  await expect(page.locator(".ticket-motion-card strong")).toHaveText("—");
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeDisabled();
  await expect(page.locator(".ticket-motion-card")).not.toContainText("Dubai");
  await expect(page.locator(".ticket-motion-card small")).toHaveCount(0);
});

test("ticket clipboard fallback confirms actual success and reports failures", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async text => { window.ticketCopied = text; } }, configurable: true });
  });
  await page.goto("/tests/fixtures/ticket-welcome.html");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  expect(await page.evaluate(() => window.ticketCopied)).toContain("1,292");
  await expect(page.getByRole("status")).toContainText(/copied/i);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Denied"); }; });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not copy");
});

test("returning refresh opens the eye briefly and does not require another action", async ({ page }) => {
  await page.goto("/tests/fixtures/ticket-welcome.html?mode=welcome-return");
  await expect(page.locator(".welcome-eye--returning")).toHaveCSS("animation-duration", "0.55s");
  await expect(page.getByText("Existing content")).toBeVisible();
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
});

test("retained long welcome has the original eye and staggered text timings", async ({ page }) => {
  await page.goto("/tests/fixtures/ticket-welcome.html?mode=welcome-full");
  await expect(page.locator(".welcome-eye--opening")).toHaveCSS("animation-duration", "1.7s");
  await expect(page.locator(".welcome-eye--opening")).toHaveCSS("animation-delay", "0.5s");
  for (const [selector, delay] of [[".welcome-moment-line", "2s"], [".welcome-moment-cta", "2.9s"], [".welcome-moment-mark", "3.5s"]]) await expect(page.locator(selector)).toHaveCSS("animation-delay", delay);
  await page.getByRole("button", { name: "Step inside", exact: true }).click();
  await expect(page.getByText("Continued")).toBeVisible();
});

test("new visitors keep the video carousel", async ({ page }) => {
  await page.goto("/tests/fixtures/ticket-welcome.html?mode=welcome-page");
  await expect(page.locator("video").first()).toBeAttached();
  await expect(page.locator(".welcome-eye--opening")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Get started", exact: true })).toBeVisible();
});

test("reduced motion removes ticket sweep and welcome animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/fixtures/ticket-welcome.html?overlay=1");
  await expect(page.locator(".ticket-motion-card")).toHaveCSS("animation-name", "none");
  expect(await page.locator(".ticket-motion-card").evaluate(element => getComputedStyle(element, "::after").display)).toBe("none");
  await page.goto("/tests/fixtures/ticket-welcome.html?mode=welcome-full");
  await expect(page.locator(".welcome-eye--opening")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".welcome-moment-line")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "Step inside", exact: true })).toBeVisible();
});
