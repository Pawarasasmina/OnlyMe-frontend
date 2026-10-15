import { Link } from "react-router-dom";
import { atseenCreators } from "../../data/atseenMockData";
import FanAvatar from "../fanWeb/shared/FanAvatar";

const people = [
  ["lina", "Lina"],
  ["ethan", "Ethan"],
  ["anna", "Anna"],
  ["omar", "Omar"],
  ["mia", "Mia"],
  ["sofia", "Sofia"],
];

const fallbackTrending = ["Fitness", "Paris", "Tech", "Business", "Mindset", "Tokyo style"];

function SearchSectionTitle({ children, className = "", id }) {
  return (
    <h2 className={`text-[12px] font-extrabold uppercase tracking-[0.22em] text-white/[0.42] ${className}`} id={id}>
      {children}
    </h2>
  );
}

function SearchDefaultState({ defaults, loading, onSearch }) {
  const serverTrending = defaults?.trending?.length ? defaults.trending : [];
  const trending = [...serverTrending, ...fallbackTrending.map((label) => ({ label }))]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.label?.toLowerCase() === item.label?.toLowerCase()) === index)
    .slice(0, 6);
  const recent = defaults?.recent?.[0]?.query || "morning routine · ethan brooks";

  if (loading) {
    return (
      <div className="mt-6 space-y-8" role="status">
        <div>
          <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 flex gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-[74px] w-[58px] animate-pulse rounded-full bg-white/[0.055]" key={index} />
            ))}
          </div>
        </div>
        <div>
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 flex flex-wrap gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="h-[52px] w-24 animate-pulse rounded-full bg-white/[0.055]" key={index} />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading search discovery</span>
      </div>
    );
  }

  return (
    <div className="space-y-7 pt-2">
      <section aria-labelledby="search-people">
        <SearchSectionTitle id="search-people">People</SearchSectionTitle>
        <div className="atseen-hide-scrollbar mt-4 flex justify-between gap-3 overflow-x-auto pb-1">
          {people.map(([id, label]) => {
            const creator = atseenCreators[id];
            return (
              <Link className="w-[56px] shrink-0 text-center" key={id} to={`/profile/${encodeURIComponent(creator?.username || id)}`}>
                <FanAvatar className="mx-auto ring-0" name={creator?.name || label} size="h-[52px] w-[52px]" src={creator?.avatar} />
                <span className="mt-2 block truncate text-[10px] font-medium text-white">{label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="trending-searches">
        <SearchSectionTitle id="trending-searches">Trending</SearchSectionTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {trending.map((item) => (
            <button className="min-h-[43px] rounded-full border border-[#29303a] bg-[#11151b] px-[18px] text-[14px] font-bold text-[#aebbd0] transition hover:border-atseen-blue/55 hover:bg-atseen-blue/10 hover:text-white" key={item.label} onClick={() => onSearch(item.label)} type="button">
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-searches">
        <SearchSectionTitle id="recent-searches">Recent</SearchSectionTitle>
        <button className="mt-3 block text-left text-[14px] font-medium text-[#76849a] transition hover:text-white/70" onClick={() => onSearch(recent)} type="button">
          {recent}
        </button>
      </section>
    </div>
  );
}

export default SearchDefaultState;
