import { test, expect } from "@playwright/test";
const user = { id: "507f1f77bcf86cd799439011", name: "Owner", username: "owner", role: "fan", onboarding: { status: "completed" } };
const held = { id: "507f1f77bcf86cd799439012", author: user, text: "A local community note", postType: "Question", isOwner: true, moderationStatus: "PENDING_REVIEW", visibility: "private", publishedAt: new Date().toISOString(), media: [], comments: [] };
async function setup(page, failure = null) {
  await page.addInitScript(value => { localStorage.setItem("onlyme_access_token", "publish-fixture"); localStorage.setItem("onlyme_cached_user", JSON.stringify(value)); }, user);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname.endsWith("/profiles/me")) data = { user, profile: { city: "Dubai" } };
    if (url.pathname === "/api/posts" && route.request().method() === "POST") {
      if (failure) return route.fulfill({ status: failure.status, json: { success: false, message: failure.message, code: failure.code } });
      return route.fulfill({ status: 202, json: { success: true, data: { post: held } } });
    }
    if (url.pathname.endsWith(`/posts/${held.id}`)) data = { post: held };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/wall");
}
async function compose(page) {
  await page.getByRole("button", { name: "Create Wall note", exact: true }).click();
  await page.locator(".wall-need-card").filter({ has: page.getByText("Question", { exact: true }) }).click();
  await page.getByRole("textbox", { name: "Note text", exact: true }).fill(held.text);
}
test("held copy submission shows review status and never enters Wall", async ({ page }) => {
  await setup(page); await compose(page);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Note submitted for review. You can check its status on your profile.")).toBeVisible();
  await expect(page.locator(".wall-thread-note")).toHaveCount(0);
  await page.goto(`/posts/${held.id}`);
  await expect(page.locator(".wall-note-review-status")).toContainText("Under review");
});
for (const failure of [
  { status: 429, code: "WALL_DAILY_LIMIT", message: "New accounts can publish two Wall notes in 24 hours during their first seven days." },
  { status: 400, code: "WALL_CONTACT_DETAILS", message: "Keep numbers and messengers out. People can message you from the note." },
  { status: 409, code: "WALL_DUPLICATE_TEXT", message: "You already posted this text in the last 24 hours." },
]) test(`${failure.code} preserves the draft and shows the server restriction`, async ({ page }) => {
  await setup(page, failure); await compose(page);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText(failure.message, { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Note text", exact: true })).toHaveValue(held.text);
  await expect(page.locator(".wall-thread-note")).toHaveCount(0);
});
