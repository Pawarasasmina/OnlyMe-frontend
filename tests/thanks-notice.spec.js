import { test, expect } from "@playwright/test";

async function fixture(page, acknowledged = false) {
  const state = { id: "notification-thanks-1", acknowledged, acknowledgements: [] };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (route.request().method() === "POST") {
      state.acknowledgements.push(path);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { acknowledged: true } }) });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { items: [{ id: state.id, type: "gift_thanks", acknowledged: state.acknowledged, read: false, preview: "Thank you for your gift", relatedCreator: { name: "Aisha", username: "aisha" } }] } }) });
  });
  await page.goto("/tests/fixtures/thanks.html");
  return state;
}
test("a thank-you announces once, survives refresh, and a different thank-you still announces", async ({ page }) => {
  const state = await fixture(page);
  await expect(page.locator(".fan-gift-thanks-toast")).toContainText("Aisha thanked you");
  await expect.poll(() => state.acknowledgements.length).toBe(1);
  // Keep returning the same unread server response to exercise the offline/local fallback.
  await Promise.all([page.waitForResponse(response => response.url().includes("/fan/activity")), page.reload()]);
  await expect(page.locator(".fan-gift-thanks-toast.is-visible")).toHaveCount(0);
  expect(state.acknowledgements).toHaveLength(1);
  state.id = "notification-thanks-2";
  await page.reload();
  await expect(page.locator(".fan-gift-thanks-toast")).toContainText("Aisha thanked you");
  await expect.poll(() => state.acknowledgements.length).toBe(2);
});
test("acknowledged thanks stay quiet but remain manually accessible", async ({ page }) => {
  await fixture(page, true);
  await expect(page.getByRole("button", { name: "Open saved thanks" })).toBeVisible();
  await expect(page.locator(".fan-gift-thanks-toast.is-visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Open saved thanks" }).click();
  await expect(page.getByRole("dialog", { name: "Aisha's thank-you" })).toBeVisible();
});
