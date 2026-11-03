import {test,expect} from '@playwright/test';
test('messaging audience cycles and saves inline without opening a dialog',async({page})=>{
  let privacy={allowDirectMessages:true,showOnlineStatus:false};
  const saves=[];
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(!path.startsWith('/api/')) return route.continue();
    if(path.endsWith('/privacy') && route.request().method()!=='GET') {
      const payload=route.request().postDataJSON();saves.push(payload);
      privacy={...payload.privacySettings,allowDirectMessages:payload.privacySettings.messageAudience!=='no_one'};
    }
    const data=path.endsWith('/privacy')?{privacySettings:privacy}:path.endsWith('/wallet')?{wallet:{balance:0}}:path.endsWith('/monetization')?{enabled:false}:{items:[]};
    return route.fulfill({contentType:'application/json',body:JSON.stringify({data})});
  });
  await page.goto('/tests/fixtures/ownership.html');
  const row=page.getByRole('button',{name:/Who can message me/});
  await expect(row).toContainText('Everyone');
  for(const [value,label] of [['following','People I follow'],['no_one','No one'],['everyone','Everyone']]) {
    await row.click();
    await expect(row).toContainText(label);
    await expect(row).toBeEnabled();
    expect(saves.at(-1).privacySettings.messageAudience).toBe(value);
    expect(saves.at(-1).privacySettings.showOnlineStatus).toBe(false);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
