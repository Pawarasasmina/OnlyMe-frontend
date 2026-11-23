import { test, expect } from "@playwright/test";

async function start(page, query = "") {
  const events = [];
  await page.route("**/api/analytics/events", async route => {
    if (route.request().method() === "POST") events.push(route.request().postDataJSON());
    await route.fulfill({ json: { success: true, data: { recorded: true } } });
  });
  await page.goto(`/tests/fixtures/chapter-analytics.html${query}`);
  await expect(page.getByRole("heading", { name: "Chapter 1" })).toBeVisible();
  return events;
}

test("text completion requires the end of the chapter and is emitted once", async ({ page }) => {
  const events = await start(page);
  await page.waitForTimeout(3200);
  expect(events).toHaveLength(0);
  await page.getByText("End of chapter").scrollIntoViewIfNeeded();
  await expect.poll(() => events.length).toBe(1);
  expect(events[0]).toMatchObject({ eventType: "CHAPTER_COMPLETE", metadata: { chapterId: "chapter-1" } });
  await page.waitForTimeout(1000);
  expect(events).toHaveLength(1);
  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.getByRole("heading", { name: "Chapter 2" })).toBeVisible();
  await page.getByText("End of chapter").scrollIntoViewIfNeeded();
  await expect.poll(() => events.length, { timeout: 6000 }).toBe(2);
  expect(events[1].metadata.chapterId).toBe("chapter-2");
});

test("reaching the end does not complete an unfinished video", async ({ page }) => {
  const events = await start(page, "?video");
  await page.getByText("End of chapter").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3200);
  expect(events).toHaveLength(0);
  await page.locator("video").evaluate(video => video.dispatchEvent(new Event("ended")));
  await expect.poll(() => events.length).toBe(1);
});

test("scrolling past video emits a fast skip without waiting for unmount", async ({ page }) => {
  const events = [];
  await page.route("**/api/analytics/events", async route => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ json: { success: true, data: { recorded: true } } });
  });
  await page.goto("/tests/fixtures/chapter-analytics.html?skip");
  await expect(page.getByRole("heading", { name: "Video feed item" })).toBeVisible();
  await page.waitForTimeout(150);
  await page.getByText("Next feed item").scrollIntoViewIfNeeded();
  await expect.poll(() => events.some(event => event.eventType === "FAST_SKIP")).toBe(true);
});

test("admin displays all five metrics, Dubai peak usage and timezone-safe dates", async ({ page }) => {
  let request;
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    request = url;
    await route.fulfill({ json: { success: true, data: {
      summary: {}, engagement: { summary: {}, trend: [] }, topContent: { items: [] },
      platformActivity: { timezone: "Asia/Dubai", hours: [{ label: "23:00", count: 12 }] },
      productEvents: { totals: { world_open: 4, chapter_complete: 3, scroll_skip: 2, support: 1, save: 5 }, supportCoins: 100, trend: [{ label: "2026-11-23", world_open: 4, chapter_complete: 3, scroll_skip: 2, support: 1, save: 5 }] },
      supportedMetrics: {},
    } } });
  });
  await page.goto("/tests/fixtures/chapter-analytics.html?admin");
  await expect(page.getByRole("heading", { name: "Product events" })).toBeVisible();
  for (const event of ["world_open", "chapter_complete", "scroll_skip", "support", "save"]) await expect(page.locator("code").filter({ hasText: new RegExp(`^${event}$`) })).toBeVisible();
  await expect(page.getByText("Coins gifted: 100")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Peak usage.*Dubai time/ })).toBeVisible();
  await expect(page.getByText("23:00", { exact: true })).toBeVisible();
  expect(request.searchParams.get("startDate")).toMatch(/T20:00:00.000Z$/);
  expect(request.searchParams.get("endDate")).toMatch(/T19:59:59.999Z$/);
  await page.getByLabel("Product activity").selectOption("TEST");
  await expect.poll(() => request.searchParams.get("productAccountType")).toBe("TEST");
  await expect(page.getByText(/TEST accounts only/)).toBeVisible();
});
