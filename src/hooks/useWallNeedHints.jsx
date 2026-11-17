import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useLanguage } from "./useLanguage";
import { msg } from "../i18n/runtime.js";
import { wallHintService } from "../services/wallHintService";

const blockers = '[aria-modal="true"], [role="dialog"], .story-composer-overlay, .story-viewer-overlay, .wall-explore-page, .welcome-moment, .onboarding-ticket-screen';
const hintsBlocked = () => [...document.querySelectorAll(blockers)].some(element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" && element.getAttribute("aria-hidden") !== "true");

export function useWallNeedHints() {
  useLanguage();
  const { user } = useAuth();
  const userId = String(user?.id || user?._id || "");
  const client = useQueryClient();
  const key = ["wall-need-hints", userId];
  useQuery({ queryKey: key, queryFn: wallHintService.get, enabled: Boolean(userId), staleTime: 60000, retry: 1 });
  const [hint, setHint] = useState(null);
  const bubbleRef = useRef(null);
  const generation = useRef(0);
  const mutation = useMutation({ mutationFn: wallHintService.dismiss, retry: 2, onError: (_error, id) => {
    client.setQueryData(["wall-need-hints", userId], current => (current || []).filter(value => value !== id));
  } });
  useEffect(() => {
    const dismiss = () => { generation.current++; setHint(null); };
    setHint(null);
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", dismiss, true);
    window.addEventListener("resize", dismiss);
    const dismissOnScroll = event => {
      if (event.target === document || event.target === window || event.target?.classList?.contains("social-center-scroll")) dismiss();
    };
    document.addEventListener("scroll", dismissOnScroll, true);
    const observer = new MutationObserver(() => { if (hintsBlocked()) dismiss(); });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-modal", "aria-hidden", "hidden"] });
    return () => {
      generation.current++;
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", dismiss, true);
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("scroll", dismissOnScroll, true);
      observer.disconnect();
    };
  }, [userId]);
  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), 4500);
    return () => window.clearTimeout(timer);
  }, [hint]);
  useLayoutEffect(() => {
    if (!hint || !bubbleRef.current) return;
    const bubble = bubbleRef.current;
    const width = bubble.getBoundingClientRect().width;
    const left = Math.max(hint.leftEdge, Math.min(hint.center - width / 2, hint.rightEdge - width));
    bubble.style.left = `${left}px`;
    bubble.style.setProperty("--hint-arrow", `${Math.max(10, Math.min(width - 10, hint.center - left))}px`);
  }, [hint]);
  const showHint = useCallback(async (id, anchor) => {
    if (!userId || !anchor || hintsBlocked()) return;
    const request = ++generation.current;
    let dismissed;
    try { dismissed = await client.fetchQuery({ queryKey: ["wall-need-hints", userId], queryFn: wallHintService.get, staleTime: 60000 }); }
    catch { return; }
    if (request !== generation.current || !anchor.isConnected || dismissed.includes(id) || hintsBlocked()) return;
    const rect = anchor.getBoundingClientRect();
    const column = anchor.closest(".social-center-scroll")?.getBoundingClientRect();
    const leftEdge = Math.max(0, column?.left || 0) + 16;
    const rightEdge = Math.min(window.innerWidth, column?.right || window.innerWidth) - 16;
    if (!rect.width || rect.top < 50 || rect.top > window.innerHeight) return;
    setHint({ id, userId, center: rect.left + rect.width / 2, leftEdge, rightEdge, top: rect.top - 10 });
    client.setQueryData(["wall-need-hints", userId], current => [...new Set([...(current || []), id])]);
    mutation.mutate(id);
  }, [client, userId, mutation.mutate]);
  const bubble = hint && hint.userId === userId ? createPortal(<div ref={bubbleRef} className="wall-need-hint" role="status" style={{ left: hint.center, top: hint.top, maxWidth: hint.rightEdge - hint.leftEdge }}><span>{msg(`wallNeeds.hint.${hint.id}`)}</span></div>, document.body) : null;
  return { showHint, bubble, hintVisible: Boolean(hint) };
}
