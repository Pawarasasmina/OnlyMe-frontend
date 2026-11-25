import { test, expect } from "@playwright/test";

const config = {
  mixes: Object.fromEntries(["SEEN", "WALL", "DISCOVER", "STORIES"].map(surface => [surface, { interest: 70, related: 20, discovery: 10 }])),
  signals: { follow: 10, fastSkip: -6 }, rules: { batchSize: 20, candidateLimit: 200 }, coldStart: { location: 5 },
  productRules: { newWorldPosition: 3, newWorldMaxAgeDays: 7, wallCountryWeight: 5, wallCityWeight: 10, missingPhotoPenalty: 12 },
};
async function fixture(page) {
  let exclusions = [];
  const writes = [];
  await page.route("**/api/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = {};
    if (url.pathname.endsWith("/recommendations")) data = { active: { version: 2, config }, drafts: [], history: [] };
    if (url.pathname.endsWith("/targets")) data = { items: [{ id: "person-1", label: "Maya", username: "maya", status: "active" }] };
    if (url.pathname.endsWith("/exclusions")) {
      if (req.method() === "PUT") {
        const body = req.postDataJSON(); writes.push(body);
        exclusions = body.excluded ? [{ _id: "exclude-1", ...body, label: "Maya" }] : [];
      }
      data = { items: exclusions };
    }
    if (url.pathname.endsWith("/preview")) data = { user: { name: "Maya" }, surface: url.searchParams.get("surface"), recommendation: { configVersion: 2 }, items: [{ id: "seen-1", position: 1, title: "Travel guide", kind: "SEEN", creator: { username: "author" }, recommendation: { bucket: "interest", reason: "Based on your interests", score: 24, adjustments: [{ rule: "wall_city", weight: 10 }] } }] };
    if (url.pathname.endsWith("/drafts")) { writes.push(req.postDataJSON()); data = { item: { version: 3 } }; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/recommendations.html");
  return writes;
}

test("product rules are editable and saved in a draft without a boost section", async ({ page }) => {
  const writes = await fixture(page);
  await expect(page.getByRole("heading", { name: "Our product rules" })).toBeVisible();
  await page.getByRole("slider", { name: "Wall: same city weight" }).fill("25");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].config.productRules.wallCityWeight).toBe(25);
  expect(writes[0].config.productRules.newWorldPosition).toBe(3);
  await expect(page.getByRole("heading", { name: /boost/i })).toHaveCount(0);
});

test("both target searches update with each letter and clear stale matches", async ({ page }) => {
  await fixture(page);
  const requested = [];
  await page.route("**/api/admin/recommendations/targets?*", async route => {
    const term = new URL(route.request().url()).searchParams.get("search");
    requested.push(term);
    await route.fulfill({ json: { success: true, data: { items: term === "zzz" ? [] : [{ id: term, label: `Match ${term}`, username: term, status: "active" }] } } });
  });
  for (const heading of ["Exclude from recommendations", "Preview as user"]) {
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
    const input = section.getByRole("textbox", { name: "Find recommendation target" });
    for (const term of ["m", "ma", "may"]) {
      await input.fill(term);
      await expect(section.getByRole("button", { name: `Match ${term} @${term}`, exact: false })).toBeVisible();
    }
    await input.clear();
    await expect(section.getByRole("button", { name: /Match may/ })).toHaveCount(0);
    await expect(section.getByRole("status")).toHaveCount(0);
    await input.fill("zzz");
    await expect(section.getByText("No matching items.")).toBeVisible();
    await input.clear();
    await expect(section.getByText("No matching items.")).toHaveCount(0);
  }
  expect(requested).toEqual(expect.arrayContaining(["m", "ma", "may", "zzz"]));
});

test("account search, exclusion and restore update the active exclusions", async ({ page }) => {
  const writes = await fixture(page);
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Exclude from recommendations", exact: true }) });
  await section.getByRole("textbox", { name: "Find recommendation target" }).fill("maya");
  await section.getByRole("button", { name: "Search", exact: true }).click();
  await section.getByRole("button", { name: /Maya @maya/ }).click();
  await section.getByRole("button", { name: "Exclude from recommendations", exact: true }).click();
  await section.getByRole("textbox", { name: "Reason for recommendation exclusion change" }).fill("Review requested");
  await section.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ targetModel: "User", targetId: "person-1", excluded: true });
  await section.getByRole("button", { name: "Restore to recommendations" }).first().click();
  await section.getByRole("textbox", { name: "Reason for recommendation exclusion change" }).fill("Review complete");
  await section.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(section.getByText("No active exclusions.")).toBeVisible();
  await section.getByRole("button", { name: "Back to search" }).click();
  await expect(section.getByRole("button", { name: "Exclude from recommendations", exact: true })).toHaveCount(0);
  await expect(section.getByRole("textbox", { name: "Find recommendation target" })).toHaveValue("");
  await expect(section.getByRole("textbox", { name: "Find recommendation target" })).toBeFocused();
  expect(writes).toHaveLength(2);
});

test("preview shows the selected user's batch and item reason on desktop and mobile", async ({ page }) => {
  await fixture(page);
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "Preview as user", exact: true }) });
  await section.getByRole("textbox", { name: "Find recommendation target" }).fill("maya");
  await section.getByRole("button", { name: "Search", exact: true }).click();
  await section.getByRole("button", { name: /Maya @maya/ }).click();
  await section.getByRole("button", { name: "Preview next batch" }).click();
  await expect(section.getByText("Based on your interests", { exact: true })).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "tmp/recommendations-preview-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("button", { name: "Preview next batch" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "tmp/recommendations-preview-mobile.png" });
  await section.getByRole("button", { name: "Back to search" }).click();
  await expect(section.getByText("Travel guide", { exact: true })).toHaveCount(0);
  await expect(section.getByRole("button", { name: "Back to search" })).toHaveCount(0);
  await expect(section.getByRole("textbox", { name: "Find recommendation target" })).toHaveValue("");
  await expect(section.getByRole("textbox", { name: "Find recommendation target" })).toBeFocused();
  await expect(section.getByRole("button", { name: "Preview next batch" })).toBeDisabled();
});
