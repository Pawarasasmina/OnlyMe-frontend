import { test, expect } from "@playwright/test";
const person = { id: "person", name: "Real Creator", username: "real-creator" };
const seen = { id: "seen", title: "A real public Seen", creator: person, chapterCount: 4 };
const data = { suggestedUsers: [person], activity: { actor: person, count: 1 }, trendingSeen: seen, freshSeens: [{ ...seen, id: "fresh", title: "Fresh public content" }] };
async function start(page, handler) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("atseen_language", "en"));
  await page.route("**/api/discover?**", handler);
  await page.goto("/tests/fixtures/right-rail.html");
}
const respond = (route, payload = data) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: payload }) });
test("sidebar requests its own lightweight view and displays real response data", async ({ page }) => {
  await start(page, route => {
    expect(new URL(route.request().url()).searchParams.get("view")).toBe("sidebar");
    return respond(route);
  });
  await expect(page.getByText("A real public Seen", { exact: true })).toBeVisible();
  await expect(page.getByText("Fresh public content", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fresh public content/ })).toHaveAttribute("href", "/seen/fresh");
});
test("failed requests show retry rather than false empty cards and recover", async ({ page }) => {
  let fail = true;
  await start(page, route => fail ? route.fulfill({ status: 503, contentType: "application/json", body: '{}' }) : respond(route));
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("No public Seen is trending yet.", { exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("A real public Seen", { exact: true })).toBeVisible();
});
test("genuine empty responses retain honest empty states", async ({ page }) => {
  await start(page, route => respond(route, { suggestedUsers: [], freshSeens: [], trendingSeen: null, activity: null }));
  await expect(page.getByText("No public Seen is trending yet.", { exact: true })).toBeVisible();
  await expect(page.getByText("Fresh public Seens will appear here.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toHaveCount(0);
});
