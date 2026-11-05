import { test, expect } from "@playwright/test";

async function fixture(page, { initialType = "personal", fail = false, target = "creator" } = {}) {
  let account = { profileAccountType: initialType, profileCategory: initialType === "personal" ? "" : "Coach" };
  const writes = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (path === "/api/settings/account" && route.request().method() === "PATCH") {
      writes.push(route.request().postDataJSON());
      if (fail) return route.fulfill({ status: 503, json: { message: "Please try again later." } });
      account = { ...account, ...writes.at(-1) };
      if (Object.hasOwn(writes.at(-1), "businessContactButtons")) account.businessContactButtonsConfigured = true;
    }
    return route.fulfill({ json: { success: true, data: path === "/api/settings/account" ? { account } : {} } });
  });
  await page.goto("/tests/fixtures/account-type.html");
  await page.getByRole("button", { name: /^Account type/ }).click();
  await page.getByRole("button", { name: target === "business" ? /^Business For brands/ : /^Creator For people/ }).click();
  return writes;
}

test("Creator switch requires confirmation and category before saving, then opens dashboard", async ({ page }) => {
  const writes = await fixture(page);
  const confirmation = page.getByRole("dialog", { name: "Switch to Creator account?" });
  await expect(confirmation.getByText("A monthly subscription to everything you share")).toBeVisible();
  await expect(confirmation.getByText("Paid questions and calls")).toBeVisible();
  await expect(confirmation.getByText("Grow and insights", { exact: true })).toBeVisible();
  await page.screenshot({ path: "tmp/creator-switch-confirmation.png" });
  await confirmation.getByRole("button", { name: "Continue", exact: true }).click();
  const submit = page.getByRole("button", { name: "Switch to Creator", exact: true });
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("button", { pressed: false }).filter({ hasText: /^Digital creator$/ })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: "Digital creator", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await confirmation.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Digital creator", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "tmp/creator-switch-category.png" });
  await submit.click();
  await expect(page.getByRole("dialog", { name: "You’re now a Creator account" })).toBeVisible();
  await page.screenshot({ path: "tmp/creator-switch-success.png" });
  expect(writes).toEqual([{ profileAccountType: "creator", profileCategory: "Digital creator", confirmSwitch: true }]);
  await page.getByRole("button", { name: "Open Creator dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Creator Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Grow" })).toBeVisible();
});

test("Cancel leaves account unchanged; Done closes success and category edit does not repeat success", async ({ page }) => {
  const writes = await fixture(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Personal Current/ })).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.getByRole("button", { name: /^Creator For people/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Coach", exact: true }).click();
  await page.getByRole("button", { name: "Switch to Creator", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /^Account type/ }).click();
  await page.getByRole("button", { name: /^Creator Current/ }).click();
  await page.getByRole("button", { name: "Artist", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes.at(-1)).toEqual({ profileAccountType: "creator", profileCategory: "Artist", confirmSwitch: false });
});

test("failed switch preserves category and never shows success", async ({ page }) => {
  await fixture(page, { fail: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Chef", exact: true }).click();
  await page.getByRole("button", { name: "Switch to Creator", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chef", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Open Creator dashboard" })).toHaveCount(0);
});

test("Business to Creator confirmation explains business-only tools being removed", async ({ page }) => {
  await fixture(page, { initialType: "business" });
  await expect(page.getByText("Contact buttons and offers are removed", { exact: true })).toBeVisible();
  await expect(page.getByText("World, Direct Access and Grow stay on", { exact: true })).toBeVisible();
});

test("Business flow persists contacts, supports Back, shows success and toast, and edits contacts", async ({ page }) => {
  const writes = await fixture(page, { initialType: "creator", target: "business" });
  await expect(page.getByText("World, Direct Access and Grow stay on", { exact: true })).toBeVisible();
  await page.screenshot({ path: "tmp/business-switch-confirmation.png" });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Call", exact: true })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Directions", exact: true })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Website", exact: true })).not.toBeChecked();
  await page.getByRole("switch", { name: "Website", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Shop", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Website", exact: true })).toBeChecked();
  expect(writes).toHaveLength(0);
  await page.screenshot({ path: "tmp/business-switch-contacts.png" });
  await page.getByRole("button", { name: "Switch to Business", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "You’re now a Business account" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Switched to business account");
  expect(writes[0]).toEqual({ profileAccountType: "business", profileCategory: "Shop", confirmSwitch: true, businessContactButtons: ["call", "directions", "website"] });
  await page.screenshot({ path: "tmp/business-switch-success.png" });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: /^Account type/ }).click();
  await page.getByRole("button", { name: /^Contact buttons/ }).click();
  for (const name of ["Call", "Directions", "Website"]) await page.getByRole("switch", { name, exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes.at(-1).businessContactButtons).toEqual([]);
});

test("Business save failure retains contact draft and does not announce a switch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, { target: "business", fail: true });
  await expect(page.getByText("Grow and insights", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Brand", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Switch to Business", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Call", exact: true })).toBeChecked();
  await expect(page.getByRole("button", { name: "Open Business dashboard" })).toHaveCount(0);
  await expect(page.getByText("Switched to business account", { exact: true })).toHaveCount(0);
});
