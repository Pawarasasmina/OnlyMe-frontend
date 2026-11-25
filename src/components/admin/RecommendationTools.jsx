import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService as api } from "../../services/adminService";
import { useAuth } from "../../hooks/useAuth";

const box = "rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm";
const field = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const button = "rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40";
const errorText = error => error?.response?.data?.message || error?.message;

export function RecommendationExclusionButton({ targetModel, targetId }) {
  const { user } = useAuth();
  const allowed = user?.role === "admin" && (!user.adminRole || user.adminRole === "MAIN_ADMIN");
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["admin", "recommendation-exclusions"], queryFn: () => api.getRecommendationExclusions().then(r => r.data.data.items), enabled: allowed });
  const excluded = query.data?.some(row => row.targetModel === targetModel && String(row.targetId) === String(targetId));
  const mutation = useMutation({ mutationFn: () => api.setRecommendationExclusion({ targetModel, targetId, excluded: !excluded, reason }), onSuccess: () => { client.invalidateQueries({ queryKey: ["admin", "recommendation-exclusions"] }); setOpen(false); setReason(""); } });
  if (!allowed) return null;
  return <div className="my-3"><button className={button} disabled={query.isPending || query.isError} onClick={() => setOpen(!open)} type="button">{excluded ? "Restore to recommendations" : "Exclude from recommendations"}</button>{query.isError && <p role="alert">{errorText(query.error)}</p>}{open && <form className="mt-2 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><input aria-label="Reason for recommendation exclusion change" className={field} minLength={3} maxLength={500} required placeholder="Reason for this change" value={reason} onChange={e => setReason(e.target.value)} /><button className={button} disabled={mutation.isPending} type="submit">Confirm</button></form>}{mutation.isError && <p className="mt-2 text-sm text-red-700" role="alert">{errorText(mutation.error)}</p>}</div>;
}

function TargetSearch({ model, onSelect }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const term = search.trim();
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(term), 250);
    return () => window.clearTimeout(timer);
  }, [term]);
  const ready = Boolean(term) && term === debouncedSearch;
  const query = useQuery({
    queryKey: ["admin", "recommendation-targets", model, debouncedSearch],
    queryFn: ({ signal }) => api.searchRecommendationTargets({ model, search: debouncedSearch }, { signal }).then(r => r.data.data.items),
    enabled: ready,
  });
  const searching = Boolean(term) && (!ready || query.isFetching);
  return <div>
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setDebouncedSearch(term); }}>
      <input aria-label="Find recommendation target" autoComplete="off" className={`${field} min-w-0 flex-1`} placeholder={model === "User" ? "Name, username, or account ID" : "Title, text, or item ID"} required value={search} onChange={e => setSearch(e.target.value)} />
      <button className={button} disabled={!term} type="submit">Search</button>
    </form>
    <div aria-live="polite" aria-busy={searching}>
      {searching && <p className="mt-2 text-sm" role="status">Searching...</p>}
      {ready && query.isError && <p role="alert" className="text-red-700">{errorText(query.error)}</p>}
      {ready && !query.isFetching && query.data?.length === 0 && <p className="mt-2 text-sm text-slate-500">No matching items.</p>}
      {ready && <div className="mt-2 max-h-64 overflow-auto">{query.data?.map(item => <button className="block w-full border-b p-3 text-left text-sm hover:bg-slate-50" key={item.id} onClick={() => onSelect(item)} type="button"><strong>{item.label}</strong>{item.username && <span> @{item.username}</span>}<small className="block text-slate-500">{item.id} ? {item.status}</small></button>)}</div>}
    </div>
  </div>;
}

export function RecommendationExclusions() {
  const sectionRef = useRef(null);
  const [searchKey, setSearchKey] = useState(0);
  const [model, setModel] = useState("User");
  const [target, setTarget] = useState(null);
  const query = useQuery({ queryKey: ["admin", "recommendation-exclusions"], queryFn: () => api.getRecommendationExclusions().then(r => r.data.data.items) });
  return <section className={box} ref={sectionRef}><h2 className="text-lg font-black">Exclude from recommendations</h2><p className="my-2 text-sm text-slate-500">Exclude any account or item from Seen, Wall, Discover, and Stories. Account exclusions cover its content. Direct links stay available. Exclusions apply immediately and survive an emergency reset.</p><select aria-label="Exclusion target type" className={`${field} mb-3`} value={model} onChange={e => { setModel(e.target.value); setTarget(null); }}>{["User", "Publication", "FeedPost", "WallPost", "Story", "Content"].map(value => <option value={value} key={value}>{({ User: "Account", Publication: "Seen / World / Experience", FeedPost: "Wall note", WallPost: "Legacy Wall post", Story: "Story", Content: "Legacy content" })[value]}</option>)}</select><TargetSearch key={`${model}-${searchKey}`} model={model} onSelect={setTarget} />{target && <div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><strong>{target.label}</strong><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white" onClick={() => { setTarget(null); setSearchKey(key => key + 1); window.requestAnimationFrame(() => sectionRef.current?.querySelector("input")?.focus()); }} type="button">Back to search</button></div><RecommendationExclusionButton targetModel={model} targetId={target.id} /></div>}<h3 className="mt-5 font-bold">Active exclusions</h3>{query.isPending && <p>Loading exclusions…</p>}{query.isError && <p role="alert">{errorText(query.error)}</p>}{query.data?.length === 0 && <p className="mt-2 text-sm text-slate-500">No active exclusions.</p>}<div className="mt-2 max-h-96 overflow-auto">{query.data?.map(row => <article className="border-b py-3" key={row._id}><b className="text-sm">{row.label}</b><p className="text-xs text-slate-500">{row.targetModel} · {row.targetId}</p><p className="text-sm">{row.reason}</p><RecommendationExclusionButton targetModel={row.targetModel} targetId={row.targetId} /></article>)}</div></section>;
}

export function RecommendationPreview() {
  const sectionRef = useRef(null);
  const [searchKey, setSearchKey] = useState(0);
  const [user, setUser] = useState(null);
  const [surface, setSurface] = useState("SEEN");
  const preview = useMutation({ mutationFn: () => api.previewRecommendations({ userId: user.id, surface }).then(r => r.data.data) });
  return <section className={box} ref={sectionRef}><h2 className="text-lg font-black">Preview as user</h2><p className="my-2 text-sm text-slate-500">Read the next batch with the active rules, audience permissions, exclusions, and exposure history. Preview does not record impressions or advance that history. Wall previews use Popular.</p><TargetSearch key={searchKey} model="User" onSelect={item => { setUser(item); preview.reset(); }} />{user && <div className="my-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold">{user.label} @{user.username}</p><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => { setUser(null); preview.reset(); setSearchKey(key => key + 1); window.requestAnimationFrame(() => sectionRef.current?.querySelector("input")?.focus()); }} type="button">Back to search</button></div>}<div className="mt-3 flex gap-2"><select aria-label="Preview surface" className={field} value={surface} onChange={e => { setSurface(e.target.value); preview.reset(); }}>{["SEEN", "WALL", "DISCOVER", "STORIES"].map(value => <option key={value}>{value}</option>)}</select><button className={button} disabled={!user || preview.isPending} onClick={() => preview.mutate()} type="button">{preview.isPending ? "Loading preview…" : "Preview next batch"}</button></div>{preview.isError && <p className="mt-3 text-red-700" role="alert">{errorText(preview.error)}</p>}{preview.data && <div className="mt-4"><p className="text-sm text-slate-500">{preview.data.surface} · Active version {preview.data.recommendation?.configVersion || "—"} · {preview.data.items.length} items</p>{!preview.data.items.length && <p className="mt-3">No eligible recommendations for this account.</p>}<ol className="mt-3 space-y-2">{preview.data.items.map(item => <li className="rounded-xl border p-3" key={item.id}><span className="text-xs font-bold text-slate-500">#{item.position} · {item.kind}</span><b className="block">{item.title}</b><p className="text-sm text-slate-500">@{item.creator?.username} · {item.recommendation?.bucket} · Score {item.recommendation?.score}</p><p className="text-sm">{item.recommendation?.reason || "Selected by this feed’s ordering rules"}</p>{item.recommendation?.adjustments?.map((rule, i) => <span className="mr-2 text-xs text-slate-500" key={i}>{rule.rule.replaceAll("_", " ")}: {rule.position ? `position ${rule.position}` : rule.weight}</span>)}</li>)}</ol></div>}</section>;
}
