import { test, expect } from "@playwright/test";
const users = [0, 1].map(index => ({ id: `507f1f77bcf86cd79943901${index}`, name: `User ${index}`, username: `user${index}`, role: "fan", onboarding: { status: "completed" } }));
const photo = color => `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><path fill="${color}" d="M0 0h300v300H0z"/></svg>`;
const caption = "A beautiful second-hand desk with a detailed description. ".repeat(9);
const longText = "Read this note directly in its tile without leaving the Wall. ".repeat(25);
const posts = [
  { id: "507f1f77bcf86cd799439021", text: caption, postType: "Buy & Sell", price: 1500, currency: "AED", media: [{ type: "image", url: photo("skyblue") }, { type: "image", url: photo("coral") }] },
  { id: "507f1f77bcf86cd799439022", text: longText, postType: "Question", media: [] },
  { id: "507f1f77bcf86cd799439023", text: "A chair to give away", postType: "Buy & Sell", price: 0, currency: "AED", media: [] },
  { id: "507f1f77bcf86cd799439024", text: "Meet us this weekend", postType: "Event", media: [{ type: "image", url: photo("seagreen") }] },
].map(post => ({ ...post, author: users[1], location: "Dubai, UAE", publishedAt: new Date().toISOString(), comments: [], commentCount: 0 }));

async function setup(page, server = { account: 0, views: ["feed", "feed"], saves: [], failSave: false }) {
  await page.addInitScript(user => {
    localStorage.setItem("onlyme_access_token", "market_fixture");
    localStorage.setItem("onlyme_cached_user", JSON.stringify(user));
  }, users[server.account]);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = { items: [], pagination: { page: 1, pages: 1, total: 0 }, count: 0, unreadCount: 0 };
    if (url.pathname.endsWith("/auth/me")) data = { user: users[server.account] };
    if (/\/profiles?\/me$/.test(url.pathname)) data = { user: users[server.account], profile: { city: "Dubai" } };
    if (url.pathname.endsWith("/users/me/wall-view")) {
      if (route.request().method() === "PATCH") {
        if (server.failSave) return route.fulfill({ status: 500, json: { message: "Fixture failure" } });
        const view = route.request().postDataJSON().view;
        server.views[server.account] = view; server.saves.push(view);
      }
      data = { view: server.views[server.account] };
    }
    if (url.pathname.endsWith("/posts")) {
      if (route.request().method() === "POST") {
        server.publishedBody = route.request().postData(); data = { post: posts[0] };
      } else {
        const items = url.searchParams.get("type") === "buy_sell" ? posts.filter(post => post.postType === "Buy & Sell") : posts;
        data = { items, pagination: { page: 1, pages: 1, total: items.length } };
      }
    }
    const detail = posts.find(post => url.pathname.endsWith(`/posts/${post.id}`));
    if (detail) data = { post: detail };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/wall");
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Wall view" })).toBeVisible();
  return server;
}

for (const width of [320, 390, 1280]) test(`grid geometry, internal reading and unified note links at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const server = await setup(page);
  const toggle = page.getByRole("group", { name: "Wall view" });
  await toggle.getByRole("button", { name: "Grid", exact: true }).click();
  const tiles = page.locator(".wall-market-tile");
  await expect(tiles).toHaveCount(4);
  await expect.poll(() => server.views[0]).toBe("grid");
  expect(await page.locator(".wall-market-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);
  expect(await tiles.first().locator(".wall-market-image").evaluate(el => Math.abs(el.clientWidth - el.clientHeight))).toBeLessThanOrEqual(1);
  await expect(tiles.first().locator(".wall-market-photo")).toHaveAttribute("src", photo("skyblue"));
  await expect(tiles.first().locator(".wall-market-photo")).toHaveCount(1);
  await expect(tiles.first().locator(".wall-market-price")).toHaveText("AED 1,500");
  await expect(tiles.first().locator(".wall-market-price")).toHaveCSS("backdrop-filter", /blur\(14px\)/);
  await expect(tiles.nth(2).locator(".wall-market-price")).toHaveText("Free");
  const tileCaption = tiles.first().locator(".wall-market-caption");
  await expect(tileCaption).toHaveAttribute("href", `/posts/${posts[0].id}`);
  await tileCaption.click();
  await expect(page).toHaveURL(new RegExp(`/posts/${posts[0].id}$`));
  await page.getByRole("link", { name: "Back to Wall" }).click();
  await expect(tiles).toHaveCount(4);
  const text = tiles.nth(1).locator(".wall-market-text");
  await expect(text).toHaveText(longText);
  await expect(text).toHaveClass(/has-more/);
  await text.focus();
  await expect(page).toHaveURL(/\/wall$/);
  await text.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(text).not.toHaveClass(/has-more/);
  await expect(page).toHaveURL(/\/wall$/);
  await text.evaluate(el => { el.scrollTop = 0; });
  await expect(text).toHaveClass(/has-more/);
  if (width === 390) await page.screenshot({ path: "test-results/wall-marketplace-unfiltered.png" });
  await text.click();
  await expect(page).toHaveURL(new RegExp(`/posts/${posts[1].id}$`));
  await expect(page.locator(".home-feed-text")).toHaveText(longText);
  await page.getByRole("link", { name: "Back to Wall" }).click();
  await expect(tiles).toHaveCount(4);
  await tiles.nth(1).locator(".wall-market-text").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/posts/${posts[1].id}$`));
  await page.getByRole("link", { name: "Back to Wall" }).click();
  await expect(tiles).toHaveCount(4);
  for (const selector of [".wall-market-photo-link", ".wall-market-avatar", ".wall-market-price", ".wall-market-meta"]) {
    await tiles.first().locator(selector).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${posts[0].id}$`));
    await expect(page.locator(".home-feed-text")).toHaveText(caption);
    await expect(page.locator(".wall-note-price")).toHaveText("AED 1,500");
    await page.getByRole("link", { name: "Back to Wall" }).click();
    await expect(tiles).toHaveCount(4);
  }
  await page.locator(".wall-need-icons").getByRole("button", { name: "Buy & Sell", exact: true }).click();
  await expect(tiles).toHaveCount(2);
  await expect(toggle.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".wall-market-category")).toHaveCount(0);
  if (width === 390) await page.screenshot({ path: "test-results/wall-marketplace-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await toggle.getByRole("button", { name: "Feed", exact: true }).click();
  await expect(page.locator(".wall-category-row")).toHaveCount(2);
});

test("preference survives a new browser session and is separate for each account", async ({ page, browser }) => {
  const server = await setup(page);
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect.poll(() => server.views[0]).toBe("grid");
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await setup(freshPage, server);
  await expect(freshPage.locator(".wall-market-tile")).toHaveCount(4);
  await fresh.close();
  server.account = 1;
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await setup(otherPage, server);
  await expect(otherPage.getByRole("button", { name: "Feed", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(otherPage.locator(".wall-market-tile")).toHaveCount(0);
  expect(server.views).toEqual(["grid", "feed"]);
  await other.close();
});

test("rapid toggles save in order and a failed save rolls back visibly", async ({ page }) => {
  const server = await setup(page);
  const grid = page.getByRole("button", { name: "Grid", exact: true });
  const feed = page.getByRole("button", { name: "Feed", exact: true });
  await grid.click(); await feed.click(); await grid.click();
  await expect.poll(() => server.saves).toEqual(["grid", "feed", "grid"]);
  await feed.click(); await expect.poll(() => server.views[0]).toBe("feed");
  server.failSave = true;
  await grid.click();
  await expect(feed).toHaveAttribute("aria-pressed", "true", { timeout: 10000 });
  await expect(page.getByText("Could not save your view. Please try again.")).toBeVisible();
});

test("Buy & Sell optional price is submitted and retained when reopening the composer", async ({ page }) => {
  const server = await setup(page);
  await page.getByRole("button", { name: "Create Wall note", exact: true }).click();
  await page.locator(".wall-need-card").filter({ has: page.getByText("Buy & Sell", { exact: true }) }).click();
  await page.getByRole("textbox", { name: "Note text", exact: true }).fill("A used desk");
  const price = page.getByRole("textbox", { name: "Price · optional", exact: true });
  await price.fill("1500");
  await expect(page.locator(".wall-compose-price label > span")).toHaveText("AED");
  await page.getByRole("button", { name: "Back to needs", exact: true }).click();
  await page.locator(".wall-need-card").filter({ has: page.getByText("Buy & Sell", { exact: true }) }).click();
  await expect(price).toHaveValue("1,500");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect.poll(() => server.publishedBody || "").toContain('name="price"');
  expect(server.publishedBody).toContain("1500");
});

for (const [amount, expected] of [["", null], ["0", "0"], ["12.50", "1250"]]) test('listing price submission: ' + (amount || 'blank'), async ({ page }) => {
  const server = await setup(page);
  await page.getByRole('button', { name: 'Create Wall note', exact: true }).click();
  await page.locator('.wall-need-card').filter({ has: page.getByText('Buy & Sell', { exact: true }) }).click();
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('A used desk');
  await page.locator('.wall-compose-price input').fill(amount);
  await expect(page.locator('.wall-compose-price small')).toHaveText("0 = free \u00b7 Meet in public. @seen doesn't take payment for items.");
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect.poll(() => Boolean(server.publishedBody)).toBe(true);
  if (expected === null) expect(server.publishedBody).not.toContain('name="price"');
  else expect(server.publishedBody.split('name="price"')[1].trimStart().split("\r\n")[0]).toBe(expected);
  expect(server.publishedBody).not.toContain('name="currency"');
});

test('price input strips non-digits and caps at nine digits', async ({ page }) => {
 await setup(page);
 await page.getByRole('button', { name: 'Create Wall note', exact: true }).click();
 await page.locator('.wall-need-card').filter({ has: page.getByText('Buy & Sell', { exact: true }) }).click();
 const input = page.locator('.wall-compose-price input');
 for (const [raw,expected] of [['abc',''],['-1','1'],['1.234','1,234'],['1234567890','123,456,789'],['0000','0']]) {
  await input.fill(raw); await expect(input).toHaveValue(expected);
 }
 await expect(input).toHaveAttribute('inputmode','numeric');
});

test('price adds commas while typing and submits the ungrouped amount', async ({ page }) => {
 const server = await setup(page);
 await page.getByRole('button', { name: 'Create Wall note', exact: true }).click();
 await page.locator('.wall-need-card').filter({ has: page.getByText('Buy & Sell', { exact: true }) }).click();
 await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Desk');
 const input = page.locator('.wall-compose-price input');
 await input.pressSequentially('123444');
 await expect(input).toHaveValue('123,444');
 await input.press('Home');
 await input.press('ArrowRight');
 await input.pressSequentially('9');
 await expect(input).toHaveValue('1,923,444');
 await input.press('Backspace');
 await expect(input).toHaveValue('123,444');
 await input.press('End');
 await input.pressSequentially('50');
 await expect(input).toHaveValue('12,344,450');
 await page.getByRole('button', { name: 'Post', exact: true }).click();
 await expect.poll(() => server.publishedBody || '').toContain('12344450');
 expect(server.publishedBody).not.toContain('12,344,450');
});

for (const [country,label] of [['Paris, France','\u20ac'],['London, United Kingdom','\u00a3'],['New York, United States','$'],['Tokyo, Japan','\u00a5'],['Doha, Qatar','QAR']]) test('currency label for '+country, async ({page}) => {
 await setup(page);
 await page.goto('/wall?compose=note&composeType=Buy%20%26%20Sell&composeRequest=currency&location='+encodeURIComponent(country)+'&scope=custom');
 await expect(page.locator('.wall-compose-price label > span')).toHaveText(label);
 await expect(page.locator('.wall-compose-price select')).toHaveCount(0);
});
