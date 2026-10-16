import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useLanguage } from "./useLanguage";
import { postService } from "../services/postService";

export function useWallTranslation({ postId, mediaId, text }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState(null);
  useEffect(() => {
    if (!text?.trim() || !ref.current) return undefined;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "160px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [text]);
  const metadata = useQuery({
    queryKey: ["wall-language", user?.id || user?._id, postId, mediaId || "text", text, language],
    queryFn: ({ signal }) => postService.getContentLanguage(postId, mediaId, signal),
    enabled: visible && Boolean(text?.trim()) && /^[a-f\d]{24}$/i.test(String(postId || "")),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const key = JSON.stringify([postId, mediaId, text, language]);
  const translate = useMutation({
    mutationFn: () => postService.translateContent(postId, mediaId),
    retry: false,
    onSuccess: (result, requestKey) => setView({ key: requestKey, text: result.translatedText, show: !result.sameLanguage, result }),
  });
  const matching = view?.key === key && (!metadata.data?.targetLanguage || metadata.data.targetLanguage === view.result?.targetLanguage);
  const showing = matching && view.show;
  const toggle = () => {
    if (translate.isPending) return;
    if (matching && view.text) setView({ ...view, show: view.result?.sameLanguage ? false : !view.show });
    else translate.mutate(key);
  };
  return { ref, metadata: metadata.data || (matching ? view.result : null), sameLanguage: Boolean(matching && view.result?.sameLanguage), showing, text: showing ? view.text : text, toggle, loading: translate.isPending, error: translate.variables === key && translate.isError };
}
