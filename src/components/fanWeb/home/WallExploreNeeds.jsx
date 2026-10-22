import { WALL_NEEDS as NEEDS } from "../../../data/wallNeeds";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { postService } from "../../../services/postService";
import FanAvatar from "../shared/FanAvatar";

export function WallNeedCard({ item: [key, label, Icon, field], data, pending, selected, onSelect, compact = false }) {
  const count = (field === "topic" ? data?.topicCounts : data?.counts)?.[key] || 0;
  const previews = data?.previews?.[key] || [];
  const people = [...new Map(previews.filter(post => post.author).map(post => [post.author._id, post.author])).values()];
  return <button aria-pressed={selected} className={`wall-explore-card ${compact ? "is-compact" : ""} ${selected ? "is-active" : ""}`} onClick={onSelect} type="button">
    <span className="wall-explore-card-title">{Icon ? <Icon aria-hidden="true" /> : null}<strong>{label}</strong>{key === "right_now" && count > 0 ? <i aria-hidden="true" /> : null}</span>
    <span className="wall-explore-preview" dir="auto">{pending ? "Loading needs..." : previews[0]?.text ? `\u201c${previews[0].text}\u201d` : "Quiet for now \u2014 be the first"}</span>
    <span className="wall-explore-activity"><span className="wall-explore-people">{people.map(person => <FanAvatar key={person._id} name={person.name} src={person.avatar} size="h-5 w-5" />)}</span><small>{pending ? "Loading..." : count ? `${count} active` : ""}</small></span>
  </button>;
}
export default function WallExploreNeeds({ location, viewerId, filters, onSelect }) {
  const page = useLocation();
  const params = { scope: location ? "custom" : "worldwide", location };
  const query = useQuery({ queryKey: ["feed-posts", "need-counts", viewerId, params], queryFn: () => postService.getNeedCounts(params), staleTime: 15000, retry: false });
  return <section aria-label="Explore needs" className="wall-explore-needs">
    <div className="wall-explore-heading"><h2>Explore needs</h2><Link aria-label="Explore all needs" to={`/wall/explore${page.search}`}>All <span aria-hidden="true">&rsaquo;</span></Link></div>
    {query.isError ? <button className="wall-explore-retry" onClick={() => query.refetch()} type="button">Could not load needs. Retry</button> : <div className="wall-explore-track">{NEEDS.map(item => <WallNeedCard data={query.data} item={item} key={item[0]} pending={query.isPending} selected={filters[item[3]] === item[0]} onSelect={() => onSelect({ [item[3]]: filters[item[3]] === item[0] ? "all" : item[0] })} />)}</div>}
  </section>;
}
