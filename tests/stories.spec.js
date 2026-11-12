import { test, expect } from "@playwright/test";
import process from "node:process";
import { Buffer } from "node:buffer";
const id = "507f1f77bcf86cd799439013";
const user = { id: "507f1f77bcf86cd799439011", name: "Story Fixture", username: "fixture", role: "fan", onboarding: { status: "completed" } };
const person = { id: "507f1f77bcf86cd799439012", name: "Lina Moreau", username: "lina" };
const replyId = "507f1f77bcf86cd799439015";
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><rect width="540" height="960" fill="#375169"/></svg>';
const image = "data:image/svg+xml," + encodeURIComponent(svg);
async function fixture(page, { status = 200, own = false } = {}) {
  const state = { submitted: [], reactions: [], highlights: [], highlightRequests: [], failHighlight: false };
  const story = { id, owner: own ? user : person, isOwner: own, viewCount: 180, mediaUrl: image, mediaType: "image", audience: "everyone", allowSharing: true, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+3600000).toISOString(), editorMetadata: { flattened: true, mentions: [{ userId: user.id, username: user.username, x: 50, y: 40 }] } };
  await page.addInitScript((value) => {
    localStorage.setItem("onlyme_access_token", "story_fixture_token");
    localStorage.setItem("onlyme_cached_user", JSON.stringify(value));
    localStorage.setItem("atseen_activity_intro_dismissed", "1");
  }, user);
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], unreadCount: 0, pagination: { page: 1, pages: 1, total: 0 } };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname.endsWith("/profiles/me") || url.pathname.endsWith("/profile/me")) data = { user, profile: { ownerUserId: user.id, displayName: user.name, username: user.username, role: "fan", isCreator: false }, publicMetrics: { followerCount: 0, followingCount: 0, seenByCount: 0 }, viewerCapabilities: { isOwner: true }, planets: [], seens: [], media: [] };
    if (url.pathname === `/api/stories/${id}`) return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status === 200 ? { success: true, data: { story: { ...story, viewerReaction: state.reactions.at(-1)?.reaction || null } } } : { message: status === 403 ? "Forbidden" : "Unavailable" }) });
    if (url.pathname === `/api/stories/creators/${user.id}/highlights`) data = { items: state.highlights };
    if (url.pathname === "/api/stories/archive") data = { items: [story, { ...story, id: "507f1f77bcf86cd799439016" }] };
    if (url.pathname === "/api/stories/highlights" && request.method() === "POST") {
      state.highlightRequests.push(request.postDataJSON());
      if (state.failHighlight) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Please try again" }) });
      const highlight = { id: "507f1f77bcf86cd799439017", name: request.postDataJSON().name, coverUrl: image, stories: request.postDataJSON().storyIds.map((storyId) => ({ ...story, id: `snapshot-${storyId}`, originalStoryId: storyId })) };
      state.highlights.push(highlight); data = { highlight };
    }
    if (/\/stories\/highlights\/[^/]+\/stories$/.test(url.pathname) && request.method() === "POST") { state.highlightRequests.push(request.postDataJSON()); data = {}; }
    if (/\/stories\/highlights\/[^/]+$/.test(url.pathname) && request.method() === "PATCH") {
      state.highlightRequests.push(request.postDataJSON()); Object.assign(state.highlights[0], request.postDataJSON()); data = { highlight: state.highlights[0] };
    }
    if (/\/stories\/highlights\/[^/]+\/stories\/[^/]+$/.test(url.pathname) && request.method() === "DELETE") {
      state.highlightRequests.push({ removed: url.pathname.split("/").at(-1) }); state.highlights[0].stories = state.highlights[0].stories.filter((item) => item.originalStoryId !== url.pathname.split("/").at(-1));
    }
    if (/\/stories\/highlights\/[^/]+$/.test(url.pathname) && request.method() === "DELETE") { state.highlights = []; }
    if (url.pathname === "/api/stories/people") data = { people: [person, ...Array.from({ length: 8 }, (_, index) => ({ id: `person-${index}`, name: `Creator ${index + 1}`, username: `creator${index + 1}` }))].filter((entry) => `${entry.name} ${entry.username}`.toLowerCase().includes((url.searchParams.get("q") || "").toLowerCase())).map((entry) => ({ ...entry, avatarUrl: image })) };
    if (url.pathname === "/api/stories" && request.method() === "POST") { state.submitted.push(request.postDataBuffer().toString()); data = { story: { ...story, owner: user } }; }
    if (url.pathname.endsWith("/reactions")) { state.reactions.push(request.postDataJSON()); data = { reaction: state.reactions.at(-1).reaction }; }
    if (url.pathname === "/api/fan/activity") data = { items: [{ id: "mention-1", type: "story_mention", title: "Lina mentioned you in a story", direction: "received", relatedCreator: person, target: { type: "STORY", id }, metadata: { imageUrl: image }, createdAt: new Date().toISOString(), canAcknowledge: true }], unreadCount: 1 };
    if (url.pathname === "/api/wallet") data = { wallet: { balance: 0 } };
    if (url.pathname === `/api/messages/conversations/${person.id}`) data = { participant: { ...person, displayName: person.name, role: "fan" }, conversationStatus: "ACTIVE", messages: [{ id: replyId, senderId: person.id, recipientId: user.id, body: "A reply to the story", mediaType: "text", disappearAfterSeconds: null, createdAt: new Date().toISOString(), storyReply: { storyId: id, imageUrl: image, caption: "A moment", expiresAt: story.expiresAt, questionPrompt: "" } }], pageInfo: { hasMore: false, nextCursor: null } };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  return state;
}
for (const width of [1440, 393]) {
  test(`story composer mentions, text formatting and publish ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await fixture(page);
    await page.goto(`/stories/${id}?reshare=1`);
    const composer = page.getByRole("dialog", { name: "Create Story", exact: true });
    await expect(composer).toBeVisible({ timeout: 15000 });
    const fileInput = composer.locator('input[type="file"]');
    await fileInput.setInputFiles(process.env.STORY_TEST_IMAGE || { name: "story.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) });
    await composer.getByRole("button", { name: "Mention people", exact: true }).click();
    const avatar = page.locator(".story-mention-avatar").first();
    await expect(avatar).toBeVisible();
    const avatarBounds = await avatar.boundingBox();
    expect(avatarBounds.width).toBe(40);
    expect(avatarBounds.height).toBe(40);
    await expect(avatar).toHaveCSS("border-radius", "50%");
    await expect(page.locator(".story-mention-title")).toHaveCSS("font-size", "20px");
    await expect(page.locator(".story-mention-search")).toHaveCSS("box-shadow", "none");
    await page.screenshot({ path: info.outputPath(`story-mentions-${width}.png`) });
    await page.getByRole("textbox", { name: "Search people to mention" }).fill("lina");
    await expect(page.getByRole("button", { name: /Lina Moreau/ })).toBeVisible();
    await page.getByRole("button", { name: /Lina Moreau/ }).click();
    await expect(composer.locator(".story-composer-mention")).toHaveText("@lina");
    const mention = composer.locator(".story-composer-mention");
    await expect(mention).toHaveCSS("background-color", "rgba(10, 13, 18, 0.55)");
    await mention.click();
    await expect(mention).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(mention.locator("span")).toHaveCSS("color", "rgb(59, 111, 176)");
    await mention.click();
    await expect(mention).not.toHaveClass(/is-solid/);
    await mention.focus();
    await page.keyboard.press("Enter");
    await expect(mention).toHaveClass(/is-solid/);
    if (width === 393) {
      const box = await mention.boundingBox();
      const x = box.x + box.width/2, y = box.y + box.height/2;
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x-20, y, id: 1 }, { x: x+20, y, id: 2 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x-45, y: y-20, id: 1 }, { x: x+45, y: y+20, id: 2 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => mention.evaluate((element) => Number(/scale\(([^)]+)/.exec(element.style.transform)?.[1]))).toBeGreaterThan(1.2);
      await expect.poll(() => mention.evaluate((element) => Math.abs(Number(/rotate\(([-\d.]+)/.exec(element.style.transform)?.[1])))).toBeGreaterThan(5);
      await session.detach();
    }
    await mention.focus();
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => mention.evaluate((element) => Number.parseFloat(element.style.top))).toBeLessThan(45);
    await composer.getByRole("button", { name: "Add text", exact: true }).click();
    await page.getByRole("textbox", { name: "Story text" }).fill("A real moment\nSecond line");
    await composer.getByRole("button", { name: "Neon", exact: true }).click();
    await composer.getByRole("button", { name: "Change text background", exact: true }).click();
    await composer.getByRole("slider", { name: "Text size" }).fill("36");
    await expect(composer.getByRole("button", { name: "Share", exact: true })).toBeHidden();
    await page.screenshot({ path: info.outputPath(`story-text-editor-${width}.png`) });
    await composer.getByRole("button", { name: "Done", exact: true }).click();
    await expect(composer.getByRole("button", { name: "Share", exact: true })).toBeVisible();
    const bounds = await composer.locator(".story-composer-stage").boundingBox();
    expect(Math.abs(bounds.width / bounds.height - 9/16)).toBeLessThan(.01);
    const placedText = composer.getByRole("button", { name: "A real moment Second line", exact: true });
    const textBounds = await placedText.boundingBox();
    await page.mouse.move(textBounds.x + 20, textBounds.y + 20);
    await page.mouse.down();
    await page.mouse.move(textBounds.x + 20, textBounds.y - bounds.height * .18, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("textbox", { name: "Story text" })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`story-composer-${width}.png`) });
    await composer.getByRole("button", { name: "Share", exact: true }).click();
    await expect.poll(() => state.submitted.length).toBe(1);
    expect(state.submitted[0]).toContain('"style":5');
    expect(state.submitted[0]).toContain('"backgroundMode":1');
    expect(state.submitted[0]).toContain('"flattened":true');
    expect(state.submitted[0]).toContain(person.id);
    expect(state.submitted[0]).toContain('"st":1');
  });
}
test("Story reaction lights cold blue, toggles off and displays the chosen emoji", async ({ page }) => {
  const state = await fixture(page);
  await page.goto(`/stories/${id}`);
  const heart = page.getByRole("button", { name: "React with heart. Hold for more reactions." });
  await expect(heart).toBeVisible({ timeout: 15000 });
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart.locator("path")).toHaveAttribute("fill", "url(#discover-story-heart-gradient)");
  await expect(heart).toBeEnabled();
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart).toBeEnabled();
  await heart.dispatchEvent("pointerdown");
  const laugh = page.getByRole("button", { name: "React with 😂", exact: true });
  await expect(laugh).toBeVisible();
  await heart.dispatchEvent("pointerup");
  await laugh.click();
  await expect(heart).toHaveText("😂");
  await expect(heart.locator(".discover-story-heart-emoji")).toHaveCSS("animation-duration", "0.5s");
  await expect(heart.locator(".discover-story-heart-ring")).toHaveCSS("animation-duration", "0.6s");
  await expect(page.locator(".story-floating-reaction")).toHaveCSS("animation-duration", "1s");
  expect(state.reactions.map((entry) => entry.reaction)).toEqual(["❤️", null, "😂"]);
});

test("Activity opens the exact mentioned story and exposes a credited reshare", async ({ page }, info) => {
  await fixture(page);
  await page.goto("/activity");
  await page.getByRole("button", { name: "Mentions", exact: true }).click();
  await expect(page).toHaveURL(/filter=mentions/);
  await expect(page.getByText('"Tap to add it to your story"', { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Lina mentioned you in a story/ }).click();
  const sheet = page.getByRole("dialog", { name: "Mentioned you in their story", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "View story", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("mention-detail-desktop.png") });
  await sheet.getByRole("button", { name: "Add to your story", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Create Story", exact: true })).toBeVisible();
  await expect(page.locator(".story-shared-card-preview")).toContainText("@lina");
  const card = page.locator(".story-shared-card-preview");
  const original = await card.boundingBox();
  await card.hover();
  await page.mouse.wheel(0, -150);
  await expect.poll(async () => (await card.boundingBox()).width).toBeGreaterThan(original.width * 1.1);
  await page.mouse.wheel(0, 300);
  await expect.poll(async () => (await card.boundingBox()).width).toBeLessThan(original.width);
  await card.focus();
  await page.keyboard.press("+");
  const box = await card.boundingBox();
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width/2, y = box.y + box.height/2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x-20, y, id: 1 }, { x: x+20, y, id: 2 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x-40, y, id: 1 }, { x: x+40, y, id: 2 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await card.boundingBox()).width).toBeGreaterThan(box.width * 1.5);
  await session.detach();
});

test("Mention preview opens the original story and closes back to Activity", async ({ page }, info) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await fixture(page);
  await page.goto("/activity");
  const row = page.getByRole("button", { name: /Lina mentioned you in a story/ });
  await row.click();
  const sheet = page.getByRole("dialog", { name: "Mentioned you in their story", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Add to your story", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("mention-detail-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await row.click();
  await sheet.getByRole("button", { name: "View story", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/stories/${id}$`));
  await expect(page.getByRole("button", { name: "Add to your story", exact: true })).toBeVisible();
});

test("Expired mention preview cannot open the reshare composer", async ({ page }) => {
  await fixture(page, { status: 404 });
  await page.goto("/activity");
  await page.getByRole("button", { name: /Lina mentioned you in a story/ }).click();
  const sheet = page.getByRole("dialog", { name: "Mentioned you in their story", exact: true });
  await expect(sheet.getByRole("alert")).toContainText("no longer available");
  await expect(sheet.getByRole("button", { name: "Add to your story", exact: true })).toHaveCount(0);
});

test("Sent mention Activity shows the recipient and opens the published story", async ({ page }) => {
  await fixture(page);
  await page.route("**/api/fan/activity?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [{ id: "sent-mention", type: "story_mention", title: "You mentioned Lina in your story", direction: "sent", relatedCreator: { ...person, name: "Lina" }, target: { type: "STORY", id }, createdAt: new Date().toISOString(), canAcknowledge: false }], unreadCount: 0 } }) }));
  await page.goto("/activity?direction=sent&filter=mentions");
  const row = page.getByRole("button", { name: /You mentioned Lina in your story/ });
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row.locator("b")).toHaveText("Lina");
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/stories/${id}$`));
});
test("Messages focuses an Activity-linked reply and opens the exact story", async ({ page }) => {
  await fixture(page);
  await page.goto(`/messages?with=${person.id}&message=${replyId}`);
  const message = page.locator(`[data-message-id="${replyId}"]`);
  await expect(message).toBeVisible({ timeout: 15000 });
  await expect(message).toHaveClass(/message-notification-focus/);
  await message.getByRole("button").first().click();
  await expect(page).toHaveURL(new RegExp(`/stories/${id}$`));
  await expect(page.getByRole("button", { name: "Add to your story", exact: true })).toBeVisible();
});
for (const status of [403, 404, 503]) {
  test(`story direct link handles ${status} without fallback content`, async ({ page }) => {
    await fixture(page, { status });
    await page.goto(`/stories/${id}`);
    await expect(page.getByRole("alert")).toContainText(status === 403 ? "Story access restricted" : status === 404 ? "Story unavailable" : "Unable to load story");
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(status === 503 ? 1 : 0);
  });
}

for (const width of [1440, 393]) {
  test(`Highlight create, back, success and existing highlight ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await fixture(page, { own: true });
    await page.goto(`/stories/${id}`);
    await page.getByRole("button", { name: "Highlight", exact: true }).click();
    let picker = page.getByRole("dialog", { name: "Add to highlight", exact: true });
    await expect(picker).toBeVisible();
    await expect(picker.getByRole("textbox")).toHaveCount(0);
    const bounds = await picker.boundingBox();
    if (width === 1440) {
      const column = await page.locator(".social-center-scroll").boundingBox();
      expect(Math.abs(bounds.x - column.x)).toBeLessThan(2);
      expect(Math.abs(bounds.width - column.width)).toBeLessThan(2);
    } else expect(bounds.width).toBe(width);
    await page.screenshot({ path: info.outputPath(`highlight-picker-${width}.png`) });
    await picker.getByRole("button", { name: "New", exact: true }).click();
    const details = page.getByRole("dialog", { name: "New highlight", exact: true });
    await expect(details.locator(".story-highlight-cover-preview img")).toBeVisible();
    await expect(details.getByRole("textbox", { name: "Highlight name" })).toHaveAttribute("maxlength", "16");
    await details.getByRole("textbox").fill("nights");
    await details.getByRole("button", { name: "Back" }).click();
    await picker.getByRole("button", { name: "New", exact: true }).click();
    await expect(details.getByRole("textbox")).toHaveValue("nights");
    await page.screenshot({ path: info.outputPath(`highlight-new-${width}.png`) });
    state.failHighlight = true;
    await details.getByRole("button", { name: "Add", exact: true }).click();
    await expect(details.getByRole("alert")).toHaveText("Please try again");
    await expect(details.getByRole("textbox")).toHaveValue("nights");
    state.failHighlight = false;
    await details.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /Added to .*nights/ })).toBeVisible();
    expect(state.highlightRequests.at(-1)).toEqual({ name: "nights", storyIds: [id], coverStoryId: id });
    await page.screenshot({ path: info.outputPath(`highlight-success-${width}.png`) });
    await expect(page.locator(".story-highlight-success")).toBeHidden({ timeout: 5000 });
    await page.getByRole("button", { name: "Highlight", exact: true }).click();
    picker = page.getByRole("dialog", { name: "Add to highlight", exact: true });
    await picker.getByRole("button", { name: "nights", exact: true }).click();
    await expect(page.locator(".story-highlight-success")).toBeVisible();
    expect(state.highlightRequests.at(-1)).toEqual({ storyId: id });
    await page.locator(".story-highlight-success").click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("region", { name: "Story highlights" }).getByRole("button", { name: "nights", exact: true })).toBeVisible();
  });
}

for (const width of [1440, 393]) {
  test(`Highlight profile archive, cover, edit, remove and delete ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await fixture(page, { own: true });
    await page.goto("/profile");
    const highlights = page.getByRole("region", { name: "Story highlights" });
    await highlights.getByRole("button", { name: "New", exact: true }).click();
    const creator = page.getByRole("dialog", { name: "Create story highlight" });
    await expect(creator.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await creator.locator(".profile-highlight-archive > button").nth(0).click();
    await creator.locator(".profile-highlight-archive > button").nth(1).click();
    await expect(creator.locator(".profile-highlight-check").nth(1)).toHaveText("2");
    await page.screenshot({ path: info.outputPath(`highlight-archive-${width}.png`) });
    await creator.getByRole("button", { name: "Next", exact: true }).click();
    await creator.locator(".profile-highlight-cover-options button").nth(1).click();
    await creator.getByRole("textbox", { name: "Highlight name" }).fill("Weekend");
    await page.screenshot({ path: info.outputPath(`highlight-cover-${width}.png`) });
    await creator.getByRole("button", { name: "Done", exact: true }).click();
    await expect(highlights.getByRole("button", { name: "Weekend", exact: true })).toBeVisible();
    expect(state.highlightRequests.at(-1).coverStoryId).toBe("507f1f77bcf86cd799439016");
    await highlights.getByRole("button", { name: "Weekend", exact: true }).click();
    await expect(page.locator(".story-highlight-view-count")).toHaveText("180 viewers");
    await page.getByRole("button", { name: "Open story menu", exact: true }).click();
    let actions = page.getByRole("dialog", { name: "Weekend actions" });
    await actions.getByRole("button", { name: "Edit highlight", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Edit highlight", exact: true });
    await editor.getByRole("textbox", { name: "Highlight name" }).fill("Trips");
    await editor.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Open story menu", exact: true }).click();
    actions = page.getByRole("dialog", { name: "Trips actions" });
    await actions.getByRole("button", { name: "Remove from highlight", exact: true }).click();
    await expect.poll(() => state.highlightRequests.at(-1).removed).toBe(id);
    await page.getByRole("button", { name: "Open story menu", exact: true }).click();
    await expect(actions.getByRole("button", { name: "Remove from highlight", exact: true })).toHaveCount(0);
    await actions.getByRole("button", { name: "Delete highlight", exact: true }).click();
    await actions.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(highlights.getByRole("button", { name: "Trips", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close story", exact: true })).toHaveCount(0);
  });
}

for (const width of [1440, 393]) {
  test(`Own story options match prototype ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await fixture(page, { own: true });
    await page.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { window.__copiedStoryLink = value; } } }); });
    await page.goto(`/stories/${id}`);
    await page.getByRole("button", { name: "Open story menu", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Story actions", exact: true });
    await expect(menu.locator(".story-owner-actions-list button")).toHaveText(["Add to highlight", "Save to phone", "Send to...", "Copy link", "Story audience", "Delete"]);
    await expect(menu.locator(".story-owner-actions-list button svg")).toHaveCount(6);
    await expect(menu).toHaveCSS("background-color", "rgb(28, 34, 45)");
    await page.screenshot({ path: info.outputPath(`story-owner-menu-${width}.png`) });
    await menu.getByRole("button", { name: "Story audience", exact: true }).click();
    const toast = page.locator(".story-menu-toast");
    await expect(toast).toHaveText("Everyone can see this");
    await expect(toast).toHaveCSS("top", "60px");
    await expect(menu).toHaveCount(0);
    await page.getByRole("button", { name: "More", exact: true }).click();
    await menu.getByRole("button", { name: "Copy link", exact: true }).click();
    await expect(toast).toHaveText("Link copied");
    expect(await page.evaluate(() => window.__copiedStoryLink)).toBe(`http://localhost:5173/stories/${id}`);
    await page.screenshot({ path: info.outputPath(`story-copy-toast-${width}.png`) });
    await page.getByRole("button", { name: "More", exact: true }).click();
    await menu.getByRole("button", { name: "Delete", exact: true }).click();
    const confirm = page.getByRole("alertdialog", { name: "Delete this story?", exact: true });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await menu.getByRole("button", { name: "Add to highlight", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Add to highlight", exact: true })).toBeVisible();
  });
}

for (const width of [1440, 393]) {
  test(`Story photo fits, zooms in and out, and pans ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await fixture(page);
    await page.goto(`/stories/${id}?reshare=1`);
    const composer = page.getByRole("dialog", { name: "Create Story", exact: true });
    await composer.locator('input[type="file"]').setInputFiles({ name: "landscape.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#458a76"/><circle cx="400" cy="300" r="100" fill="#f5ca76"/></svg>') });
    const photo = composer.locator(".story-composer-photo-image");
    await expect.poll(() => photo.evaluate((element) => element.complete && element.naturalWidth)).toBe(800);
    const gesture = composer.getByRole("button", { name: "Adjust story photo. Drag to move and pinch to zoom." });
    const bounds = await gesture.boundingBox();
    const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height * .13;
    const initial = await photo.boundingBox();
    expect(Math.abs(initial.width / initial.height - 4/3)).toBeLessThan(.02);
    if (width === 393) {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x-30, y, id: 1 }, { x: x+30, y, id: 2 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x-65, y, id: 1 }, { x: x+65, y, id: 2 }] });
      await expect.poll(async () => (await photo.boundingBox()).width).toBeGreaterThan(initial.width*1.8);
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x-18, y, id: 1 }, { x: x+18, y, id: 2 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.wheel(0,-400);
      await expect.poll(async () => (await photo.boundingBox()).width).toBeGreaterThan(initial.width*1.8);
      await page.mouse.wheel(0,650);
    }
    await expect.poll(async () => (await photo.boundingBox()).width).toBeLessThan(initial.width*.9);
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+45,y+35,{ steps: 8 }); await page.mouse.up();
    await expect.poll(() => photo.evaluate((element) => parseFloat(element.style.left))).toBeGreaterThan(55);
    await expect(composer.locator(".story-composer-photo-blur")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`story-photo-zoom-${width}.png`) });
  });
}

for (const width of [1440, 393]) {
  test(`Credited story reshare matches prototype ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await fixture(page);
    await page.goto(`/stories/${id}?reshare=1`);
    const composer = page.getByRole("dialog", { name: "Create Story", exact: true });
    const card = composer.getByRole("group", { name: "Shared story: Lina Moreau", exact: true });
    const media = card.locator(".story-reshare-card-media");
    await expect(media.getByAltText("Original story")).toBeVisible();
    await expect(card.locator(".story-reshare-card-author b")).toHaveText("Lina");
    await expect(card.locator(".story-reshare-card-credit")).toHaveText("@lina");
    await expect(card).not.toContainText("Original story");
    const bounds = await media.boundingBox();
    expect(Math.abs(bounds.width / bounds.height - 9/16)).toBeLessThan(.01);
    expect(bounds.width).toBeLessThanOrEqual(200);
    await expect(composer.locator(".story-composer-head > button")).toHaveCount(5);
    const stage = await composer.locator(".story-composer-stage").boundingBox();
    if (width === 1440) { const column = await page.locator(".social-center-scroll").boundingBox(); expect(Math.abs(stage.width-column.width)).toBeLessThan(2); }
    else expect(stage.width).toBe(width);
    await page.screenshot({ path: info.outputPath(`story-reshare-${width}.png`), animations: "disabled" });
    await card.focus(); await page.keyboard.press("+");
    await expect.poll(async () => (await media.boundingBox()).width).toBeGreaterThan(bounds.width);
    await composer.getByRole("button", { name: "Share", exact: true }).click();
    await expect.poll(() => state.submitted.length).toBe(1);
    expect(state.submitted[0]).toContain('name="sourceStoryId"');
    expect(state.submitted[0]).toContain('"username":"lina"');
    expect(state.submitted[0]).toContain('"kind":"story"');
  });
}

for (const width of [1440, 393]) {
  test(`Seen by Today and This week match prototype ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await fixture(page, { own: true });
    const signals = [
      { actor: { id: person.id, displayName: "Lina Moreau", username: "lina", avatarUrl: image }, createdAt: new Date(Date.now()-120000).toISOString() },
      { actor: { id: "507f1f77bcf86cd799439021", displayName: "Ethan Brooks", username: "ethan", avatarUrl: image }, createdAt: new Date(Date.now()-2*86400000).toISOString() },
      { actor: { id: "507f1f77bcf86cd799439022", displayName: "Mia Tanaka", username: "mia", avatarUrl: image }, createdAt: new Date(Date.now()-3*86400000).toISOString() }
    ];
    const sent = [{ targetUserId: signals[2].actor.id }];
    await page.route("**/api/profiles/me/viewers**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { signals } }) }));
    await page.route("**/api/orbit/signals**", (route) => {
      if (route.request().method() === "POST") sent.push(route.request().postDataJSON());
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { signals: sent } }) });
    });
    await page.goto("/profile");
    await page.getByRole("button", { name: /Seen by/ }).click();
    const dialog = page.getByRole("dialog").filter({ has: page.getByRole("navigation", { name: "Profile connections" }) });
    const week = dialog.locator(".profile-seen-group").filter({ has: page.getByRole("heading", { name: "This week", exact: true }) });
    await expect(week.locator(".profile-seen-by-row")).toHaveCount(2);
    const ethan = week.locator(".profile-seen-by-row").filter({ hasText: "Ethan Brooks" });
    const button = ethan.getByRole("button", { name: "See back", exact: true });
    await expect(button).toHaveCSS("color", "rgb(156, 203, 255)");
    await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(button.locator("svg path")).toHaveAttribute("fill", "currentColor");
    await expect(ethan.locator("small")).toHaveCSS("color", "rgba(255, 255, 255, 0.4)");
    await expect(week.locator(".profile-seen-mutual")).toHaveText("mutual");
    await page.screenshot({ path: info.outputPath(`seen-by-${width}.png`), animations: "disabled" });
    await button.click();
    await expect(ethan.locator(".profile-seen-mutual")).toHaveText("mutual");
    expect(sent.some((item) => item.targetUserId === signals[1].actor.id)).toBe(true);
    await dialog.getByRole("textbox", { name: "Search profile connections" }).fill("mia");
    await expect(dialog.locator(".profile-seen-by-row")).toHaveCount(1);
  });
}

test("Activity Following toggles to Follow back and persists", async ({ page }) => {
  await fixture(page);
  let following = true;
  let changes = 0;
  await page.route("**/api/fan/activity**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { items: [{ id: "follow-event", type: "follow", title: "Lina Moreau started following you", direction: "received", relatedCreator: person, createdAt: new Date().toISOString() }] } }) }));
  await page.route("**/api/profiles/lina", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { profile: { username: "lina" }, viewerRelationship: { following } } }) }));
  await page.route("**/api/profiles/lina/follow", (route) => {
    following = !following; changes++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { relationship: { active: following } } }) });
  });
  await page.goto("/activity");
  await page.getByRole("button", { name: "Following", exact: true }).click();
  const followBack = page.getByRole("button", { name: "Follow back", exact: true });
  await expect(followBack).toBeEnabled();
  await expect(followBack).toHaveCSS("background-color", "rgb(156, 203, 255)");
  expect(changes).toBe(1);
  await page.reload();
  await expect(followBack).toBeEnabled();
  await followBack.click();
  await expect(page.getByRole("button", { name: "Following", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Following", exact: true })).toHaveCSS("background-color", "rgba(255, 255, 255, 0.08)");
  expect(changes).toBe(2);
});
