import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, INTERVAL_MS, probe, checkTargets, uploadSamples, deliverNotifications } from './monitor.mjs';
const config = { targets: [{ target: 'web', url: 'https://web.test' }, { target: 'api', url: 'https://api.test/api/health/ready', api: true }], recipients: ['owner@example.test'], token: 'x'.repeat(32), ingestUrl: 'https://api.test/api/monitoring/watchdog', smtp: { host: 'localhost' }, from: 'alerts@example.test' };
test('one-minute checks work without any third-party credential', () => {
  assert.equal(INTERVAL_MS, 60000);
  const value = readConfig({ MONITOR_WEB_URL: 'http://localhost:5173', MONITOR_API_READY_URL: 'http://localhost:3104/api/health/ready' });
  assert.equal(value.smtp, null); assert.equal(value.token, '');
  assert.throws(() => readConfig({}), /required/);
});
test('HTTP 200 with failed readiness and network failures are unhealthy', async () => {
  assert.equal((await probe(config.targets[1], async () => new Response('{"success":false}'))).healthy, false);
  assert.equal((await probe(config.targets[0], async () => { throw new Error('offline'); })).healthy, false);
});
test('outages and recoveries are queued once, and samples survive API downtime', async () => {
  const state = {}; let healthy = false;
  const fetcher = async () => new Response(JSON.stringify({ success: healthy }), { status: healthy ? 200 : 503 });
  await checkTargets(config, state, fetcher); await checkTargets(config, state, fetcher);
  assert.equal(state.notifications.length, 2);
  await assert.rejects(uploadSamples(config, state, async () => new Response('', { status: 503 })));
  assert.equal(state.samples.length, 2);
  healthy = true; await checkTargets(config, state, fetcher);
  assert.equal(state.notifications.length, 4);
  await uploadSamples(config, state, async (_url, options) => { assert.equal(JSON.parse(options.body).samples.length, 3); return new Response('{}', { status: 202 }); });
  assert.equal(state.samples.length, 0);
});
test('SMTP rejection keeps each recipient notification queued for retry', async () => {
  const state = { notifications: [{ id: 'one', recipient: 'owner@example.test', subject: 'DOWN', text: 'details', attempts: 0, nextAttemptAt: 0 }] };
  await deliverNotifications(config, state, () => ({ sendMail: async () => ({ accepted: [], rejected: ['owner@example.test'] }) }));
  assert.equal(state.notifications.length, 1); assert.equal(state.notifications[0].attempts, 1);
  state.notifications[0].nextAttemptAt = 0;
  await deliverNotifications(config, state, () => ({ sendMail: async () => ({ accepted: ['owner@example.test'], rejected: [] }) }));
  assert.equal(state.notifications.length, 0);
});
test('checker supports Resend without SMTP and preserves rejected jobs', async () => {
  const state = { notifications: [{ id: 'stable-job', recipient: 'owner@example.test', subject: 'DOWN', text: 'details', attempts: 0, nextAttemptAt: 0 }] };
  const resend = { ...config, smtp: null, resendKey: 'mock-key' };
  await deliverNotifications(resend, state, undefined, async () => new Response('{}', { status: 403 }));
  assert.equal(state.notifications.length, 1);
  state.notifications[0].nextAttemptAt = 0;
  await deliverNotifications(resend, state, undefined, async (_url, options) => {
    assert.ok(options.headers['Idempotency-Key']);
    assert.deepEqual(JSON.parse(options.body).to, ['owner@example.test']);
    return new Response('{"id":"mock-email-id"}');
  });
  assert.equal(state.notifications.length, 0);
});
test('watchdog synchronizes database recipients and removes obsolete queued recipients', async () => {
  const state = { samples: [{ at: new Date().toISOString(), checks: [] }], notifications: [{ recipient: 'old@example.test' }, { recipient: 'main@example.test' }] };
  await uploadSamples(config, state, async () => new Response('{"recipients":["main@example.test","moderator@example.test"]}', { status: 202 }));
  assert.deepEqual(state.recipients, ['main@example.test', 'moderator@example.test']);
  assert.equal(state.recipientSource, 'database');
  assert.deepEqual(state.notifications, [{ recipient: 'main@example.test' }]);
});
