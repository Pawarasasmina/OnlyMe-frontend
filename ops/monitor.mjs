import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
export const INTERVAL_MS = 60000;
export function readConfig(env) {
  for (const key of ['MONITOR_WEB_URL', 'MONITOR_API_READY_URL']) {
    if (!env[key]) throw new Error(`${key} is required`);
    const url = new URL(env[key]);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) throw new Error(`${key} must be HTTPS (localhost HTTP is allowed for testing), without credentials or query parameters`);
  }
  if (!env.MONITOR_API_READY_URL.endsWith('/health/ready')) throw new Error('Use the API /health/ready URL');
  if (env.MONITOR_WATCHDOG_TOKEN && env.MONITOR_WATCHDOG_TOKEN.length < 32) throw new Error('MONITOR_WATCHDOG_TOKEN must contain at least 32 characters');
  return { resendKey: env.RESEND_API_KEY && (env.EMAIL_FROM || env.MONITOR_FROM_EMAIL) ? env.RESEND_API_KEY : null, targets: [{ target: 'web', url: env.MONITOR_WEB_URL }, { target: 'api', url: env.MONITOR_API_READY_URL, api: true }], ingestUrl: env.MONITOR_API_READY_URL.replace(/\/health\/ready$/, '/monitoring/watchdog'), token: env.MONITOR_WATCHDOG_TOKEN || '', stateFile: env.MONITOR_STATE_FILE || '/data/monitor-state.json', smtp: env.MONITOR_SMTP_HOST && env.MONITOR_FROM_EMAIL ? { host: env.MONITOR_SMTP_HOST, port: Number(env.MONITOR_SMTP_PORT || 587), secure: env.MONITOR_SMTP_SECURE === 'true', requireTLS: env.MONITOR_SMTP_SECURE !== 'true', ...(env.MONITOR_SMTP_USER ? { auth: { user: env.MONITOR_SMTP_USER, pass: env.MONITOR_SMTP_PASSWORD } } : {}), connectionTimeout: 5000, socketTimeout: 10000 } : null, from: env.EMAIL_FROM || env.MONITOR_FROM_EMAIL, recipients: [] };
}
export async function probe(target, fetcher = fetch) {
  const started = Date.now();
  try {
    const response = await fetcher(target.url, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    let healthy = response.status === 200;
    if (target.api && healthy) healthy = (await response.json()).success === true;
    await response.body?.cancel().catch(() => {});
    return { target: target.target, healthy, durationMs: Date.now() - started };
  } catch { return { target: target.target, healthy: false, durationMs: Date.now() - started }; }
}
export async function checkTargets(config, state, fetcher = fetch) {
  state.previous ||= {}; state.samples ||= []; state.notifications ||= [];
  const checks = await Promise.all(config.targets.map((target) => probe(target, fetcher)));
  const at = new Date().toISOString();
  for (const check of checks) {
    const previous = state.previous[check.target];
    if ((!check.healthy && previous !== false) || (check.healthy && previous === false)) {
      const subject = `[ATSEEN] ${check.target} ${check.healthy ? 'recovered' : 'DOWN'}`;
      console.info(JSON.stringify({ event: 'uptime_alert', subject, at }));
      for (const recipient of state.recipients || config.recipients) state.notifications.push({ id: `${at}:${check.target}:${recipient}`, recipient, subject, text: `${subject}\nObserved: ${at}\nResponse time: ${check.durationMs} ms\nIndependent checker; no third-party monitoring API.`, attempts: 0, nextAttemptAt: 0 });
    }
    state.previous[check.target] = check.healthy;
  }
  state.samples.push({ at, checks });
  if (state.samples.length > 10080) { state.droppedSamples = (state.droppedSamples || 0) + state.samples.length - 10080; state.samples = state.samples.slice(-10080); }
  if (state.notifications.length > 1000) { state.droppedNotifications = (state.droppedNotifications || 0) + state.notifications.length - 1000; state.notifications = state.notifications.slice(-1000); }
}
export async function uploadSamples(config, state, fetcher = fetch) {
  if (!config.token || !state.samples?.length) return;
  const samples = state.samples.slice(0, 20);
  const response = await fetcher(config.ingestUrl, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ samples }) });
  if (!response.ok) throw new Error('Internal monitoring API did not accept uptime samples');
  const result = await response.json().catch(() => ({}));
  if (Array.isArray(result.recipients)) {
    state.recipientSource = "database";
    state.recipients = [...new Set(result.recipients.filter((value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))];
    state.notifications = (state.notifications || []).filter((job) => state.recipients.includes(job.recipient));
  }
  state.samples.splice(0, samples.length);
}
export async function deliverNotifications(config, state, createTransport, fetcher = fetch) {
  if ((!config.resendKey && !config.smtp) || !state.notifications?.length) return;
  const transport = config.resendKey ? null : createTransport ? createTransport(config.smtp) : (await import('nodemailer')).default.createTransport(config.smtp);
  try {
    for (const notification of state.notifications.filter((item) => item.nextAttemptAt <= Date.now()).slice(0, 3)) {
      try {
        if (config.resendKey) {
          const response = await fetcher('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `monitoring-${createHash('sha256').update(notification.id).digest('hex')}` }, body: JSON.stringify({ from: config.from, to: [notification.recipient], subject: notification.subject, text: notification.text }) });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.id) throw new Error('Resend did not acknowledge notification');
          state.notifications = state.notifications.filter((item) => item.id !== notification.id);
          continue;
        }
        const result = await transport.sendMail({ from: config.from, to: notification.recipient, subject: notification.subject, text: notification.text, disableFileAccess: true, disableUrlAccess: true });
        if (!result.accepted?.some((value) => String(value).toLowerCase() === notification.recipient.toLowerCase()) || result.rejected?.length) throw new Error('SMTP recipient not accepted');
        state.notifications = state.notifications.filter((item) => item.id !== notification.id);
      } catch { notification.attempts += 1; notification.nextAttemptAt = Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(notification.attempts, 6)); }
    }
  } finally { transport?.close?.(); }
}
export async function run(config) {
  let state = {};
  try { state = JSON.parse(await readFile(config.stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Restore the unreadable monitor state file before restarting'); }
  if (state.recipientSource !== 'database') { state.recipients = []; state.notifications = []; }
  let saving = Promise.resolve();
  const save = () => { saving = saving.then(async () => { await mkdir(dirname(config.stateFile), { recursive: true }); await writeFile(`${config.stateFile}.tmp`, JSON.stringify(state), { mode: 0o600 }); await rename(`${config.stateFile}.tmp`, config.stateFile); }); return saving; };
  const tick = async () => {
    await checkTargets(config, state); await save();
    try { await uploadSamples(config, state); } catch { console.error('API unreachable or watchdog token invalid; uptime samples retained locally'); }
    await save();
  };
  let mailing = false;
  const mailTick = async () => { if (mailing) return; mailing = true; try { await deliverNotifications(config, state); await save(); } catch { console.error('Email notification worker failed; queued notifications will retry'); } finally { mailing = false; } };
  await tick(); void mailTick();
  const timer = setInterval(() => { void tick().catch(() => { console.error('Monitor cycle failed'); process.exit(1); }); }, INTERVAL_MS);
  const mailTimer = setInterval(() => { void mailTick(); }, 30000);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearInterval(timer); clearInterval(mailTimer); void save().then(() => process.exit(0)); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { const config = readConfig(process.env); if (process.argv.includes('--check-config')) console.log(JSON.stringify({ valid: true, dashboardReporting: Boolean(config.token), emailProvider: config.resendKey ? "resend" : config.smtp ? "smtp" : null, intervalSeconds: 60 })); else await run(config); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
