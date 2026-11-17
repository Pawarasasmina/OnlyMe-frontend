import { test, expect } from "@playwright/test";

const users = ["one", "two"].map((name, index) => ({ id: `507f1f77bcf86cd79943901${index}`, name, username: name, role: "fan", onboarding: { status: "completed" } }));
const types = { need_help: "Need Help", buy_sell: "Buy & Sell", question: "Question", recommendation: "Recommendation", looking_for: "Looking for", offering: "Offering", event: "Event" };
async function setup(page, isolateHints = false) {
  // Hint-only checks isolate the bubble from the v113.476 navigation scroll.
  if (isolateHints) await page.addInitScript(() => { Element.prototype.scrollIntoView = () => {}; });
  const server = { account: 0, hints: [new Set(), new Set()], dismissals: [], requests: [] };
  await page.addInitScript(user => {
    localStorage.setItem("onlyme_access_token", "wall_test");
    localStorage.setItem("onlyme_cached_user", JSON.stringify(user));
    window.__vibrations = [];
    Object.defineProperty(navigator, "vibrate", { value: duration => { window.__vibrations.push(duration); return true; } });
  }, users[0]);
  const posts = Array.from({ length: 20 }, (_, index) => ({ id: `507f1f77bcf86cd7994391${String(index).padStart(2, "0")}`, author: users[1], text: `Note ${index}`, postType: Object.values(types)[index % 7], topic: index % 2 ? "Food" : "Meet people", rightNow: index === 3, publishedAt: new Date().toISOString(), comments: [], commentCount: 0, media: [] }));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, count: 0, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user: users[server.account] };
    if (/\/profiles?\/me$/.test(url.pathname)) data = { user: users[server.account], profile: { city: "Colombo" } };
    if (url.pathname.endsWith("/posts/need-counts")) data = { counts: { right_now: 1, need_help: 3, buy_sell: 3, question: 3 }, topicCounts: { meet_people: 10 }, previews: {} };
    if (url.pathname.endsWith("/users/me/wall-hints")) data = { dismissed: [...server.hints[server.account]] };
    if (/\/users\/me\/wall-hints\//.test(url.pathname)) {
      const id = url.pathname.split("/").at(-1);
      server.hints[server.account].add(id); server.dismissals.push(id);
      data = { dismissed: [...server.hints[server.account]] };
    }
    if (url.pathname.endsWith("/posts")) {
      server.requests.push(Object.fromEntries(url.searchParams));
      const selectedTypes = (url.searchParams.get("type") || "all").split(",").filter(value => value !== "all");
      const selectedTopics = (url.searchParams.get("topic") || "all").split(",").filter(value => value !== "all");
      const live = url.searchParams.get("rightNow") === "true";
      const items = selectedTypes.length || selectedTopics.length || live ? posts.filter(post => selectedTypes.some(key => types[key] === post.postType) || selectedTopics.some(key => ({ meet_people: "Meet people", food: "Food" })[key] === post.topic) || live && post.rightNow) : posts;
      data = { items, pagination: { page: 1, pages: 1, total: items.length } };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/wall");
  await expect(page.locator(".wall-need-icon")).toHaveCount(7);
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  return server;
}

for (const width of [390, 1280]) test(`seven glass icons select one kind and scroll to its list at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const server = await setup(page);
  const row = page.locator(".wall-need-icons");
  await expect(row.locator("button b")).toHaveText(["Right now", "Company", "Need help", "Looking for", "Buy & Sell", "Tips", "More"]);
  const help = row.getByRole("button", { name: "Need help", exact: true });
  await expect(help.locator(".wall-need-glass")).toHaveCSS("width", "56px");
  await expect(help.locator(".wall-need-glass svg")).toHaveCSS("stroke-width", "1.6px");
  await expect(help.locator(".wall-need-glass")).toHaveCSS("color", "rgba(255, 255, 255, 0.9)");
  await expect(row.locator("button").nth(1)).toHaveCSS("animation-delay", "0.045s");
  await expect(row.locator("button").last()).toHaveCSS("animation-delay", "0.27s");
  await expect(help).toHaveCSS("animation-duration", "0.45s");
  await expect(row.locator(".wall-need-live")).toHaveCSS("animation-duration", "1.8s");
  await help.click();
  await expect(help).toHaveAttribute("aria-pressed", "true");
  await expect(help.locator(".wall-need-glass")).toHaveCSS("color", "rgb(10, 12, 15)");
  await expect(page.locator(".wall-feed-heading")).toBeInViewport();
  await expect.poll(() => server.requests.at(-1)?.type).toBe("need_help");
  await row.getByRole("button", { name: "Company", exact: true }).click();
  await expect(help).toHaveAttribute("aria-pressed", "false");
  await expect(row.locator('[aria-pressed="true"]')).toHaveCount(1);
  await row.getByRole("button", { name: "Company", exact: true }).click();
  await expect(row.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".wall-feed-heading h2")).toHaveText("For you");
  await row.getByRole("button", { name: "More", exact: true }).click();
  await expect(page.locator(".wall-explore-page")).toBeVisible();
  await page.locator(".wall-explore-page-grid").getByRole("button", { name: /^Offering/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(row.getByRole("button", { name: "More", exact: true })).toHaveClass(/is-active/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
for (const width of [390, 1280]) test(`All picker styling, stable cards, Clear and Done at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page);
  await page.getByRole("link", { name: "Explore all needs" }).click();
  const cards = page.locator(".wall-explore-page-grid .wall-explore-card");
  await expect(cards).toHaveCount(17);
  const clear = page.locator(".wall-explore-clear");
  await expect(clear).toBeDisabled();
  await expect(clear).toHaveCSS("opacity", "0");
  const live = cards.filter({ hasText: "Right now" });
  const before = await live.boundingBox();
  await live.click();
  await expect(live).toHaveAttribute("aria-pressed", "true");
  await expect(clear).toHaveCSS("opacity", "1");
  await expect(clear).toHaveCSS("font-weight", "600");
  await expect(live).toHaveCSS("background-color", "rgba(156, 203, 255, 0.13)");
  await expect(live.locator(".wall-explore-check")).toHaveCSS("width", "20px");
  await expect(live.locator(".wall-explore-check svg")).toHaveAttribute("stroke-width", "3.4");
  await expect(live.locator(".wall-explore-card-title i")).toHaveCSS("visibility", "hidden");
  expect(await live.boundingBox()).toEqual(before);
  await expect(page.locator(".wall-explore-page-content")).toHaveCSS("padding-bottom", "130px");
  await clear.click();
  await expect(cards.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(clear).toBeDisabled();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".wall-feed-heading h2")).toHaveText("For you");
  await expect(page.locator(".wall-feed-heading")).toBeInViewport();
});

test("all six icon hints appear once at intent, and reduced motion disables effects", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const server = await setup(page, true);
  const row = page.locator(".wall-need-icons");
  const cases = [
    ["Right now", "Happening nearby · gone in 24 h"],
    ["Company", "Find people for coffee, sport, plans"],
    ["Need help", "Neighbours who need a hand"],
    ["Looking for", "People nearby searching for something"],
    ["Buy & Sell", "Local deals · meet in public"],
    ["Tips", "Places neighbours vouch for"],
  ];
  for (const [name, hint] of cases) {
    await row.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".wall-need-hint")).toHaveText(hint);
    await expect(page.locator(".wall-need-hint")).toHaveCount(1);
    const bubble = page.locator(".wall-need-hint");
    await expect(bubble).toHaveCSS("font-weight", "600");
    await expect(bubble.locator("span")).toHaveCSS("white-space", "nowrap");
    const bubbleBox = await bubble.boundingBox();
    const iconBox = await row.getByRole("button", { name, exact: true }).boundingBox();
    expect(bubbleBox.y + bubbleBox.height).toBeLessThan(iconBox.y);
  }
  await expect(row.locator(".wall-need-live")).toHaveCSS("animation-name", "none");
  await expect(row.locator("button").first()).toHaveCSS("animation-name", "none");
  await page.getByRole("link", { name: "Explore all needs" }).click();
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
  await expect.poll(() => server.hints[0].size).toBe(6);
});

test("blocked tips are not consumed and an opening sheet dismisses the active tip", async ({ page }) => {
  const server = await setup(page, true);
  const help = page.locator(".wall-need-icons").getByRole("button", { name: "Need help", exact: true });
  await page.evaluate(() => {
    const sheet = document.createElement("div");
    sheet.id = "test-sheet"; sheet.setAttribute("role", "dialog"); sheet.textContent = "Sheet";
    document.body.append(sheet);
  });
  await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
  expect(server.dismissals).not.toContain("need_help");
  await page.locator("#test-sheet").evaluate(el => el.remove());
  await help.click(); // off never shows a hint
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
  await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveText("Neighbours who need a hand");
  await page.evaluate(() => {
    const sheet = document.createElement("div"); sheet.setAttribute("aria-modal", "true"); sheet.textContent = "Sheet"; document.body.append(sheet);
  });
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
});

test("context hints dismiss once per icon on the server, survive reload and remain account-specific", async ({ page }) => {
  const server = await setup(page, true);
  const help = page.locator(".wall-need-icons").getByRole("button", { name: "Need help", exact: true });
  await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveText("Neighbours who need a hand");
  await expect.poll(() => server.dismissals.filter(id => id === "need_help").length).toBe(1);
  await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
  await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await help.click(); await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveCount(0);
  expect(server.dismissals.filter(id => id === "need_help")).toHaveLength(1);
  server.account = 1;
  await page.goto("/wall");
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await help.click();
  await expect(page.locator(".wall-need-hint")).toHaveText("Neighbours who need a hand");
  expect(server.hints[1].has("need_help")).toBe(true);
  await expect(page.locator(".wall-need-hint")).toHaveCount(0, { timeout: 6000 });
});
