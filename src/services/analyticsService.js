import axiosInstance from "../api/axiosInstance";
import { getAnalyticsSessionId } from "./analyticsSession";

const IMPRESSION_BATCH_SIZE = 25;
const IMPRESSION_FLUSH_MS = 2500;

let impressionQueue = [];
let flushTimer = null;

function currentSource() {
  const path = window.location.pathname;
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/discover")) return "discover";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/saved")) return "saved";
  if (path.startsWith("/seen")) return "seen";
  if (path.startsWith("/world")) return "world";
  return "home";
}

function withSession(payload = {}) {
  return { source: currentSource(), sessionId: getAnalyticsSessionId(), ...payload };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    analyticsService.flushImpressions();
  }, IMPRESSION_FLUSH_MS);
}

export const analyticsService = {
  getSessionId: getAnalyticsSessionId,
  startSession: () => axiosInstance.post("/analytics/sessions/start", withSession()),
  endSession: () => axiosInstance.post("/analytics/sessions/end", withSession()),
  trackEvent: (event) => axiosInstance.post("/analytics/events", withSession(event)).catch(() => null),
  trackProfileView: ({ profileUserId, source = currentSource() }) => analyticsService.trackEvent({
    entityId: profileUserId,
    entityType: "profile",
    eventType: "PROFILE_VIEW",
    metadata: { profileUserId },
    source,
  }),
  trackSearchResultClick: ({ entityId, entityType, position, searchCategory, searchEventId }) => analyticsService.trackEvent({
    entityId,
    entityType,
    eventType: "SEARCH_RESULT_CLICKED",
    metadata: { position, searchCategory, searchEventId },
    source: "search",
  }),
  trackContentView: ({ entityId, entityType = "feed_post", source = currentSource() }) => analyticsService.trackEvent({
    entityId,
    entityType,
    eventType: "CONTENT_VIEW",
    source,
  }),
  queueContentImpression: (event) => {
    impressionQueue.push(withSession({
      entityType: "feed_post",
      eventType: "CONTENT_IMPRESSION",
      metadata: { placement: currentSource(), visibleMs: 500, visibleThreshold: 0.5, ...event.metadata },
      source: event.source || currentSource(),
      ...event,
    }));
    if (impressionQueue.length >= IMPRESSION_BATCH_SIZE) void analyticsService.flushImpressions();
    else scheduleFlush();
  },
  flushImpressions: async () => {
    if (!impressionQueue.length) return null;
    const events = impressionQueue.slice(0, IMPRESSION_BATCH_SIZE);
    impressionQueue = impressionQueue.slice(IMPRESSION_BATCH_SIZE);
    try {
      return await axiosInstance.post("/analytics/events/batch", { events });
    } catch {
      return null;
    } finally {
      if (impressionQueue.length) scheduleFlush();
    }
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void analyticsService.flushImpressions();
  });
  window.addEventListener("beforeunload", () => {
    void analyticsService.flushImpressions();
  });
}
