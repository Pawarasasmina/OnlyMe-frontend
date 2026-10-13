import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { restoreSocialScroll, scrollPositionForNavigation } from "../utils/socialScrollRestoration";

export function useSocialScrollRestoration(contentRef) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const entries = useRef(new Map());
  const routes = useRef(new Map());
  const route = `${location.pathname}${location.search}`;

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const entryPositions = entries.current;
    const routePositions = routes.current;
    const target = scrollPositionForNavigation({
      navigationType,
      restoreScroll: location.state?.restoreScroll,
      entryPosition: entryPositions.get(location.key),
      routePosition: routePositions.get(route),
    });
    let restoring = true;
    let frame;
    let timeout;
    let resizeObserver;
    let mutationObserver;
    let lastPosition = target;
    const remember = () => {
      if (restoring) return;
      lastPosition = { content: content?.scrollTop || 0, window: window.scrollY };
      entryPositions.set(location.key, lastPosition);
      routePositions.set(route, lastPosition);
    };
    const stopRestoring = () => {
      restoring = false;
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
    const restore = () => {
      if (!restoring) return;
      if (restoreSocialScroll(content, window, target)) {
        stopRestoring();
        remember();
      }
    };
    const scheduleRestore = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(restore);
    };
    // Keep the desired position while cached or fetched content fills the page.
    resizeObserver = new ResizeObserver(scheduleRestore);
    const watchContent = () => {
      resizeObserver.disconnect();
      if (content) {
        resizeObserver.observe(content);
        if (content.firstElementChild) {
          resizeObserver.observe(content.firstElementChild);
          for (const child of content.firstElementChild.children) resizeObserver.observe(child);
        }
      }
      scheduleRestore();
    };
    mutationObserver = new MutationObserver(watchContent);
    if (content) mutationObserver.observe(content, { childList: true, subtree: true });
    watchContent();
    timeout = window.setTimeout(stopRestoring, 15000);
    restore();
    const userScroll = () => { stopRestoring(); remember(); };
    const userKey = (event) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) userScroll();
    };
    content?.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("wheel", userScroll, { passive: true });
    window.addEventListener("touchstart", userScroll, { passive: true });
    window.addEventListener("keydown", userKey);
    return () => {
      stopRestoring();
      // The new route may already have shortened the DOM. Save the last scroll
      // event instead of reading a scrollTop that the browser has clamped to zero.
      entryPositions.set(location.key, lastPosition);
      routePositions.set(route, lastPosition);
      content?.removeEventListener("scroll", remember);
      window.removeEventListener("scroll", remember);
      window.removeEventListener("wheel", userScroll);
      window.removeEventListener("touchstart", userScroll);
      window.removeEventListener("keydown", userKey);
    };
  }, [contentRef, location.key, location.state?.restoreScroll, navigationType, route]);
}
