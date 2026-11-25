import {test,expect} from "@playwright/test";
test("view-once report is preserved before the client consumes the message",async({page})=>{
  const user={id:"507f1f77bcf86cd799439011",name:"Evidence tester",username:"evidence",role:"fan",onboarding:{status:"completed"}};
  const other="507f1f77bcf86cd799439012",id="507f1f77bcf86cd799439013",writes=[];
  const participant={id:other,name:"Sender",displayName:"Sender",username:"sender",role:"fan"};
  const message={id,senderId:other,recipientId:user.id,body:"Private disappearing text",mediaType:"text",disappearAfterSeconds:0,createdAt:new Date().toISOString(),reactions:[]};
  await page.addInitScript(user=>{localStorage.setItem("onlyme_access_token","evidence-fixture");localStorage.setItem("onlyme_cached_user",JSON.stringify(user));},user);
  await page.route("**/api/**",async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;if(!path.startsWith("/api/"))return route.continue();
    if(req.method()!=="GET")writes.push(path);
    let data={items:[],groups:[],windows:[],people:[],calls:[]};
    if(path.endsWith("/auth/me"))data={user};
    if(path.endsWith("/profiles/me"))data={user,profile:{}};
    if(path==="/api/messages/conversations")data={conversations:[{id:other,type:"direct",status:"ACTIVE",participant}]};
    if(path===`/api/messages/conversations/${other}`)data={participant,messages:[message],conversation:{status:"ACTIVE"},blockStatus:{},pageInfo:{hasMore:false}};
    if(path===`/api/messages/${id}/open`)data={message:{...message,openedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()}};
    if(path===`/api/messages/${id}/report`){expect(JSON.parse(req.postData()).reason).toBe("OTHER");data={reportId:"frozen-report",status:"RECEIVED"};}
    await route.fulfill({json:{success:true,data}});
  });
  await page.goto(`/messages?with=${other}`);
  await page.getByRole("button",{name:/View once/}).click();
  await page.getByRole("button",{name:"Report this disappearing content",exact:true}).click();
  await expect.poll(()=>writes.includes(`/api/messages/${id}/consume`)).toBe(true);
  expect(writes.indexOf(`/api/messages/${id}/report`)).toBeLessThan(writes.indexOf(`/api/messages/${id}/consume`));
  await expect(page.getByRole("heading",{name:"Thank you",exact:true})).toBeVisible();
});
test("frozen photo, voice and video evidence render and play on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/tests/fixtures/evidence.html");
  await expect(page.getByText(/Frozen evidence:/)).toBeVisible();
  const photo=page.getByAltText("Reported photo evidence");await expect(photo).toBeVisible();
  expect(await photo.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
  for(const label of ["Reported voice note","Reported video circle"]){
    const media=page.getByLabel(label);await expect(media).toHaveAttribute("controls","");
    await expect.poll(()=>media.evaluate(el=>el.readyState)).toBeGreaterThan(0);
    await media.evaluate(async el=>{await el.play();});
    await expect.poll(()=>media.evaluate(el=>el.currentTime)).toBeGreaterThan(0);
    await media.evaluate(el=>el.pause());
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"tmp/message-evidence-mobile.png",fullPage:true});
});
test("legacy evidence is labelled accurately and media errors explain retry",async({page})=>{
  await page.goto("/tests/fixtures/evidence.html?legacy");
  await expect(page.getByText(/Legacy report:/)).toBeVisible();
  await page.getByLabel("Reported voice note").evaluate(el=>el.dispatchEvent(new Event("error")));
  await expect(page.getByRole("status").filter({hasText:"Voice note"})).toContainText("Voice note could not be loaded");
});
