import { test, expect } from "@playwright/test";

const users = ["one", "two"].map((name, index) => ({ id: `507f1f77bcf86cd79943901${index}`, name, username: name, role: "fan", onboarding: { status: "completed" } }));
const types = { need_help: "Need Help", buy_sell: "Buy & Sell", question: "Question", recommendation: "Recommendation", looking_for: "Looking for", offering: "Offering", event: "Event" };
async function setup(page) {
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

for (const width of [390, 1280]) test(`seven icons, independent OR selections, no scroll jump and full page at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const server = await setup(page);
  const row = page.locator(".wall-need-icons");
  await expect(row.locator("button b")).toHaveText(["Right now", "Company", "Need help", "Looking for", "Buy & Sell", "Tips", "More"]);
  await expect(page.locator(".wall-explore-track")).toHaveCount(0);
  await expect(row.locator(".wall-need-live")).toBeVisible();
  if (width === 390) await page.screenshot({ path: "test-results/wall-needs-icons.png" });
  await page.locator(".wall-explore-needs").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.querySelector(".social-center-scroll")?.scrollTo({ top: 100, behavior: "instant" });
    window.scrollTo({ top: 100, behavior: "instant" });
  });
  const top = await row.evaluate(element => element.getBoundingClientRect().top);
  const help = row.getByRole("button", { name: "Need help", exact: true });
  await help.click();
  await expect(help).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => server.requests.at(-1)?.matchMode).toBe("any");
  await expect.poll(async () => Math.abs(await row.evaluate(element => element.getBoundingClientRect().top) - top)).toBeLessThan(2);
  await row.getByRole("button", { name: "Buy & Sell", exact: true }).click();
  await row.getByRole("button", { name: "Company", exact: true }).click();
  await expect(help).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".wall-feed-heading h2")).toContainText("Company");
  await expect(page.locator(".wall-feed-heading h2")).toContainText("Buy & Sell");
  await expect.poll(() => server.requests.at(-1)?.type).toBe("need_help,buy_sell");
  await expect.poll(() => server.requests.at(-1)?.topic).toBe("meet_people");
  await help.click();
  await expect(help).toHaveAttribute("aria-pressed", "false");
  await expect(row.getByRole("button", { name: "Company", exact: true })).toHaveAttribute("aria-pressed", "true");
  await row.getByRole("button", { name: "More", exact: true }).click();
  await expect(page).toHaveURL(/\/wall\/explore/);
  const cards = page.locator(".wall-explore-page-grid");
  await expect(cards.getByRole("button", { name: /^Buy & Sell/ })).toHaveAttribute("aria-pressed", "true");
  await expect(cards.getByRole("button", { name: /^Company/ })).toHaveAttribute("aria-pressed", "true");
  const question = cards.getByRole("button", { name: /^Question/ });
  await question.click();
  await expect(question).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/wall\/explore/);
  await question.click(); await expect(question).toHaveAttribute("aria-pressed", "false");
  await question.click();
  const done = page.getByRole("button", { name: "Done", exact: true });
  await expect(done).toBeInViewport();
  if (width === 390) await page.screenshot({ path: "test-results/wall-needs-selection.png" });
  await done.click();
  await expect(row.getByRole("button", { name: "More", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".wall-feed-heading h2")).toContainText("Questions");
  await row.getByRole("button", { name: "More", exact: true }).click();
  await page.locator(".wall-explore-clear").click();
  await expect(cards.locator('[aria-pressed="true"]')).toHaveCount(0);
  await cards.getByRole("button", { name: /^Need help/ }).click();
  await page.getByRole("button", { name: "Back to Wall", exact: true }).click();
  await expect(row.getByRole("button", { name: "Need help", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator(".wall-feed-heading").getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator(".wall-feed-heading h2")).toHaveText("For you");
  await expect(row.locator('[aria-pressed="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__vibrations.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("all six icon hints and More appear once at intent, and reduced motion disables effects", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const server = await setup(page);
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
  }
  await expect(row.locator(".wall-need-live")).toHaveCSS("animation-name", "none");
  await row.getByRole("button", { name: "More", exact: true }).click();
  await expect(page.locator(".wall-need-hint")).toHaveText("Choose more categories and topics");
  await expect.poll(() => server.hints[0].size).toBe(7);
});

test("context hints dismiss once per icon on the server, survive reload and remain account-specific", async ({ page }) => {
  const server = await setup(page);
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
