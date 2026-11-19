import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const supported = new Set(["for_you", "nearby", "rising", "new", "creators"]);
const normalize = value => ({ filter: supported.has(value?.filter) ? value.filter : "for_you", topic: typeof value?.topic === "string" ? value.topic : "" });
const keyFor = viewerId => `atseen_discover_filters:${viewerId || "guest"}`;
function read(viewerId) {
  try { return normalize(JSON.parse(sessionStorage.getItem(keyFor(viewerId)) || "null")); }
  catch { return normalize(null); }
}
function save(viewerId, selection) {
  try { sessionStorage.setItem(keyFor(viewerId), JSON.stringify(selection)); } catch { /* URL selection remains usable. */ }
}
function apply(current, selection) {
  const next = new URLSearchParams(current);
  next.delete("filter"); next.delete("topic");
  if (selection.filter !== "for_you") next.set("filter", selection.filter);
  if (selection.topic) next.set("topic", selection.topic);
  return next;
}

export default function useDiscoverFilters(viewerId) {
  const [params, setParams] = useSearchParams();
  const explicit = params.has("filter") || params.has("topic");
  const selection = explicit ? normalize({ filter: params.get("filter"), topic: params.get("topic") }) : read(viewerId);
  const { filter: activeFilter, topic: activeTopic } = selection;

  useEffect(() => {
    save(viewerId, { filter: activeFilter, topic: activeTopic });
    if (!explicit && (activeFilter !== "for_you" || activeTopic)) {
      setParams(current => apply(current, { filter: activeFilter, topic: activeTopic }), { replace: true });
    }
  }, [viewerId, activeFilter, activeTopic, explicit, setParams]);

  const select = next => {
    // Save before clearing the URL: selecting For you must also clear the memory.
    save(viewerId, next);
    setParams(current => apply(current, next), { replace: true });
  };
  return {
    activeFilter,
    activeTopic,
    changeFilter: filter => select({ filter: !activeTopic && filter === activeFilter ? "for_you" : filter, topic: "" }),
    changeTopic: topic => select({ filter: "for_you", topic: topic === activeTopic ? "" : topic }),
  };
}
