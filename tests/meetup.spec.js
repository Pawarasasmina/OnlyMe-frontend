import { test, expect } from "@playwright/test";
test("saved Dubai opens with its map and is not replaced by device location", async ({page}) => {
  await page.addInitScript(()=>{window.locationRequests=0;navigator.geolocation.getCurrentPosition=()=>{window.locationRequests+=1;};});
  await fixture(page,"?compose&saved");
  await page.locator(".wall-compose-settings button").nth(1).click();
  await expect(page.locator(".universal-location-map")).toContainText("Dubai - approximate area");
  await expect(page.locator(".universal-location-tiles img").first()).toBeAttached();
  await expect(page.locator(".universal-location-done")).toContainText("Dubai");
  expect(await page.evaluate(()=>window.locationRequests)).toBe(0);
  await page.locator(".universal-location-done").click();
  await expect(page.locator(".wall-compose-settings")).toContainText("Dubai");
});
test("Wall picker resolves current location only when requested", async ({page,context}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({latitude:25.123456,longitude:55.345678});
  await fixture(page,"?compose");
  const lookup=page.waitForRequest(req=>req.url().includes("/locations") && new URL(req.url()).searchParams.has("latitude"));
  await page.locator(".wall-compose-settings button").nth(1).click();
  await page.getByRole("button",{name:/Current location/}).click();
  const request=await lookup;
  expect(new URL(request.url()).searchParams.get("areaOnly")).toBe("true");
  await expect(page.locator(".universal-location-map")).toContainText("Marina - approximate area");
  await expect(page.locator(".universal-location-dot")).toHaveCount(0);
  await page.locator(".universal-location-done").click();
  await expect(page.locator(".wall-compose-settings")).toContainText("Marina, Dubai, UAE");
});
test("location permission denial still allows choosing an area manually", async ({page}) => {
  await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(_,fail)=>fail({code:1,message:"Permission denied"});});
  await fixture(page,"?compose");
  await page.locator(".wall-compose-settings button").nth(1).click();
  await page.getByRole("button",{name:/Current location/}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.locator(".universal-location-search input").fill("Marina");
  await page.locator(".universal-location-row").filter({hasText:"Marina"}).click();
  await expect(page.locator(".universal-location-map")).toContainText("approximate area");
});
async function fixture(page,suffix=""){
  const writes=[];
  await page.route("**/api/**",async route=>{
    const req=route.request(),url=new URL(req.url());if(!url.pathname.startsWith("/api/"))return route.continue();
    let data={items:[],count:0};
    if(req.method()!=="GET")writes.push({path:url.pathname,body:req.postData()});
    if(url.pathname.endsWith("/locations")){expect(url.searchParams.get("areaOnly")).toBe("true");data={items:[{id:"area1",name:"Marina",label:"Marina, Dubai, UAE",subtitle:"Dubai, UAE",code:"AE",kind:"area",mapCenter:{latitude:25.1,longitude:55.3},wallAreaToken:"test-signed-area"}]};}
    if(url.pathname.endsWith("/report"))data={reportId:"report1",status:"RECEIVED"};
    if(url.pathname.endsWith("/moderation-policy"))data={policy:{urgentHours:4,standardHours:24,contextMessages:3,unsafeUrgentHours:4,unsafeReportThreshold:3,unsafeReportWindowDays:30,unsafeRestrictionDays:1}};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto(`/tests/fixtures/meetup.html${suffix}`);return writes;
}
test("Company note displays safety tips and sends I feel unsafe as an urgent-report reason",async({page})=>{
  const writes=await fixture(page);await expect(page.getByRole("complementary",{name:"Meet-up safety tips"})).toBeVisible();
  await expect(page.getByRole("button",{name:"I feel unsafe - report urgently",exact:true})).toBeHidden();
  await page.locator("summary").filter({hasText:"Meet safely"}).click();
  await page.getByRole("button",{name:"I feel unsafe - report urgently",exact:true}).click();await page.getByRole("button",{name:"I feel unsafe",exact:true}).click();
  await expect.poll(()=>writes.some(row=>row.path.endsWith("/report"))).toBe(true);expect(JSON.parse(writes.find(row=>row.path.endsWith("/report")).body).reason).toBe("UNSAFE_MEETUP");
});
test("Wall composer uses area-only search, offers no live pin and carries the signed area",async({page})=>{
  await page.setViewportSize({width:390,height:844});await fixture(page,"?compose");await expect(page.getByRole("complementary",{name:"Meet-up safety tips"})).toBeVisible();
  await page.locator(".wall-compose-settings button").nth(1).click();await expect(page.locator(".universal-location-map")).toHaveCount(1);await expect(page.getByRole("button",{name:/Current location/})).toHaveCount(1);
  await page.locator(".universal-location-search input").fill("Marina");await page.locator(".universal-location-row").filter({hasText:"Marina"}).click();await expect(page.locator(".universal-location-map")).toContainText("approximate area");await expect(page.locator(".universal-location-dot")).toHaveCount(0);await page.screenshot({path:"tmp/meetup-area-map-mobile.png"});await page.locator(".universal-location-done").click();
  await expect(page.locator(".wall-compose-settings")).toContainText("Marina, Dubai, UAE");await page.screenshot({path:"tmp/meetup-company-mobile.png",fullPage:true});
});
test("admin sees meet-up policy limits and can edit the independent reporter threshold",async({page})=>{
  await fixture(page,"?admin");await expect(page.getByRole("heading",{name:"Meet-up safety rules",exact:true})).toBeVisible();
  const sla=page.getByRole("spinbutton",{name:"Unsafe report SLA (hours, maximum 4)",exact:true});await expect(sla).toHaveAttribute("max","4");await expect(sla).toHaveValue("4");
  await page.getByRole("spinbutton",{name:"Independent reporters required",exact:true}).fill("4");await expect(page.getByRole("spinbutton",{name:"Independent reporters required",exact:true})).toHaveValue("4");await page.screenshot({path:"tmp/meetup-admin-policy.png",fullPage:true});
});
