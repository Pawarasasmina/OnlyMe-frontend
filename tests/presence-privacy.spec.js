import { test, expect } from "@playwright/test";

async function privacyFixture(page) {
  let preferences = { activityStatus: true, readReceipts: true };
  const writes = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (route.request().method() === "PATCH") { const body = route.request().postDataJSON(); writes.push(body); preferences = { ...preferences, ...body.privacySettings }; }
    return route.fulfill({ json: { success: true, data: path === "/api/settings/privacy" ? { role: "fan", privacySettings: preferences } : { role: "fan", privacySettings: preferences, activeStatus: null, offerAtSeen: false } } });
  });
  await page.goto("/tests/fixtures/presence-privacy.html");
  return writes;
}
test("prototype switches default on, save independently, and persist after reload", async ({ page }) => {
  const writes = await privacyFixture(page);
  const activity = page.getByRole("switch", { name: /Activity status/ });
  const receipts = page.getByRole("switch", { name: /Read receipts/ });
  await expect(activity).toBeEnabled(); await expect(activity).toHaveAttribute("aria-checked", "true");
  await expect(receipts).toHaveAttribute("aria-checked", "true");
  await activity.click(); await expect(activity).toHaveAttribute("aria-checked", "false");
  await expect(receipts).toHaveAttribute("aria-checked", "true");
  await receipts.click(); await expect(receipts).toHaveAttribute("aria-checked", "false");
  expect(writes).toEqual([{ privacySettings: { activityStatus: false } }, { privacySettings: { readReceipts: false } }]);
  await page.reload(); await expect(activity).toHaveAttribute("aria-checked", "false"); await expect(receipts).toHaveAttribute("aria-checked", "false");
});
for (const width of [390, 1280]) test(`return offer aligns with the column and disappears after 9 seconds at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.clock.install(); await privacyFixture(page);
  await expect(page.getByRole("switch", { name: /Activity status/ })).toBeEnabled();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 50)));
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("onlyme-presence-self", { detail: { activeStatus: null, offerAtSeen: true } })));
  const bar = page.locator(".presence-return-bar"); await expect(bar).toBeVisible();
  await expect(bar).toContainText("At seen again?"); await expect(bar.getByRole("button", { name: "Turn on", exact: true })).toBeVisible();
  const bounds = await bar.boundingBox(); expect(Math.abs(bounds.x - ((width - Math.min(width, 440)) / 2 + 16))).toBeLessThan(2);
  await page.clock.fastForward(8999); await expect(bar).toBeVisible();
  await page.clock.fastForward(2); await expect(bar).toHaveCount(0);
});

const recipient = "507f1f77bcf86cd799439012";
for (const scenario of [
  { name: "mutual fan", active: true, creator: false, activity: true, read: true, expected: "Active now" },
  { name: "non-mutual fan", active: false, creator: false, activity: true, read: true, expected: "" },
  { name: "activity hidden", active: true, creator: false, activity: false, read: false, expected: "" },
  { name: "creator reply expectation", active: true, creator: true, activity: true, read: true, expected: "usually replies within ~1h" },
]) test(`Messages respects ${scenario.name} without activity timestamps`, async ({ page }) => {
  const user = { id: "507f1f77bcf86cd799439011", name: "Max", username: "max", role: "fan", activity_status: scenario.activity, read_receipts: scenario.read, onboarding: { status: "completed" } };
  const participant = { id: recipient, name: "Liam Carter", displayName: "Liam Carter", username: "liam.carter", role: scenario.creator ? "creator" : "fan", isCreator: scenario.creator, typicalReplyHours: 1, atSeenActive: scenario.creator };
  const message = { id: "507f1f77bcf86cd799439013", senderId: user.id, recipientId: recipient, body: "A delivered message", createdAt: "2026-11-20T12:00:00Z", delivered: true, readAt: scenario.read ? true : null };
  await page.addInitScript(user => { localStorage.setItem("onlyme_access_token", "presence-fixture"); localStorage.setItem("onlyme_cached_user", JSON.stringify(user)); }, user);
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    let data = { items: [], groups: [], windows: [], calls: [], people: [] };
    if (path === "/api/auth/me") data = { user };
    if (path === "/api/profiles/me") data = { user, profile: {} };
    if (path === "/api/messages/conversations") data = { conversations: [{ id: recipient, participant, lastMessage: message, status: "ACTIVE" }] };
    if (path === `/api/messages/conversations/${recipient}`) data = { participant, messages: [message], pageInfo: { hasMore: false }, conversation: { status: "ACTIVE" }, blockStatus: {} };
    if (path === "/api/presence") data = { items: [{ userId: recipient, active_now: scenario.active }] };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto(`/messages?with=${recipient}`);
  const header = page.locator(".message-chat-header-identity"); await expect(header).toContainText("liam.carter");
  if (scenario.expected) await expect(header).toContainText(scenario.expected);
  else await expect(header.locator(".message-active-now")).toHaveCount(0);
  if (scenario.creator) { await expect(header.locator(".message-active-now")).toHaveCount(0); await expect(header.locator(".message-at-seen-pill")).toHaveText("At seen"); }
  if (!scenario.read) await expect(page.getByLabel("Delivered", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/last seen|last active/i);
});
