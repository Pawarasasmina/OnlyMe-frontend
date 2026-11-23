import { useEffect, useRef } from "react";
import { analyticsService } from "../services/analyticsService";

// A chapter is complete after three visible seconds, reaching its end, and
// finishing every embedded audio/video. Navigation alone is not completion.
export function useChapterCompletion({ accessToken = "", chapterId, enabled, publicationId, rootRef: providedRootRef }) {
  const ownRootRef = useRef(null);
  const endRef = useRef(null);
  const rootRef = providedRootRef || ownRootRef;
  useEffect(() => {
    const root = rootRef.current;
    const end = endRef.current;
    if (!enabled || !root || !end || !chapterId || !publicationId) return undefined;
    let endVisible = false, visibleMs = 0, sent = false, lastTick = performance.now();
    const completedMedia = new Set();
    const check = () => {
      const now = performance.now();
      const bounds = root.getBoundingClientRect();
      const visible = document.visibilityState === "visible" && bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (visible) visibleMs += Math.min(500, now - lastTick);
      lastTick = now;
      const media = [...root.querySelectorAll("video, audio")];
      if (!sent && visible && endVisible && visibleMs >= 3000 && media.every(item => item.ended || completedMedia.has(item))) {
        sent = true;
        void analyticsService.trackEvent({ eventType: "CHAPTER_COMPLETE", entityType: "publication", entityId: publicationId, metadata: { chapterId, accessToken } });
      }
    };
    const ended = event => { completedMedia.add(event.target); check(); };
    const observer = new IntersectionObserver(([entry]) => { endVisible = entry.isIntersecting; check(); }, { threshold: 0 });
    observer.observe(end);
    root.addEventListener("ended", ended, true);
    const timer = window.setInterval(check, 250);
    return () => { observer.disconnect(); root.removeEventListener("ended", ended, true); window.clearInterval(timer); };
  }, [accessToken, chapterId, enabled, publicationId, rootRef]);
  return { rootRef, endRef };
}
