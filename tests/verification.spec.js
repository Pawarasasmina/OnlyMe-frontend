import { test, expect } from "@playwright/test";
async function fixture(page, initialStatus = "NOT_STARTED") {
  const calls = [];
  let verification = { id: "application", purpose: "IDENTITY", status: initialStatus, creatorVisibleMessage: "Please upload a clearer selfie" };
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    calls.push(url.pathname);
    if (url.pathname.endsWith("/identity/draft")) verification = { ...verification, ...route.request().postDataJSON(), status: "DRAFT" };
    if (url.pathname.includes("/verification/upload/")) {
      const field = url.pathname.split("/").at(-1);
      verification[field] = { originalName: "identity.png", mimeType: "image/png", size: 100 };
    }
    if (url.pathname.endsWith("/submit") || url.pathname.endsWith("/resubmit")) verification.status = "PENDING_REVIEW";
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { verification } }) });
  });
  await page.goto("/tests/fixtures/verification.html");
  return calls;
}
test("verification stays inside the app and submits ID plus selfie for admin review", async ({ page }) => {
  const calls = await fixture(page);
  await expect(page.getByRole("heading", { name: "Get verified" })).toBeVisible();
  await expect(page.getByText("Reviewed by the @seen team", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start verification" }).click();
  await page.getByLabel("Legal full name", { exact: true }).fill("Elena Petrova");
  await page.getByLabel("Date of birth", { exact: true }).fill("1995-01-01");
  await page.getByLabel("Country of residence", { exact: true }).fill("Sri Lanka");
  await page.getByLabel("Document issuing country", { exact: true }).fill("Sri Lanka");
  const file = { name: "identity.png", mimeType: "image/png", buffer: Buffer.from("test-image") };
  await page.getByLabel("Identity document front", { exact: true }).setInputFiles(file);
  await page.getByLabel("Selfie holding your identity document", { exact: true }).setInputFiles(file);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox").nth(2).check();
  await page.getByRole("button", { name: "Send for review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Under review" })).toBeVisible();
  await expect(page).toHaveURL(/tests\/fixtures\/verification.html$/);
  expect(calls.some(path => path === "/api/identity/start")).toBe(false);
  expect(calls).toContain("/api/creator/verification/upload/selfieWithDocument");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Under review" })).toBeVisible();
});
test("approved users see an admin-reviewed badge without bank or Stripe claims", async ({ page }) => {
  await fixture(page, "APPROVED");
  await expect(page.getByRole("heading", { name: /verified/ })).toBeVisible();
  await expect(page.getByText("The @seen team has reviewed and approved your identity. Your verified badge is on.")).toBeVisible();
  await expect(page.getByText(/Stripe/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
});
test("requested changes display the admin reason and allow correction", async ({ page }) => {
  await fixture(page, "CHANGES_REQUESTED");
  await expect(page.getByText("Please upload a clearer selfie", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resubmit for review", exact: true })).toBeVisible();
  await expect(page.getByLabel("Selfie holding your identity document", { exact: true })).toBeVisible();
});
