import {test,expect} from "@playwright/test";
const user={id:"507f1f77bcf86cd799439011",name:"Tablet",username:"tablet",role:"fan",onboarding:{status:"completed"}};
async function setup(page,stories=false){
 await page.addInitScript(user=>{localStorage.setItem("onlyme_access_token","tablet-fixture");localStorage.setItem("onlyme_cached_user",JSON.stringify(user));},user);
 await page.route("**/api/**",route=>{
 const path=new URL(route.request().url()).pathname;if(!path.startsWith("/api/"))return route.continue();
 let data={items:[],conversations:[],groups:[],people:[],windows:[],calls:[],stories:[],gifts:[],pagination:{page:1,pages:1,total:0}};
 if(stories && path === "/api/stories/active")data={viewer:{...user,stories:[{id:"507f1f77bcf86cd799439099",owner:user,isOwner:true,caption:"Tablet story",mediaType:"image",mediaUrl:"/illustrations/empty-feed.svg",createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()}]},items:[]};
 if(path.endsWith("/auth/me"))data={user};
 if(path==="/api/profiles/me")data={user,profile:{ownerUserId:user.id,displayName:"Tablet",username:"tablet",role:"fan",profileAccountType:"personal",socialLinks:[],directAccess:{enabled:false}},publicMetrics:{},viewerCapabilities:{isOwner:true},viewerRelationship:{},planets:[],media:[],seens:[],experiences:[],wallPosts:[]};
 return route.fulfill({json:{success:true,data}});
 });
}
for(const width of [768,820,880])test(`tablet matches the prototype full-width content and navigation at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1024});await setup(page);
 for(const route of ["/seen","/wall","/discover","/profile","/profile/creator2","/messages"]){
 await page.goto(route);const center=page.locator(".social-center-scroll");await expect(center).toBeVisible();
 await expect(page.locator(".center-route-loading")).toHaveCount(0);
 const box=await center.boundingBox();expect(box.width).toBe(width);expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
 const roots=await center.locator(':scope > main > :not(.center-refresh-overlay):not([role="dialog"])').all();
 for(const root of roots){const bounds=await root.boundingBox();if(bounds)expect(bounds.width).toBeLessThanOrEqual(width);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 const nav=page.locator(".fan-mobile-nav");await expect(nav).toBeVisible();const navBox=await nav.boundingBox();expect(navBox.width).toBe(width-24);expect(Math.abs(navBox.x-12)).toBeLessThanOrEqual(1);
 }
});
for(const width of [390,767])test(`phone remains full width at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page);await page.goto("/seen");
 await expect(page.locator(".social-center-scroll")).toBeVisible();
 const box=await page.locator(".social-center-scroll").boundingBox();expect(Math.abs(box.width-width)).toBeLessThanOrEqual(1);
});

test("tablet story viewer and Create sheet align to the content column",async({page})=>{
 await page.setViewportSize({width:768,height:1024});await setup(page,true);
 await page.goto("/wall");await page.getByRole("button",{name:/View your story/}).click();
 const story=page.locator(".story-viewer-overlay");await expect(story).toBeVisible();
 await expect(story).toHaveCSS("width","768px");await expect(story).toHaveCSS("left","0px");
 await page.keyboard.press("Escape");await page.goto("/seen");
 await page.locator(".seen-proto-header-actions").getByRole("button",{name:"Create",exact:true}).click();
 const create=page.locator(".seen-create-sheet");await expect(create).toBeVisible();
 await expect(create).toHaveCSS("width","768px");await expect(create).toHaveCSS("left","0px");
});
test("desktop side rails and bounded center remain present",async({page})=>{
 await page.setViewportSize({width:1280,height:900});await setup(page);await page.goto("/seen");
 await expect(page.locator(".fan-web-sidebar")).toBeVisible();
 const box=await page.locator(".social-center-scroll").boundingBox();expect(box.width).toBeLessThan(768);
});
