import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useFanToast } from "../components/fanWeb/shared/FanToastContext";
import { msg } from "../i18n/runtime.js";
import { wallViewService } from "../services/wallViewService";

function cachedView(id) {
  try { return localStorage.getItem(`atseen:wall-view:${id}`) === "grid" ? "grid" : "feed"; } catch { return "feed"; }
}
function remember(id, view) { try { localStorage.setItem(`atseen:wall-view:${id}`, view); } catch { /* Server persistence remains available. */ } }
export function useWallViewPreference() {
  const { user } = useAuth();
  const id = String(user?.id || user?._id || "");
  const key = ["wall-view", id];
  const client = useQueryClient();
  const { showToast } = useFanToast();
  const latest = useRef(0);
  const query = useQuery({ queryKey: key, queryFn: async ({ signal }) => {
    const view = await wallViewService.get(signal); remember(id, view); return view;
  }, enabled: Boolean(id), placeholderData: () => cachedView(id), staleTime: 60000, retry: 1 });
  const mutation = useMutation({
    mutationFn: ({ view }) => wallViewService.save(view),
    scope: { id: `wall-view:${id}` },
    retry: 1,
    onMutate: async ({ view }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData(key) || cachedView(id);
      client.setQueryData(key, view); remember(id, view);
      return { previous, key, id };
    },
    onError: (_error, { sequence }, context) => {
      if (latest.current === sequence && context) { client.setQueryData(context.key, context.previous); remember(context.id, context.previous); showToast(msg("wallGrid.preferenceError")); }
    },
  });
  return { view: query.data === "grid" ? "grid" : "feed", setView: view => mutation.mutate({ view, sequence: ++latest.current }) };
}
