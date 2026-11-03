import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/api/wallet',route=>route.fulfill({json:{data:{wallet:{balance:100}}}}));});
test('prototype gift preview updates progress without any payment request',async({page})=>{
 const paymentRequests=[];
 page.on('request',request=>{if(request.method()!=='GET' && request.url().includes('/api/')) paymentRequests.push(request.url());});
 await page.goto('/tests/fixtures/dream.html');
 await expect(page.getByText('Be the first to believe')).toBeVisible();
 await page.getByRole('button',{name:'Gift 0',exact:false}).click();
 await expect(page.getByRole('status')).toBeVisible();
 await expect(page.getByText(/5 \/ 1,500/)).toBeVisible();
 await page.getByRole('button',{name:'Gift 1',exact:false}).first().click();
 await expect(page.getByText(/10 \/ 1,500/)).toBeVisible();
 await expect(page.getByText(/1 in this story/)).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 expect(paymentRequests).toEqual([]);
});
test('preview contributions survive a reload',async({page})=>{
 await page.goto('/tests/fixtures/dream.html');
 await page.getByRole('button',{name:'Gift 0',exact:false}).click();
 await expect(page.getByText(/5 \/ 1,500/)).toBeVisible();
 await page.reload();
 await expect(page.getByText(/5 \/ 1,500/)).toBeVisible();
});
test('insufficient balance shows a recharge message without confirmation',async({page})=>{
 await page.route('**/api/wallet',route=>route.fulfill({json:{data:{wallet:{balance:0}}}}));
 await page.goto('/tests/fixtures/dream.html');
 await page.getByRole('button',{name:'Gift 0',exact:false}).click();
 await expect(page.getByText('Not enough coins. Top up your wallet to send this gift.')).toBeVisible();
 await expect(page.getByRole('link',{name:'Recharge'})).toBeVisible();
 await expect(page.getByRole('button',{name:/^Send gift/})).toHaveCount(0);
});
test('near the goal each gift reduces the amount left like the prototype',async({page})=>{
 await page.route('**/api/wallet',route=>route.fulfill({json:{data:{wallet:{balance:2000}}}}));
 await page.addInitScript(()=>localStorage.setItem('onlyme-dream-demo-v1:demo-user',JSON.stringify({spent:1125,dreams:{dream:{coins:1125,gifts:[],privateSupport:false}}})));
 await page.goto('/tests/fixtures/dream.html');
 await expect(page.getByText('375 left — your gift can close it')).toBeVisible();
 await page.getByRole('button',{name:'Gift 0',exact:false}).click();
 await expect(page.getByText('370 left — your gift can close it')).toBeVisible();
 await page.getByRole('button',{name:'Gift 0',exact:false}).click();
 await expect(page.getByText('365 left — your gift can close it')).toBeVisible();
});
test('58 percent collected displays 630 left instead of a percentage',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('onlyme-dream-demo-v1:demo-user',JSON.stringify({spent:870,dreams:{dream:{coins:870,gifts:[],privateSupport:false}}})));
 await page.goto('/tests/fixtures/dream.html');
 await expect(page.getByText('630 left — your gift can close it')).toBeVisible();
 await expect(page.getByText(/58%/)).toHaveCount(0);
});
test('profile card reads the same saved progress as the gift page',async({page})=>{
 await page.route('**/api/dreams/creator/arjun',route=>route.fulfill({json:{data:{dream:{id:'dream',title:'Field guide',status:'ACTIVE',receivedStars:0,goalStars:1500,supporterCount:1,supporters:[]},gifts:[]}}}));
 await page.addInitScript(()=>localStorage.setItem('onlyme-dream-demo-v1:demo-user',JSON.stringify({spent:1210,dreams:{dream:{coins:1210,gifts:[],privateSupport:false}}})));
 await page.goto('/tests/fixtures/dream.html?profile=1');
 await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','81');
 await expect(page.locator('.dream-compact-title')).toContainText('81%');
 await expect(page.locator('.dream-compact-supporters')).toContainText('2 in this story');
});
test('Dream footer opens the share sheet with its preview and recipient search',async({page})=>{
 await page.route('**/api/messages/share/recipients*',route=>route.fulfill({json:{data:{people:[]}}}));
 await page.goto('/tests/fixtures/dream.html');
 await page.locator('.dream-support-share-footer button').click();
 await expect(page.locator('.share-sheet-overlay')).toBeVisible();
 await expect(page.locator('.share-chat-card')).toContainText('Field guide');
 await expect(page.locator('.share-sheet-overlay input').first()).toBeVisible();
 await expect(page.locator('.dream-support-sheet .share-sheet-overlay')).toHaveCount(0);
 const overlayBounds=await page.locator('.share-sheet-overlay').boundingBox();
 const centerBounds=await page.locator('.social-center-scroll').boundingBox();
 expect(Math.abs(overlayBounds.x-centerBounds.x)).toBeLessThan(2);
 expect(Math.abs(overlayBounds.width-centerBounds.width)).toBeLessThan(2);
 await expect(page.locator('.share-chat-avatar')).toBeHidden();
 const extraSpace = await page.locator('.share-sheet-panel').evaluate(panel=>{
   panel.scrollTop=panel.scrollHeight;
   const last=panel.querySelector('.share-external-row').getBoundingClientRect();
   return panel.getBoundingClientRect().bottom-last.bottom;
 });
 expect(extraSpace).toBeLessThan(45);
});
test('Instagram opens the save-picture instructions and Done returns to the Dream',async({page})=>{
 await page.route('**/api/messages/share/recipients*',route=>route.fulfill({json:{data:{people:[]}}}));
 await page.goto('/tests/fixtures/dream.html');
 await page.locator('.dream-support-share-footer button').click();
 await page.getByRole('button',{name:'Instagram',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Press and hold to save the picture'})).toBeVisible();
 await expect(page.getByText('Then open Instagram and add it to your story')).toBeVisible();
 await expect(page.locator('.instagram-save-content > img')).toBeVisible();
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.locator('.instagram-save-overlay')).toHaveCount(0);
});
test('visitor menu stays in the center and reports or blocks through existing APIs',async({page})=>{
 await page.route('**/api/messages/blocks/recipient',route=>route.fulfill({json:{data:{}}}));
 await page.goto('/tests/fixtures/profile-menu.html');
 await expect(page.getByRole('button',{name:'Share profile'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Report',exact:true})).toBeVisible();
 const overlay=await page.locator('.is-visitor-menu').boundingBox();
 const center=await page.locator('.social-center-scroll').boundingBox();
 expect(Math.abs(overlay.x-center.x)).toBeLessThan(2);
 expect(Math.abs(overlay.width-center.width)).toBeLessThan(2);
 const blocked=page.waitForRequest(request=>request.url().endsWith('/messages/blocks/recipient') && request.method()==='PUT');
 await expect(page.getByRole('button',{name:/Block Arjun/})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Unfollow'})).toHaveCount(0);
 await page.getByRole('button',{name:/Block Arjun/}).first().click();
 await blocked;
 await expect(page.locator('.is-visitor-menu')).toHaveCount(0);
});
