/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { WALL_NEEDS as NEEDS } from "../../../data/wallNeeds";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { postService } from "../../../services/postService";
import FanAvatar from "../shared/FanAvatar";
import { toggleWallFilter, wallFilterSelected, wallFilterValues } from "../../../utils/wallFilters";
import { FiMoreHorizontal } from "react-icons/fi";
import { useWallNeedHints } from "../../../hooks/useWallNeedHints";
import { wallHaptic } from "../../../utils/wallHaptics";

export function WallNeedCard({ item: [key, label, Icon, field], data, pending, selected, onSelect, compact = false }) {
  __useUiLanguage();
  const count = (field === "topic" ? data?.topicCounts : data?.counts)?.[key] || 0;
  const previews = data?.previews?.[key] || [];
  const people = [...new Map(previews.filter(post => post.author && typeof post.author === "object").map(post => {
    const author = post.author;
    const id = author.id || author._id || author.username;
    return [id, { ...author, id, name: author.name || author.displayName || author.username, avatar: author.avatar || author.profilePhoto || author.avatarUrl }];
  }).filter(([id]) => id)).values()].slice(0, 3);
  return <button aria-pressed={selected} className={`wall-explore-card ${compact ? "is-compact" : ""} ${selected ? "is-active" : ""}`} onClick={onSelect} type="button">
    <span className="wall-explore-check" aria-hidden="true">✓</span>
    <span className="wall-explore-card-title">{key === "right_now" ? <svg aria-hidden="true" className="wall-right-now-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg> : Icon ? <Icon aria-hidden="true" /> : null}<strong>{label}</strong>{key === "right_now" && count > 0 ? <i aria-hidden="true" /> : null}</span>
    <span className="wall-explore-preview" dir="auto">{pending ? __msg("fanWeb.loadingNeeds") : previews[0]?.text ? `\u201c${previews[0].text}\u201d` : __msg("fanWeb.quietForNowBeTheFirst")}</span>
    <span className="wall-explore-activity"><span className="wall-explore-people">{people.map(person => <FanAvatar key={person.id} name={person.name} src={person.avatar} size="h-[18px] w-[18px]" />)}</span><small>{pending ? __msg("admin.loading") : count ? __msg("fanWeb.active", { value0: count }) : ""}</small></span>
  </button>;
}
export default function WallExploreNeeds({ location, viewerId, filters, onSelect }) {
  __useUiLanguage();
  const page = useLocation();
  const navigate = useNavigate();
  const { showHint, bubble, hintVisible } = useWallNeedHints();
  const params = { scope: location ? "custom" : "worldwide", location };
  const query = useQuery({ queryKey: ["feed-posts", "need-counts", viewerId, params], queryFn: () => postService.getNeedCounts(params), staleTime: 15000, refetchOnMount: "always", refetchInterval: 60000, retry: false });
  const quick = ["right_now", "meet_people", "need_help", "looking_for", "buy_sell", "recommendation"].map(key => NEEDS.find(item => item[0] === key));
  const moreSelected = wallFilterValues(filters, "type").some(key => ["offering", "question", "event"].includes(key)) || wallFilterValues(filters, "topic").some(key => key !== "meet_people");
  return <section aria-label={__msg("fanWeb.exploreNeeds")} className="wall-explore-needs" data-hints-blocked={hintVisible ? "true" : undefined}>
    <div className="wall-explore-heading"><h2>{__msg("fanWeb.exploreNeeds")}</h2><Link aria-label={__msg("fanWeb.exploreAllNeeds")} to={`/wall/explore${page.search}`}>{__msg("fanWeb.all")} <span aria-hidden="true">&rsaquo;</span></Link></div>
    {query.isError ? <button className="wall-explore-retry" onClick={() => query.refetch()} type="button">{__msg("fanWeb.couldNotLoadNeedsRetry")}</button> : null}
    <div className="wall-need-icons">{quick.map(([key, label, Icon, field]) => {
      const selected = wallFilterSelected(filters, key, field);
      return <button aria-pressed={selected} className={`wall-need-icon${selected ? " is-active" : ""}`} key={key} type="button" onClick={event => {
        wallHaptic();
        const glyph = event.currentTarget.querySelector(".wall-need-glass");
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) glyph.animate([{ transform: "scale(1)" }, { transform: "scale(.86)", offset: .35 }, { transform: "scale(1.08)", offset: .7 }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.3,.7,.3,1)" });
        onSelect(toggleWallFilter(filters, key, field));
        if (!selected) void showHint(key, event.currentTarget);
      }}><span className="wall-need-glass">{key === "right_now" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg> : <Icon aria-hidden="true" />}{key === "right_now" && query.data?.counts?.right_now > 0 ? <i className="wall-need-live" aria-hidden="true" /> : null}</span><b>{key === "meet_people" ? __msg("wallNeeds.company") : key === "recommendation" ? __msg("wallNeeds.tips") : label}</b></button>;
    })}<button className={`wall-need-icon${moreSelected ? " is-active" : ""}`} aria-label={__msg("wallNeeds.more")} type="button" onClick={() => { wallHaptic(); navigate(`/wall/explore${page.search}`, { state: { wallMoreHint: true } }); }}><span className="wall-need-glass"><FiMoreHorizontal aria-hidden="true" /></span><b>{__msg("wallNeeds.more")}</b></button></div>
    {bubble}
  </section>;
}
