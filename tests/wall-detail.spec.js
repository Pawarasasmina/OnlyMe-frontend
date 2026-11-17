import { test, expect } from "@playwright/test";
const user = { id: "507f1f77bcf86cd799439011", name: "Viewer", username: "viewer", role: "fan", onboarding: { status: "completed" } };
const id = "507f1f77bcf86cd799439012";
async function setup(page, own = true) {
  const author = own ? user : { id: "507f1f77bcf86cd799439013", name: "Neighbour", username: "neighbour" };
  const post = { id, author, text: "The complete content of this community note. ".repeat(30), postType: "Question", publishedAt: new Date().toISOString(), isOwner: own, canResolve: own, media: [], comments: Array.from({ length: 12 }, (_, i) => ({ id: `comment-${i}`, author, text: `Full reply ${i}`, ...(i === 0 ? { reactionCount: 4, viewerReaction: "fire" } : {}) })), commentCount: 12 };
  await page.addInitScript(value => { localStorage.setItem("onlyme_access_token", "detail-fixture"); localStorage.setItem("onlyme_cached_user", JSON.stringify(value)); }, user);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname.endsWith("/profiles/me")) data = { user, profile: { city: "Dubai" } };
    if (url.pathname === "/api/posts") data = { items: [post], pagination: { page: 1, pages: 1, total: 1 } };
    if (url.pathname.endsWith(`/posts/${id}/resolution`)) {
      const solved = route.request().postDataJSON().solved;
      Object.assign(post, { resolvedAt: solved ? new Date().toISOString() : null, isClosed: solved, closedReason: solved ? "resolved" : "" });
      data = { post };
    }
    if (url.pathname.endsWith(`/posts/${id}`)) {
      if (route.request().method() === "PUT") Object.assign(post, { text: "Updated from the note page", editedAt: new Date().toISOString(), editVersion: 1 });
      data = { post };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return post;
}
for (const width of [390, 1280]) test(`full Note page, reply focus and owner menu at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  const post = await setup(page);
  await page.goto("/wall");
  await expect(page.locator(".wall-comments-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Open comments", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/posts/${id}\\?reply=1$`));
  const input = page.getByRole("textbox", { name: "Add a Wall note comment", exact: true });
  await expect(input).toBeFocused();
  await expect(input).toBeInViewport();
  await expect(page.locator(".home-feed-text")).toHaveText(post.text);
  await expect(page.locator(".wall-note-replies-heading")).toHaveText("Replies · 12");
  await expect(input).toHaveAttribute("placeholder", "Reply to Viewer\u2026");
  await expect(page.locator(".is-note-detail .fan-avatar").first()).toHaveCSS("width", "42px");
  const firstReplyReaction = page.locator('[data-comment-id="comment-0"] .wall-comment-actions button').first();
  await expect(firstReplyReaction).toContainText("\uD83D\uDD25");
  await expect(firstReplyReaction).toContainText("4");
  await firstReplyReaction.dispatchEvent("pointerdown");
  await page.waitForTimeout(500);
  await firstReplyReaction.dispatchEvent("pointerup");
  await expect(page.locator('[data-comment-id="comment-0"] .wall-comment-quick-reactions')).toBeVisible();
  await expect(page.locator('[data-comment-id="comment-0"] .wall-comment-quick-reactions button')).toHaveCount(8);
  await expect(page.locator('[data-comment-id="comment-11"]')).toBeAttached();
  await expect(page.locator(".wall-comments-panel > form")).toHaveCSS("position", width <= 880 ? "fixed" : "sticky");
  await page.locator(".wall-note-detail-header button").click();
  await expect(page.locator(".wall-note-detail-header button")).toHaveCSS("width", "36px");
  await expect(page.locator(".wall-note-detail-header button")).toHaveCSS("background-color", "rgba(255, 255, 255, 0.07)");
  const menu = page.locator(".home-post-more-list");
  for (const action of ["edit", "resolution", "story", "repost", "share", "archive", "delete"]) await expect(menu.locator(`[data-action="${action}"]`)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
test("visitor Note menu uses normal user actions", async ({ page }) => {
  await setup(page, false); await page.goto(`/posts/${id}`);
  await page.locator(".wall-note-detail-header button").click();
  for (const action of ["share", "show-more", "hide", "unfollow", "report-spam", "report", "block"]) await expect(page.locator(`.home-post-more-list [data-action="${action}"]`)).toBeVisible();
  await expect(page.locator('[data-action="edit"]')).toHaveCount(0);
});
test("old Wall links open the unified Note page", async ({ page }) => {
  await setup(page); await page.goto(`/wall?note=${id}`);
  await expect(page).toHaveURL(new RegExp(`/posts/${id}$`));
  await expect(page.locator(".wall-note-detail-header")).toBeVisible();
});

for (const entry of ["grid", "list"]) for (const action of ["archive", "delete"]) test(`${entry} opens editable note; solve/reopen and ${action} stay in sync`, async ({ page }) => {
  await setup(page);
  await page.goto("/wall?type=question");
  if (entry === "grid") {
    await page.getByRole("group", { name: "Wall view" }).getByRole("button", { name: "Grid", exact: true }).click();
    await page.locator(".wall-market-text").first().click();
  } else await page.locator(".wall-category-row").first().click();
  await expect(page).toHaveURL(new RegExp(`/posts/${id}$`));
  const more = page.locator(".wall-note-detail-header button");
  await more.click();
  await page.locator('.home-post-more-list [data-action="edit"]').click();
  await page.getByRole("textbox", { name: "Note text", exact: true }).fill("Updated from the note page");
  await page.locator(".wall-create-screen").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".home-feed-text")).toHaveText("Updated from the note page");
  await expect(page).toHaveURL(new RegExp(`/posts/${id}$`));
  await more.click();
  await page.locator('.home-post-more-list [data-action="resolution"]').click();
  await expect(page.locator(".wall-post-type-link")).toHaveText("Solved");
  await more.click();
  await expect(page.locator('.home-post-more-list [data-action="edit"]')).toHaveCount(0);
  await page.locator('.home-post-more-list [data-action="resolution"]').click();
  await expect(page.locator(".wall-post-type-link")).toHaveText("Question");
  await more.click();
  await page.locator(`.home-post-more-list [data-action="${action}"]`).click();
  if (action === "delete") await page.locator(".app-dialog-layer").getByRole("button", { name: "Delete note", exact: true }).click();
  await expect(page).toHaveURL(/\/wall\?type=question$/);
});
test("comment notification links reveal the targeted reply", async ({ page }) => {
  await setup(page); await page.goto(`/posts/${id}?comment=comment-11`);
  await expect(page.locator('[data-comment-id="comment-11"]')).toBeVisible();
});
test("hiding another person's note leaves its detail page", async ({ page }) => {
  await setup(page, false); await page.goto(`/posts/${id}`);
  await page.locator(".wall-note-detail-header button").click();
  await page.locator('.home-post-more-list [data-action="hide"]').click();
  await expect(page).toHaveURL(/\/wall$/);
});
test("readers can flag a Recommendation as outdated from its menu", async ({ page }) => {
  const post = await setup(page, false); post.postType = "Recommendation";
  let votes = 0;
  await page.route(`**/api/posts/${id}/outdated`, async route => {
    votes++; post.viewerFlaggedOutdated = true;
    await route.fulfill({ json: { success: true, data: { voted: true } } });
  });
  await page.goto(`/posts/${id}`);
  await page.locator(".wall-note-detail-header button").click();
  await page.locator('.home-post-more-list [data-action="outdated"]').click();
  await expect.poll(() => votes).toBe(1);
  await expect(page.getByText("Thanks. We'll ask the author to check this recommendation.", { exact: true })).toBeVisible();
});
test("three reader flags show the author Still true before ninety days", async ({ page }) => {
  const post = await setup(page); post.postType = "Recommendation"; post.outdatedConcern = true;
  await page.goto(`/posts/${id}`);
  await expect(page.locator(".wall-note-availability")).toContainText("Still true?");
  await expect(page.locator(".wall-note-availability").getByRole("button", { name: "Yes, still true", exact: true })).toBeVisible();
});
