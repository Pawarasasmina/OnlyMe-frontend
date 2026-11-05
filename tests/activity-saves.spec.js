import { test, expect } from "@playwright/test";
const text = "Zuma after 8 PM — book a table in advance. Worth every dirham.";
async function fixture(page, items) {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const data = path === "/api/fan/activity" ? { items } : path === "/api/wallet" ? { wallet: {} } : { items: [] };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/tests/fixtures/activity-saves.html");
}
const saved = { id: "saved-note", type: "wall_save_group", title: "12 people saved your note", direction: "received", filter: "saves", aggregate: { count: 12 }, target: { id: "note1", type: "WALL_POST", preview: text }, preview: text, actionPath: "/posts/note1", createdAt: new Date().toISOString() };
for (const width of [1440, 393]) test(`saved-note Activity row matches prototype and opens original at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await fixture(page, [saved]);
  const row = page.locator(".activity-prototype-row.is-note-save");
  await expect(row).toHaveCount(1);
  await expect(row.locator(".activity-prototype-copy p b")).toHaveText("12 people");
  await expect(row.locator(".activity-prototype-icon.is-aggregate")).toBeVisible();
  await expect(row.locator(".activity-person-avatar")).toHaveCount(0);
  await expect(row.locator(".activity-note-tile")).toHaveText(text);
  await expect(row.locator(".activity-content-tile")).toHaveCSS("width", "42px");
  await expect(row.locator(".activity-content-tile")).toHaveCSS("height", "52px");
  await expect(row.locator(".activity-prototype-copy p")).toHaveCSS("font-size", "12.5px");
  await page.screenshot({ path: `tmp/activity-saved-note-${width}.png` });
  await row.click();
  await expect(page.getByRole("heading", { name: "Original note note1" })).toBeVisible();
});
test("individual legacy save rows group by note without showing saver names", async ({ page }) => {
  await fixture(page, ["one", "two"].map((id, index) => ({ ...saved, id, type: "feed_post_save", aggregate: null, title: `Saver ${index} saved your note`, relatedCreator: { id, name: `Saver ${index}` } })));
  const row = page.locator(".activity-prototype-row.is-note-save");
  await expect(row).toHaveCount(1);
  await expect(row.locator(".activity-prototype-copy p")).toHaveText("2 people saved your note");
  await expect(row.locator(".activity-person-avatar")).toHaveCount(0);
});

test("Direct Access Answer opens the exact request", async ({ page }) => {
  await fixture(page, [{ id: "da", type: "direct_access", filter: "comments", direction: "received", title: "James requested Direct Access", metadata: { canAnswer: true }, actionPath: "/messages?tab=direct&with=james&window=request1", createdAt: new Date().toISOString() }]);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.getByRole("heading")).toHaveText("/messages?tab=direct&with=james&window=request1");
});

test("renewal warning offers a working top-up action", async ({ page }) => {
  await fixture(page, [{ id: "renew", type: "premium_renewal_low_balance", filter: "subscriptions", direction: "received", title: "Not enough coins to renew — top up to stay", target: { id: "world1", type: "PREMIUM_WORLD" }, actionPath: "/wallet", createdAt: new Date().toISOString() }]);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Top up", exact: true }).click();
  await expect(page.getByRole("heading")).toHaveText("/wallet");
});

test("saved comments show anonymous counts and the comment preview", async ({ page }) => {
  await fixture(page, [{ ...saved, id: "comment-save", type: "comment_save_group", title: "3 people saved your comment", aggregate: { count: 3 }, metadata: { savedComment: true } }]);
  await expect(page.locator(".activity-prototype-copy p")).toHaveText("3 people saved your comment");
  await expect(page.locator(".activity-note-tile")).toHaveText(text);
});
