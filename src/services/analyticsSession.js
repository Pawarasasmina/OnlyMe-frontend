const SESSION_KEY = "onlyme_analytics_session_id";
const LAST_ACTIVITY_KEY = "onlyme_analytics_last_activity_at";
const STARTED_KEY = "onlyme_analytics_started_at";
const INACTIVITY_MS = 30 * 60 * 1000;

function randomId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsSessionId() {
  const timestamp = Date.now();
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId || timestamp - lastActivity > INACTIVITY_MS) {
    sessionId = randomId();
    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(STARTED_KEY, new Date(timestamp).toISOString());
  }
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
  return sessionId;
}

export function clearAnalyticsSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem(STARTED_KEY);
}
