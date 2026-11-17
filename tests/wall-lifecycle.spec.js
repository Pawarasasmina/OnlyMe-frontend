import { test, expect } from "@playwright/test";
const DAY = 86400000;
const user = { id: "507f1f77bcf86cd799439011", name: "Owner", username: "owner", role: "fan", onboarding: { status: "completed" } };
const id = "507f1f77bcf86cd799439012";
function note(type, days = 0, extra = {}) {
  return { id, text: "Lifecycle test note", author: user, postType: type, isOwner: true, canResolve: true, publishedAt: new Date(Date.now() - days * DAY).toISOString(), comments: [], media: [], ...extra };
}
async function setup(page, posts = []) {
  const server = { posts, bumps: 0, resolutions: 0 };
  await page.addInitScript(value => {
    localStorage.setItem("onlyme_access_token", "lifecycle-fixture");
    localStorage.setItem("onlyme_cached_user", JSON.stringify(value));
  }, user);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, count: 0, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname === "/api/profiles/me") data = { user, profile: { city: "Dubai" } };
    if (url.pathname === "/api/profiles/owner") data = { profile: { ownerUserId: user.id, displayName: user.name, username: user.username, role: "fan", socialLinks: [] }, publicMetrics: {}, viewerCapabilities: { isOwner: false }, viewerRelationship: {}, wallPosts: server.posts, seens: [], planets: [], experiences: [], media: [] };
    if (url.pathname === "/api/posts") data = { items: server.posts, pagination: { page: 1, pages: 1, total: server.posts.length } };
    const post = server.posts.find(item => url.pathname.includes(`/posts/${item.id}`));
    if (post) {
      if (url.pathname.endsWith("/bump")) { server.bumps++; Object.assign(post, { bumpedAt: new Date().toISOString(), bumpCount: 1, canBump: false, needsExpiryPrompt: false, expiresAt: new Date(Date.now() + 7 * DAY).toISOString() }); }
      if (url.pathname.endsWith("/resolution")) { server.resolutions++; Object.assign(post, { resolvedAt: new Date().toISOString(), isClosed: true, closedReason: "resolved" }); }
      data = { post };
    }
    if (url.pathname === "/api/search") data = { items: server.posts.map(post => ({ id: post.id, type: "post", title: post.text, description: post.text, route: `/posts/${post.id}`, createdAt: post.publishedAt, metadata: { ...post, author: user } })) };
    await route.fulfill({ json: { success: true, data } });
  });
  return server;
}

test("closed originals and shares stay out of Wall feed, rows, and grid but retain detail status", async ({ page }) => {
  const posts = [note("Question"), ...["Buy & Sell", "Recommendation", "Event", "Question"].map((type, i) => note(type, 0, { id: `507f1f77bcf86cd79943902${i}`, resolvedAt: new Date().toISOString() })), note("Need Help", 8, { id: "507f1f77bcf86cd799439030" }), note("Recommendation", 105, { id: "507f1f77bcf86cd799439031" })];
  posts.push({ ...posts[1], id: "share-sold", originalPostId: posts[1].id });
  await setup(page, posts);
  await page.goto("/wall");
  await expect(page.locator(".wall-thread-note")).toHaveCount(1);
  await page.goto("/wall?type=question");
  await expect(page.locator(".wall-category-row")).toHaveCount(1);
  await page.getByRole("group", { name: "Wall view" }).getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.locator(".wall-market-tile")).toHaveCount(1);
  for (const [post, label] of [[posts[1], "Sold"], [posts[2], "Outdated"], [posts[3], "Ended"], [posts[4], "Solved"], [posts[5], "Expired"], [posts[6], "May be outdated"]]) {
    await page.goto(`/posts/${post.id}`);
    await expect(page.locator(".wall-post-type-link")).toHaveText(label);
    await expect(page.locator(".wall-note-availability")).toHaveCount(0);
  }
});

test("request author can Keep it and later mark Solved from detail", async ({ page }) => {
  const post = note("Need Help", 6.5);
  const server = await setup(page, [post]);
  await page.goto(`/posts/${id}`);
  const prompt = page.locator(".wall-note-availability");
  await expect(prompt).toContainText("Still need it?");
  await prompt.getByRole("button", { name: "Keep it", exact: true }).click();
  await expect.poll(() => server.bumps).toBe(1);
  await expect(prompt).toHaveCount(0);
  await page.getByRole("button", { name: "Mark as solved", exact: true }).click();
  await expect.poll(() => server.resolutions).toBe(1);
  await expect(page.locator(".wall-post-type-link")).toHaveText("Solved");
});

test("Right now and Events never show author expiry prompts", async ({ page }) => {
  const posts = [note("Buy & Sell", 0.9, { rightNow: true, canBump: true }), note("Event", 6.5, { id: "507f1f77bcf86cd799439013", canBump: true })];
  await setup(page, posts);
  for (const post of posts) {
    await page.goto(`/posts/${post.id}`);
    await expect(page.locator(".wall-thread-note")).toBeVisible();
    await expect(page.locator(".wall-note-availability")).toHaveCount(0);
  }
});

test("search keeps closed notes with category-specific status", async ({ page }) => {
  await setup(page, [note("Buy & Sell", 0, { resolvedAt: new Date().toISOString() }), note("Recommendation", 105, { id: "507f1f77bcf86cd799439013" })]);
  await page.goto("/wall/search?q=note");
  await expect(page.locator(".wall-search-result")).toHaveCount(2);
  await expect(page.locator(".wall-search-result-meta").first()).toContainText("Sold");
  await expect(page.locator(".wall-search-result-meta").last()).toContainText("May be outdated");
});

test("mounted Wall removes a note at its expiry without reloading", async ({ page }) => {
  const now = Date.now();
  await page.clock.install({ time: now });
  const post = note("Need Help", 0, { publishedAt: new Date(now - 7 * DAY + 2000).toISOString(), expiresAt: new Date(now + 2000).toISOString() });
  await setup(page, [post]);
  await page.goto("/wall");
  await expect(page.locator(".wall-thread-note")).toHaveCount(1);
  await page.clock.runFor(2100);
  await expect(page.locator(".wall-thread-note")).toHaveCount(0);
});

test("composer shows each category lifetime and the Right now override", async ({ page }) => {
  await setup(page);
  for (const [type, text] of [["Need Help", "7 days"], ["Looking for", "14 days"], ["Question", "30 days"], ["Buy & Sell", "30 days"], ["Offering", "30 days"], ["Recommendation", "3 months"], ["Event", "7 days, then it ends"], ["Right Now", "24 hours"]]) {
    await page.goto(`/wall?compose=note&composeType=${encodeURIComponent(type)}&composeRequest=${encodeURIComponent(type)}`);
    await expect(page.locator(".wall-compose-lifetime")).toContainText(text);
  }
});

test("author profile retains closed notes and statuses", async ({ page }) => {
  await setup(page, [note("Buy & Sell", 0, { resolvedAt: new Date().toISOString() }), note("Need Help", 8, { id: "507f1f77bcf86cd799439013" })]);
  await page.goto("/profile/owner");
  await expect(page.locator(".profile-notes-list .wall-thread-note")).toHaveCount(2);
  await expect(page.locator(".profile-notes-list .wall-post-type-link").first()).toHaveText("Sold");
  await expect(page.locator(".profile-notes-list .wall-post-type-link").last()).toHaveText("Expired");
});

test("solving from the Wall opens the retained closed note detail", async ({ page }) => {
  const server = await setup(page, [note("Question")]);
  await page.goto("/wall");
  await page.getByRole("button", { name: "Mark as solved", exact: true }).click();
  await expect.poll(() => server.resolutions).toBe(1);
  await expect(page).toHaveURL(new RegExp(`/posts/${id}$`));
  await expect(page.locator(".wall-post-type-link")).toHaveText("Solved");
  await page.getByRole("link", { name: "Back to Wall" }).click();
  await expect(page.locator(".wall-thread-note")).toHaveCount(0);
});
