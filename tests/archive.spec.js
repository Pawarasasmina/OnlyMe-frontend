import { test, expect } from "@playwright/test";

async function fixture(page, fail = false) {
  const state = { posts: [{ id: "note", text: "Where can I get a car detailed properly in Dubai Marina? Hand wash, not a tunnel.", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() }], publications: [{ id: "seen", title: "My Seen", kind: "SEEN", chapterCount: 3, statusVersion: 2 }], fail, commands: [] };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    let data = {};
    if (path === "/api/posts/mine") data = { items: state.posts };
    if (path === "/api/publications/mine") data = { items: state.publications };
    if (path.endsWith("/restore")) {
      if (state.fail) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Please try again" }) });
      state.commands.push({ path, body: route.request().postDataJSON() });
      if (path.includes("/posts/")) state.posts = []; else state.publications = [];
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/archive.html");
  return state;
}
test("Archive restores notes and Seens with prototype toast and empty state", async ({ page }) => {
  const state = await fixture(page);
  await expect(page.getByRole("heading", { name: "Archive" })).toBeVisible();
  await expect(page.locator(".profile-archive-page h1")).toHaveCSS("font-size", "18px");
  await expect(page.locator(".profile-archive-row.is-note p")).toHaveCSS("font-size", "12.5px");
  await page.locator(".profile-archive-row.is-note").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("status")).toHaveText("Restored ✓");
  await expect(page.locator(".profile-archive-row.is-note")).toHaveCount(0);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Empty — archive a Seen or a note from its ⋯ menu.")).toBeVisible();
  expect(state.commands[1].body.statusVersion).toBe(2);
});
test("failed restore retains the archived item for retry on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fixture(page, true);
  await page.locator(".profile-archive-row.is-note").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("status")).toHaveText("Please try again");
  await expect(page.locator(".profile-archive-row.is-note")).toBeVisible();
  state.fail = false;
  await page.locator(".profile-archive-row.is-note").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("status")).toHaveText("Restored ✓");
});
