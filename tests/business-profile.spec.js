import { test, expect } from "@playwright/test";
const user={id:"507f1f77bcf86cd799439011",name:"Shop",username:"shop",role:"creator",creatorApprovalStatus:"approved",profileAccountType:"business",status:"active",onboarding:{status:"completed"}};
async function setup(page,contact={},owner=true){
 await page.addInitScript(user=>{localStorage.setItem("onlyme_access_token","business-fixture");localStorage.setItem("onlyme_cached_user",JSON.stringify(user));},user);
 await page.route("**/api/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith("/api/"))return route.continue();
  let data={items:[],groups:[],conversations:[],gifts:[],stories:[],pagination:{page:1,pages:1,total:0}};
  if(path.endsWith("/auth/me"))data={user};
  if(path==="/api/profiles/me"||path==="/api/profiles/shop")data={user,profile:{ownerUserId:user.id,username:"shop",displayName:"Shop",role:"creator",isCreator:true,profileAccountType:"business",socialLinks:[],businessContact:{enabled:["call","directions","website"],...contact},directAccess:{enabled:false}},publicMetrics:{followerCount:0,followingCount:0},viewerCapabilities:{isOwner:owner,canCreate:owner},viewerRelationship:{},planets:[],media:[],seens:[],experiences:[],wallPosts:[]};
  if(path==="/api/creator/dashboard"||path==="/api/creator/ways-to-earn"||path==="/api/creator/grow")data={};
  if(path==="/api/settings/monetization")data={enabled:false,verified:false,accountType:"business"};
  await route.fulfill({json:{success:true,data}});
 });
}
for(const owner of [true,false])test(`empty business contacts are hidden for ${owner?"owner":"visitor"}`,async({page})=>{
 await setup(page,{},owner);await page.goto("/profile/shop");
 await expect(page.locator(".profile-prototype")).toBeVisible();
 await expect(page.locator(".profile-business-contact-actions")).toHaveCount(0);
});
test("populated business contact actions appear",async({page})=>{
 await setup(page,{call:"+94771234567",directions:"Colombo",website:"https://example.com"});await page.goto("/profile/shop");
 await expect(page.locator(".profile-business-contact-actions button")).toHaveCount(3);
});
test("business Studio is labeled and Offers opens the Wall Offering composer",async({page})=>{
 await setup(page);await page.goto("/studio");
 await expect(page.getByRole("heading",{name:"Business dashboard",exact:true})).toBeVisible();
 await page.locator(".business-dashboard-tools").getByRole("link",{name:"Offering",exact:true}).click();
 await expect(page.locator(".wall-create-screen")).toBeVisible();
 await expect(page.locator(".wall-prototype-compose")).toContainText("Offering");
});
test("business onboarding dashboard exposes Offers too",async({page})=>{
 await setup(page);await page.goto("/ways-to-earn");
 await expect(page.locator(".earn-page-head")).toContainText("Business dashboard");
 await expect(page.locator(".business-dashboard-tools").getByRole("link",{name:"Offering",exact:true})).toBeVisible();
});
