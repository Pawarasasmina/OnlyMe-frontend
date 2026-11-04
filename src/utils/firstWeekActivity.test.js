import test from 'node:test';
import assert from 'node:assert/strict';
import { firstWeekActivity, loadFirstWeekActivity } from './firstWeekActivity.js';

const joined = '2026-10-01T10:00:00Z';
test('uses actual first-week events, one per day, with no invented quiet days', () => {
  const items = [
    { id: 'late', title: 'Outside week', createdAt: '2026-10-08T10:00:00Z' },
    { id: 'second', title: 'Second event', createdAt: '2026-10-01T12:00:00Z' },
    { id: 'first', title: 'Real reply', createdAt: '2026-10-01T11:00:00Z' },
    { id: 'third', title: 'Real follow', createdAt: '2026-10-03T11:00:00Z' },
    { id: 'old', title: 'Before signup', createdAt: '2026-09-30T11:00:00Z' },
    { id: 'silent', type: 'profile_view', title: 'Silent view', createdAt: '2026-10-02T11:00:00Z' },
    { id: 'sent', direction: 'sent', title: 'Sent event', createdAt: '2026-10-04T11:00:00Z' },
  ];
  assert.deepEqual(firstWeekActivity(items, joined).map(item => [item.id,item.day]), [['first',1],['third',3]]);
  assert.deepEqual(firstWeekActivity(items, 'invalid'), []);
});
test('reads older API pages to find the first week for an established account', async () => {
  const pages=[];
  const result=await loadFirstWeekActivity(async ({page}) => {
    pages.push(page);
    return {data:{data:{items:page===1 ? [{title:'Recent',createdAt:'2026-11-01T12:00:00Z'}] : [{id:'real',title:'Real event',createdAt:'2026-10-02T12:00:00Z'}],pageInfo:{hasMore:page===1}}}};
  },joined);
  assert.deepEqual(pages,[1,2]);
  assert.equal(result[0].id,'real');
  assert.equal(result[0].day,2);
});
