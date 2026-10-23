import SeenEyeMark from "../branding/SeenEyeMark";
import { FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import { atseenCreators } from "../../data/atseenMockData";

const people = [
  { id: "seen", label: "seen", status: "Official", tone: "blue", official: true },
  { id: "lina", label: "Lina", status: "At seen", tone: "blue", badge: "eye" },
  { id: "ethan", label: "Ethan", status: "At the gym", tone: "orange", badge: "🏋" },
  { id: "anna", label: "Anna", status: "Traveling", tone: "purple", badge: "✈" },
  { id: "omar", label: "Omar", status: "Coffee break", tone: "gold", badge: "☕" },
  { id: "mia", label: "Mia", status: "Celebrating", tone: "gold", badge: "🎉" },
];
const fallbackTrending = ["Fitness", "Paris", "Tech", "Business", "Mindset", "Tokyo style"];

function SearchSectionTitle({ children, id }) {
  return <h2 className="search-discover-section-title" id={id}>{children}</h2>;
}

function SearchDefaultState({ defaults, loading, onSearch }) {
  const serverTrending = defaults?.trending?.length ? defaults.trending : [];
  const trending = [...serverTrending, ...fallbackTrending.map((label) => ({ label }))]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.label?.toLowerCase() === item.label?.toLowerCase()) === index)
    .slice(0, 6);
  const recent = defaults?.recent?.[0]?.query || "morning routine · ethan brooks";
  if (loading) return <div className="mt-6 space-y-8" role="status"><div className="h-3 w-16 animate-pulse rounded-full bg-white/10" /><div className="flex gap-4">{Array.from({ length: 6 }).map((_, index) => <div className="h-[90px] w-[62px] shrink-0 animate-pulse rounded-full bg-white/[0.055]" key={index} />)}</div><span className="sr-only">Loading search discovery</span></div>;
  return <div className="search-discover-default">
    <section aria-labelledby="search-people"><SearchSectionTitle id="search-people">People</SearchSectionTitle><div className="search-discover-people atseen-hide-scrollbar">
      {people.map((person) => { const creator = atseenCreators[person.id]; return <Link className="search-discover-person" key={person.id} to={person.official ? "/profile/seen" : `/profile/${encodeURIComponent(creator?.username || person.id)}`}>
        <span className={`search-discover-avatar ${person.official ? "is-official" : ""}`}>{person.official ? <SeenEyeMark /> : <img alt="" src={creator?.avatar} />}{person.badge ? <span className={`search-discover-status-badge ${person.badge === "eye" ? "is-at-seen" : ""}`}>{person.badge === "eye" ? <SeenEyeMark /> : person.badge}</span> : null}</span>
        <span className="search-discover-person-name">{person.label}{person.official ? <FiCheck aria-label="Verified" /> : null}</span><span className={`search-discover-person-status is-${person.tone}`}>{person.status}</span>
      </Link>; })}
    </div></section>
    <section aria-labelledby="trending-searches"><SearchSectionTitle id="trending-searches">Trending</SearchSectionTitle><div className="search-discover-trending">{trending.map((item) => <button key={item.label} onClick={() => onSearch(item.label)} type="button">{item.label}</button>)}</div></section>
    <section aria-labelledby="recent-searches"><SearchSectionTitle id="recent-searches">Recent</SearchSectionTitle><button className="search-discover-recent" onClick={() => onSearch(recent)} type="button">{recent}</button></section>
  </div>;
}

export default SearchDefaultState;
