# A15 internal monitoring

Monitoring now uses the application's API and MongoDB. Sentry SDKs, Sentry tokens,
third-party monitoring APIs have been removed. Optional email delivery can reuse the existing Resend integration.
No additional monitoring account or API key is required for the dashboard.

## Start and check

1. Restart the backend and frontend. The API starts its collection/report workers
   after MongoDB connects, independently of the existing maintenance-worker flag.
2. Sign in as **Main Admin** and open **Administration → Monitoring**, or
   `/admin/monitoring`.
3. Browse several application screens and wait around 10 seconds, then refresh the
   monitoring dashboard. Coverage timestamps and screen timings should appear.
4. On staging, trigger a controlled JavaScript/React error or an API 500 response.
   Check Recent errors and Alert notifications. Do not crash a live user session.
5. The dashboard stores weekly reports automatically, even without email settings.
   Reports are due Monday at **09:00 Asia/Colombo**, covering the preceding seven
   days. First start and restarts catch up the most recent completed weekly period.

Only Main Admin can read operational error logs, recipients and reports. Client
telemetry accepts anonymous login/startup errors but is rate limited, size limited,
validated and marked as **unverified client diagnostics**. Client submissions
cannot claim to be API observations or independent watchdog results.

## What is collected

- Web: React boundary errors, unhandled JavaScript errors/rejections, API request
  statuses/durations, and route load durations.
- API: observed request statuses/durations, handled 5xx exceptions, worker failures,
  and a redacted process-fatal record in local supervisor logs.

Mobile monitoring is intentionally deferred. Independent uptime is also shown as
**not configured** until the optional checker below is deployed outside the API.

No raw error messages, legal names, document contents, payment data, message text,
request bodies, headers, cookies or query parameters are intentionally collected.
Routes replace identifiers with `:id`. Source frames retain only a file basename,
line and column. Production bundles need matching locally retained build artifacts
for detailed source debugging; this system does not upload source maps anywhere.

Screen loads end after tracked API requests/React Query settle plus a 200 ms web
render grace. The 30-second timeout is included and flagged.
Median/p95 figures are **histogram upper bounds**, clearly labelled `≤` in the
UI, rather than exact samples. API failure rates use server-observed completed
requests (5xx); client request failure rates also include network failures. Missing
coverage is shown as missing data, not zero errors. Timing data identifies slow
screens; it does not automatically fix the reported 4–7-second delay.

A fatal JavaScript event is buffered/persisted best effort; sudden browser or OS
termination can prevent JavaScript from flushing. Server fatal events are written
to supervisor logs because a dying process cannot guarantee a database write.

## Storage and retries

`MonitoringEvent` stores a strict allowlist and has 30-day TTL retention.
`MonitoringAlert` groups errors. `MonitoringReport` stores weekly summaries.
`MonitoringNotification` is a per-recipient durable SMTP outbox with retries,
leases and 30-day retention. Recipients come from active Main Admin and Moderator accounts in MongoDB. There is no personal-address fallback or recipient ENV override.

Clients buffer at most 100 events and batch at most 20 per five-second flush.
Failed sends retry with the same event IDs. The API buffers at most 2,000 events,
flushes at most 200 every five seconds, and retries database failures. Event IDs
make persistence retries idempotent. API-process dropped-event counts are visible
in the dashboard; collection is best effort under overload or process death.
Error email jobs are capped at one per app surface, hour and recipient; additional errors remain visible in the dashboard. Weekly jobs
are deduplicated per reporting period and recipient. SMTP acceptance is shown
as acceptance, not proof that an inbox received an email.

## Optional email delivery (existing Resend or SMTP)

The backend automatically uses its existing `RESEND_API_KEY` and `EMAIL_FROM` settings when present. No SMTP settings are required in that case. The same durable outbox, recipient limits and retry behavior apply. A successful provider acknowledgement is not proof of inbox delivery. No credentials are returned to the browser. If Resend is not configured, use an existing SMTP mailbox or your own mail relay. Configure only the monitoring
variables in `OnlyMe-backend/.env.monitoring.example`:

```dotenv
MONITOR_FROM_EMAIL=alerts@your-domain.com
MONITOR_SMTP_HOST=your-mail-server
MONITOR_SMTP_PORT=587
MONITOR_SMTP_SECURE=false
MONITOR_SMTP_USER=your-mailbox-user
MONITOR_SMTP_PASSWORD=your-mailbox-password-or-app-password
```

These are examples; supply your actual mail-server settings. Port 587 uses
STARTTLS; set `MONITOR_SMTP_SECURE=true` for implicit TLS such as port 465.
Store passwords only in server secrets/environment, never in browser
variables or source control. Leave SMTP unset to keep dashboard-only alerts and
weekly reports; notification jobs remain queued. Existing unrelated application
email features retain their existing delivery setup.

## Independent uptime checker

A stopped API cannot monitor its own outage. Run `ops/monitor.mjs` on another
machine that remains online, ideally on a different network/provider. No
third-party uptime API is involved. If this separate machine is not available,
**independent downtime detection remains unavailable**; the dashboard says so.

1. Copy `ops/monitor.env.example` to the gitignored `ops/monitor.env`.
2. Set canonical website and API `/api/health/ready` URLs. HTTPS is required except
   localhost HTTP for development. Health readiness includes database connectivity
   and draining state; a process-only liveness URL is insufficient.
3. Generate a random secret at least 32 characters long, for example:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Set it as `MONITOR_WATCHDOG_TOKEN` on both the API and the separate checker.
   This authenticates checker uploads; do not put it in the web environment.
4. Set a durable, writable `MONITOR_STATE_FILE` and optional SMTP values on the
   checker. Local notifications and samples are retained without SMTP; email is
   necessary to notify someone who is not watching the dashboard/local logs.
5. Check settings without network requests or email:

   ```sh
   node --env-file=ops/monitor.env ops/monitor.mjs --check-config
   ```

6. Run it as a supervised service, or on the separate host with Docker:

   ```sh
   docker build -f ops/Dockerfile -t atseen-monitor .
   docker run -d --name atseen-monitor --restart unless-stopped \
     --env-file ops/monitor.env -v /srv/atseen-monitor:/data atseen-monitor
   ```

   The persistent volume must be writable by uid 1000. Run one instance per state
   file. The checker needs its own email settings to notify during an API outage. Set `RESEND_API_KEY` and `EMAIL_FROM` on that separate host to use Resend without SMTP, or configure SMTP there.

Web/API probes run every 60 seconds with 10-second timeouts, independently of SMTP.
The checker persists results before trying the API. On API failure it retains
samples locally and uploads them after recovery, preserving observation times.
Outage/recovery transitions are logged and queued once per recipient. Rejected
SMTP deliveries retry with backoff. A heartbeat older than 150 seconds is labelled
stale/unverified, not healthy. The local buffer holds up to seven days of samples
and 1,000 queued emails; discarded-overflow counts remain in the state file.
Use your host's local service/supervisor alerts to detect checker failure itself.

## Verification

- Compare API failure counts with a controlled staging 200 and 500 request.
- Confirm URL query secrets and error-message text are absent from stored events.
- Use controlled 1-second and 6-second screen loads to check timing buckets.
- Verify a weekly report survives process restart and repeated generation does
  not create duplicate reports or recipient jobs.
- Stop only a staging API: confirm the independent checker logs an outage and,
  if SMTP is configured, the team and owner receive email. Restore it and verify
  recovery, uploaded historical samples, and a fresh watchdog heartbeat.
- Confirm each actual email inbox receives the message; SMTP acceptance alone
  cannot prove inbox delivery.

Automated checks include an **isolated temporary MongoDB** integration test, which
never connects to the application's database or sends email:

```sh
node --test ops/monitor.test.mjs shared/internalTelemetry.test.js shared/monitoringPrivacy.test.js src/services/requestActivity.test.js
cd OnlyMe-backend
node --test src/controllers/monitoringController.test.js src/services/internalMonitoring.integration.test.js
```
### Role-based recipients
Recipients follow the email addresses stored on the staff accounts in the Users collection. Admin team & access controls staff role/status; changing a stored staff email through an authorized account update also changes its monitoring destination. The monitoring dashboard lists the current database-derived recipients. Backend delivery rechecks eligibility and cancels queued jobs for addresses that are no longer eligible. The independent checker synchronizes and caches the database list through its authenticated uploads; during API downtime it uses the last synchronized list. A new checker must successfully synchronize once before it knows where to send outage emails. Active read-only/test staff accounts are included when their role is Main Admin or Moderator.
