import { test, expect } from "@playwright/test";
const application={_id:"licence1",__v:1,legalName:"Local Studio LLC",country:"UAE",licenceNumber:"UAE-12345",issuingAuthority:"Trade authority",documentType:"TRADE_LICENCE",expiresAt:"2030-12-31",status:"PENDING",history:[],user:{_id:"business",username:"studio"},documentMetadata:{mimeType:"application/pdf",originalName:"licence.pdf",size:100}};
async function fixture(page,view){
  const writes=[];let reviewed=false,resolved=false;
  await page.route("**/api/**",async route=>{
    const req=route.request(),url=new URL(req.url());if(!url.pathname.startsWith("/api/"))return route.continue();let data={};
    if(req.method()!=="GET")writes.push({path:url.pathname,body:req.postDataJSON()});
    if(url.pathname.endsWith("/review")){reviewed=true;data={};}
    else if(url.pathname.endsWith("/business-verifications"))data={items:reviewed?[]:[application]};
    else if(url.pathname.endsWith("/business-offers"))data={items:[{_id:"offer1",author:{username:"studio"},text:"Studio session with all fees included",price:150,currency:"AED",status:"published"}]};
    else if(url.pathname.endsWith("/resolve")){resolved=true;data={};}
    else if(url.pathname.endsWith("/support-inbox"))data={items:resolved?[]:[{_id:"booking1",service:"Studio session",price:150,currency:"AED",scheduledAt:"2030-01-01T10:00:00Z",business:{username:"studio"},customer:{username:"maya"},dispute:{reason:"Business did not provide the booked session"}}]};
    else if(url.pathname.endsWith("/verification"))data={verification:null};
    else if(url.pathname.endsWith("/bookings"))data={items:[{_id:"booking1",service:"Studio session",business:{_id:"business",username:"studio"},customer:{_id:"customer",username:"maya"},scheduledAt:"2030-01-01T10:00:00Z",status:"CONFIRMED",price:150,currency:"AED"}]};
    else if(url.pathname.endsWith("/users"))data={users:[{_id:"business",name:"Local Studio",username:"studio",email:"studio@test.invalid",role:"fan",profileAccountType:"business",status:"active",accountType:"REAL",createdAt:"2025-01-01"}]};
    else data={items:[],verifications:[]};
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto(`/tests/fixtures/business.html?view=${view}`);return writes;
}
test("business approval requires review confirmations and a reason",async({page})=>{
  const writes=await fixture(page,"verification");const approve=page.getByRole("button",{name:"APPROVED",exact:true});
  await expect(approve).toBeDisabled();await page.getByRole("textbox",{name:"Business review reason"}).fill("Current licence and business details match");
  await expect(approve).toBeDisabled();await page.getByRole("checkbox").nth(0).check();await page.getByRole("checkbox").nth(1).check();await approve.click();
  await expect(page.getByText("No applications in this view.")).toBeVisible();expect(writes[0].body).toMatchObject({status:"APPROVED",documentReviewed:true,detailsMatch:true});
});
test("admin can review business offers and record why an offer was hidden",async({page})=>{
  const writes=await fixture(page,"verification");await page.getByRole("button",{name:"Business offers",exact:true}).click();
  await page.getByRole("button",{name:"Review offer"}).click();await page.getByRole("textbox",{name:"Review reason",exact:true}).fill("Misleading price conditions require correction");await page.getByRole("button",{name:"Hide offer",exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.hidden).toBe(true);
});
test("support inbox resolves booking disputes",async({page})=>{
  const writes=await fixture(page,"support");await page.getByRole("textbox",{name:"Support resolution",exact:true}).fill("Customer and business agreed to reschedule");await page.getByRole("button",{name:"Resolve dispute"}).click();
  await expect(page.getByText("No open booking disputes.")).toBeVisible();expect(writes[0].path).toContain("/support-inbox/booking1/resolve");
});
test("Business owner can find licence submission and booking dispute controls on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});await fixture(page,"owner");await expect(page.getByRole("heading",{name:"Business verification",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Submit for review"})).toBeDisabled();await page.getByRole("button",{name:"Report booking dispute"}).click();await expect(page.getByRole("button",{name:"Send to support"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:"tmp/business-owner-mobile.png",fullPage:true});
});
test("Users includes a Business profile filter sent to the server",async({page})=>{
  await fixture(page,"users");const request=page.waitForRequest(req=>req.url().includes("/admin/users?")&&req.url().includes("profileAccountType=business"));
  await page.getByRole("combobox",{name:"Filter users by profile type"}).selectOption("business");await request;await expect(page.getByRole("link",{name:"Local Studio",exact:true})).toBeVisible();
});
