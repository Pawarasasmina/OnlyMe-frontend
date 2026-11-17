import { test, expect } from "@playwright/test";
const user = { id: "507f1f77bcf86cd799439011", name: "Viewer", username: "viewer", role: "fan", onboarding: { status: "completed" } };
const note = index => ({ id: `507f1f77bcf86cd799439${String(index).padStart(3, "0")}`, author: user, postType: "Question", text: `Text-only note ${index}`, publishedAt: new Date().toISOString(), comments: [], media: [] });

for (const persistentFailure of [false, true]) test(`later-page photos load after ${persistentFailure ? "manual recovery" : "one automatic retry"}`, async ({ page }) => {
  const state = { pageTwoRequests: 0, fail: persistentFailure };
  await page.addInitScript(value => {
    localStorage.setItem("onlyme_access_token", "media_fixture");
    localStorage.setItem("onlyme_cached_user", JSON.stringify(value));
  }, user);
  await page.route("**/uploads/*.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path fill="skyblue" d="M0 0h64v64H0z"/></svg>' }));
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, count: 0, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (/\/profiles?\/me$/.test(url.pathname)) data = { user, profile: { city: "Dubai" } };
    if (url.pathname.endsWith("/posts")) {
      const pageNumber = Number(url.searchParams.get("page") || 1);
      if (pageNumber === 2) {
        state.pageTwoRequests++;
        if (state.fail || state.pageTwoRequests === 1) return route.fulfill({ status: 503, json: { message: "Temporary feed failure" } });
      }
      const items = pageNumber < 3 ? Array.from({ length: 20 }, (_, index) => note((pageNumber - 1) * 20 + index)) : [
        { ...note(40), images: ["/uploads/legacy-photo.svg"] },
        { ...note(41), media: [{ id: "photo", url: "/uploads/current-photo.svg", type: "image" }] },
      ];
      data = { items, pagination: { page: pageNumber, pages: 3, total: 42 } };
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/wall");
  await expect(page.locator(".wall-thread-note")).toHaveCount(20);
  await expect(page.locator(".home-feed-media img")).toHaveCount(0);
  await page.locator(".home-feed-sentinel").scrollIntoViewIfNeeded();
  if (persistentFailure) {
    const error = page.locator(".home-feed-sentinel").getByRole("alert");
    await expect(error).toContainText("Your loaded notes are still here");
    await expect(page.locator(".wall-thread-note")).toHaveCount(20);
    expect(state.pageTwoRequests).toBe(2);
    state.fail = false;
    await error.getByRole("button", { name: "Retry", exact: true }).click();
  }
  await expect(page.locator(".wall-thread-note")).toHaveCount(40);
  await page.locator(".home-feed-sentinel").scrollIntoViewIfNeeded();
  await expect(page.locator(".wall-thread-note")).toHaveCount(42);
  const images = page.locator(".home-feed-media img");
  await expect(images).toHaveCount(2);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  await expect(page.locator(".home-feed-error")).toHaveCount(0);
});
