import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768]) {
  for (const profile of [false, true]) {
    test(`Wall note geometry and comment wording at ${width}px, profile=${profile}`, async ({ page }) => {
      page.on("pageerror", error => { throw error; });
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/api/**", route => new URL(route.request().url()).pathname.startsWith("/api/")
        ? route.fulfill({ json: { success: true, data: { items: [] } } })
        : route.continue());
      await page.goto(`/tests/fixtures/wall-threads.html${profile ? "?profile" : ""}`);
      const notes = page.locator(".wall-thread-note");
      await expect(notes).toHaveCount(3);
      await expect(notes.nth(0).locator(".wall-view-comments")).toHaveCount(0);
      await expect(notes.nth(1).locator(".wall-view-comments")).toHaveText("View 1 comment");
      await expect(notes.nth(2).locator(".wall-view-comments")).toHaveText("View all 3 comments");
      const geometry = await notes.first().evaluate(note => {
        const style = getComputedStyle(note);
        const text = note.querySelector(".wall-post-text-content");
        const actions = note.querySelector(".home-feed-actions");
        return {
          background: style.backgroundColor, radius: style.borderRadius, shadow: style.boxShadow,
          divider: style.borderBottomWidth,
          indent: text.getBoundingClientRect().left - note.getBoundingClientRect().left,
          actionIndent: actions.getBoundingClientRect().left - note.getBoundingClientRect().left,
          actionOverflow: actions.scrollWidth > actions.clientWidth,
          avatar: note.querySelector(".home-feed-post-head .fan-avatar")?.getBoundingClientRect().width,
          overflow: document.documentElement.scrollWidth > innerWidth,
          noWrap: [...actions.querySelectorAll("button")].every(button => getComputedStyle(button).whiteSpace === "nowrap"),
        };
      });
      expect(geometry).toMatchObject({ background: "rgba(0, 0, 0, 0)", radius: "0px", shadow: "none", divider: "1px", indent: profile ? 0 : 48, actionIndent: 0, actionOverflow: false, overflow: false, noWrap: true });
      expect(geometry.avatar).toBe(profile ? undefined : 38);
      await expect(notes.last()).toHaveCSS("border-bottom-width", "0px");
      if (width === 390) await page.screenshot({ path: `test-results/wall-threads-${profile ? "profile" : "feed"}.png` });
      await expect(notes.nth(1).locator(".wall-note-text-link")).toHaveAttribute("href", "/posts/fixture-1");
    });
  }
}
