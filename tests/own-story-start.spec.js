import { test, expect } from "@playwright/test";
for (const width of [390,1280]) test(`own story opens newest, plays older next, and reopens newest at ${width}px`, async ({page}) => {
 await page.setViewportSize({width,height:900});
 await page.addInitScript(() => {
  const owner={id:"507f1f77bcf86cd799439011",name:"Max",username:"max"};
  window.__OWN_STORIES__=[{id:"old",caption:"Older own story",createdAt:"2026-11-20T08:00:00Z",viewed:false},{id:"new",caption:"Newest own story",createdAt:"2026-11-20T09:00:00Z",viewed:true}].map(story=>({...story,owner,ownerId:owner.id,isOwn:true,isOwner:true,mediaType:"image",mediaUrl:"/illustrations/empty-feed.svg",image:"/illustrations/empty-feed.svg"}));
 });
 await page.route("**/api/**",route=>new URL(route.request().url()).pathname.startsWith("/api/")?route.fulfill({json:{success:true,data:{viewers:[],items:[]}}}):route.continue());
 await page.goto("/tests/fixtures/story-row.html");
 const open=page.getByRole("button",{name:/View your story/});
 await open.click();
 await expect(page.getByText("Newest own story",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Next story",exact:true}).click();
 await expect(page.getByText("Older own story",{exact:true})).toBeVisible();
 await page.keyboard.press("Escape");
 await open.click();
 await expect(page.getByText("Newest own story",{exact:true})).toBeVisible();
});

for (const width of [390,1280]) test(`other people stories start newest and play older next at ${width}px`, async ({page}) => {
 await page.setViewportSize({width,height:900});
 await page.addInitScript(() => {
  const owner={id:"507f1f77bcf86cd799439022",name:"Lina",username:"lina"};
  const stories=[{id:"old-other",caption:"Older other story",createdAt:"2026-11-20T08:00:00Z",viewed:false},{id:"new-other",caption:"Newest other story",createdAt:"2026-11-20T09:00:00Z",viewed:true}].map(story=>({...story,owner,ownerId:owner.id,mediaType:"image",mediaUrl:"/illustrations/empty-feed.svg",image:"/illustrations/empty-feed.svg"}));
  window.__STORY_GROUPS__=[{id:owner.id,user:owner,hasUnseenStories:true,stories}];
 });
 await page.route("**/api/**",route=>new URL(route.request().url()).pathname.startsWith("/api/")?route.fulfill({json:{success:true,data:{viewers:[],items:[]}}}):route.continue());
 await page.goto("/tests/fixtures/story-row.html");
 await page.getByRole("button",{name:/View Lina/}).click();
 await expect(page.getByText("Newest other story",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Next story",exact:true}).click();
 await expect(page.getByText("Older other story",{exact:true})).toBeVisible();
});
