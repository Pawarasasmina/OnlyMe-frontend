import { test, expect } from "@playwright/test";

async function mockWallet(page) {
  await page.route("**/api/wallet", route => route.fulfill({ json: { data: { wallet: { balance: 1000 } } } }));
}

test("purchase gives immediate feedback, celebrates only after success, then opens chapter two", async ({ page }) => {
  await mockWallet(page);
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  let calls = 0;
  await page.route("**/api/worlds/paid/purchase", async route => {
    calls++;
    await pending;
    await route.fulfill({ json: { data: { entitlement: { ownerNumber: 1, grantedAt: "2026-11-12T00:00:00Z" } } } });
  });
  await page.goto("/tests/fixtures/celebrations.html");
  await expect(page.locator(".paid-seen-purchase-owners")).toHaveCount(0);
  await page.getByRole("button", { name: /Unlock.*190/ }).click();
  await expect(page.getByRole("button", { name: /Confirming/ })).toBeDisabled();
  await expect(page.locator(".paid-seen-success-layer")).toHaveCount(0);
  complete();
  await expect(page.getByRole("heading", { name: "It's yours" })).toBeVisible();
  await expect(page.locator(".confirmation-rings i")).toHaveCount(2);
  await expect(page.locator(".ownership-burst")).toHaveCount(1);
  await expect(page.locator(".paid-seen-success-community")).toHaveCount(0);
  await expect(page.locator(".paid-seen-success-note audio")).toHaveCount(0);
  await expect(page.locator(".paid-seen-chapter-check")).toHaveCount(2);
  await page.getByRole("button", { name: /Start.*Inside/ }).click();
  await expect(page.getByTestId("route")).toHaveText("/seen/paid?chapter=1");
  expect(calls).toBe(1);
});

test("failed purchase stays on paywall and allows retry without celebration", async ({ page }) => {
  await mockWallet(page);
  await page.route("**/api/worlds/paid/purchase", route => route.fulfill({ status: 503, json: { message: "Please try again later." } }));
  await page.goto("/tests/fixtures/celebrations.html");
  await page.getByRole("button", { name: /Unlock.*190/ }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: /Unlock.*190/ })).toBeEnabled();
  await expect(page.locator(".ownership-burst")).toHaveCount(0);
});

test("already owned opens content without another ownership celebration", async ({ page }) => {
  await mockWallet(page);
  await page.route("**/api/worlds/paid/purchase", route => route.fulfill({ status: 409, json: { code: "ALREADY_ENTITLED", message: "Already owned" } }));
  await page.goto("/tests/fixtures/celebrations.html");
  await page.getByRole("button", { name: /Unlock.*190/ }).click();
  await expect(page.getByTestId("route")).toHaveText("/seen/paid?chapter=1");
  await expect(page.locator(".paid-seen-success-layer")).toHaveCount(0);
});

test("positive owner counts use singular copy; reduced motion reveals unlocked checks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockWallet(page);
  await page.route("**/api/worlds/paid/purchase", route => route.fulfill({ json: { data: { entitlement: { ownerNumber: 2 } } } }));
  await page.goto("/tests/fixtures/celebrations.html?owners=1");
  await expect(page.getByText("1 person owns this", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Unlock.*190/ }).click();
  await expect(page.getByText("You and 1 other person own this", { exact: true })).toBeVisible();
  await expect(page.locator(".ownership-burst")).toBeHidden();
  await expect(page.locator(".paid-seen-chapter-check").first()).toHaveCSS("opacity", "1");
});

test("already active membership is identified without a new-join success", async ({ page }) => {
  await mockWallet(page);
  await page.route("**/api/premium-worlds/paid/join", route => route.fulfill({ status: 409, json: { code: "MEMBERSHIP_ALREADY_ACTIVE", message: "Already active" } }));
  await page.goto("/tests/fixtures/celebrations.html?join=1");
  await page.locator(".premium-confirm-primary").click();
  await expect(page.getByTestId("result")).toHaveText('{"alreadyActive":true}');
});

test("publish acknowledgment completes and also works with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/fixtures/celebrations.html?publish=1");
  await expect(page.getByRole("status")).toContainText("Now it can be seen");
  await expect(page.getByText("Published destination")).toBeVisible();
});

test("successful join plays rings before the welcome; queued joins do not", async ({ page }) => {
  await mockWallet(page);
  await page.route("**/api/premium-worlds/paid/join", route => route.fulfill({ json: { data: { membership: { memberNumber: 12 } } } }));
  await page.goto("/tests/fixtures/celebrations.html?join=1");
  await page.locator(".premium-confirm-primary").click();
  await expect(page.locator(".join-confirmation-moment .confirmation-rings i")).toHaveCount(2);
  await expect(page.getByText("World welcome", { exact: true })).toHaveCount(0);
  await expect(page.getByText("World welcome", { exact: true })).toBeVisible();
  await page.unroute("**/api/premium-worlds/paid/join");
  await page.route("**/api/premium-worlds/paid/join", route => route.fulfill({ json: { data: { queued: true, waitingList: { position: 2 } } } }));
  await page.goto("/tests/fixtures/celebrations.html?join=1");
  await page.locator(".premium-confirm-primary").click();
  await expect(page.getByTestId("result")).toContainText('"queued":true');
  await expect(page.locator(".join-confirmation-moment")).toHaveCount(0);
});

test("creator recording uses real audio without a simulated duration", async ({ page }) => {
  await mockWallet(page);
  await page.route("**/api/worlds/paid/purchase", route => route.fulfill({ json: { data: { entitlement: { ownerNumber: 1 } } } }));
  await page.goto("/tests/fixtures/celebrations.html?voice=1");
  await page.getByRole("button", { name: /Unlock.*190/ }).click();
  await expect(page.locator(".paid-seen-success-note audio")).toHaveAttribute("src", "/owner-hello.webm");
  await expect(page.getByText("0:14", { exact: true })).toHaveCount(0);
});

test("closing the paywall does not purchase or celebrate", async ({ page }) => {
  await mockWallet(page);
  const purchases = [];
  page.on("request", request => { if (request.url().endsWith("/purchase")) purchases.push(request); });
  await page.goto("/tests/fixtures/celebrations.html");
  await page.locator(".paid-seen-purchase-close").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".confirmation-rings")).toHaveCount(0);
  expect(purchases).toHaveLength(0);
});

test("publish sweeps for 900ms, completes at 1300ms, then banner dismisses after 5200ms", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-12T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-12T00:00:01Z"));
  await page.goto("/tests/fixtures/celebrations.html?publish=1&banner=1");
  await expect(page.locator(".publish-moment-sweep")).toHaveCSS("animation-duration", "0.9s");
  await expect(page.locator(".publish-moment-sweep")).toHaveCSS("animation-delay", "0.25s");
  await page.clock.runFor(1200);
  await expect(page.locator(".publication-banner")).toHaveCount(0);
  await page.clock.runFor(100);
  await expect(page.locator(".publication-banner")).toContainText("Published");
  await expect(page.locator(".publication-banner")).toContainText("A small journey");
  await page.clock.runFor(5100);
  await expect(page.locator(".publication-banner")).not.toHaveClass(/is-leaving/);
  await page.clock.runFor(100);
  await expect(page.locator(".publication-banner")).toHaveClass(/is-leaving/);
  await page.clock.runFor(320);
  await expect(page.locator(".publication-banner")).toHaveCount(0);
});

test("share copies the real permalink and reports success only after clipboard succeeds", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async text => { window.copiedPublishUrl = text; } }, configurable: true });
  });
  await page.goto("/tests/fixtures/celebrations.html?publish=1&banner=1");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  expect(await page.evaluate(() => window.copiedPublishUrl)).toMatch(/\/seen\/paid$/);
  await expect(page.getByTestId("result")).toContainText(/copied/i);
  await expect(page.locator(".publication-banner")).toHaveCount(0);
});

test("failed copying keeps the banner and reports failure", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("Denied"); } }, configurable: true });
  });
  await page.goto("/tests/fixtures/celebrations.html?publish=1&banner=1");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByTestId("result")).toContainText("Could not copy");
  await expect(page.locator(".publication-banner")).toBeVisible();
});

test("banner distinguishes updates and displays only confirmed reward wording", async ({ page }) => {
  await page.goto("/tests/fixtures/celebrations.html?publish=1&banner=1&updated=1");
  await expect(page.locator(".publication-banner")).toContainText("Updated");
  await expect(page.locator(".publication-banner")).not.toContainText("One more AI Seen today");
  await page.goto("/tests/fixtures/celebrations.html?publish=1&banner=1&reward=1");
  await expect(page.locator(".publication-banner")).toContainText("One more AI Seen today");
});

test("upload progress shows measured percentage and omits a percentage when unknown", async ({ page }) => {
  await page.goto("/tests/fixtures/celebrations.html?progress=37");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "37");
  await expect(page.getByRole("status")).toContainText("37%");
  await page.goto("/tests/fixtures/celebrations.html?progress=unknown");
  await expect(page.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  await expect(page.getByRole("status")).not.toContainText("%");
});

test("profile centers the new tile once, with the prototype glow and reduced-motion alternative", async ({ page }) => {
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    window.publishScrollCalls = [];
    Element.prototype.scrollIntoView = function (options) { window.publishScrollCalls.push(options); scroll.call(this, options); };
  });
  await page.goto("/tests/fixtures/celebrations.html?grid=1");
  await expect(page.locator(".is-newly-published")).toHaveCSS("animation-duration", "2.4s");
  await expect(page.locator(".is-newly-published")).toHaveCSS("animation-delay", "0.3s");
  expect(await page.evaluate(() => window.publishScrollCalls)).toEqual([{ block: "center", behavior: "smooth" }]);
  await expect.poll(() => page.locator("#publish-grid-scroll").evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  expect(await page.evaluate(() => window.publishScrollCalls)).toEqual([{ block: "center", behavior: "auto" }]);
  await expect(page.locator(".is-newly-published")).toHaveCSS("animation-name", "none");
});
