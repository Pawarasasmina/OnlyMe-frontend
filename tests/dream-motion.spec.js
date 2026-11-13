import { test, expect } from "@playwright/test";

async function dreamPage(page, overrides = {}, { owner = false } = {}) {
  await page.route("**/api/dreams/creator/arjun", route => route.fulfill({ json: { data: { dream: {
    id: "dream", title: "Field guide", status: "ACTIVE", receivedStars: 570, goalStars: 1500,
    supporterCount: 3, supporters: [], photo: { url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><path fill="skyblue" d="M0 0h88v88H0z"/></svg>' }, ...overrides,
  }, gifts: [] } } }));
  await page.goto(`/tests/fixtures/dream.html?profile=1${owner ? "&owner=1" : ""}`);
  await expect(page.locator(".dream-compact-row")).toBeVisible();
}

test("real progress fills over 1.2 seconds, with the delayed shimmer and photo animations", async ({ page }) => {
  await dreamPage(page);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "38");
  await expect(page.locator(".dream-compact-title strong")).toHaveText("38%");
  await expect(page.locator(".dream-compact-progress>i")).toHaveCSS("animation-duration", "1.2s");
  await expect(page.locator(".dream-compact-shimmer")).toHaveCSS("animation-duration", "2.8s");
  await expect(page.locator(".dream-compact-shimmer")).toHaveCSS("animation-delay", "1.2s");
  await expect(page.locator(".dream-compact-cover")).toHaveCSS("animation-duration", "2.4s");
  await expect(page.locator(".dream-compact-cover img")).toHaveCSS("animation-duration", "10s");
  await expect(page.locator(".dream-compact-cover img")).toHaveCSS("animation-direction", "alternate");
  await expect(page.locator(".dream-compact-supporters")).toHaveText("3 in this story");
  await page.locator(".dream-compact-progress>i").evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
  const ratio = await page.locator(".dream-compact-progress").evaluate(element => element.firstElementChild.getBoundingClientRect().width / element.getBoundingClientRect().width);
  expect(ratio).toBeCloseTo(.38, 2);
});

test("zero contributions keep the bar empty, even with old demo values in storage", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("onlyme-dream-demo-v1:demo-user", JSON.stringify({ dreams: { dream: { coins: 1400 } } })));
  await dreamPage(page, { receivedStars: 0, supporterCount: 0 });
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await page.locator(".dream-compact-progress>i").evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
  await expect(page.locator(".dream-compact-progress>i")).toHaveCSS("width", "0px");
  await expect(page.locator(".dream-compact-title strong")).toHaveText("0%");
  await expect(page.locator(".dream-compact-supporters")).toHaveText("0 in this story");
});

test("percentage becomes gold at 75 percent and stays blue below it", async ({ page }) => {
  await dreamPage(page, { receivedStars: 1110 });
  await expect(page.locator(".dream-compact-title strong")).toHaveCSS("color", "rgb(191, 227, 255)");
  await dreamPage(page, { receivedStars: 1125 });
  await expect(page.locator(".dream-compact-title strong")).toHaveText("75%");
  await expect(page.locator(".dream-compact-title strong")).toHaveCSS("color", "rgb(233, 207, 134)");
});

test("100 percent funding remains active until completion is confirmed", async ({ page }) => {
  await dreamPage(page, { receivedStars: 1800 });
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("button", { name: /Help/ })).toBeVisible();
  await expect(page.getByText("Came true", { exact: true })).toHaveCount(0);
});

test("completed Dream shows thanks, removes support and pulse, and retains photo zoom", async ({ page }) => {
  await dreamPage(page, { status: "COMPLETED", supporterCount: 7 });
  await expect(page.locator(".dream-compact-title strong")).toHaveText("Came true");
  await expect(page.locator(".dream-compact-supporters")).toContainText("7");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator(".dream-compact-shimmer")).toHaveCount(0);
  await expect(page.locator(".dream-compact-action")).toHaveCount(0);
  await expect(page.locator(".dream-compact-cover")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".dream-compact-cover img")).toHaveCSS("animation-duration", "10s");
  await expect(page.locator(".dream-compact-content")).toBeDisabled();
});

test("reduced motion keeps actual progress immediately and hides shimmer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dreamPage(page);
  for (const selector of [".dream-compact-cover", ".dream-compact-cover img", ".dream-compact-progress>i"]) await expect(page.locator(selector)).toHaveCSS("animation-name", "none");
  await expect(page.locator(".dream-compact-shimmer")).toBeHidden();
  const ratio = await page.locator(".dream-compact-progress").evaluate(element => element.firstElementChild.getBoundingClientRect().width / element.getBoundingClientRect().width);
  expect(ratio).toBeCloseTo(.38, 2);
});

test("missing and broken photos use the local generated cover", async ({ page }) => {
  await dreamPage(page, { photo: null });
  await expect(page.locator(".dream-compact-cover img")).toHaveAttribute("src", /^data:image\/svg\+xml,/);
  await page.route("**/broken-dream-photo.jpg", route => route.fulfill({ status: 404, body: "" }));
  await dreamPage(page, { photo: { url: "/broken-dream-photo.jpg" } });
  await expect(page.locator(".dream-compact-cover img")).toHaveAttribute("src", /^data:image\/svg\+xml,/);
});

test("funded support sheet does not claim the Dream has happened", async ({ page }) => {
  await page.route("**/api/wallet", route => route.fulfill({ json: { data: { wallet: { balance: 100 } } } }));
  await page.goto("/tests/fixtures/dream.html?funded=1");
  await expect(page.locator(".dream-support-progress-copy strong")).toHaveText("Fully funded");
  await expect(page.getByText("It happened", { exact: true })).toHaveCount(0);
});
