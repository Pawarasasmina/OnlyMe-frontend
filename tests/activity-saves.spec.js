import { test, expect } from "@playwright/test";
const text = "Zuma after 8 PM — book a table in advance. Worth every dirham.";
async function fixture(page, items) {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const data = path === "/api/fan/activity" ? { items } : path === "/api/wallet" ? { wallet: {} } : { items: [] };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/tests/fixtures/activity-saves.html");
}
const saved = { id: "saved-note", type: "wall_save_group", title: "12 people saved your note", direction: "received", filter: "saves", aggregate: { count: 12 }, target: { id: "note1", type: "WALL_POST", preview: text }, preview: text, actionPath: "/posts/note1", createdAt: new Date().toISOString() };
for (const width of [1440, 393]) test(`saved-note Activity row matches prototype and opens original at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await fixture(page, [saved]);
  const row = page.locator(".activity-prototype-row.is-note-save");
  await expect(row).toHaveCount(1);
  await expect(row.locator(".activity-prototype-copy p b")).toHaveText("12 people");
  await expect(row.locator(".activity-prototype-icon.is-aggregate")).toBeVisible();
  await expect(row.locator(".activity-person-avatar")).toHaveCount(0);
  await expect(row.locator(".activity-note-tile")).toHaveText(text);
  await expect(row.locator(".activity-content-tile")).toHaveCSS("width", "42px");
  await expect(row.locator(".activity-content-tile")).toHaveCSS("height", "52px");
  await expect(row.locator(".activity-prototype-copy p")).toHaveCSS("font-size", "12.5px");
  await page.screenshot({ path: `tmp/activity-saved-note-${width}.png` });
  await row.click();
  await expect(page.getByRole("heading", { name: "Original note note1" })).toBeVisible();
});
test("individual legacy save rows group by note without showing saver names", async ({ page }) => {
  await fixture(page, ["one", "two"].map((id, index) => ({ ...saved, id, type: "feed_post_save", aggregate: null, title: `Saver ${index} saved your note`, relatedCreator: { id, name: `Saver ${index}` } })));
  const row = page.locator(".activity-prototype-row.is-note-save");
  await expect(row).toHaveCount(1);
  await expect(row.locator(".activity-prototype-copy p")).toHaveText("2 people saved your note");
  await expect(row.locator(".activity-person-avatar")).toHaveCount(0);
});

test("Direct Access Answer opens the exact request", async ({ page }) => {
  await fixture(page, [{ id: "da", type: "direct_access", filter: "comments", direction: "received", title: "James requested Direct Access", metadata: { canAnswer: true }, actionPath: "/messages?tab=direct&with=james&window=request1", createdAt: new Date().toISOString() }]);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.getByRole("heading")).toHaveText("/messages?tab=direct&with=james&window=request1");
});

test("renewal warning offers a working top-up action", async ({ page }) => {
  await fixture(page, [{ id: "renew", type: "premium_renewal_low_balance", filter: "subscriptions", direction: "received", title: "Not enough coins to renew — top up to stay", target: { id: "world1", type: "PREMIUM_WORLD" }, actionPath: "/wallet", createdAt: new Date().toISOString() }]);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Top up", exact: true }).click();
  await expect(page.getByRole("heading")).toHaveText("/wallet");
});

test("saved comments show anonymous counts and the comment preview", async ({ page }) => {
  await fixture(page, [{ ...saved, id: "comment-save", type: "comment_save_group", title: "3 people saved your comment", aggregate: { count: 3 }, metadata: { savedComment: true } }]);
  await expect(page.locator(".activity-prototype-copy p")).toHaveText("3 people saved your comment");
  await expect(page.locator(".activity-note-tile")).toHaveText(text);
});

test("follow-back has no eye; mutual acknowledgement matches prototype", async ({page})=>{
 await page.emulateMedia({reducedMotion:"no-preference"});
 await page.addInitScript(()=>{window.ackMotion=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.ackMotion.push(options.duration);return animate.call(this,frames,options)}});
 await fixture(page, [
 {id:"follow-eye-test",type:"follow",title:"Max started following you",direction:"received",filter:"follows",relatedCreator:{id:"max",name:"Max",username:"max"},canAcknowledge:true,createdAt:new Date().toISOString()},
 {id:"mutual-eye-test",type:"mutual",title:"You and Mia see each other",direction:"received",filter:"all",relatedCreator:{id:"mia",name:"Mia"},canAcknowledge:true,createdAt:new Date().toISOString()}
 ]);
 await page.getByRole("button",{name:"All",exact:true}).click();
 const follow=page.locator(".activity-prototype-row").filter({hasText:"Max started following you"});
 await expect(follow.locator(".activity-presence-ack,.activity-mutual-eye")).toHaveCount(0);
 await expect(follow.getByRole("button",{name:"Follow back"})).toBeVisible();
 const mutual=page.locator(".activity-prototype-row").filter({hasText:"You and Mia see each other"});
 const button=mutual.locator(".activity-presence-ack");
 await expect(button.locator("svg")).toHaveCSS("width","15px");
 await expect(button.locator("svg")).toHaveCSS("height","9.375px");
 await button.click();
 await expect(button).toHaveText("Seen \u2713");
 await expect(button).toHaveCSS("font-size","9.5px");
 expect(await page.evaluate(()=>window.ackMotion)).toContain(500);
 await button.click();
 await expect(button.locator("svg")).toHaveCount(1);
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.evaluate(()=>window.ackMotion=[]);
 await button.click();
 expect(await page.evaluate(()=>window.ackMotion)).toHaveLength(0);
});
