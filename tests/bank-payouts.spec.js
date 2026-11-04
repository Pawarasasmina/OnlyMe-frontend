import { test, expect } from "@playwright/test";
const accountNumber = "AE070331234567890123456";
const application = { id: "bank1", status: "PENDING_REVIEW", version: 1, accountHolder: "Elena Petrova", bankName: "Review Bank", country: "AE", currency: "AED", accountLast4: "3456", user: { name: "Elena Petrova" } };
async function fixture(page, { view = "verify", status = null, admin = false, fail = false } = {}) {
  let bank = status ? { ...application, status, reviewMessage: status === "CHANGES_REQUESTED" ? "Please correct your details" : "" } : null;
  const calls = [];
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url()), path = url.pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const method = route.request().method();
    let data;
    if (method === "POST") {
      const body = route.request().postDataJSON(); calls.push({ path, body });
      if (fail) return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Please refresh your bank details." }) });
      bank = path.endsWith("/review") ? { ...bank, status: body.status, version: bank.version + 1 } : { ...application };
      data = { bank };
    } else if (path === "/api/identity") data = { provider: "manual", bankProvider: "manual", available: true, bankAvailable: true, status: "verified", bankReady: bank?.status === "APPROVED", bankStatus: bank?.status || "not_started", bankLast4: bank?.status === "APPROVED" ? "3456" : "" };
    else if (path === "/api/identity/bank") data = { available: true, bank };
    else if (path === "/api/identity/admin/banks") data = { items: bank && bank.status === url.searchParams.get("status") ? [bank] : [], total: bank?.status === "PENDING_REVIEW" ? 1 : 0, page: 1 };
    else if (path === "/api/identity/admin/banks/bank1") data = { bank: { ...bank, accountNumber, swift: "EBILAEAD", routing: "" } };
    else data = { verification: { purpose: "IDENTITY", status: "APPROVED" } };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto(admin ? "/tests/fixtures/bank-review.html" : `/tests/fixtures/verification.html?view=${view}`);
  return calls;
}
async function fill(page) {
  await page.getByLabel("Account holder's full name").fill("Elena Petrova");
  await page.getByLabel("Bank name", { exact: true }).fill("Review Bank");
  await page.getByLabel("Bank country").fill("UAE");
  await page.getByLabel("Account currency").fill("AED");
  await page.getByLabel("Account number or IBAN").fill(accountNumber);
  await page.getByLabel("SWIFT/BIC (or provide routing code below)").fill("EBILAEAD");
  await page.getByRole("checkbox").check();
}
test("verified user submits bank details for admin review without Stripe", async ({ page }) => {
  const calls = await fixture(page);
  await page.getByRole("button", { name: "Add a bank for payouts" }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add a bank for payouts" })).toBeVisible();
  await fill(page);
  await page.getByRole("button", { name: "Submit for admin review" }).click();
  await expect(page.getByRole("heading", { name: "Bank details under review" })).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0].body.accountNumber).toBe(accountNumber);
  expect(calls[0].body.confirmOwnership).toBe(true);
  await expect(page.getByText(/Stripe/)).toHaveCount(0);
});
test("pending bank cannot be edited or marked ready by its owner", async ({ page }) => {
  await fixture(page, { status: "PENDING_REVIEW", view: "bank" });
  await expect(page.getByRole("heading", { name: "Bank details under review" })).toBeVisible();
  await expect(page.getByLabel("Account number or IBAN")).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeDisabled();
});
test("changing an approved bank requires fresh account details and a new review", async ({ page }) => {
  await fixture(page, { status: "APPROVED", view: "bank" });
  await page.getByRole("button", { name: "Change bank details" }).click();
  await expect(page.getByLabel("Account number or IBAN")).toHaveValue("");
  await fill(page);
  await page.getByRole("button", { name: "Resubmit for review" }).click();
  await expect(page.getByRole("heading", { name: "Bank details under review" })).toBeVisible();
});
test("changes requested by admin can be corrected and resubmitted", async ({ page }) => {
  const calls = await fixture(page, { status: "CHANGES_REQUESTED", view: "bank" });
  await expect(page.getByText("Please correct your details", { exact: true })).toBeVisible();
  await fill(page);
  await page.getByRole("button", { name: "Resubmit for review" }).click();
  await expect(page.getByRole("heading", { name: "Bank details under review" })).toBeVisible();
  expect(calls[0].body.version).toBe(1);
});
test("admin opens audited details and explicitly approves bank", async ({ page }) => {
  const calls = await fixture(page, { status: "PENDING_REVIEW", admin: true });
  await expect(page.getByText(accountNumber, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Review details" }).click();
  await expect(page.getByText(accountNumber, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve bank" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Approve bank" }).click();
  await expect(page.getByText("No bank applications.")).toBeVisible();
  expect(calls[0].body).toMatchObject({ status: "APPROVED", reviewConfirmed: true, version: 1 });
});
test("failed submission keeps form editable and never claims approval", async ({ page }) => {
  await fixture(page, { view: "bank", fail: true });
  await fill(page);
  await page.getByRole("button", { name: "Submit for admin review" }).click();
  await expect(page.getByRole("alert")).toHaveText("Please refresh your bank details.");
  await expect(page.getByRole("button", { name: "Submit for admin review" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Your bank is approved" })).toHaveCount(0);
});
