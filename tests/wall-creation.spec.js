import { Buffer } from "node:buffer";
import { test, expect } from "@playwright/test";
const user={id:"507f1f77bcf86cd799439011",name:"Wall Fixture",username:"wallfixture",role:"fan",city:"Fixture City",onboarding:{status:"completed"}};
async function fixture(page) {
  const state={posts:[],failNext:false,keys:[],payloads:[],voiceMedia:null};
  await page.addInitScript((value)=>{localStorage.setItem("onlyme_access_token","wall_fixture_token");localStorage.setItem("onlyme_cached_user",JSON.stringify(value));},user);
  await page.route("**/api/**",async route=>{
    const url=new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data={items:[],pagination:{page:1,pages:1,total:0},warnings:[],count:0,unreadCount:0};
    if(url.pathname.endsWith("/posts") && route.request().method()==="POST") {
      state.keys.push(route.request().headers()["idempotency-key"]);
      const body=route.request().postData() || "";
      state.payloads.push(body);
      if(state.failNext){state.failNext=false;return route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({success:false,message:"Fixture publication failed"})});}
      const post={id:"507f1f77bcf86cd799439012",author:user,text:"Dinner at a restaurant",postType:"Buy & Sell",topic:"Food",rightNow:true,canResolve:true,isOwner:true,location:"Test City, Test Country",comments:[],media:[],publishedAt:new Date().toISOString()};
      if(state.voiceMedia){post.media=[state.voiceMedia];post.text="";post.postType="Need Help";}
      state.posts=[{id:"507f1f77bcf86cd799439099",author:user,text:"Older recommended post",postType:"Recommendation",comments:[],media:[],publishedAt:"2026-10-01T00:00:00Z"},post];data={post};
    } else if(url.pathname.endsWith("/posts")) data={items:state.posts,pagination:{page:1,pages:1,total:state.posts.length}};
    if(url.pathname.endsWith("/reaction") && route.request().method()==="PUT") { const post=state.posts[0]; const value=route.request().postDataJSON().reaction; post.viewerReaction=value; post.reactions=[{reaction:"like",count:1},{reaction:"love",count:1},...(value?[{reaction:value,count:1}]:[])]; data={post}; }
    if(url.pathname === "/api/search") data={items: url.searchParams.get("q") === "plumber" ? [{id:"507f1f77bcf86cd799439012",type:"post",route:"/posts/507f1f77bcf86cd799439012",description:"Need a plumber tonight",category:"Need help",createdAt:new Date().toISOString(),metadata:{author:user,commentCount:2}}] : [],nextCursor:null};
    if(url.pathname.endsWith("/voice/transcribe")) data={transcript:"Fixture recording",language:"en",transcriptLanguage:"en",confidence:1};
    if(url.pathname.endsWith("/voice/translation-languages")) data={languages:[{code:"ar-SA",name:"Arabic"},{code:"en-US",name:"English"}]};
    if(url.pathname.endsWith("/voice/translate")) data={translatedText:"Arabic fixture translation",detectedLanguage:"en-US",provider:"lara"};
    if(url.pathname.endsWith("/auth/me")) data={user};
    if(url.pathname.endsWith("/profile/me")||url.pathname.endsWith("/profiles/me")) data={user,profile:{city:"Fixture City"}};
    if(url.pathname.endsWith("/posts/need-counts")) data={previews:{need_help:[{text:"A real nearby need",author:{_id:user.id,name:user.name}}]},counts:{right_now:1,need_help:2,looking_for:4,offering:2,buy_sell:2,question:3,recommendation:18,event:1},topicCounts:{meet_people:3,work:1,services:4,housing:1,places:6,food:5,travel:3,kids_family:0,community:12}};
    if(url.pathname.endsWith("/search/locations")) data={items:[{label:"Test City, Test Country",name:"Test City",code:"TC",subtitle:"Test Country"}]};
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,data})});
  });
  await page.goto("/wall");
  await page.getByRole("button",{name:"Create Wall note",exact:true}).click();
  await expect(page.getByRole("heading",{name:"What do you need today?"})).toBeVisible();
  return state;
}
for (const size of [{width:1440,height:1000},{width:393,height:852}]) {
 test(`categories, nested sheets, draft preservation and layout ${size.width}`,async({page},testInfo)=>{
  await page.setViewportSize(size);
  const state=await fixture(page);
  const labels=["Need help","Looking for","Offering","Buy & Sell","Question","Recommendation","Event"];
  for(const label of labels){
    await page.locator(".wall-need-card").filter({has:page.getByText(label,{exact:true})}).click();
    await expect(page.locator(".wall-create-header h1")).toHaveText(label);
    await page.getByRole("button",{name:"Back to needs",exact:true}).click();
  }
  await page.locator(".wall-need-card").filter({has:page.getByText("Buy & Sell",{exact:true})}).click();
  await page.getByRole("textbox",{name:"Note text"}).fill("A room for rent near the park");
  await expect(page.locator(".wall-compose-settings button").first()).toContainText("Housing");
  await page.locator(".wall-compose-settings button").first().click();
  await expect(page.getByRole("dialog",{name:"Choose topic"})).toBeVisible();
  await expect(page.locator(".wall-topic-grid button")).toHaveCount(9);
  await page.screenshot({path:testInfo.outputPath("topics.png")});
  await page.locator(".wall-topic-grid button").filter({hasText:"Meet people"}).click();
  await expect(page.getByText("Meet in public places",{exact:false})).toBeVisible();
  await page.getByRole("textbox",{name:"Note text"}).fill("Dinner at a restaurant");
  await expect(page.locator(".wall-compose-settings button").first()).toContainText("Meet people");
  await page.locator(".wall-compose-settings button").first().click();
  await page.getByRole("button",{name:/Auto.*from your text/}).click();
  await expect(page.locator(".wall-compose-settings button").first()).toContainText("Food");
  await page.locator(".wall-compose-settings button").nth(1).click();
  await expect(page.getByRole("dialog",{name:"Location",exact:true})).toBeVisible();
  await page.getByPlaceholder("Search a country or city").fill("Test");
  await page.getByRole("button",{name:/Test City.*Test Country/}).click();
  await expect(page.locator(".wall-compose-settings button").nth(1)).toContainText("Test City");
  await page.locator(".wall-compose-settings button").nth(2).click();
  await expect(page.locator(".wall-compose-settings button").nth(2)).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Back to needs",exact:true}).click();
  await page.getByRole("button",{name:"Close need picker"}).click();
  await page.getByRole("button",{name:"Create Wall note",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Note text"})).toHaveValue("Dinner at a restaurant");
  await expect(page.locator(".wall-create-header h1")).toHaveText("Buy & Sell");
  await page.locator(".wall-compose-settings button").first().click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog",{name:"Choose topic"})).toHaveCount(0);
  await expect(page.getByRole("textbox",{name:"Note text"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({path:testInfo.outputPath("composer.png")});
  const png=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=40;canvas.height=40;canvas.getContext("2d").fillRect(0,0,40,40);return canvas.toDataURL("image/png").split(",")[1];});
  await page.locator('input[type="file"]').setInputFiles([0,1,2,3].map(i=>({name:`fixture-${i}.png`,mimeType:"image/png",buffer:Buffer.from(png,"base64")})));
  for(let i=0;i<3;i++) await page.getByRole("button",{name:"Save image",exact:true}).click();
  await expect(page.locator(".home-note-preview-grid img")).toHaveCount(3);
  await page.getByRole("button",{name:"Remove image",exact:true}).first().click();
  await expect(page.locator(".home-note-preview-grid img")).toHaveCount(2);
  state.failNext=true;
  await page.getByRole("button",{name:"Post",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Fixture publication failed");
  await expect(page.getByRole("textbox",{name:"Note text"})).toHaveValue("Dinner at a restaurant");
  await expect(page.locator(".home-note-preview-grid img")).toHaveCount(2);
  await page.getByRole("button",{name:"Post",exact:true}).click();
  await expect(page.locator(".wall-create-screen")).toHaveCount(0);
  expect(state.keys).toHaveLength(2);
  expect(state.keys[0]).toBeTruthy();
  expect(state.keys[1]).toBe(state.keys[0]);
  expect(state.payloads[1]).toContain("Buy & Sell");
  expect(state.payloads[1]).toContain("Food");
  await expect(page.locator(".home-feed-post").first()).toContainText("Dinner at a restaurant");
  await page.reload();
  await expect(page.locator(".home-feed-post").filter({hasText:"Dinner at a restaurant"})).toBeVisible();
 });
}
for(const width of [1440,393]) {
test(`prototype voice capture and published transcript ${width}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});
  const state=await fixture(page);
  await page.locator(".wall-need-card").filter({has:page.getByText("Need help",{exact:true})}).click();
  await page.getByRole("button",{name:"Record voice note",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Say what you see"})).toBeVisible();
  await expect(page.locator(".wall-voice-capture .sr-only")).toHaveText(/00:01 of 00:30/);
  await page.screenshot({path:testInfo.outputPath("voice-recording.png")});
  await page.getByRole("button",{name:"Stop",exact:true}).click();
  await expect(page.locator(".wall-composer-voice-chip")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Record voice note",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Post",exact:true})).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath("voice-attached.png")});
  await page.getByRole("button",{name:"Review voice text and translations"}).click();
  await expect(page.getByRole("heading",{name:"Review voice note"})).toBeVisible();
  await page.getByRole("button",{name:"Translate transcript",exact:true}).click();
  await expect(page.getByText("Arabic fixture translation",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Use Recording",exact:true}).click();
  // A small valid WAV fixture exercises actual browser playback without external storage.
  const wav=Buffer.alloc(44+32000);
  wav.write("RIFF",0);wav.writeUInt32LE(wav.length-8,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(32000,40);
  state.voiceMedia={id:"507f1f77bcf86cd799439013",type:"audio",url:`data:audio/wav;base64,${wav.toString("base64")}`,duration:1,waveform:[.1,.4,.8,.3,.7],transcript:"Fixture recording",transcriptLanguage:"en-US",translations:[]};
  await page.getByRole("button",{name:"Post",exact:true}).click();
  await expect(page.locator(".wall-voice-note")).toBeVisible();
  await expect(page.locator(".wall-transcript-text")).toHaveCount(0);
  await page.getByRole("button",{name:/Show text/}).click();
  await expect(page.locator(".wall-transcript-text")).toHaveText("Fixture recording");
  await page.getByRole("button",{name:"Play Voice note",exact:true}).click();
  await expect(page.getByRole("button",{name:"Pause Voice note",exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("voice-published.png")});
  await page.getByRole("button",{name:/Hide text/}).click();
  await expect(page.locator(".wall-transcript-text")).toHaveCount(0);
  await page.getByRole("button",{name:"Create Wall note",exact:true}).click();
  await page.locator(".wall-need-card").filter({has:page.getByText("Need help",{exact:true})}).click();
  await page.getByRole("textbox",{name:"Note text"}).fill("Keep this draft");
  await page.getByRole("button",{name:"Record voice note",exact:true}).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox",{name:"Note text"})).toHaveValue("Keep this draft");
});
}

/* retained removal coverage */
test("remove an attached recording",async({page})=>{
  await fixture(page);
  await page.locator(".wall-need-card").filter({has:page.getByText("Need help",{exact:true})}).click();
  await page.getByRole("button",{name:"Record voice note",exact:true}).click();
  await expect(page.locator(".wall-voice-capture .sr-only")).toHaveText(/00:01 of 00:30/);
  await page.getByRole("button",{name:"Stop",exact:true}).click();
  await expect(page.locator(".wall-composer-voice-chip")).toBeVisible();
  await page.getByRole("button",{name:"Remove voice note",exact:true}).click();
  await expect(page.getByRole("button",{name:"Post",exact:true})).toBeDisabled();
  await page.getByRole("textbox",{name:"Note text"}).fill("Keep this draft");
  await page.getByRole("button",{name:"Record voice note",exact:true}).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox",{name:"Note text"})).toHaveValue("Keep this draft");
});


test("microphone denial is actionable and does not discard typed text",async({page})=>{
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied for fixture","NotAllowedError");};});
  await fixture(page);
  await page.locator(".wall-need-card").filter({has:page.getByText("Need help",{exact:true})}).click();
  await page.getByRole("textbox",{name:"Note text"}).fill("Keep after permission denial");
  await page.getByRole("button",{name:"Record voice note",exact:true}).click();
  await expect(page.getByText(/Microphone access is blocked/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox",{name:"Note text"})).toHaveValue("Keep after permission denial");
});

for (const width of [1440, 393]) {
  test(`Wall board hierarchy, live needs and topic links ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await fixture(page);
    state.posts = [{ id: "507f1f77bcf86cd799439012", author: user, text: "A real nearby need", postType: "Need Help", topic: "Housing", canResolve: true, isOwner: true, rightNow: true, location: "Fixture City", comments: [], media: [], publishedAt: new Date().toISOString() }];
    await page.getByRole("button", { name: "Close need picker" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Wall", exact: true })).toBeVisible();
    await expect(page.locator(".wall-explore-card")).toHaveCount(9);
    await expect(page.locator(".wall-explore-card").filter({ hasText: "Need help" })).toContainText("A real nearby need");
    await expect(page.locator(".wall-explore-card").filter({ hasText: "Need help" })).toContainText("2 active");
    await expect(page.locator(".wall-topic-nav")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark as solved", exact: true })).toBeVisible();
    const capsule = page.locator(".home-reaction-capsule").first();
    expect(Math.round((await capsule.boundingBox()).width)).toBe(82);
    await capsule.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Explore all needs", exact: true }).click();
    await expect(page).toHaveURL(/wall\/explore/);
    await expect(page.getByRole("heading", { name: "What people post", exact: true })).toBeVisible();
    await expect(page.locator(".wall-explore-page-grid").first().locator(".wall-explore-card")).toHaveCount(8);
    await expect(page.locator(".wall-explore-page-grid.is-topics .wall-explore-card")).toHaveCount(9);
    await page.getByRole("button", { name: "Back to Wall", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mark as solved", exact: true })).toBeVisible();
    await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("wall-board-final.png"), animations: "disabled" });
    await page.getByRole("link", { name: "Filter Wall by topic: Housing", exact: true }).click();
    await expect(page).toHaveURL(/topic=housing/);
    await expect(page.locator(".wall-feed-heading")).toContainText("Housing");
    await page.locator(".wall-explore-card").filter({ hasText: "Meet people" }).click();
    await expect(page).toHaveURL(/topic=meet_people/);
    await expect(page.getByRole("button", { name: "Filters", exact: true })).toHaveCount(0);
    await expect(page.locator(".wall-filter-toolbar")).toHaveCount(0);
    await page.goto("/wall?type=right_now&topic=housing&scope=custom&location=Fixture+City&country=TC");
    await expect(page.locator(".wall-feed-heading h2")).toHaveText("Right now \u00b7 Housing");
    await expect(page.locator(".wall-explore-card").filter({ hasText: "Right now" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.locator(".wall-feed-heading h2")).toHaveText("For you");
    await expect(page.locator(".wall-feed-heading")).toContainText("Fixture City");
    await expect(page.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("location")).toBe("Fixture City");
    expect(new URL(page.url()).searchParams.get("country")).toBe("TC");
    expect(new URL(page.url()).searchParams.has("type")).toBe(false);
    expect(new URL(page.url()).searchParams.has("topic")).toBe(false);
    await expect(page.locator('.wall-explore-card[aria-pressed="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

for (const width of [1440,393]) {
 test(`Wall search prototype screen ${width}`, async ({page},testInfo) => {
  await page.setViewportSize({width,height:900});
  await fixture(page);
  await page.getByRole("button",{name:"Close need picker"}).click();
  await page.getByRole("link",{name:"Search Wall",exact:true}).click();
  await expect(page).toHaveURL(/wall\/search/);
  await expect(page.getByRole("textbox",{name:"Search the Wall",exact:true})).toBeFocused();
  await expect(page.getByRole("heading",{name:"People often search",exact:true})).toBeVisible();
  await expect(page.locator(".wall-search-suggestions button")).toHaveCount(6);
  expect(await page.locator(".wall-search-page").evaluate(el=>getComputedStyle(el).backgroundColor)).toBe("rgb(10, 12, 15)");
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath("wall-search.png")});
  await page.getByRole("button",{name:"plumber",exact:true}).click();
  await expect(page.locator(".wall-search-result")).toContainText("Need a plumber tonight");
  await expect(page.locator(".wall-search-result")).toContainText("2 replies");
  await page.getByRole("button",{name:"Clear search",exact:true}).click();
  await page.getByRole("textbox",{name:"Search the Wall",exact:true}).fill("No matches fixture");
  await expect(page.getByText("Nothing yet. Ask the Wall ? people nearby will answer.")).toBeVisible();
  await page.getByRole("link",{name:/Ask a question/}).click();
  await expect(page.getByRole("textbox",{name:"Note text",exact:true})).toHaveValue("No matches fixture");
  await expect(page.locator(".wall-create-header h1")).toHaveText("Question");
 });
}

for(const width of [1440,393]){
 test(`Wall quick reactions and inline comments ${width}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});
  const state=await fixture(page);
  const author={id:"507f1f77bcf86cd799439088",name:"Other Author",username:"other"};
  state.posts=[{id:"507f1f77bcf86cd799439012",author,text:"Looking for a tennis partner",postType:"Looking for",topic:"Meet people",comments:[1,2,3].map(i=>({id:`comment-${i}`,text:`Comment ${i}`,author})),commentCount:3,reactions:[{reaction:"like",count:1},{reaction:"love",count:1}],media:[],publishedAt:new Date().toISOString()}];
  await page.getByRole("button",{name:"Close need picker"}).click(); await page.reload();
  const post=page.locator(".home-feed-post").first();
  await expect(post.getByText("View all 3 comments",{exact:true})).toBeVisible();
  await expect(post.locator(".wall-comments-panel")).toHaveCount(0);
  await expect(post.locator(".wall-join-label")).toHaveText("I\u2019m in");
  await post.getByRole("button",{name:"React to post",exact:true}).click();
  const tray=page.getByRole("dialog",{name:"Choose a Wall note reaction",exact:true});
  await expect(tray).toBeVisible(); await expect(tray.locator("button")).toHaveCount(7);
  const bounds=await tray.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await expect(tray).toHaveCSS("position","fixed");
  await expect(page.locator(".home-prototype-main")).toHaveCSS("background-color","rgb(10, 12, 15)");
  await page.screenshot({path:testInfo.outputPath("wall-reaction-tray.png"),animations:"disabled"});
  await tray.getByRole("button",{name:"Send Fire reaction",exact:true}).click();
  await expect(post.locator(".home-reaction-capsule")).toHaveClass(/is-selected/);
  await post.getByRole("button",{name:"Change Fire reaction",exact:true}).click();
  await page.getByRole("button",{name:"More reactions",exact:true}).click();
  await expect(page.locator(".seen-reaction-sheet")).toBeVisible();
  await page.keyboard.press("Escape");
  await post.locator(".home-reaction-capsule").dispatchEvent("pointerdown");
  await expect(page.getByRole("dialog",{name:"Wall note reactions",exact:true})).toBeVisible();
  await post.locator(".home-reaction-capsule").dispatchEvent("pointerup");
  await page.keyboard.press("Escape");
  await post.getByText("View all 3 comments",{exact:true}).click();
  await expect(post.locator(".seen-comments-list article")).toHaveCount(3);
  await post.getByRole("button",{name:"Open comments",exact:true}).click();
  await expect(post.locator(".wall-comments-panel")).toHaveCount(0);
  await expect(post.getByText("View all 3 comments",{exact:true})).toBeVisible();
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath("wall-comment-actions.png")});
 });
}

for(const width of [1440,393]){
 test(`Wall purpose metadata and filter links ${width}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});const state=await fixture(page);
  state.posts=["Recommendation","Question","Event"].map((postType,index)=>({id:`507f1f77bcf86cd79943901${index+2}`,author:user,text:`Metadata fixture ${postType}`,postType,topic:"Food",rightNow:index===0,comments:[],media:[],location:"Dubai, UAE",createdAt:new Date(Date.now()-9*3600000).toISOString(),publishedAt:new Date(Date.now()-3*3600000).toISOString()}));
  await page.getByRole("button",{name:"Close need picker"}).click();
  await page.goto("/wall?scope=custom&location=Dubai&country=AE");
  const posts=page.locator(".home-feed-post");await expect(posts).toHaveCount(3);
  await expect(posts.nth(0).locator(".wall-note-meta")).toContainText("Recommendation");
  await expect(posts.nth(0).locator(".wall-now-badge")).toHaveCount(1);
  await expect(posts.nth(1).locator(".wall-now-badge")).toHaveCount(0);
  await expect(posts.nth(1).locator(".wall-note-age")).toContainText("3h");
  await expect(posts.nth(1).locator(".wall-note-place")).toHaveAttribute("title","Dubai, UAE");
  await expect(posts.nth(1).locator(".wall-note-place svg")).toHaveCount(1);
  await expect(posts.nth(1).locator(".wall-note-meta")).not.toContainText("Food");
  await expect(posts.nth(1).getByRole("link",{name:"Filter Wall by topic: Food",exact:true})).toBeVisible();
  await posts.nth(1).getByRole("link",{name:"Filter Wall by Question",exact:true}).click();
  expect(new URL(page.url()).searchParams.get("type")).toBe("question");
  expect(new URL(page.url()).searchParams.get("location")).toBe("Dubai");
  expect(new URL(page.url()).searchParams.get("country")).toBe("AE");
  await posts.nth(2).getByRole("link",{name:"Filter Wall by Event",exact:true}).click();
  expect(new URL(page.url()).searchParams.get("type")).toBe("event");
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath("wall-metadata.png")});
 });
}

for(const width of [1440,393]){
 test(`Full Explore needs prototype page ${width}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});await fixture(page);
  await page.getByRole("button",{name:"Close need picker"}).click();
  await page.goto("/wall?scope=custom&location=Dubai&country=AE");
  await page.getByRole("link",{name:"Explore all needs",exact:true}).click();
  await expect(page.locator(".wall-explore-page")).toHaveCSS("background-color","rgb(10, 12, 15)");
  await expect(page.locator(".wall-explore-page-grid").first().locator(".wall-explore-card-title strong")).toHaveText(["Right now","Need help","Looking for","Offering","Buy & Sell","Question","Recommendation","Event"]);
  const topics=page.locator(".wall-explore-page-grid.is-topics");
  await expect(topics.locator(".wall-explore-card-title strong")).toHaveText(["Meet people","Work","Services","Housing","Places","Food","Travel","Kids & Family","Community"]);
  await expect(page.locator(".wall-explore-page-grid").first().getByRole("button").filter({hasText:"Need help"})).toContainText("A real nearby need");
  await expect(page.locator(".center-refresh-overlay")).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath("explore-needs.png"),fullPage:true});
  await topics.getByRole("button").filter({has:page.getByText("Food",{exact:true})}).click();
  expect(new URL(page.url()).searchParams.get("topic")).toBe("food");
  expect(new URL(page.url()).searchParams.get("location")).toBe("Dubai");
  expect(new URL(page.url()).searchParams.get("country")).toBe("AE");
  await expect(page.locator(".wall-feed-heading h2")).toHaveText("Food");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 });
}
