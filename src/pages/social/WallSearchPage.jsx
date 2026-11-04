/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { searchService } from "../../services/searchService";
import { relativeTime } from "../../utils/relativeTime";

const suggestions = ["babysitter", "plumber", "room in Marina", "accountant", "bike", "caf\u00e9 with Wi-Fi"];
export default function WallSearchPage() {
  __useUiLanguage();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(params.get("q") || "");
  const input = useRef(null);
  const q = (params.get("q") || "").trim();
  const returnTo = location.state?.wallReturnTo?.startsWith("/wall?") ? location.state.wallReturnTo : "/wall";
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setDraft(params.get("q") || ""); }, [params]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft.trim() === q) return;
      setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true, state: location.state });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, q, setParams, location.state]);
  const query = useInfiniteQuery({ queryKey: ["wall-search", q], initialPageParam: "", getNextPageParam: (last) => last.nextCursor || undefined, queryFn: ({ signal, pageParam }) => searchService.search({ q, cursor: pageParam, type: "wall_notes", limit: 30, sort: "newest" }, signal), enabled: Boolean(q), retry: false });
  const items = query.data?.pages.flatMap((page) => page.items || page.sections?.wall_notes?.items || []) || [];
  return <section className="wall-search-page" aria-label={__msg("fanWeb.searchWall")}>
    <form className="wall-search-header" onSubmit={(event) => { event.preventDefault(); setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true, state: location.state }); }}>
      <div className="wall-search-field"><FiSearch aria-hidden="true" /><input aria-label={__msg("social.searchTheWall")} autoComplete="off" maxLength={120} onChange={(event) => setDraft(event.target.value)} placeholder={__msg("social.searchTheWallPlumberFlatVisa")} ref={input} value={draft} />{draft ? <button aria-label={__msg("search.clearSearch")} onClick={() => { setDraft(""); setParams({}, { replace: true, state: location.state }); input.current?.focus(); }} type="button"><FiX /></button> : null}</div>
      <button className="wall-search-cancel" onClick={() => navigate(returnTo)} type="button">{__msg("admin.cancel")}</button>
    </form>
    <div className="wall-search-body">
      {!q && !draft.trim() ? <><h1>{__msg("social.peopleOftenSearch")}</h1><div className="wall-search-suggestions">{suggestions.map((term) => <button key={term} onClick={() => { setDraft(term); setParams({ q: term }, { replace: true, state: location.state }); }} type="button"><FiSearch aria-hidden="true" />{term}</button>)}</div></> : null}
      {q && (query.isPending || draft.trim() !== q) ? <p className="wall-search-status" role="status">{__msg("social.searchingTheWall")}</p> : null}
      {q && query.isError ? <div className="wall-search-status" role="alert"><p>{__msg("social.couldNotSearchTheWall")}</p><button onClick={() => query.refetch()} type="button">{__msg("activity.retry")}</button></div> : null}
      {q && draft.trim() === q && !query.isPending && !query.isError ? <>
        <p aria-live="polite" className="sr-only">{items.length} {__msg("social.results")}</p>
        {items.map((item) => { const meta = item.metadata || {}; const author = meta.author || {}; const replies = Number(meta.commentCount || meta.replyCount || 0); return <Link className="wall-search-result" key={`${item.type}-${item.id}`} to={item.route || `/posts/${item.id}`}><span className="wall-search-result-meta"><strong>{meta.resolvedAt ? __msg("social.solved") : meta.postType || item.category || __msg("social.note_2c924e")}</strong> ? {meta.isOwn ? __msg("fanWeb.you") : author.name || __msg("admin.user")} ? {relativeTime(item.createdAt)} ? {replies} {replies === 1 ? __msg("social.reply") : __msg("social.replies")}</span><span className="wall-search-result-text" dir="auto">{item.description || item.title}</span></Link>; })}
        {!items.length ? <div className="wall-search-status"><p>{__msg("social.nothingYetAskTheWallPeopleNearbyWillAnswer")}</p><Link to={`/wall?compose=note&question=${encodeURIComponent(q)}`}>{__msg("social.askAQuestion")} <span aria-hidden="true">?</span></Link></div> : null}
        {query.hasNextPage ? <button className="wall-search-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} type="button">{query.isFetchingNextPage ? __msg("admin.loading") : __msg("social.showMoreResults")}</button> : null}
      </> : null}
    </div>
  </section>;
}
