import { test, expect } from "@playwright/test";
for (const width of [1280, 390]) {
  test(`internal monitoring shows data and missing coverage honestly at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/admin/monitoring", (route) => route.fulfill({ json: { data: {
      summary: { counts: [{ surface: "api", kind: "request", count: 100, failed: 5 }], screens: [{ surface: "web", route: "/seen", loads: 20, p50UpperMs: 2000, p95UpperMs: 7000, timeouts: 0 }], coverage: [], uptime: [] },
      watchdog: { fresh: false, lastHeartbeatAt: null }, collection: { pending: 0, dropped: 0 }, email: { configured: false, recipients: ["owner@example.test"], teamConfigured: false, counts: [] }, errors: [{ _id: "error", surface: "web", errorType: "TypeError", route: "/seen", frames: ["app.js:10:1"], createdAt: "2026-11-26T00:00:00Z", source: "client" }], alerts: [], reports: [], weeklySchedule: "Monday 09:00 Asia/Colombo", nativeCrashCoverage: "JavaScript errors only. Native iOS crashes require device crash logs."
    } } }));
    await page.goto("/tests/fixtures/monitoring.html");
    await expect(page.getByRole("heading", { name: "Internal monitoring", exact: true })).toBeVisible();
    await expect(page.getByText("5.00% (5/100)")).toBeVisible();
    await expect(page.getByText(/Email delivery not configured/)).toBeVisible();
    await expect(page.getByText(/Downtime detection is not verified/)).toBeVisible();
    await expect(page.getByRole("cell", { name: "7000 ms", exact: true })).toBeVisible();
    await expect(page.getByText(/TypeError · \/seen/)).toBeVisible();
    await expect(page.getByText(/Native iOS crashes require device crash logs/)).toBeVisible();
  });
}