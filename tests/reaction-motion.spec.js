import { test, expect } from "@playwright/test";

for (const kind of ["seen", "wall"]) for (const reduced of [false, true]) test(`${kind} selection pops once, reduced motion ${reduced}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.addInitScript(() => { window.capsulePops = []; const animate = Element.prototype.animate; Element.prototype.animate = function(frames, options) { if (options?.duration === 320) window.capsulePops.push({ frames, options }); return animate.call(this, frames, options); }; });
  await page.route("**/api/**", async route => { if (!new URL(route.request().url()).pathname.startsWith("/api/")) return route.continue(); await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { post: { id: "507f1f77bcf86cd799439013", author: { id: "507f1f77bcf86cd799439012", name: "Lina" }, text: "A Wall note", viewerReaction: "love", reactionCount: 1 }, engagement: { viewerReaction: "LOVE", reactionCount: 1, reactionBreakdown: { LOVE: 1 } } } }) }); });
  await page.goto(`/tests/fixtures/reaction-capsules.html?${kind}`);
  expect(await page.evaluate(() => window.capsulePops.length)).toBe(0);
  await page.locator(kind === "wall" ? ".home-reaction-capsule" : ".seen-reactions").click();
  const love = page.getByRole("button", { name: /Love/i }).last();
  await expect(love).toBeVisible(); await love.click();
  await expect(page.locator(".wall-reaction-tray")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.capsulePops.length)).toBe(reduced ? 0 : 1);
  if (!reduced) expect((await page.evaluate(() => window.capsulePops[0])).frames[1].transform).toBe("scale(1.12)");
});

for (const kind of ["seen", "wall"]) test(`${kind} shared tray bounces before applying and closes after selection`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let reactions = 0;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (/reaction/.test(path) && route.request().method() !== "GET") reactions++;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { post: { id: "507f1f77bcf86cd799439013", author: { id: "507f1f77bcf86cd799439012", name: "Lina" }, text: "A Wall note", viewerReaction: "love", reactionCount: 1 }, engagement: { viewerReaction: "LOVE", reactionCount: 1, reactionBreakdown: { LOVE: 1 } } } }) });
  });
  await page.goto(`/tests/fixtures/reaction-capsules.html?${kind}`);
  const capsule = page.locator(kind === "wall" ? ".home-reaction-capsule" : ".seen-reactions");
  await capsule.click();
  const tray = page.locator(".wall-reaction-tray");
  const love = tray.getByRole("button", { name: /Send Love reaction/i });
  const animation = await love.evaluate(button => {
    button.click(); const animation = button.querySelector("span").getAnimations()[0]; animation.pause(); animation.currentTime = 100;
    return { duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes().map(frame => frame.transform) };
  });
  await expect(love).toBeDisabled();
  expect(animation.duration).toBe(280); expect(animation.frames[1]).toContain("scale(1.35)");
  expect(reactions).toBe(0); await expect(tray).toBeVisible();
  await love.locator("span").evaluate(span => span.getAnimations()[0].finish());
  await expect.poll(() => reactions).toBe(1); await expect(tray).toHaveCount(0);
  await expect(capsule).toBeFocused();
  await capsule.click(); await page.getByRole("button", { name: "More reactions", exact: true }).click();
  const expanded = page.locator(".seen-reaction-sheet"); await expect(expanded).toBeVisible();
  await expanded.getByRole("button", { name: /Love reaction/i }).click();
  await expect(expanded).toHaveCount(0);
  const applied = reactions;
  await capsule.click();
  await tray.getByRole("button", { name: /Love reaction/i }).evaluate(button => { button.click(); button.querySelector("span").getAnimations()[0].pause(); });
  await page.keyboard.press("Escape");
  await expect(tray).toHaveCount(0);
  expect(reactions).toBe(applied);
});

async function chat(page) {
  const viewer = "507f1f77bcf86cd799439011", other = "507f1f77bcf86cd799439012";
  const participant = { id: other, name: "Lina", displayName: "Lina", username: "lina", role: "fan" };
  const message = { id: "507f1f77bcf86cd799439013", senderId: other, recipientId: viewer, body: "Hello from Lina", mediaType: "text", disappearAfterSeconds: null, createdAt: new Date().toISOString(), reactions: [] };
  const requests = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname; if (!path.startsWith("/api/")) return route.continue();
    let data = { items: [], people: [], groups: [], windows: [], calls: [] };
    if (path === "/api/messages/conversations") data = { conversations: [{ id: other, type: "direct", status: "ACTIVE", participant, lastMessage: message }] };
    if (path === `/api/messages/conversations/${other}`) data = { participant, messages: [message], conversation: { status: "ACTIVE" }, blockStatus: {}, pageInfo: { hasMore: false } };
    if (/\/reaction$/.test(path)) { const request = route.request(); requests.push(request.method()); message.reactions = request.method() === "DELETE" ? [] : [{ userId: viewer, emoji: request.postDataJSON().emoji }]; data = { reactions: message.reactions }; }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/tests/fixtures/invitation-messages.html");
  await page.getByRole("button", { name: /Lina.*Hello from Lina/ }).click();
  return { bubble: page.locator('[data-message-id="507f1f77bcf86cd799439013"]'), requests };
}
test("chat actions hide at rest, keyboard focus reveals them, double-click toggles actual reactions", async ({ page }) => {
  const { bubble, requests } = await chat(page);
  await page.mouse.move(0, 0); await expect(page.locator(".message-action-controls")).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "React to message", exact: true }).focus();
  await expect(page.locator(".message-action-controls")).toHaveCSS("opacity", "1");
  await bubble.dblclick(); await expect.poll(() => requests.length).toBe(1);
  await expect(page.getByRole("button", { name: /❤️ reaction by/ })).toBeVisible();
  await bubble.dblclick(); await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toBe("DELETE"); await expect(page.getByRole("button", { name: /❤️ reaction by/ })).toHaveCount(0);
});
test.describe("mobile touch", () => {
test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
test("touch double-tap fires once and hold opens the tray", async ({ page }) => {
  const { bubble, requests } = await chat(page);
  await expect(page.locator(".message-action-controls")).toHaveCSS("opacity", "0");
  for (let i = 0; i < 2; i++) { await bubble.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1 }); await bubble.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1 }); }
  await bubble.dispatchEvent("dblclick"); await expect.poll(() => requests.length).toBe(1);
  await bubble.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1 });
  await expect(page.locator(".message-action-controls [data-chat-popover]").getByRole("button", { name: "😂", exact: true })).toBeVisible();
  await bubble.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1 });
  expect(requests).toHaveLength(1);
});
});
