import {test,expect} from '@playwright/test';

test('wallet uses API packs and conversion, saves the limit, and separates withdrawable income',async({page})=>{
  let limit=0;
  await page.route('**/api/wallet**',async route=>{
    const url=new URL(route.request().url());
    let data;
    if(url.pathname.endsWith('/spending-limit')) {
      limit=route.request().postDataJSON().monthlySpendingLimitUsd;
      data={monthlySpendingLimitUsd:limit};
    } else if(url.pathname.endsWith('/ledger')) data={items:[{id:'earning',event:'CHAT_GIFT_EARNING',starsChange:125,usdAmount:5,counterparty:{name:'Real Supporter'},createdAt:'2026-11-01T12:00:00Z'}]};
    else data={wallet:{balance:250,bonusBalance:5,starsPerUsd:25,availableIncomeUsd:12,pendingIncomeUsd:8,incomeUsd:20,clearingDays:14,withdrawalMinimumUsd:50,spentThisMonthStars:125,spentThisMonthUsd:5,monthlySpendingLimitUsd:limit,spendingLimitOptionsUsd:[0,25,50],topUpPacks:[{usd:12.49,stars:312,bonusStars:8}],automaticIncome:{items:[]}}};
    await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data})});
  });
  await page.goto('/tests/fixtures/wallet.html');
  await expect(page.locator('.wallet-prototype-balance > span')).toHaveText('= $10.00');
  await expect(page.locator('.wallet-prototype-packs button')).toHaveCount(1);
  await expect(page.locator('.wallet-prototype-packs')).toContainText('320');
  await expect(page.locator('.wallet-prototype-packs')).toContainText('$12.49');
  await page.screenshot({path:'tmp/wallet-coins-review.png',fullPage:true});
  await page.locator('.wallet-month-spending button').click();
  await page.getByRole('button',{name:'$25.00',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(limit).toBe(25);
  await expect(page.locator('.wallet-month-spending button')).toContainText('$25.00');
  await page.getByRole('tab',{name:'Income',exact:true}).click();
  await expect(page.locator('.wallet-prototype-income > strong')).toHaveText('$12.00');
  await expect(page.locator('.wallet-prototype-activity')).toContainText(/\+\s*\$5\.00/);
  await page.screenshot({path:'tmp/wallet-income-review.png',fullPage:true});
});
