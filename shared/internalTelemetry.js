import { monitoringRoute } from "./monitoringPrivacy.js";
export function redactedFrames(error) {
  return String(error?.stack || "").split("\n").slice(1, 9).flatMap((line) => { const match = line.match(/([A-Za-z0-9_.-]+\.(?:jsx?|tsx?|bundle)):(\d+)(?::(\d+))?/); return match ? [`${match[1]}:${match[2]}:${match[3] || 0}`] : []; });
}
export function createTelemetryClient({ surface, endpoint, release = "", fetcher = fetch }) {
  const queue = [];
  let sending = false;
  const emit = (event) => {
    if (queue.length >= 100) queue.shift();
    const safe = { eventId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`, surface, release, ...event, route: monitoringRoute(event.route || "/") };
    queue.push(safe); return safe;
  };
  const reportError = (error, route = "/") => emit({ kind: "error", route, errorType: ["TypeError", "ReferenceError", "RangeError", "SyntaxError", "URIError"].includes(error?.name) ? error.name : "Error", frames: redactedFrames(error) });
  const flush = async () => {
    if (sending || !queue.length) return;
    sending = true;
    const events = queue.splice(0, 20);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetcher(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }, body: JSON.stringify({ events }), keepalive: true, signal: controller.signal });
      if (!response.ok) throw new Error("Telemetry unavailable");
    } catch { queue.unshift(...events.slice(0, Math.max(0, 100 - queue.length))); }
    finally { clearTimeout(timer); sending = false; }
  };
  return { emit, reportError, flush, pending: () => queue.length };
}
