import { test, expect } from "@playwright/test";

const id = "507f1f77bcf86cd799439012";
async function fixture(page, { count = 3, signedOut = false } = {}) {
  const people = ["Anna Petrova", "Omar Haddad", "Mia Tanaka"].slice(0, count).map((name, i) => ({ id: `${id.slice(0, -1)}${i + 2}`, name, username: name.split(" ")[0].toLowerCase(), joinedAt: new Date(Date.now() - 7200000).toISOString(), type: "friend" }));
  const state = { sent: [], requests: [] };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    state.requests.push({ path, method: route.request().method() });
    let data = { items: [] };
    if (path === "/api/settings/invitations") data = { code: "f-max-test", joinedCount: count, friends: people, creators: [], ringEarned: count >= 3 };
    if (path.startsWith("/api/creator/referrals/")) data = { type: "friend", inviter: { name: "Max Carter", username: "max" } };
    if (path === "/api/messages/share/recipients") data = { people: people.map(x => ({ ...x, displayName: x.name })) };
    if (path === "/api/messages/share") { state.sent.push(route.request().postDataJSON()); data = { sent: [{ recipientId: id }], failed: [] }; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto(`/tests/fixtures/friends.html${signedOut ? "?public=1" : ""}`);
  return state;
}
test("Bring friends matches the earned-ring sheet and the private joined list", async ({ page }) => {
  await fixture(page);
  await expect(page.getByRole("heading", { name: "Your gold ring is on" })).toBeVisible();
  // Use the real profile selectors to catch story-ring CSS overriding earned gold.
  await page.evaluate(() => {
    const profile = document.createElement("div");
    profile.className = "profile-prototype is-owner-profile";
    profile.innerHTML = '<div class="profile-identity is-owner"><div class="profile-avatar-orbit-shell has-invite-gold-ring"><button class="profile-avatar-ring no-stories" aria-label="Gold ring styling check"></button></div></div>';
    document.body.appendChild(profile);
  });
  const goldRing = page.getByRole("button", { name: "Gold ring styling check" });
  await expect(goldRing).toHaveCSS("border-top-color", "rgb(217, 184, 100)");
  await goldRing.evaluate(el => { el.classList.replace("no-stories", "has-stories"); });
  await expect(goldRing).toHaveCSS("border-top-color", "rgb(217, 184, 100)");
  await goldRing.evaluate(el => el.closest(".profile-prototype").remove());
  await expect(page.locator(".bring-friends-home h2")).toHaveCSS("font-size", "21px");
  await page.screenshot({ path: test.info().outputPath("bring-friends.png") });
  await expect(page.getByText("Only you see who joined with your invite")).toBeVisible();
  await page.getByRole("button", { name: "See all (3)" }).click();
  await expect(page.getByRole("heading", { name: "Joined with your invite" })).toBeVisible();
  await expect(page.getByText("FRIENDS · 3")).toBeVisible();
  await page.getByRole("button", { name: "More about Anna Petrova" }).click();
  await expect(page.getByRole("button", { name: "Send a gift", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View profile", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/anna$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Joined with your invite" })).toBeVisible();
});
test("invitation preview Join shows the prototype toast without creating an attribution", async ({ page }) => {
  const state = await fixture(page, { count: 0 });
  await expect(page.getByRole("heading", { name: "3 more friends — and a gold ring" })).toBeVisible();
  await page.getByRole("button", { name: "See what your friend sees" }).click();
  await expect(page.getByRole("heading", { name: "Join Max on @seen" })).toBeVisible();
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("This is what your friend sees ✓");
  expect(state.requests.filter(x => x.method !== "GET")).toHaveLength(0);
});
test("private preview toast and share recipient flow work on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fixture(page);
  await page.getByRole("button", { name: "Send an invite" }).click();
  await expect(page.getByText("Max invited you to @seen")).toBeVisible();
  await expect(page.getByText("Real stories from real people. Join me there.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Story", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Select Anna Petrova" }).click();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".fan-archive-toast")).toContainText("Sent to Anna");
  expect(state.sent[0].sharedContent.contentType).toBe("invitation");
  await fixture(page);
  await page.getByRole("button", { name: "See what your friend sees" }).click();
  await page.getByRole("button", { name: "Join without telling Max" }).click();
  await expect(page.getByRole("status")).toHaveText("Joined — Max won’t be told");
});
test("real invitation private Join carries privacy choice into registration", async ({ page }) => {
  await fixture(page, { signedOut: true });
  await page.getByRole("button", { name: "Join without telling Max" }).click();
  await expect(page).toHaveURL(/\/register\?ref=f-max-test&private=1$/);
});

test("Copy link closes sharing and copies the actual invitation URL", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await fixture(page);
  await page.getByRole("button", { name: "Send an invite" }).click();
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Link copied ✓");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/invite/f-max-test");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("More falls back to copying the invitation with its message", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { configurable: true, value: undefined }));
  await fixture(page);
  await page.getByRole("button", { name: "Send an invite" }).click();
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Copied with a message — paste it anywhere");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Max invited you to @seen");
  expect(copied).toContain("/invite/f-max-test");
});
