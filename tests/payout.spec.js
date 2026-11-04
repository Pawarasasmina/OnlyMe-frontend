import {test,expect} from '@playwright/test';

async function fixture(page,{approved=true,available=184.2,fail=false}={}) {
  const calls=[];
  let paid=false;
  await page.route('**/api/wallet**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/withdraw')) {
      calls.push(route.request().postDataJSON());
      if(fail && calls.length===1) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Please retry this request.'})});
      paid=true;
      return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{withdrawal:{id:'requested',starsAmount:1842,usdAmount:184.2,status:'PENDING_ADMIN_PROCESSING',bankLast4:'5921'}}})});
    }
    const data=path.endsWith('/ledger')?{items:[]}:{wallet:{balance:paid?0:1842,availableIncomeUsd:paid?0:available,availableIncomeStars:paid?0:1842,pendingIncomeUsd:89,clearingDays:14,withdrawalMinimumUsd:50,starsPerUsd:10,topUpPacks:[],payouts:{bankReady:approved,bankName:'Real Bank',bankLast4:'5921',refundsDeductedUsd:12.5,automaticPayout:true,standard:{enabled:true,feeUsd:0},instant:{enabled:false}},automaticIncome:{items:[]}}};
    return route.fulfill({contentType:'application/json',body:JSON.stringify({data})});
  });
  await page.goto('/tests/fixtures/wallet.html');
  await page.getByRole('tab',{name:'Income',exact:true}).click();
  await page.getByRole('button',{name:'Withdraw',exact:true}).click();
  return calls;
}

test('withdraw opens overview, confirmation, and server-confirmed receipt',async({page})=>{
  const calls=await fixture(page);
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('Real Bank •• 5921')).toBeVisible();
  await expect(dialog).toContainText('$89.00');
  await page.screenshot({path:'tmp/payout-overview.png',fullPage:true});
  await dialog.getByRole('button',{name:/Withdraw now/}).click();
  await expect(dialog.getByText('Instant',{exact:true})).toBeVisible();
  await expect(dialog.locator('.payout-method.is-disabled')).toBeVisible();
  await page.screenshot({path:'tmp/payout-confirm.png',fullPage:true});
  await dialog.getByRole('button',{name:'Withdraw $184.20',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Payout requested'})).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0].method).toBe('standard');
  expect(calls[0].starsAmount).toBe(1842);
  await dialog.getByRole('button',{name:'Done',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.wallet-prototype-income > strong')).toHaveText('$0.00');
});

test('unapproved bank and below-minimum income cannot be withdrawn',async({page})=>{
  const calls=await fixture(page,{approved:false,available:20});
  await expect(page.getByRole('dialog').getByRole('button',{name:/Withdraw now/})).toBeDisabled();
  expect(calls).toHaveLength(0);
});

test('failed requests retain the idempotency key and show no false success',async({page})=>{
  const calls=await fixture(page,{fail:true});
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:/Withdraw now/}).click();
  await dialog.getByRole('button',{name:'Withdraw $184.20',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Please retry');
  await expect(dialog.getByText('Payout requested',{exact:true})).toHaveCount(0);
  await dialog.getByRole('button',{name:'Withdraw $184.20',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Payout requested'})).toBeVisible();
  expect(calls[0].idempotencyKey).toBe(calls[1].idempotencyKey);
});

test('holds and refunds matches the full scrollable rules layout and real clearing days',async({page})=>{
  await fixture(page);
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:/Holds & refunds/}).click();
  await expect(dialog.getByRole('heading',{name:'Holds & refunds',exact:true})).toBeVisible();
  await expect(dialog.locator('.holds-refund-rule')).toHaveCount(10);
  await expect(dialog.getByRole('heading',{name:'Withdrawable after 14 days'})).toBeVisible();
  await expect(dialog.locator('.holds-refund-rule svg')).toHaveCount(10);
  await page.screenshot({path:'tmp/holds-refunds-top.png'});
  await dialog.getByRole('heading',{name:'Fair play',exact:true}).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('heading',{name:'Fair play',exact:true})).toBeVisible();
  await page.screenshot({path:'tmp/holds-refunds-bottom.png'});
  const scrollable=await dialog.locator('.financial-center-sheet').evaluate(el=>el.scrollHeight>el.clientHeight);
  expect(scrollable).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
