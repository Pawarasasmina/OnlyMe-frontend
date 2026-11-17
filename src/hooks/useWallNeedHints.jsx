import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useLanguage } from "./useLanguage";
import { msg } from "../i18n/runtime.js";
import { wallHintService } from "../services/wallHintService";

export function useWallNeedHints() {
  useLanguage();
  const { user } = useAuth();
  const userId = String(user?.id || user?._id || "");
  const client = useQueryClient();
  const key = ["wall-need-hints", userId];
  useQuery({ queryKey: key, queryFn: wallHintService.get, enabled: Boolean(userId), staleTime: 60000, retry: 1 });
  const [hint, setHint] = useState(null);
  const generation = useRef(0);
  const mutation = useMutation({ mutationFn: wallHintService.dismiss, retry: 2, onError: (_error, id) => {
    client.setQueryData(["wall-need-hints", userId], current => (current || []).filter(value => value !== id));
  } });
  useEffect(() => {
    const dismiss = () => { generation.current++; setHint(null); };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      generation.current++;
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [userId]);
  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), 4500);
    return () => window.clearTimeout(timer);
  }, [hint]);
  const showHint = useCallback(async (id, anchor) => {
    if (!userId || !anchor) return;
    const request = ++generation.current;
    let dismissed;
    try { dismissed = await client.fetchQuery({ queryKey: ["wall-need-hints", userId], queryFn: wallHintService.get, staleTime: 60000 }); }
    catch { return; }
    if (request !== generation.current || !anchor.isConnected || dismissed.includes(id)) return;
    const rect = anchor.getBoundingClientRect();
    const column = anchor.closest(".social-center-scroll")?.getBoundingClientRect();
    const leftEdge = Math.max(0, column?.left || 0) + 16;
    const rightEdge = Math.min(window.innerWidth, column?.right || window.innerWidth) - 16;
    const width = Math.min(280, rightEdge - leftEdge);
    setHint({ id, left: Math.max(leftEdge, Math.min(rect.left + rect.width / 2 - width / 2, rightEdge - width)), top: rect.bottom + 90 < window.innerHeight ? rect.bottom + 10 : Math.max(16, rect.top - 80), width });
    client.setQueryData(["wall-need-hints", userId], current => [...new Set([...(current || []), id])]);
    mutation.mutate(id);
  }, [client, userId, mutation.mutate]);
  const bubble = hint ? createPortal(<div className="wall-need-hint" role="status" style={{ left: hint.left, top: hint.top, width: hint.width }}>{msg(`wallNeeds.hint.${hint.id}`)}</div>, document.body) : null;
  return { showHint, bubble, hintVisible: Boolean(hint) };
}
