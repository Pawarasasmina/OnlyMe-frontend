import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import SeenEyeMark from "../branding/SeenEyeMark";
import { FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import { atseenCreators } from "../../data/atseenMockData";

const people = [
  { id: "seen", get label() { return __msg("branding.seen"); }, get status() { return __msg("search.official"); }, tone: "blue", official: true },
  { id: "lina", get label() { return __msg("search.lina"); }, get status() { return __msg("constants.atSeen"); }, tone: "blue", badge: "eye" },
  { id: "ethan", get label() { return __msg("search.ethan"); }, get status() { return __msg("constants.atTheGym"); }, tone: "orange", badge: "🏋" },
  { id: "anna", get label() { return __msg("search.anna"); }, get status() { return __msg("constants.traveling"); }, tone: "purple", badge: "✈" },
  { id: "omar", get label() { return __msg("search.omar"); }, get status() { return __msg("constants.coffeeBreak"); }, tone: "gold", badge: "☕" },
  { id: "mia", get label() { return __msg("search.mia"); }, get status() { return __msg("constants.celebrating"); }, tone: "gold", badge: "🎉" },
];
const fallbackTrending = ["Fitness", "Paris", "Tech", "Business", "Mindset", "Tokyo style"];

function SearchSectionTitle({ children, id }) {
  __useUiLanguage();
  return <h2 className="search-discover-section-title" id={id}>{children}</h2>;
}

function SearchDefaultState({ defaults, loading, onSearch }) {
  __useUiLanguage();
  const serverTrending = defaults?.trending?.length ? defaults.trending : [];
  const trending = [...serverTrending, ...fallbackTrending.map((label) => ({ label }))]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.label?.toLowerCase() === item.label?.toLowerCase()) === index)
    .slice(0, 6);
  const recent = defaults?.recent?.[0]?.query || __msg("search.morningRoutineEthanBrooks");
  if (loading) return <div className="mt-6 space-y-8" role="status"><div className="h-3 w-16 animate-pulse rounded-full bg-white/10" /><div className="flex gap-4">{Array.from({ length: 6 }).map((_, index) => <div className="h-[90px] w-[62px] shrink-0 animate-pulse rounded-full bg-white/[0.055]" key={index} />)}</div><span className="sr-only">{__msg("search.loadingSearchDiscovery")}</span></div>;
  return <div className="search-discover-default">
    <section aria-labelledby="search-people"><SearchSectionTitle id="search-people">{__msg("search.people")}</SearchSectionTitle><div className="search-discover-people atseen-hide-scrollbar">
      {people.map((person) => { const creator = atseenCreators[person.id]; return <Link className="search-discover-person" key={person.id} to={person.official ? "/profile/seen" : `/profile/${encodeURIComponent(creator?.username || person.id)}`}>
        <span className={`search-discover-avatar ${person.official ? "is-official" : ""}`}>{person.official ? <SeenEyeMark /> : <img alt="" src={creator?.avatar} />}{person.badge ? <span className={`search-discover-status-badge ${person.badge === "eye" ? "is-at-seen" : ""}`}>{person.badge === "eye" ? <SeenEyeMark /> : person.badge}</span> : null}</span>
        <span className="search-discover-person-name">{person.label}{person.official ? <FiCheck aria-label={__msg("fanWeb.verified")} /> : null}</span><span className={`search-discover-person-status is-${person.tone}`}>{__enumLabel(person.status)}</span>
      </Link>; })}
    </div></section>
    <section aria-labelledby="trending-searches"><SearchSectionTitle id="trending-searches">{__msg("discover.trending")}</SearchSectionTitle><div className="search-discover-trending">{trending.map((item) => <button key={item.label} onClick={() => onSearch(item.label)} type="button">{item.label}</button>)}</div></section>
    <section aria-labelledby="recent-searches"><SearchSectionTitle id="recent-searches">{__msg("fanWeb.recent")}</SearchSectionTitle><button className="search-discover-recent" onClick={() => onSearch(recent)} type="button">{recent}</button></section>
  </div>;
}

export default SearchDefaultState;
