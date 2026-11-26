import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`hold and release use an in-page sheet at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => { window.prompt = () => { throw new Error("prompt is not supported"); }; });
    const actions = [];
    await page.route("**/admin/governance/targets?**", (route) => route.fulfill({ json: { data: { items: [{ id: "test-user", title: "Test Creator", subtitle: "@testcreator", badge: "USER" }] } } }));
    await page.route("**/admin/finance/users/test-user", (route) => route.fulfill({ json: { data: { user: { name: "Test Creator", username: "testcreator", email: "test@example.com" }, payoutHold: null, ledger: [], purchases: {} } } }));
    await page.route("**/admin/finance/users/test-user/payout-*", async (route) => {
      actions.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await route.fulfill({ json: { data: { hold: { _id: "hold", active: !route.request().url().endsWith("payout-release"), reason: "Review required" } } } });
    });
    await page.goto("/tests/fixtures/payout-hold.html");
    await page.getByRole("button", { name: /Test Creator/ }).click();
    await page.getByRole("button", { name: "Hold payouts", exact: true }).click();
    let sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(actions).toHaveLength(0);
    await page.getByRole("button", { name: "Hold payouts", exact: true }).click();
    await sheet.getByRole("textbox").fill("Review required");
    await sheet.getByRole("button", { name: "Hold payouts", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Payout hold active$/ })).toHaveText("Payout hold active");
    await page.getByRole("button", { name: "Release payout hold", exact: true }).click();
    await sheet.getByRole("textbox").fill("Review completed");
    await sheet.getByRole("button", { name: "Release payout hold", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Payout hold released$/ })).toHaveText("Payout hold released");
    await expect(page.getByRole("button", { name: "Hold payouts", exact: true })).toBeVisible();
    expect(actions).toHaveLength(2);
    expect(actions[0].body.reason).toBe("Review required");
    expect(actions[1].body.reason).toBe("Review completed");
  });
}
