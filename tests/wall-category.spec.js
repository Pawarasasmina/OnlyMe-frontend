import { test, expect } from "@playwright/test";

const user = { id: "507f1f77bcf86cd799439011", name: "Viewer", username: "viewer", role: "fan", onboarding: { status: "completed" } };
const author = { id: "507f1f77bcf86cd799439010", name: "Lina", username: "lina" };
const longText = "A local question with enough text to exceed two lines. ".repeat(8) + "The full note ends here.";
const posts = [
  { id: "507f1f77bcf86cd799439012", author, text: longText, postType: "Question", topic: "Food", location: "Colombo, Sri Lanka", publishedAt: new Date().toISOString(), commentCount: 3, comments: [], media: [] },
  { id: "507f1f77bcf86cd799439013", author, text: "A note with a photo", postType: "Question", topic: "Food", publishedAt: new Date().toISOString(), comments: [], media: [{ type: "image", url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"><path fill="skyblue" d="M0 0h52v52H0z"/></svg>' }] },
];

for (const width of [390, 1280]) {
  test(`category rows, topic labels, full note and clearing at ${width}px`, async ({ page }) => {
    let shownPosts = posts;
    await page.setViewportSize({ width, height: 900 });
    page.on("pageerror", error => { throw error; });
    await page.addInitScript(value => {
      localStorage.setItem("onlyme_access_token", "wall_fixture_token");
      localStorage.setItem("onlyme_cached_user", JSON.stringify(value));
    }, user);
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith("/api/")) return route.continue();
      let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, count: 0, unreadCount: 0 };
      if (url.pathname.endsWith("/posts")) data = { items: shownPosts, pagination: { page: 1, pages: 1, total: shownPosts.length } };
      if (url.pathname.endsWith(`/posts/${posts[0].id}`)) data = { post: posts[0] };
      if (url.pathname.endsWith("/auth/me")) data = { user };
      if (/\/profiles?\/me$/.test(url.pathname)) data = { user, profile: { city: "Colombo" } };
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/wall?type=question");
    const rows = page.locator(".wall-category-row");
    await expect(rows).toHaveCount(2);
    await expect(page.locator(".wall-thread-note")).toHaveCount(0);
    await expect(rows.first().locator(".wall-category-meta")).toContainText("Lina");
    await expect(rows.first().locator(".wall-category-meta")).toContainText("Colombo");
    await expect(rows.first().locator(".wall-category-meta em")).toHaveCount(0);
    await expect(rows.first().locator(".wall-category-comments")).toHaveText("3");
    await expect(rows.nth(1).locator("img.wall-category-thumbnail")).toHaveCSS("width", "52px");
    await expect(rows.first().locator(".wall-category-text")).toHaveCSS("-webkit-line-clamp", "2");
    expect(await rows.first().locator(".wall-category-text").evaluate(el => el.clientHeight)).toBeLessThanOrEqual(40);
    if (width === 390) {
      await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
      await rows.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: "test-results/wall-category-mobile.png" });
    }
    await rows.first().click();
    await expect(page).toHaveURL(new RegExp(`/posts/${posts[0].id}$`));
    await expect(page.locator(".home-feed-text")).toHaveText(longText);
    await expect(page.locator(".home-feed-show-more")).toHaveCount(0);
    await page.getByRole("link", { name: "Back to Wall" }).click();
    await expect(page).toHaveURL(/\/wall\?type=question$/);
    await expect(rows).toHaveCount(2);
    await page.locator(".wall-feed-heading").getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.locator(".wall-thread-note")).toHaveCount(2);
    await expect(rows).toHaveCount(0);
    await expect(page.locator(".wall-feed-heading h2")).toHaveText("For you");
    await expect(page.locator(".home-feed-show-more")).toHaveCount(0);
    await page.locator(".wall-note-text-link").first().click();
    await expect(page).toHaveURL(new RegExp(`/posts/${posts[0].id}$`));
    await expect(page.locator(".home-feed-text")).toHaveText(longText);
    await expect(page.locator(".wall-comments-panel")).toBeVisible();
    await page.getByRole("link", { name: "Back to Wall" }).click();
    await page.locator(".wall-thread-note").first().locator(".wall-view-comments").click();
    await expect(page).toHaveURL(new RegExp(`/posts/${posts[0].id}\\?reply=1$`));
    await expect(page.locator(".wall-comments-panel")).toBeVisible();
    await page.goto("/wall?topic=food");
    await expect(rows).toHaveCount(2);
    await expect(rows.first().locator(".wall-category-meta em")).toHaveText("Question");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.goto("/wall?rightNow=true");
    await expect(rows).toHaveCount(2);
    await expect(rows.first().locator(".wall-category-meta em")).toHaveText("Question");
    shownPosts = [{ ...posts[0], author: user, isOwner: true, resolvedAt: new Date().toISOString() }];
    await page.goto("/wall?type=question");
    await expect(rows).toHaveCount(0);
    await page.goto(`/posts/${posts[0].id}`);
  });
}
