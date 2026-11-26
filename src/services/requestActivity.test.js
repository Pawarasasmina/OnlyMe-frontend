import test from 'node:test';
import assert from 'node:assert/strict';
import { beginMonitoredRequest, endMonitoredRequest, pendingRequests } from './requestActivity.js';
test('screen timing waits for concurrent API work and balances failures/retries', () => {
  const first = {}, second = {};
  beginMonitoredRequest(first); beginMonitoredRequest(second);
  assert.equal(pendingRequests(), 2);
  endMonitoredRequest(first); endMonitoredRequest(first);
  assert.equal(pendingRequests(), 1);
  beginMonitoredRequest(first);
  assert.equal(pendingRequests(), 2);
  endMonitoredRequest(first); endMonitoredRequest(second);
  assert.equal(pendingRequests(), 0);
});
