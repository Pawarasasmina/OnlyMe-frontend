import { test, expect } from "@playwright/test";
const user = { id: "507f1f77bcf86cd799439011", name: "Editor", username: "editor", role: "fan", onboarding: { status: "completed" } };
const id = "507f1f77bcf86cd799439012";
async function setup(page, age = 60000) {
  const now = await page.evaluate(() => Date.now());
  const post = { id, author: user, isOwner: true, postType: "Buy & Sell", text: "Original desk", price: 123444, currency: "AED", location: "Dubai, UAE", rightNow: true, publishedAt: new Date(now - age).toISOString(), editVersion: 0, canResolve: true, comments: [], media: [{ id: "photo", type: "image", url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>' }, { id: "voice", type: "audio", url: "https://example.test/voice.webm", duration: 3, transcript: "The original voice" }] };
  const server = { saves: [], post };
  await page.addInitScript(value => { localStorage.setItem("onlyme_access_token", "edit-fixture"); localStorage.setItem("onlyme_cached_user", JSON.stringify(value)); }, user);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname.endsWith("/profiles/me")) data = { user, profile: { city: "Dubai" } };
    if (url.pathname.endsWith(`/posts/${id}`)) {
      let unchanged = false;
      if (route.request().method() === "PUT") {
        const payload = route.request().postData(); server.saves.push(payload);
        unchanged = payload.includes("Original desk") && payload.includes("123444");
        if (!unchanged) Object.assign(post, { text: "Updated desk", price: 2000, editedAt: new Date().toISOString(), editVersion: 1 });
      }
      data = { post, unchanged };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto(`/posts/${id}`);
  return server;
}
async function openEdit(page) {
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.locator('[data-action="edit"]').click();
}
test("owner edit prefills content, Back cancels, Save updates and marks edited", async ({ page }) => {
  const server = await setup(page);
  await page.evaluate(async owner => {
    const { saveWallDraft } = await import("/src/services/wallDraftStore.js");
    saveWallDraft(owner, { text: "My unsent draft", files: [new File(["draft photo"], "draft.png", { type: "image/png" })] });
  }, user.id);
  await openEdit(page);
  const composer = page.locator(".wall-create-screen");
  await expect(composer.getByRole("textbox", { name: "Note text", exact: true })).toHaveValue("Original desk");
  await expect(composer.locator(".wall-compose-price input")).toHaveValue("123,444");
  await expect(composer.locator(".home-note-preview-grid img")).toHaveCount(1);
  await expect(composer.locator(".wall-composer-voice-chip")).toBeVisible();
  await expect(composer.locator(".wall-edit-time")).toContainText("more min");
  await composer.getByRole("textbox", { name: "Note text", exact: true }).fill("Discard me");
  await composer.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(server.saves).toHaveLength(0);
  await expect(page.locator(".home-feed-text")).toHaveText("Original desk");
  expect(await page.evaluate(async owner => (await import("/src/services/wallDraftStore.js")).readWallDraft(owner).text, user.id)).toBe("My unsent draft");
  await openEdit(page);
  await composer.getByRole("textbox", { name: "Note text", exact: true }).fill("Updated desk");
  await composer.locator(".wall-compose-price input").fill("2000");
  await composer.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => server.saves.length).toBe(1);
  expect(server.saves[0]).toContain('name="retainedMedia"');
  expect(server.saves[0]).toContain('photo'); expect(server.saves[0]).toContain('voice');
  await expect(composer).toHaveCount(0);
  await expect(page.locator(".home-feed-text")).toHaveText("Updated desk");
  await expect(page.locator(".wall-note-edited")).toContainText("edited");
  expect(await page.evaluate(async owner => {
    const draft = (await import("/src/services/wallDraftStore.js")).readWallDraft(owner);
    return [draft.text, draft.files[0].name];
  }, user.id)).toEqual(["My unsent draft", "draft.png"]);
});
test("Edit disappears from an open menu exactly after fifteen minutes", async ({ page }) => {
  const now = Date.now();
  await page.clock.install({ time: now });
  await setup(page, 890000);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await expect(page.locator('[data-action="edit"]')).toBeVisible();
  await page.clock.runFor(11000);
  await expect(page.locator('[data-action="edit"]')).toHaveCount(0);
});
test("notes older than fifteen minutes have no Edit action", async ({ page }) => {
  await setup(page, 901000);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await expect(page.locator('[data-action="edit"]')).toHaveCount(0);
});

test("unchanged Save reports No changes without adding the edited mark", async ({ page }) => {
  await setup(page);
  await openEdit(page);
  await expect(page.locator(".wall-edit-time")).toContainText("Editing · you can change it for");
  await page.locator(".wall-create-screen").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("No changes", { exact: true })).toBeVisible();
  await expect(page.locator(".wall-note-edited")).toHaveCount(0);
});
