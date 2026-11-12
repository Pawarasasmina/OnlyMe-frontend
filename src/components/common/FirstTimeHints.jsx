import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage.js";
import { msg } from "../../i18n/runtime.js";
import "./FirstTimeHints.css";

const shownInSession = new Set();
const hintOrder = ["wall", "highlights", "gift", "photo", "swipe", "save", "ask", "react"];
const hints = new Set(hintOrder);
const blockers = '[aria-modal="true"], [role="dialog"], .story-composer-overlay, .story-viewer-overlay, [data-hints-blocked="true"]';
function visible(element) {
  if (!element?.isConnected || !element.getClientRects().length || element.closest('[aria-hidden="true"], [inert]')) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) !== 0;
}

export default function FirstTimeHints({ enabled = true }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const userId = user?.id || user?._id;
  const onboarding = user?.onboarding?.status;
  const [hint, setHint] = useState(null);
  const bubbleRef = useRef(null);
  const route = `${location.pathname}${location.search}`;

  useLayoutEffect(() => {
    if (!hint || !bubbleRef.current) return;
    const bubble = bubbleRef.current;
    const width = bubble.offsetWidth;
    const left = Math.max(hint.left, Math.min(hint.x - width / 2, hint.right - width));
    bubble.style.marginLeft = `${left - hint.left}px`;
    bubble.style.setProperty("--hint-anchor", `${Math.max(12, Math.min(width - 12, hint.x - left))}px`);
  }, [hint, language]);

  useEffect(() => {
    setHint(null);
    if (!enabled || !userId || onboarding === "in_progress" || /^\/(onboarding|auth|login|signup|create)(\/|$)/.test(location.pathname)) return undefined;
    let active = null, finished = false, ready = false, expiry;
    const seen = id => {
      const key = `atseen:first-hint:v1:${userId}:${id}`;
      try { return shownInSession.has(key) || localStorage.getItem(key) === "1"; } catch { return shownInSession.has(key); }
    };
    const dismiss = () => {
      if (!active) return;
      finished = true; active = null; setHint(null); window.clearTimeout(expiry);
    };
    const scan = () => {
      if (!ready || finished) return;
      const center = document.querySelector(".social-center-scroll");
      const blocked = document.hidden || [...document.querySelectorAll(blockers)].some(visible);
      if (!center || blocked) { dismiss(); return; }
      const bounds = center.getBoundingClientRect();
      const top = Math.max(0, bounds.top), bottom = Math.min(innerHeight, bounds.bottom);
      const candidates = active ? [active.element] : [...center.querySelectorAll("[data-first-hint]")].sort((a, b) => hintOrder.indexOf(a.dataset.firstHint) - hintOrder.indexOf(b.dataset.firstHint));
      for (const element of candidates) {
        const id = element.dataset.firstHint;
        if (!hints.has(id) || (!active && seen(id)) || !visible(element) || element.disabled) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.top < top + 12 || rect.bottom > bottom - 12 || rect.left < bounds.left || rect.right > bounds.right) continue;
        const front = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (!front || !element.contains(front)) continue;
        const below = rect.top < top + 160;
        const position = { id, x: Math.max(bounds.left + 10, Math.min(rect.left + rect.width / 2, bounds.right - 10)), y: below ? rect.bottom + 10 : rect.top - 10, below, left: Math.max(10, bounds.left + 10), right: Math.min(innerWidth - 10, bounds.right - 10) };
        if (!active) {
          active = { element, id };
          const key = `atseen:first-hint:v1:${userId}:${id}`;
          shownInSession.add(key);
          try { localStorage.setItem(key, "1"); } catch { /* Session memory preserves once-only behavior when storage is unavailable. */ }
          expiry = window.setTimeout(dismiss, 4500);
        }
        setHint(current => current && Object.keys(position).every(key => current[key] === position[key]) ? current : position);
        return;
      }
      dismiss();
    };
    const timer = window.setTimeout(() => { ready = true; scan(); }, 1100);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden", "aria-modal", "data-first-hint", "disabled"] });
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", dismiss, true);
    document.addEventListener("visibilitychange", scan);
    document.addEventListener("scroll", scan, true);
    window.addEventListener("resize", scan);
    return () => {
      window.clearTimeout(timer); window.clearTimeout(expiry); observer.disconnect();
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", dismiss, true);
      document.removeEventListener("visibilitychange", scan);
      document.removeEventListener("scroll", scan, true);
      window.removeEventListener("resize", scan);
    };
  }, [enabled, userId, onboarding, route, language, location.pathname]);

  if (!hint) return null;
  const width = hint.right - hint.left;
  return createPortal(<div data-first-hint-bubble role="status" className={`first-time-hint ${hint.below ? "is-below" : "is-above"}`} style={{ left: hint.left, top: hint.y, width }}><span ref={bubbleRef}>{msg(`hints.${hint.id}`)}</span></div>, document.body);
}
