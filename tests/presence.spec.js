import {test,expect} from "@playwright/test";
test("presence motion follows live state and reduced-motion preference", async ({page})=>{
 await page.emulateMedia({reducedMotion:"no-preference"});
 await page.goto("/tests/fixtures/presence.html");
 const ring=page.getByTestId("new").locator(".wall-story-ring");
 const dot=page.getByTestId("new").locator(".presence-blink");
 await expect(ring).toHaveCSS("animation-duration","3s");
 await expect(dot).toHaveCSS("animation-duration","2.2s");
 await expect(page.getByTestId("empty").locator(".presence-live-ring,.presence-blink")).toHaveCount(0);
 await expect(page.getByTestId("viewed").locator(".wall-story-ring")).toHaveCSS("animation-name","none");
 await expect(page.getByTestId("viewed").locator(".wall-story-ring")).toHaveCSS("box-shadow","none");
 await page.emulateMedia({reducedMotion:"reduce"});
 await expect(ring).toHaveCSS("animation-name","none");
 await expect(dot).toHaveCSS("animation-name","none");
});
