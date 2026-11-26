import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetryClient } from './internalTelemetry.js';
test('internal client redacts error text and URL secrets; failed sends retry with the same event IDs', async () => {
  const bodies = []; let accepted = false;
  const client = createTelemetryClient({ surface: 'web', endpoint: 'http://local/api/monitoring/events', fetcher: async (_url, options) => { bodies.push(JSON.parse(options.body)); return new Response('', { status: accepted ? 202 : 503 }); } });
  client.reportError({ name: 'TypeError', stack: 'secret\n at app (http://host/app.js:4:2)' }, '/users/private?token=secret');
  await client.flush(); assert.equal(client.pending(), 1);
  accepted = true; await client.flush(); assert.equal(client.pending(), 0);
  assert.equal(bodies[0].events[0].eventId, bodies[1].events[0].eventId);
  assert.equal(JSON.stringify(bodies).includes('secret'), false);
});
test('telemetry queue is bounded and cannot interrupt the caller', async () => {
  const client = createTelemetryClient({ surface: 'ios', endpoint: 'http://local', fetcher: async () => { throw new Error('offline'); } });
  for (let i = 0; i < 150; i += 1) client.emit({ kind: 'screen', route: '/seen', durationMs: 500 });
  assert.equal(client.pending(), 100); await client.flush(); assert.equal(client.pending(), 100);
});
