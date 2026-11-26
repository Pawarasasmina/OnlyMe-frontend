import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`separate wallets show reconciled balances and isolated test money at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const row = { _id: "earning", createdAt: "2026-11-26T00:00:00Z", entryType: "MANUAL_ADJUSTMENT", referenceType: "SHOWCASE_CREATOR_INCOME", referenceId: "demo", walletChange: 3500, walletBalance: 3500, adjustment: true, metadata: { seeded: true } };
    const report = { reconciliation: "MATCHED", fanCoins: 70, creatorEarningsUsd: 3500, fanLedger: [], earningsLedger: [row] };
    await page.route("**/admin/governance/targets?**", (route) => route.fulfill({ json: { data: { items: [{ id: "creator", title: "Test Creator", subtitle: "@creator", badge: "USER" }] } } }));
    await page.route("**/admin/finance/users/creator", (route) => route.fulfill({ json: { data: { user: { username: "creator", name: "Test Creator" }, ledger: [], purchases: {}, walletReports: { REAL_SEED: report, TEST: { ...report, fanCoins: 40, creatorEarningsUsd: 0, earningsLedger: [], reconciliation: "DRIFT", reconciliationMessage: "Ledger history does not reconcile with stored wallet balances. Financial review is required." } } } } }));
    await page.goto("/tests/fixtures/payout-hold.html");
    await page.getByRole("button", { name: /Test Creator/ }).click();
    const wallets = page.getByRole("region", { name: "Separate wallets" });
    await expect(wallets.getByText("70 coins", { exact: true })).toBeVisible();
    await expect(wallets.getByText("$3,500.00", { exact: true }).first()).toBeVisible();
    await expect(wallets.getByText("Manual / opening adjustment · Demo data", { exact: true })).toBeVisible();
    await wallets.getByRole("button", { name: "Test money", exact: true }).click();
    await expect(wallets.getByText("40 coins", { exact: true })).toBeVisible();
    await expect(wallets.getByText("$0.00", { exact: true })).toBeVisible();
    await expect(wallets.getByRole("alert")).toContainText("Financial review is required");
  });
}
