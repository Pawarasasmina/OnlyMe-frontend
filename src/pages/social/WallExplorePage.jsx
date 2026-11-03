/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { WALL_NEEDS as NEEDS } from "../../data/wallNeeds";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { WallNeedCard } from "../../components/fanWeb/home/WallExploreNeeds";
import { WALL_FILTER_TOPICS } from "../../data/wallFilters";
import { readWallFilters, writeWallFilters } from "../../utils/wallFilters";
import { useAuth } from "../../hooks/useAuth";
import { postService } from "../../services/postService";
const TOPICS = ["meet_people", "work", "services", "housing", "places", "food", "travel", "kids_family", "community"];
export default function WallExplorePage() {
  __useUiLanguage();
  const [params] = useSearchParams();
  const filters = readWallFilters(params);
  const { user } = useAuth();
  const navigate = useNavigate();
  const area = { scope: filters.location ? "custom" : "worldwide", location: filters.location };
  const query = useQuery({ queryKey: ["feed-posts", "need-counts", String(user?.id || user?._id || ""), area], queryFn: () => postService.getNeedCounts(area), staleTime: 15000, retry: false });
  const backTo = `/wall${params.size ? `?${params}` : ""}`;
  useEffect(() => { const key = event => { if(event.key === "Escape") navigate(backTo); }; window.addEventListener("keydown",key); return () => window.removeEventListener("keydown",key); }, [navigate,backTo]);
  const choose = ([key,,,field]) => {
    const next = writeWallFilters(params, { ...filters, [field]: key });
    if(params.has("country")) next.set("country",params.get("country"));
    navigate(`/wall?${next}`, { state: { scrollToWallFeed: true } });
  };
  const purposes = NEEDS.filter(item => item[3] === "type");
  const topics = TOPICS.map(key => [key, WALL_FILTER_TOPICS.find(item => item.value === key).label, null, "topic"]);
  const grid = (items, compact = false) => <div className={`wall-explore-page-grid ${compact ? "is-topics" : ""}`}>{items.map(item => <WallNeedCard compact={compact} data={query.data} item={item} key={item[0]} onSelect={() => choose(item)} pending={query.isPending} selected={filters[item[3]] === item[0]} />)}</div>;
  return <section className="wall-explore-page" aria-labelledby="wall-explore-title">
    <header><button aria-label={__msg("social.backToWall")} onClick={() => navigate(backTo)} type="button"><FiChevronLeft data-ui-directional="true" aria-hidden="true" /></button><h1 id="wall-explore-title">{__msg("fanWeb.exploreNeeds")}</h1></header>
    {query.isError ? <div className="wall-explore-page-error" role="alert"><p>{__msg("social.couldNotLoadNeeds")}</p><button onClick={() => query.refetch()} type="button">{__msg("activity.retry")}</button></div> : <div className="wall-explore-page-content"><h2>{__msg("social.whatPeoplePost")}</h2>{grid(purposes)}<h2>{__msg("settings.topics")}</h2>{grid(topics,true)}</div>}
  </section>;
}
