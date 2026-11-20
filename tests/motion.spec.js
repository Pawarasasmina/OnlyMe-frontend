import {test,expect} from "@playwright/test";
for(const reduced of [false,true])test(`chapter, AI and route motion respect reduced motion ${reduced}`,async({page})=>{
 await page.emulateMedia({reducedMotion:reduced?"reduce":"no-preference"});
 await page.addInitScript(()=>{window.routeAnimations=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.dataset.routeTransition)window.routeAnimations.push({frames,options});return original.call(this,frames,options);};});
 await page.goto("/tests/fixtures/motion.html");
 await page.getByRole("button",{name:"Toggle AI",exact:true}).click();
 await expect(page.getByRole("status")).toHaveText("Preparing your words");
 await expect(page.locator(".ai-thinking-eye")).toHaveCSS("animation-name",reduced?"none":"ai-eye-spin");
 await page.getByRole("button",{name:"Next chapter",exact:true}).click();
 await expect(page.getByRole("article")).toHaveText("Chapter 1");
 if(!reduced)await expect(page.locator(".motion-outgoing-face")).toHaveCount(1);
 await expect(page.locator(".motion-outgoing-face")).toHaveCount(0);
 await page.getByRole("button",{name:"Next screen",exact:true}).click();
 await expect(page).toHaveURL(/next$/);
 await expect.poll(()=>page.evaluate(()=>window.routeAnimations.length)).toBe(reduced?0:1);
 await expect(page.locator("[data-route-transition]")).toHaveCount(0);
});
