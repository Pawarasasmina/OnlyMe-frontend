import { createTelemetryClient } from "../../shared/internalTelemetry.js";
const endpoint = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:3104/api").replace(/\/$/, "")}/monitoring/events`;
const telemetry = createTelemetryClient({ surface: "web", endpoint, release: import.meta.env.VITE_APP_RELEASE || "" });
let initialized = false;
const seen = new WeakSet();
export function reportError(error) {
  if (error && typeof error === "object") { if (seen.has(error)) return; seen.add(error); }
  telemetry.reportError(error, window.location.pathname);
  void telemetry.flush();
}
export function initializeMonitoring() {
  if (initialized) return; initialized = true;
  window.addEventListener("error", (event) => { if (event.error) reportError(event.error); });
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
  window.setInterval(() => { void telemetry.flush(); }, 5000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) void telemetry.flush(); });
}
export function captureApiFailure(path, method, status) {
  if (path?.includes("/monitoring")) return;
  if (!status || status >= 500) telemetry.reportError({ name: "Error" }, path);
}
export function captureApiRequest(config, status) {
  if (!config || config.url?.includes("/monitoring")) return;
  telemetry.emit({ kind: "request", route: config.url, status: status || 0, durationMs: Math.max(0, Math.round(performance.now() - (config._monitoringStarted || performance.now()))) });
}
export function startScreenTiming(route) {
  const started = performance.now(); let finished = false;
  const end = (timedOut = false) => { if (finished) return; finished = true; telemetry.emit({ kind: "screen", route, timedOut, durationMs: Math.min(120000, Math.round(performance.now() - started)) }); };
  return { end: () => end(), timeout: () => end(true), cancel: () => { finished = true; } };
}
