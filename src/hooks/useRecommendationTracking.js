import { useEffect, useRef } from "react";
import { analyticsService } from "../services/analyticsService";

export function useRecommendationTracking({ batchId = "", creatorId = "", enabled = true, entityId, entityType, position = 0, topics = [] }) {
  const rootRef = useRef(null);
  const stateRef = useRef({ completed: false, impression: false, replayCount: 0, startedAt: 0, visibleMs: 0, watchedSeconds: new Set() });

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || !entityId) return undefined;
    const state = stateRef.current;
    const payload = (eventType, extra = {}) => analyticsService.trackRecommendationSignal({ batchId, creatorId, entityId, entityType, eventType, position, topics, ...extra });
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!state.startedAt) state.startedAt = Date.now();
        if (!state.impression) {
          state.impression = true;
          analyticsService.queueContentImpression({ entityId, entityType, metadata: { batchId, creatorId, position, topics }, source: entityType === "feed_post" ? "home" : entityType === "profile" ? "discover" : entityType });
        }
      } else if (state.startedAt) {
        const elapsed = Date.now() - state.startedAt;
        state.visibleMs += elapsed;
        state.startedAt = 0;
        if (!root.querySelector("video")) void payload(elapsed < 2000 ? "FAST_SKIP" : "CONTENT_WATCH", { watchMs: elapsed });
      }
    }, { threshold: [0, 0.5, 0.8] });
    observer.observe(root);

    const video = root.querySelector("video");
    if (!video) return () => observer.disconnect();
    const durationMs = () => Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0;
    const completion = () => durationMs() ? Math.min(1, state.watchedSeconds.size / Math.max(1, Math.ceil(video.duration))) : 0;
    const onTime = () => { if (Number.isFinite(video.currentTime)) state.watchedSeconds.add(Math.floor(video.currentTime)); };
    const onEnded = () => {
      const value = completion();
      state.completed = true;
      void payload("CONTENT_COMPLETED", { completion: value, durationMs: durationMs(), watchMs: state.watchedSeconds.size * 1000 });
    };
    const onPlay = () => {
      if (state.completed && video.currentTime < 1) {
        state.replayCount += 1;
        state.completed = false;
        void payload("CONTENT_REPLAY", { completion: completion(), durationMs: durationMs(), watchMs: state.watchedSeconds.size * 1000 });
      }
    };
    const flush = () => {
      if (!state.watchedSeconds.size || state.completed) return;
      const value = completion();
      void payload(state.watchedSeconds.size < 2 ? "FAST_SKIP" : "CONTENT_WATCH", { completion: value, durationMs: durationMs(), watchMs: state.watchedSeconds.size * 1000 });
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    window.addEventListener("pagehide", flush);
    return () => {
      observer.disconnect();
      flush();
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      window.removeEventListener("pagehide", flush);
    };
  }, [batchId, creatorId, enabled, entityId, entityType, position, topics]);

  return rootRef;
}
