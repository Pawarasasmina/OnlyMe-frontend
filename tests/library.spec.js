import { test, expect } from "@playwright/test";

async function fixture(page, { fail = false, recap = { stories: 8, chapters: 1, messages: 38 } } = {}) {
  const membership = { id: "membership", creator: { name: "Sofia Reyes" }, premiumPublication: { id: "world", title: "Sofia’s World" }, memberNumber: 214, starsPerPeriod: 290, status: "ACTIVE", currentPeriodStart: "2026-10-03", currentPeriodEnd: "2099-11-02", cancelAtPeriodEnd: false };
  const state = { commands: [], fail };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    let data = { items: [] };
    if (path === "/api/memberships") data = { items: [membership, { ...membership, id: "expired", status: "EXPIRED", premiumPublication: { title: "Expired World" } }] };
    if (path.endsWith("/library")) data = { recap, items: [{ id: "chapter", title: "Before & after", kind: "chapter" }] };
    if (/\/premium-memberships\/.+\/(cancel|resume)$/.test(path)) {
      state.commands.push({ path, body: route.request().postDataJSON() });
      if (state.fail) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Please retry" }) });
      const cancel = path.endsWith("/cancel");
      Object.assign(membership, { status: cancel ? "CANCEL_AT_PERIOD_END" : "ACTIVE", cancelAtPeriodEnd: cancel });
      data = { membership: { ...membership }, receiptEmailSent: true };
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/library.html");
  return state;
}
test("Library manages, cancels, and restarts a World membership", async ({ page }) => {
  const state = await fixture(page);
  await expect(page.getByText("Expired World")).toHaveCount(0);
  await page.getByRole("button", { name: /Sofia’s World/ }).click();
  await expect(page.getByText("YOUR MONTH INSIDE")).toBeVisible();
  await expect(page.locator(".library-recap > div b")).toHaveText(["8", "1", "38"]);
  await expect(page.getByRole("link", { name: /Top up to stay/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancel membership", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cancel your membership?" })).toBeVisible();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  expect(state.commands).toHaveLength(0);
  await page.getByRole("button", { name: "Cancel membership", exact: true }).click();
  await page.getByRole("button", { name: "Finish cancellation" }).click();
  await expect(page.getByRole("heading", { name: "Your membership is cancelled" })).toBeVisible();
  await expect(page.getByText(/confirmation is on its way/)).toBeVisible();
  await page.getByRole("button", { name: "Restart membership" }).click();
  await expect(page.getByText("Next payment", { exact: true })).toBeVisible();
  expect(state.commands.map(x => x.path.split("/").at(-1))).toEqual(["cancel", "resume"]);
});
test("failed cancellation keeps the confirmation and reuses its idempotency key", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fixture(page, { fail: true });
  await page.getByRole("button", { name: /Sofia’s World/ }).click();
  await page.getByRole("button", { name: "Cancel membership", exact: true }).click();
  await page.getByRole("button", { name: "Finish cancellation" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  state.fail = false;
  await page.getByRole("button", { name: "Finish cancellation" }).click();
  await expect(page.getByRole("heading", { name: "Your membership is cancelled" })).toBeVisible();
  expect(state.commands[0].body.idempotencyKey).toBe(state.commands[1].body.idempotencyKey);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("empty billing-period activity displays numeric zeros", async ({ page }) => {
  await fixture(page, { recap: { stories: 0, chapters: 0, messages: 0 } });
  await page.getByRole("button", { name: /Sofia.s World/ }).click();
  await expect(page.locator(".library-recap > div b")).toHaveText(["0", "0", "0"]);
  await expect(page.getByText("Monthly activity totals are not available yet.")).toHaveCount(0);
});
