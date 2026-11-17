/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { WALL_NEEDS as NEEDS } from "../../data/wallNeeds";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { WallNeedCard } from "../../components/fanWeb/home/WallExploreNeeds";
import { WALL_FILTER_TOPICS } from "../../data/wallFilters";
import { readWallFilters, writeWallFilters, toggleWallFilter, wallFilterSelected } from "../../utils/wallFilters";
import { DEFAULT_WALL_FILTERS } from "../../data/wallFilters";
import { wallHaptic } from "../../utils/wallHaptics";
import { useWallNeedHints } from "../../hooks/useWallNeedHints";
import { useAuth } from "../../hooks/useAuth";
import { postService } from "../../services/postService";
const TOPICS = ["meet_people", "work", "services", "housing", "places", "food", "travel", "kids_family", "community"];
export default function WallExplorePage() {
  __useUiLanguage();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => readWallFilters(params));
  const location = useLocation();
  const moreAnchor = useRef(null);
  const moreShown = useRef(false);
  const { showHint, bubble, hintVisible } = useWallNeedHints();
  const { user } = useAuth();
  const navigate = useNavigate();
  const area = { scope: filters.location ? "custom" : "worldwide", location: filters.location };
  const query = useQuery({ queryKey: ["feed-posts", "need-counts", String(user?.id || user?._id || ""), area], queryFn: () => postService.getNeedCounts(area), staleTime: 15000, refetchOnMount: "always", refetchInterval: 60000, retry: false });
  const selectedParams = writeWallFilters(params, filters);
  if (params.has("country")) selectedParams.set("country", params.get("country"));
  const backTo = `/wall${selectedParams.size ? `?${selectedParams}` : ""}`;
  const done = () => { wallHaptic(); navigate(backTo, { replace: true, state: { scrollToWallFeed: true } }); };
  useEffect(() => {
    if (location.state?.wallMoreHint && !moreShown.current && moreAnchor.current) {
      moreShown.current = true;
      void showHint("more", moreAnchor.current);
    }
  }, [location.state, showHint]);
  useEffect(() => { const key = event => { if(event.key === "Escape") navigate(backTo, { replace: true, state: { scrollToWallFeed: true } }); }; window.addEventListener("keydown",key); return () => window.removeEventListener("keydown",key); }, [navigate,backTo]);
  const choose = ([key,,,field]) => {
    wallHaptic();
    setFilters(current => toggleWallFilter(current, key, field));
  };
  const purposes = NEEDS.filter(item => item[3] === "type").map(item => item[0] === "recommendation" ? [item[0], __msg("wallNeeds.tips"), item[2], item[3]] : item);
  const topics = TOPICS.map(key => [key, key === "meet_people" ? __msg("wallNeeds.company") : WALL_FILTER_TOPICS.find(item => item.value === key).label, null, "topic"]);
  const selected = filters.rightNow || filters.type !== "all" || filters.topic !== "all";
  const grid = (items, compact = false) => <div className={`wall-explore-page-grid ${compact ? "is-topics" : ""}`}>{items.map(item => <WallNeedCard compact={compact} data={query.data} item={item} key={item[0]} onSelect={() => choose(item)} pending={query.isPending} selected={wallFilterSelected(filters, item[0], item[3])} />)}</div>;
  return <section className="wall-explore-page" aria-labelledby="wall-explore-title" data-hints-blocked={hintVisible ? "true" : undefined}>
    <header><button aria-label={__msg("social.backToWall")} onClick={done} type="button"><FiChevronLeft data-ui-directional="true" aria-hidden="true" /></button><h1 id="wall-explore-title" ref={moreAnchor}>{__msg("fanWeb.exploreNeeds")}</h1><button className="wall-explore-clear" disabled={!selected} aria-hidden={!selected} onClick={() => { wallHaptic(); setFilters(current => ({ ...current, type: DEFAULT_WALL_FILTERS.type, topic: DEFAULT_WALL_FILTERS.topic, rightNow: false })); }} type="button">{__msg("fan.clear")}</button></header>
    <p className="wall-explore-subtitle">{__msg("wallNeeds.pick")}</p>
    {query.isError ? <div className="wall-explore-page-error" role="alert"><p>{__msg("social.couldNotLoadNeeds")}</p><button onClick={() => query.refetch()} type="button">{__msg("activity.retry")}</button></div> : null}
    <div className="wall-explore-page-content"><h2>{__msg("social.whatPeoplePost")}</h2>{grid(purposes)}<h2>{__msg("settings.topics")}</h2>{grid(topics,true)}</div>
    <footer className="wall-explore-done"><button onClick={done} type="button">{__msg("wallNeeds.done")}</button></footer>
    {bubble}
  </section>;
}
