import { test, expect } from "@playwright/test";
const user = { id: "507f1f77bcf86cd799439011", name: "Discover Fixture", username: "fixture", role: "fan", city: "Dubai", onboarding: { status: "completed" } };
const photo = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#375169"/><circle cx="200" cy="175" r="70" fill="#9ccbff"/><ellipse cx="200" cy="400" rx="145" ry="125" fill="#7197b5"/></svg>');
async function fixture(page, { walletBalance = 0 } = {}) {
  const state = { filters: [], refreshes: [], reactions: [], sentGifts: [], activity: [], receivedGifts: [
    { id: "old-aura", giftId: "aura", name: "Aura", imageUrl: photo, stars: 300, sender: { id: "omar", name: "Omar Haddad", username: "omar" }, featuredOnProfile: true, createdAt: "2026-01-03T12:00:00Z" },
    { id: "old-dancer", giftId: "dancer", name: "Little Dancer", imageUrl: photo, stars: 100, sender: { id: "mia", name: "Mia", username: "mia" }, createdAt: "2026-01-02T12:00:00Z" },
    { id: "old-tulips", giftId: "tulips", name: "Tulips", imageUrl: photo, stars: 90, sender: { id: "lina", name: "Lina", username: "lina" }, createdAt: "2026-01-01T12:00:00Z" },
  ] };
  await page.addInitScript(value => { localStorage.setItem("onlyme_access_token", "fixture_token"); localStorage.setItem("onlyme_cached_user", JSON.stringify(value)); }, user);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], count: 0, unreadCount: 0, pagination: { page: 1, pages: 1, total: 0 } };
    if (url.pathname.endsWith("/auth/me")) data = { user };
    if (url.pathname.endsWith("/profile/me") || url.pathname.endsWith("/profiles/me")) data = { user, profile: { city: "Dubai" } };
    if (url.pathname === "/api/fan/activity") data = { items: state.activity, unreadCount: state.activity.length };
    if (url.pathname === "/api/wallet") data = { wallet: { balance: walletBalance } };
    if (url.pathname === "/api/messages/gifts") data = { gifts: [{ id: "gift-1", name: "No Bad Days", stars: 180, imageUrl: photo, receivedCount: 3, category: { id: "most", name: "Most gifted", sortOrder: 1 } }] };
    if (url.pathname === "/api/profiles/anna") data = {
      profile: { ownerUserId: "anna", username: "anna", displayName: "Anna Petrova", avatar: photo, isCreator: true, bio: "Traveling", directAccess: { enabled: false } },
      publicMetrics: { followerCount: 3100, followingCount: 314, seenByCount: 306 },
      viewerCapabilities: { isOwner: false, canFollow: true, canMessage: true }, viewerRelationship: {}, planets: [], media: [], seens: [], experiences: [],
    };
    if (url.pathname === "/api/profiles/anna/gifts") data = { gifts: state.receivedGifts, total: state.receivedGifts.length };
    if (url.pathname === "/api/discover") {
      state.filters.push(url.searchParams.get("filter"));
      state.refreshes.push(url.searchParams.get("refreshToken"));
      data = {
        following: [{ id: "anna", username: "anna", name: "Anna Petrova", avatar: photo, activeStatus: { label: "My World is open", emoji: "\u{1F30D}", color: "#9ccbff" }, stories: [] }, { id: "omar", username: "omar", name: "Omar Haddad", avatar: photo, activeStatus: { label: "Replying to everyone", emoji: "\u{1F4AC}", color: "#9ccbff" }, stories: [] }],
        recommendations: [
          { id: "discover:anna", creator: { id: "anna", name: "Anna Petrova", username: "anna", avatar: photo }, coverImage: "https://example.com/background.jpg", category: "Psychology", city: "Madrid", dream: { title: "Professional Skincare", status: "active" }, featuredSeen: { id: "seen1", title: "Start Your First Business" }, featuredOffer: { id: "world1", type: "world", peopleCount: 21, title: "Anna's World" } },
          { id: "discover:omar", creator: { id: "omar", name: "Omar Haddad", username: "omar", avatar: photo, status: "At seen" }, category: "Travel", city: "Dubai", reason: { code: "SAME_CITY", detail: "Recently active in Dubai" }, featuredOffer: { id: "world2", type: "world", peopleCount: 12, title: "Omar's World" } },
          { id: "discover:elsa", creator: { id: "elsa", name: "Elsa Lane", username: "elsa", avatar: photo }, category: "Art", city: "Stockholm", reason: { code: "FOLLOW_GRAPH", detail: "People you follow also see them" }, recommendationReason: "People you follow also see them" },
        ], pagination: { hasMore: false, nextCursor: null },
      };
    }
    if (url.pathname.startsWith("/api/stories/creators/")) {
      const ownerId = url.pathname.split("/").at(-1);
      data = { items: [0,1,2,3].map(index => ({ id: `${ownerId}-story-${index}`, owner: { id: ownerId, name: ownerId === "anna" ? "Anna Petrova" : "Omar Haddad", username: ownerId, avatar: photo }, mediaType: index === 1 ? "video" : "image", hasAudio: index === 1, mediaUrl: photo, viewerReaction: state.reactions.find(item => item.storyId === `${ownerId}-story-${index}`)?.reaction || null, createdAt: new Date(Date.now()-3*3600000).toISOString(), expiresAt: new Date(Date.now()+3600000).toISOString(), editorMetadata: { textOverlays: [{ id: `text-${index}`, text: `Story ${index+1}`, x: 50, y: 65, style: 2, color: "#0A0C0F" }] } })) };
    }
    if (/\/api\/messages\/conversations\/[^/]+\/gifts$/.test(url.pathname) && route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      state.sentGifts.push(payload);
      const receivedGift = { id: `received-${state.sentGifts.length}`, giftId: payload.giftId, name: "No Bad Days", stars: 180, imageUrl: photo, sender: { id: user.id, name: user.name, username: user.username }, visibility: payload.visibility, source: payload.sourceType, message: payload.message, createdAt: new Date().toISOString() };
      state.receivedGifts.unshift(receivedGift);
      data = { gift: { id: "gift-1", name: "No Bad Days", stars: 180, imageUrl: photo }, receivedGift, wallet: { balance: walletBalance - 180 * state.sentGifts.length } };
    }
    if (url.pathname.endsWith("/reactions")) {
      const storyId = url.pathname.split("/").at(-2);
      const payload = route.request().postDataJSON();
      state.reactions = state.reactions.filter(item => item.storyId !== storyId);
      if (payload.reaction) state.reactions.push({ ...payload, storyId });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/discover");
  return state;
}
for (const width of [1440, 393, 320]) {
  test(`Discover reference layout and real context ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await fixture(page);
    await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
    await expect(page.locator(".discover-friend-link")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Open Anna Petrova's profile" })).toHaveAttribute("href", "/profile/anna");
    const avatar = page.locator(".discover-friend-avatar").first();
    const photoBounds = await avatar.locator(".fan-avatar").boundingBox();
    const ringBounds = await avatar.boundingBox();
    const badgeBounds = await avatar.locator(".wall-story-status-badge").boundingBox();
    expect(photoBounds.width).toBe(52);
    expect(ringBounds.width).toBe(56);
    expect(badgeBounds.width).toBe(19);
    expect(badgeBounds.height).toBe(19);
    expect(badgeBounds.x).toBeGreaterThan(photoBounds.x + photoBounds.width / 2);
    expect(badgeBounds.y).toBeGreaterThan(photoBounds.y + photoBounds.height / 2);
    expect(await page.locator(".wall-story-presence-label").first().evaluate(el => getComputedStyle(el).whiteSpace)).toBe("nowrap");
    const cards = page.locator(".discover-orb-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText("Omar");
    const anna = page.getByRole("button", { name: "Open Anna Petrova's discover story" });
    await expect(anna.locator("img")).toHaveAttribute("src", photo);
    await expect(anna).toContainText("Dreams of: Professional Skincare");
    await expect(anna).toContainText("Start Your First Business");
    await expect(anna.locator(".discover-world-mark")).toHaveCount(1);
    await expect(cards.first()).toContainText("World · 12 members");
    await expect(cards.getByText("People you follow also see them", { exact: true })).toHaveCount(0);
    const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
    expect(Math.abs(first.y - second.y)).toBeLessThan(1);
    expect(second.x).toBeGreaterThan(first.x);
    expect(Math.abs(first.width / first.height - 0.8)).toBeLessThan(0.01);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("discover-reviewed.png"), fullPage: true });
    const nearby = page.getByRole("button", { name: "Nearby", exact: true });
    await nearby.click();
    await expect(nearby).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => state.filters.at(-1)).toBe("nearby");
    await nearby.click();
    await expect(nearby).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => state.filters.at(-1)).toBe("for_you");
    if (width === 1440) {
      const previous = state.refreshes.at(-1);
      await page.getByRole("navigation", { name: "Fan navigation" }).getByRole("link", { name: "Discover", exact: true }).click();
      await expect.poll(() => state.refreshes.at(-1)).not.toBe(previous);
    }
    await anna.click();
    await expect(page.locator(".discover-rec-story")).toBeVisible();
    const viewer = page.locator(".discover-story-viewer");
    await expect(viewer).toBeVisible();
    await expect(viewer.getByRole("group", { name: "Story progress" }).locator(":scope > span")).toHaveCount(4);
    await expect(viewer.getByText("3h", { exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "React to story", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Send a gift", exact: true })).toHaveCount(0);
    await viewer.getByRole("button", { name: "React to story", exact: true }).click();
    await expect.poll(() => state.reactions.length).toBe(1);
    await expect(viewer.getByRole("status")).toHaveText("Sent to Anna");
    if (width === 1440) await expect(viewer.getByRole("status")).toHaveCount(0, { timeout: 2500 });
    const reactedHeart = viewer.getByRole("button", { name: "Remove story reaction", exact: true });
    await expect(reactedHeart).toHaveAttribute("aria-pressed", "true");
    await expect(reactedHeart.locator(".discover-story-heart-lit")).toBeVisible();
    await reactedHeart.click();
    await expect.poll(() => state.reactions.length).toBe(0);
    await viewer.getByRole("textbox", { name: "Reply to story", exact: true }).focus();
    const reactionTray = viewer.getByRole("group", { name: "Story reactions", exact: true });
    await expect(reactionTray).toBeVisible();
    expect((await reactionTray.boundingBox()).width).toBeLessThan(300);
    await expect(viewer.getByRole("button", { name: "Close reactions", exact: true })).toHaveCount(0);
    await expect(viewer.getByRole("button", { name: "React with applause", exact: true })).toBeVisible();
    if (width === 1440) await page.screenshot({ path: testInfo.outputPath("story-reaction-picker.png") });
    await viewer.getByRole("button", { name: "React with fire", exact: true }).click();
    await expect.poll(() => state.reactions.at(-1)?.reaction).toBe("\ud83d\udd25");
    await expect(viewer.getByRole("button", { name: "Remove story reaction", exact: true }).locator(".discover-story-heart-emoji")).toHaveText("\ud83d\udd25");
    await viewer.getByRole("button", { name: "Next story", exact: true }).click();
    await expect(viewer.getByText("Story 2", { exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Unmute story", exact: true })).toBeVisible();
    await viewer.getByRole("button", { name: "Open story menu", exact: true }).click();
    await expect(viewer.getByRole("dialog", { name: "Story actions", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Send a gift", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Send to…", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Copy link", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "About this account", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Mute Anna’s stories", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Report", exact: true })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Done", exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("story-actions.png") });
    if (width === 1440) {
      await viewer.getByRole("button", { name: "Send a gift", exact: true }).click();
      const giftPicker = page.getByRole("region", { name: "Send a story gift", exact: true });
      await expect(giftPicker).toBeVisible();
      await expect(giftPicker.getByRole("heading", { name: "Send Anna a gift", exact: true })).toBeVisible();
      await expect(giftPicker).toContainText("Gifts are direct support — Anna earns from them instantly");
      await expect(giftPicker.getByText("Your balance:", { exact: false })).toHaveCount(0);
      const gift = giftPicker.getByRole("button", { name: "No Bad Days, 180 coins, recharge required", exact: true }).first();
      await expect(gift).toBeEnabled();
      await expect(gift).toHaveCSS("opacity", "1");
      await gift.click();
      await expect(giftPicker.getByRole("button", { name: "Recharge · ✦180", exact: true })).toBeEnabled();
      await giftPicker.getByRole("button", { name: "Change gift", exact: true }).click();
      await giftPicker.getByRole("button", { name: "Close gift picker", exact: true }).click();
      await viewer.getByRole("button", { name: "Open story menu", exact: true }).click();
    }
    await viewer.getByRole("button", { name: "Close story actions", exact: true }).click({ position: { x: 10, y: 10 } });
    await page.screenshot({ path: testInfo.outputPath("story-viewer.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Discover", exact: true })).toBeVisible();
  });
}

test("Discover opens the profile when the account has no active stories", async ({ page }) => {
  await fixture(page);
  await page.route("**/api/stories/creators/anna", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [] } }) }));
  await page.getByRole("button", { name: "Open Anna Petrova's discover story" }).click();
  await expect(page).toHaveURL(/\/profile\/anna$/);
  await expect(page.getByText("Anna Petrova has no active stories.", { exact: true })).toHaveCount(0);
});


for (const width of [1440, 393]) {
for (const realReply of [false, true]) {
test(`Story gift completes with ordered banners ${width} ${realReply ? "server" : "prototype"}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  const state = await fixture(page, { walletBalance: 500 });
  await page.getByRole("button", { name: "Open Anna Petrova's discover story" }).click();
  const viewer = page.locator(".discover-story-viewer");
  await viewer.getByRole("button", { name: "Next story", exact: true }).click();
  await viewer.getByRole("button", { name: "Open story menu", exact: true }).click();
  await viewer.getByRole("button", { name: "Send a gift", exact: true }).click();
  const giftPicker = page.getByRole("region", { name: "Send a story gift", exact: true });
  await giftPicker.getByRole("button", { name: "No Bad Days, 180 coins", exact: true }).first().click();
  await giftPicker.getByPlaceholder("Say something...").fill("Just because");
  await giftPicker.locator(".dream-gift-send").click();
  await expect(page.locator(".gift-celebration-layer")).toBeVisible();
  await expect(page.locator(".gift-success-toast")).toHaveCount(0);
  await expect(page.locator(".gift-celebration-layer")).toContainText("Just because");
  await expect(page.locator(".gift-celebration-recipient")).toContainText("for Anna");
  await expect.poll(() => state.sentGifts.at(-1)?.sourceType).toBe("STORY");
  await expect.poll(() => state.sentGifts.at(-1)?.message).toBe("Just because");
  const shelfNotice = page.locator(".fan-gift-shelf-toast");
  await expect(shelfNotice).toBeVisible({ timeout: 6000 });
  await expect(shelfNotice).toContainText("On Anna");
  await expect(shelfNotice).toContainText("Your No Bad Days is first on the shelf");
  await expect(shelfNotice.getByRole("button", { name: "View", exact: true })).toBeVisible();
  await expect(viewer).toHaveCount(0);
  await expect(page.getByText("Anna thanked you", { exact: true })).toHaveCount(0);
  await expect(shelfNotice).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("shelf-banner.png") });
  if (realReply) state.activity.push({ id: "thanks-1", type: "gift_thanked", title: "Anna thanked you for your gift", preview: "Thank you - this made my day.", relatedCreator: { name: "Anna Petrova", username: "anna", avatarUrl: photo }, read: false });
  const thanksNotice = page.locator(".fan-gift-thanks-toast");
  await expect(thanksNotice).toContainText("Anna thanked you", { timeout: 10000 });
  const expectedMessage = realReply ? "Thank you - this made my day." : "This means more than you think. Thank you.";
  await expect(thanksNotice).toContainText(`\u201c${expectedMessage}\u201d`);
  await expect(page.locator(".fan-gift-shelf-toast.is-visible")).toHaveCount(0);
  await expect(thanksNotice).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("thanks-banner.png") });
  await expect(thanksNotice.getByRole("button", { name: "View", exact: true })).toHaveCount(0);
  const thanksAvatar = thanksNotice.locator(".fan-gift-thanks-avatar");
  const avatarBounds = await thanksAvatar.boundingBox();
  const imageBounds = await thanksAvatar.locator("img").boundingBox();
  expect(Math.abs(imageBounds.height - avatarBounds.height)).toBeLessThan(1);
  const bannerBounds = await thanksNotice.boundingBox();
  const columnBounds = await page.locator(".social-center-scroll").boundingBox();
  expect(Math.abs(bannerBounds.x + bannerBounds.width / 2 - columnBounds.x - columnBounds.width / 2)).toBeLessThan(2);
  await thanksNotice.getByRole("button", { name: "Anna thanked you", exact: true }).click();
  if (!realReply) {
    await expect(page).toHaveURL(/profile\/anna/);
    return;
  }
  const thanksCard = page.getByRole("dialog", { name: "Thanks for your gift" });
  await expect(thanksCard).toContainText("Thank you - this made my day.");
  await thanksCard.getByRole("button", { name: "View support activity" }).click();
  await expect(page).toHaveURL(/activity\?filter=support/);
});

}

}

for (const width of [1440, 393]) {
  test(`Sent story gift appears on recipient profile and collection ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await fixture(page, { walletBalance: 1000 });
    await page.getByRole("button", { name: "Open Anna Petrova's discover story" }).click();
    const viewer = page.locator(".discover-story-viewer");
    await viewer.getByRole("button", { name: "Open story menu", exact: true }).click();
    await viewer.getByRole("button", { name: "Send a gift", exact: true }).click();
    const picker = page.getByRole("region", { name: "Send a story gift", exact: true });
    await expect(picker.getByLabel("Recent gift")).toContainText("Someone just made Anna\u2019s day \u2014 Aura \u00b7 from @omar");
    await picker.getByRole("button", { name: "No Bad Days, 180 coins", exact: true }).first().click();
    await picker.locator(".dream-gift-send").click();
    await page.locator(".fan-gift-shelf-toast").getByRole("button", { name: "View", exact: true }).click({ timeout: 7000 });
    await expect(page).toHaveURL(/profile\/anna/);
    const shelf = page.locator("#profile-gifts");
    await expect(shelf).toContainText("4 gifts");
    await expect(shelf.locator("img")).toHaveCount(3);
    await expect(shelf).not.toContainText("Dream");
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("recipient-gift-shelf.png") });
    await shelf.click();
    const collection = page.getByRole("dialog", { name: "Anna\u2019s Gifts", exact: true });
    await expect(collection).toBeVisible();
    await expect(collection.locator(".profile-received-gifts-head .fan-avatar")).toBeVisible();
    await expect(collection.locator(".profile-received-gifts-head")).toContainText("4 gifts");
    const tiles = collection.locator(".profile-received-gift");
    await expect(tiles).toHaveCount(4);
    await expect(tiles.first()).toContainText("No Bad Days");
    await expect(tiles.first()).toContainText("from you");
    await expect(tiles.nth(1)).toContainText("from @omar");
    await expect(collection.locator(".profile-received-gifts-head h2")).toHaveCSS("font-size", "13.5px");
    await expect(collection.locator(".profile-received-gifts-head .fan-avatar")).toHaveCSS("width", "32px");
    await expect(tiles.first().locator("strong")).toHaveCSS("font-size", "9.5px");
    await expect(tiles.first().locator("small")).toHaveCSS("font-size", "8.5px");
    await expect(collection.locator(".profile-received-gifts-grid")).toHaveCSS("row-gap", "20px");
    const artBounds = await tiles.first().locator("span").boundingBox();
    const giftImageBounds = await tiles.first().locator("img").boundingBox();
    expect(giftImageBounds.height).toBeLessThanOrEqual(78);
    expect(artBounds.height).toBe(86);
    const titleBounds = await tiles.first().locator("strong").boundingBox();
    expect(titleBounds.y).toBeGreaterThanOrEqual(artBounds.y + artBounds.height);
    const sheetBounds = await collection.locator(".profile-received-gifts-sheet").boundingBox();
    const columnBounds = await page.locator(".social-center-scroll").boundingBox();
    expect(Math.abs(sheetBounds.width - columnBounds.width)).toBeLessThan(2);
    expect(Math.abs(sheetBounds.height - 860)).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath("recipient-gift-collection.png") });
    await collection.getByRole("button", { name: "Send a gift", exact: true }).click();
    const directPicker = page.getByRole("region", { name: "Send a direct gift", exact: true });
    const recentGift = directPicker.getByLabel("Recent gift");
    await expect(recentGift).toContainText("Someone just made Anna\u2019s day \u2014 No Bad Days \u00b7 from you");
    await expect(recentGift.getByRole("img", { name: "No Bad Days", exact: true })).toBeVisible();
    await expect(directPicker.getByRole("heading", { name: "Most gifted", exact: true }).first()).toBeVisible();
    const recentBounds = await recentGift.boundingBox();
    const categoryBounds = await directPicker.getByRole("heading", { name: "Most gifted", exact: true }).first().boundingBox();
    expect(recentBounds.y + recentBounds.height).toBeLessThan(categoryBounds.y);
    await page.screenshot({ path: testInfo.outputPath("recent-sent-gift.png") });
    await directPicker.getByRole("button", { name: "No Bad Days, 180 coins", exact: true }).first().click();
    await directPicker.locator(".dream-gift-send").click();
    await expect(shelf).toContainText("5 gifts", { timeout: 7000 });
    await expect(directPicker).toHaveCount(0, { timeout: 7000 });
    await page.reload();
    await expect(shelf).toContainText("5 gifts");
    await shelf.click();
    await expect(collection.locator(".profile-received-gift").first()).toContainText("from you");
    await expect(collection.locator(".profile-received-gift").first()).toContainText("\u00d72");
    await collection.getByRole("button", { name: "Send a gift", exact: true }).click();
    await expect(directPicker.getByLabel("Recent gift")).toContainText("No Bad Days \u00b7 from you");
    expect(state.sentGifts.map(gift => gift.sourceType)).toEqual(["STORY", "DIRECT"]);
  });
}

test("Gift picker omits recent gift message when recipient has no gifts", async ({ page }) => {
  const state = await fixture(page, { walletBalance: 1000 });
  state.receivedGifts = [];
  await page.getByRole("button", { name: "Open Anna Petrova's discover story" }).click();
  const viewer = page.locator(".discover-story-viewer");
  await viewer.getByRole("button", { name: "Open story menu", exact: true }).click();
  await viewer.getByRole("button", { name: "Send a gift", exact: true }).click();
  const picker = page.getByRole("region", { name: "Send a story gift", exact: true });
  await expect(picker.getByRole("button", { name: "No Bad Days, 180 coins", exact: true }).first()).toBeVisible();
  await expect(picker.getByLabel("Recent gift")).toHaveCount(0);
});

for (const width of [1440, 393]) {
test(`Sent Activity shows one row per gift and replays clicked gift ${width}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  const state = await fixture(page);
  const createdAt = new Date().toISOString();
  state.activity = [1, 2].map(index => ({ id: `gift-notice-${index}`, type: "gift_sent", direction: "sent", title: "You sent My Star to Arjun Mehta", reference: { type: "MESSAGE", id: `gift-message-${index}` }, relatedCreator: { id: "arjun", displayName: "Arjun Mehta", username: "arjun", avatarUrl: photo }, createdAt, metadata: { giftId: "star" } }));
  await page.route("**/api/wallet/ledger**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [1, 2].map(index => ({ id: `gift-ledger-${index}`, event: "CHAT_GIFT_DEBIT", reference: { type: "CHAT_GIFT", id: `gift-message-${index}` }, counterparty: { id: "arjun", name: "Arjun Mehta", username: "arjun", avatar: photo }, starsChange: -7, metadata: { giftId: "star", giftName: "My Star", giftImageUrl: photo, starsPerUsd: 100 }, createdAt })), pagination: { page: 1, pages: 1 } } }) }));
  await page.route("**/api/messages/gifts**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { gifts: [{ id: "star", name: "My Star", imageUrl: photo, description: "Just because" }] } }) }));
  await page.goto("/activity?direction=sent");
  const rows = page.locator(".activity-prototype-row");
  await expect(rows).toHaveCount(2);
  await expect(page.getByText("You sent a gift to Arjun Mehta", { exact: true })).toHaveCount(0);
  await expect(rows.first()).toContainText("You sent My Star to Arjun Mehta");
  await expect(rows.first()).toContainText("-$0.07");
  await expect(rows.first().locator(".activity-prototype-gift")).toBeVisible();
  await page.getByRole("button", { name: "Support", exact: true }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole("button", { name: "Purchases", exact: true }).click();
  await expect(rows).toHaveCount(2);
  await rows.first().click();
  const preview = page.getByRole("dialog", { name: "My Star gift preview", exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("img", { name: "My Star", exact: true })).toBeVisible();
  await expect(preview).toContainText("Just because");
  await expect(preview).toContainText("from you");
  await expect(preview).toHaveCSS("opacity", "1");
  const previewBounds = await preview.boundingBox();
  const columnBounds = await page.locator(".social-center-scroll").boundingBox();
  expect(Math.abs(previewBounds.x - columnBounds.x)).toBeLessThan(1);
  expect(Math.abs(previewBounds.width - columnBounds.width)).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath("activity-gift-replay.png") });
  await expect(page).toHaveURL(/activity\?direction=sent&filter=purchases/);
  await expect(preview).toHaveCount(0, { timeout: 6000 });
  await expect(rows).toHaveCount(2);
  await rows.last().focus();
  await page.keyboard.press("Enter");
  await expect(preview).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  expect(state.sentGifts).toHaveLength(0);
});
}


for (const width of [1440, 393, 320]) {
  test(`Search default matches prototype spacing and controls ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    await page.route("https://images.unsplash.com/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#375169"/></svg>' }));
    await page.route("**/api/search/defaults", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { trending: ["Fitness", "Paris", "Tech", "Business", "Mindset", "Tokyo style"].map(label => ({ label })), recent: [{ query: "morning routine" }] } }) }));
    await page.goto("/search?from=discover");
    const input = page.getByRole("combobox", { name: "Search Atseen" });
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS("height", "47px");
    await expect(input).toHaveCSS("font-size", "14.5px");
    await expect(input).toHaveCSS("outline-style", "none");
    await expect(page.getByRole("button", { name: "Go back", exact: true })).toHaveCSS("width", "38px");
    const discovery = page.locator(".search-discover-default");
    await expect(discovery.getByRole("heading", { name: "People", exact: true })).toHaveCSS("font-size", "11px");
    await expect(discovery.locator(".search-discover-person")).toHaveCount(6);
    await expect(discovery.locator(".search-discover-avatar").first()).toHaveCSS("width", "58px");
    await expect(discovery.locator(".search-discover-person").first()).toHaveCSS("width", "62px");
    await expect(discovery.locator(".search-discover-person-name").first()).toHaveCSS("font-size", "9px");
    await expect(discovery.locator(".search-discover-person-status").first()).toHaveCSS("font-size", "8.5px");
    await expect(discovery.locator(".search-discover-avatar.is-official > svg path")).toHaveAttribute("fill", "currentColor");
    await expect(discovery.locator(".search-discover-status-badge").first()).toHaveCSS("width", "19px");
    await expect(discovery.locator(".search-discover-trending button")).toHaveText(["Fitness", "Paris", "Tech", "Business", "Mindset", "Tokyo style"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("search-reference.png") });
    await discovery.getByRole("button", { name: "Fitness", exact: true }).click();
    await expect(input).toHaveValue("Fitness");
    await expect(page).toHaveURL(/q=Fitness/);
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(discovery).toBeVisible();
    await discovery.getByRole("button", { name: "morning routine", exact: true }).click();
    await expect(input).toHaveValue("morning routine");
    await expect(page).toHaveURL(/q=morning\+routine/);
  });
}

for (const width of [1440, 393, 320]) {
  test(`Official seen Search profile opens the brand page ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    let following = false;
    let followRequests = 0;
    await page.route("**/api/profiles/seen", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { profile: { username: "seen", displayName: "seen" }, viewerRelationship: { following } } }) }));
    await page.route("**/api/profiles/seen/follow", route => {
      following = !following;
      followRequests += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { following } }) });
    });
    await page.goto("/search?from=discover");
    await page.locator(".search-discover-person").first().click();
    await expect(page).toHaveURL(/profile\/seen$/);
    const brand = page.locator(".seen-brand-page");
    await expect(brand.getByRole("heading", { name: "seen Verified", exact: true })).toBeVisible();
    await expect(brand).toContainText("@seen \u00b7 Official account");
    await expect(brand).toContainText("We see you");
    await expect(brand.locator(".seen-brand-avatar")).toHaveCSS("width", "92px");
    await expect(brand.locator(".seen-brand-earning-cards > div")).toHaveCount(5);
    await expect(brand.locator(".seen-brand-earning-cards > div").first()).toHaveCSS("width", "142px");
    await expect(brand.locator(".seen-brand-earning-cards strong").first()).toHaveCSS("font-size", "22px");
    await expect(brand.locator(".seen-brand-module")).toHaveCount(5);
    await expect(brand.locator(".seen-brand-module h3").first()).toHaveCSS("font-size", "19px");
    await expect(brand.locator(".seen-brand-content img[src^=\"http\"]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("official-seen-header.png") });
    await brand.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(brand.getByRole("button", { name: "Following", exact: true })).toBeVisible();
    expect(followRequests).toBe(1);
    await page.reload();
    await expect(brand.getByRole("button", { name: "Following", exact: true })).toBeVisible();
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await brand.getByRole("button", { name: "Say hi", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Say hi to the team" })).toContainText("hello@atseen.com");
    await page.keyboard.press("Escape");
    await brand.getByRole("navigation", { name: "Official seen highlights" }).getByRole("button", { name: "Earn", exact: true }).click();
    const guide = page.getByRole("dialog", { name: "@seen story", exact: true });
    await expect(guide).toContainText("Money \u2014 honest by design");
    await page.keyboard.press("Escape");
    await expect(guide).toHaveCount(0);
    await brand.getByRole("button", { name: "Learn about Wall", exact: true }).click();
    await expect(guide).toContainText("The wall hears you");
    await page.keyboard.press("Escape");
    await brand.getByRole("button", { name: "Learn about Stories & status", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("official-seen-how-it-works.png") });
    await brand.locator(".seen-brand-footer").scrollIntoViewIfNeeded();
    await expect(brand.getByRole("heading", { name: "Human first", exact: true })).toBeVisible();
    await expect(brand.locator(".seen-brand-footer")).toContainText("You\u2019ve been seen");
    await page.screenshot({ path: testInfo.outputPath("official-seen-beliefs.png") });
    await brand.locator(".seen-brand-footer button").click();
    await expect(page.getByRole("dialog", { name: "Say hi to the team" })).toBeVisible();
  });
}

for (const width of [1440, 393]) {
  test(`Official seen options work without a seeded profile ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    await page.route("**/api/profiles/seen", route => route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Profile not found" }) }));
    let failedFollowRequests = 0;
    await page.route("**/api/profiles/seen/follow", route => { failedFollowRequests += 1; return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "Profile not found" }) }); });
    await page.goto("/profile/seen");
    const brand = page.locator(".seen-brand-page");
    await brand.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(brand.getByRole("button", { name: "Following", exact: true })).toBeVisible();
    await expect(brand.getByText("Profile not found", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(brand.getByRole("button", { name: "Following", exact: true })).toBeVisible();
    await brand.getByRole("button", { name: "Following", exact: true }).click();
    await expect(brand.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
    expect(failedFollowRequests).toBe(0);
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await brand.getByRole("button", { name: "Say hi", exact: true }).click();
    const contact = page.getByRole("dialog", { name: "Say hi to the team", exact: true });
    await expect(contact).toContainText("hello@atseen.com");
    const bounds = await contact.locator(".seen-brand-contact-sheet").boundingBox();
    const column = await page.locator(".social-center-scroll").boundingBox();
    expect(Math.abs(bounds.x - column.x)).toBeLessThan(1);
    expect(Math.abs(bounds.width - column.width)).toBeLessThan(1);
    expect(Math.abs(bounds.height - 860)).toBeLessThan(1);
    await expect(contact.getByRole("heading")).toHaveCSS("font-size", "15px");
    await expect(contact.getByRole("button", { name: "Close dialog" })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("official-contact-sheet.png") });
    await page.keyboard.press("Escape");
    await expect(contact).toHaveCount(0);
    await brand.locator(".seen-brand-footer button").click();
    await expect(contact).toBeVisible();
    await contact.getByRole("button", { name: "Close contact sheet" }).click();
    await expect(contact).toHaveCount(0);
  });
}
for (const width of [1440, 393]) {
  test(`Search results use prototype sections and tabs ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    const person = { id: 'ethan', type: 'person', title: 'Ethan Brooks', route: '/profile/ethan', verified: true, category: 'Fitness Coach', metadata: { hasActiveStory: true, activeStatus: { label: 'At the gym', emoji: '\uD83C\uDFCB' } } };
    const experience = { id: 'training', type: 'experience', title: 'Inside My Training', route: '/experiences/training', description: 'My real programs, my real result', metadata: { price: 490, creator: { name: 'Ethan Brooks' } } };
    const seen = { id: 'routine', type: 'seen', title: 'Morning Training', route: '/seen/routine', category: 'Fitness', metadata: { creator: { name: 'Ethan Brooks' }, chapterCount: 3, chapters: [{ title: 'Warm up' }, { title: 'Train' }, { title: 'Recover' }] } };
    const sections = { people: { total: 1, items: [person] }, experiences: { total: 1, items: [experience] }, seens: { total: 1, items: [seen] } };
    await page.route('**/api/search?**', route => {
      const type = new URL(route.request().url()).searchParams.get('type');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: type === 'all' ? { sections } : { items: sections[type]?.items || [], total: sections[type]?.total || 0 } }) });
    });
    await page.goto('/search?q=Fitness');
    const tabs = page.getByRole('tablist', { name: 'Search result type' });
    await expect(tabs.getByRole('tab')).toHaveText(['Top', 'People', 'Seen', 'Wall']);
    await expect(page.locator('.search-results-heading')).toHaveText(['People', 'Experiences', 'Seen']);
    await expect(page.locator('.search-experience-cover')).toHaveCSS('width', '44px');
    await expect(page.locator('.search-experience-price')).toContainText('490');
    await expect(page.locator('.search-person-status')).toHaveText('At the gym');
    await expect(page.locator('.search-seen-strip .search-seen-card')).toHaveCSS('width', '150px');
    await expect(page.locator('.search-seen-chapters > span')).toHaveCount(2);
    await tabs.getByRole('tab', { name: 'Seen', exact: true }).click();
    await expect(page).toHaveURL(/type=seens/);
    await expect(page.locator('.search-seen-grid .search-seen-card')).toHaveCount(1);
    await expect(page.locator('.search-experience-card')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Open Seen Morning Training' }).click();
    await expect(page).toHaveURL(/\/seen\/routine$/);
  });
}
