import { test, expect } from "@playwright/test";
const ready = { enabled: true, accountType: "creator", category: "Digital creator", country: "Sri Lanka", hasDateOfBirth: true, eligibility: { age: true, country: true, terms: true, standing: true }, verified: true, payoutsReady: true, sellerReady: true, policy: { enabled: true, supportedCountries: ["Sri Lanka", "France"], termsVersion: "v-test" }, tools: { gifts: true, dream: true, directAccess: true, paidSeens: true, world: true } };
async function fixture(page, { data = ready, walletError = false, failSave = false, admin = false } = {}) {
  const calls = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const method = route.request().method();
    if (method !== "GET") calls.push({ path, body: route.request().postDataJSON() });
    if (walletError && path === "/api/wallet" || failSave && method === "PUT") return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Please try again later." }) });
    if (path === "/api/settings/monetization" && method === "PUT") {
      data = { ...ready, policy: data.policy, enabled: data.policy.supportedCountries.length > 0, payoutsReady: data.payoutsReady, eligibility: { ...ready.eligibility, country: data.policy.supportedCountries.length > 0 } };
    }
    const payload = path === "/api/creator/verification" ? { verification: { purpose: "IDENTITY", status: data.verified ? "APPROVED" : "NOT_STARTED" } } : path.endsWith("/monetization-policy") ? method === "PUT" ? route.request().postDataJSON() : ready.policy : path === "/api/settings/monetization" ? data : path === "/api/wallet" ? { wallet: { availableIncomeUsd: 12.34, pendingIncomeUsd: 56.78, starsPerUsd: 37 } } : path === "/api/identity" ? { status: "verified", bankAvailable: true, bankReady: data.payoutsReady, bankLast4: data.payoutsReady ? "1234" : "", automaticPayout: true } : path === "/api/identity/bank" ? { available: true, bank: null } : { account: { profileAccountType: data.accountType, profileCategory: data.category }, gifts: [], items: [] };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: payload }) });
  });
  await page.goto(`/tests/fixtures/monetization.html${admin ? "?admin" : ""}`);
  return calls;
}
test("eligible page matches prototype sections and uses live dollar values", async ({ page }) => {
  await fixture(page);
  await expect(page.getByText("You can earn on @seen")).toBeVisible();
  await expect(page.getByText("Creator · Sri Lanka")).toBeVisible();
  for (const name of ["Eligibility", "Ways to earn", "Payouts"]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText("Available $12.34 · $56.78 clearing")).toBeVisible();
  await expect(page.locator(".monetization-tool .monetization-on")).toHaveCount(7);
  await page.screenshot({ path: "tmp/monetization-desktop.png", fullPage: true });
  await page.getByRole("button", { name: /Holds & refunds/ }).click();
  await expect(page.getByRole("heading", { name: "Holds & refunds" })).toBeVisible();
});
test("personal accounts switch type before World and Direct Access", async ({ page }) => {
  await fixture(page, { data: { ...ready, accountType: "personal", category: "", tools: { ...ready.tools, world: false, directAccess: false } } });
  await page.getByRole("button", { name: /World Monthly subscription/ }).click();
  await expect(page.getByRole("dialog", { name: "Account type", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Personal Current/ })).toBeVisible();
});
test("missing eligibility can be completed and persists server response", async ({ page }) => {
  const calls = await fixture(page, { data: { ...ready, enabled: false, verified: false, hasDateOfBirth: false, country: "", eligibility: { age: false, country: false, terms: false, standing: true } } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Complete eligibility" }).click();
  const dialog = page.getByRole("dialog", { name: "Complete eligibility" });
  await dialog.getByLabel("Date of birth", { exact: false }).fill("1995-01-01");
  await dialog.getByLabel("Payout country").selectOption("France");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("You can earn on @seen")).toBeVisible();
  expect(calls[0].body).toEqual({ dateOfBirth: "1995-01-01", country: "France", acceptTerms: true, termsVersion: "v-test" });
});

test("approved identity and bank do not bypass missing monetization consent", async ({ page }) => {
  const calls = await fixture(page, { data: { ...ready, enabled: false, eligibility: { ...ready.eligibility, terms: false } } });
  await page.getByRole('button', { name: 'Complete eligibility', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Complete eligibility', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await expect(dialog.getByLabel('Date of birth', { exact: false })).toHaveCount(0);
  await expect(dialog.getByRole('combobox')).toHaveCount(0);
  await expect(dialog.locator('.monetization-approved-country')).toHaveText('Sri Lanka');
  await expect(page.locator('.identity-scene')).toHaveCount(0);
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('You can earn on @seen')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete eligibility', exact: true })).toHaveCount(0);
  await expect(page.locator('.monetization-check .is-passed')).toHaveCount(4);
  expect(calls).toHaveLength(1);
  expect(calls[0].body.acceptTerms).toBe(true);
  expect(calls[0].body.country).toBe('Sri Lanka');
});
test("empty country list opens the admin bank flow after explicit consent", async ({ page }) => {
  const calls = await fixture(page, { data: { ...ready, enabled: false, country: "UAE", payoutsReady: false, eligibility: { ...ready.eligibility, terms: false, country: false }, policy: { ...ready.policy, supportedCountries: [] } }, walletError: true });
  await expect(page.getByText("Balance unavailable")).toBeVisible();
  await page.getByRole("button", { name: "Complete eligibility" }).click();
  const consent = page.getByRole("dialog", { name: "Complete eligibility" });
  await consent.getByRole("checkbox").check();
  await consent.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You’re verified" })).toBeVisible();
  await expect(page.locator(".identity-scene")).toBeVisible();
  await expect(page.getByText("Your badge is on. Add a bank to withdraw.")).toBeVisible();
  await page.screenshot({ path: "tmp/verified-bank-entry.png" });
  await page.getByRole("button", { name: "Add a bank for payouts", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set up payouts" })).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add a bank for payouts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit for admin review" })).toBeVisible();
  expect(calls[0].body.country).toBe("UAE");
  expect(calls[0].body.acceptTerms).toBe(true);
});
test("admin manages payout countries independently of coin exchange rate", async ({ page }) => {
  const calls = await fixture(page, { admin: true });
  await page.getByLabel("Supported payout countries (one per line)").fill("France\nSri Lanka");
  await page.getByRole("button", { name: "Save eligibility policy" }).click();
  await expect(page.getByRole("status")).toHaveText("Eligibility policy saved.");
  expect(calls[0]).toEqual({ path: "/api/admin/monetization-policy", body: { enabled: true, supportedCountries: ["France", "Sri Lanka"], termsVersion: "v-test" } });
});

 test("verified accounts see confirmation before bank setup and can defer it", async ({ page }) => {
  const calls = await fixture(page, { data: { ...ready, enabled: false, payoutsReady: false, eligibility: { ...ready.eligibility, country: false } } });
  await page.getByRole("button", { name: "Complete eligibility" }).click();
  await expect(page.locator(".identity-name")).toHaveText("Aisha Rahman");
  await page.getByRole("button", { name: "Later", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Verification", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Complete eligibility" }).click();
  await page.getByRole("button", { name: "Add a bank for payouts", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set up payouts" })).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit for admin review" })).toBeVisible();
  expect(calls).toHaveLength(0);
});
