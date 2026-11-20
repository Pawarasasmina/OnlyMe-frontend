import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IntlMessageFormat } from 'intl-messageformat';
const read = language => JSON.parse(readFileSync(new URL('./locales/'+language+'.json', import.meta.url), 'utf8'));
const keys = ["profile.sWorld_9663ba","profile.value0SWorld","system.ProfileContentGrid.645017bd05","creator.freeForever","creator.toSpotlight","creator.thisMonth","financial.premiumWorld","social.worldUnavailable","financial.unavailable","creator.addAVideoMaximum30Seconds","fan.awaitingCreatorReply","fan.youCanStillAnswer","fan.forwarded_aa6f80","context.requestTheCall","system.WorldReaderPage.0e3f2dec15","invitationMessage.linkValue0","financial.sayHiTo","orbit.newLights","publication.members","stories.opensIt","creator.replace","creator.generateFromTitle","fan.callConfirmed","social.featured","atseenMockData.foundOneThisWallWorks","admin.recentExposureMemory","social.reposted","profile.call","system.SeenFeedPage.8c6ae9a2fd","creator.upload_630cc6","fan.answerNewWindow","orbit.gotIt","fan.youNeed","social.paid","atseenMockData.sentYouASpotInDmCheckIt","fan.pay","CallContext.paidCallValue0","financial.premiumPlanet","admin.oldestSubmitted","wallPublishing.reviewSubmitted","wallPublishing.underReview","wallPublishing.notApproved","wallEdit.expired","wallFreshness.feedbackSent"];
const en = read('en');
for (const language of ['ar','ru','uk','es','pt','fr','de']) test('reviewed labels retain placeholders and render in '+language, () => {
 const catalog = read(language);
 assert.deepEqual(Object.keys(en).filter(key => !Object.hasOwn(catalog,key)), [], language+' missing keys');
 assert.deepEqual(Object.keys(catalog).filter(key => catalog[key].includes('\u2047')), [], language+' broken replacement characters');
 for (const key of keys) {
  const text = catalog[key];
  assert.ok(text && !text.includes('\u2047'), language+': '+key);
  const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(vars(text), vars(en[key]), key);
  const output = new IntlMessageFormat(text, language).format({value0:'Liam'});
  assert.ok(typeof output === 'string' && output.length > 0);
  if (vars(text).length) assert.ok(output.includes('Liam'), key);
 }
 assert.notEqual(catalog['creator.thisMonth'], en['creator.thisMonth']);
});
