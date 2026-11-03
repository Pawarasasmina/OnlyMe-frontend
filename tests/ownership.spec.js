import { test, expect } from "@playwright/test";

async function fixture(page, { earnings = 1077.2, failure = false, checkFailure = false } = {}) {
  const mutations = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (!path.startsWith("/api/")) return route.continue();
    if (method !== "GET") mutations.push({ path, method, data: route.request().postDataJSON() });
    if ((failure && method !== "GET") || (checkFailure && path.endsWith("/ownership"))) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Please try again later." }) });
    const data = path.endsWith("/ownership") ? { unwithdrawnUsd: earnings } : path.endsWith("/identity") ? { status: "not_started", bankReady: false } : { account: {}, privacySettings: {}, items: [] };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/ownership.html");
  await page.getByRole("button", { name: "Account ownership and control" }).click();
  return mutations;
}

test("ownership sheet matches the center column and deactivation can be canceled", async ({ page }) => {
  const calls = await fixture(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Deactivate or delete" })).toBeVisible();
  const center = await page.locator(".social-center-scroll").boundingBox();
  const bounds = await dialog.boundingBox();
  expect(Math.abs(center.x - bounds.x)).toBeLessThan(2);
  expect(Math.abs(center.width - bounds.width)).toBeLessThan(2);
  await page.getByRole("button", { name: "Deactivate account", exact: false }).click();
  await expect(dialog.getByText(/Subscribers keep access until their month ends/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Deactivate or delete" })).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("earnings warning precedes final deletion and payout link opens real payout flow", async ({ page }) => {
  const calls = await fixture(page);
  await page.getByRole("button", { name: "Delete account", exact: false }).click();
  await expect(page.getByRole("heading", { name: "You have $1,077.20 not withdrawn" })).toBeVisible();
  await page.getByRole("button", { name: "Go to payouts" }).click();
  await expect(page.getByRole("heading", { name: "Payouts", exact: true })).toBeVisible();
  expect(calls).toHaveLength(0);
});

test("delete anyway still requires final confirmation; keeping account has no mutation", async ({ page }) => {
  const calls = await fixture(page);
  await page.getByRole("button", { name: "Delete account", exact: false }).click();
  await page.getByRole("button", { name: "Delete anyway" }).click();
  await expect(page.getByText("Your worlds, stories and notes will be gone within 30 days. Unused coins can’t be refunded.")).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls).toHaveLength(0);
});

test("zero earnings skips warning and confirmed deletion logs out", async ({ page }) => {
  const calls = await fixture(page, { earnings: 0 });
  await page.getByRole("button", { name: "Delete account", exact: false }).click();
  await page.getByRole("button", { name: "Delete my account", exact: true }).click();
  await expect(page.getByText("Logged out", { exact: true })).toBeVisible();
  expect(calls[0]).toMatchObject({ path: "/api/auth/account", method: "DELETE" });
  expect(await page.evaluate(() => window.ownershipLoggedOut)).toBe(true);
});

test("deactivation failure keeps account signed in and permits retry", async ({ page }) => {
  const calls = await fixture(page, { failure: true });
  await page.getByRole("button", { name: "Deactivate account", exact: false }).click();
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Please try again later.");
  expect(calls[0]).toMatchObject({ path: "/api/auth/account/deactivate", method: "POST" });
  expect(await page.evaluate(() => window.ownershipLoggedOut)).toBeUndefined();
  await expect(page.getByRole("button", { name: "Deactivate", exact: true })).toBeEnabled();
});

test("failed earnings check cannot silently skip the warning", async ({ page }) => {
  const calls = await fixture(page, { checkFailure: true });
  await page.getByRole("button", { name: "Delete account", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Unable to check your earnings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete my account", exact: true })).toHaveCount(0);
  expect(calls).toHaveLength(0);
});

test("mobile deactivation stays within viewport and logs out after confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = await fixture(page);
  await page.screenshot({ path: "tmp/ownership-mobile.png" });
  await page.getByRole("button", { name: "Deactivate account", exact: false }).click();
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds.x).toBe(0);
  expect(bounds.width).toBe(390);
  expect(bounds.y).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(page.getByText("Logged out", { exact: true })).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0].path).toBe("/api/auth/account/deactivate");
});
