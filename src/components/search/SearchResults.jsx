import { Link } from "react-router-dom";
import { FiBookmark, FiChevronRight, FiCompass, FiFileText, FiGrid, FiMapPin, FiMessageCircle } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { resolveMediaUrl } from "../../utils/media";

const resultIcons = {
  journey: FiCompass,
  place: FiMapPin,
  post: FiMessageCircle,
  saved: FiBookmark,
  seen: FiFileText,
  world: FiGrid,
};

function ResultThumb({ item }) {
  if (item.type === "person") {
    return <FanAvatar name={item.title} size="h-12 w-12" src={item.image} />;
  }
  const Icon = resultIcons[item.type] || FiGrid;
  const image = resolveMediaUrl(item.image);
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-atseen-line bg-atseen-surface-2 text-atseen-blue">
      {image ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={image} /> : <Icon aria-hidden="true" />}
    </span>
  );
}

function ResultMeta({ item }) {
  const bits = [];
  if (item.category) bits.push(item.category);
  if (item.location?.city) bits.push(item.location.country ? `${item.location.city}, ${item.location.country}` : item.location.city);
  if (item.createdAt) bits.push(new Date(item.createdAt).toLocaleDateString());
  return bits.length ? <p className="mt-1 truncate text-[11px] text-atseen-dim">{bits.join(" - ")}</p> : null;
}

export function SearchResultRow({ item }) {
  const isPerson = item.type === "person";
  return (
    <Link
      className="group flex min-h-[64px] items-center gap-3 rounded-[14px] px-0 py-2 transition hover:bg-white/[0.035]"
      to={item.route || "/search"}
    >
      <ResultThumb item={item} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-extrabold text-atseen-text">
          <span className="truncate">{item.title}</span>
          {item.verified ? <VerifiedBadge /> : null}
        </span>
        {item.subtitle ? <span className="mt-0.5 block truncate text-xs font-semibold text-atseen-muted">{item.subtitle}</span> : null}
        {item.description ? <span className="mt-1 block line-clamp-2 text-xs leading-5 text-atseen-muted">{item.description}</span> : null}
        <ResultMeta item={item} />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        {item.saved ? <FiBookmark aria-label="Saved" className="text-atseen-blue" fill="currentColor" /> : null}
        {isPerson && item.metadata?.canSeeYou ? <span className="hidden rounded-full border border-atseen-blue/30 px-2 py-1 text-[10px] font-bold text-atseen-blue sm:inline">I see you</span> : null}
        <FiChevronRight aria-hidden="true" className="text-atseen-dim transition group-hover:text-atseen-blue" />
      </span>
    </Link>
  );
}

function sectionLabel(type) {
  return {
    journeys: "Journeys",
    people: "People",
    places: "Places",
    posts: "Posts",
    saved: "Saved",
    seens: "Seens",
    worlds: "Worlds",
  }[type] || type;
}

export function SearchSection({ data, onSeeAll, type }) {
  const items = data?.items || [];
  if (!items.length) return null;
  return (
    <section className="mt-6" aria-labelledby={`search-section-${type}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-white/[0.42]" id={`search-section-${type}`}>
          {sectionLabel(type)} {typeof data.total === "number" ? <span className="text-atseen-blue">{data.total}</span> : null}
        </h2>
        <button className="text-xs font-bold text-atseen-blue hover:text-white" onClick={() => onSeeAll(type)} type="button">See all</button>
      </div>
      <div className="grid gap-1">
        {items.map((item) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} />)}
      </div>
    </section>
  );
}

export function SearchAllResults({ onSeeAll, sections = {} }) {
  return (
    <div aria-live="polite">
      {["people", "worlds", "seens", "posts", "places", "journeys"].map((type) => (
        <SearchSection data={sections[type]} key={type} onSeeAll={onSeeAll} type={type} />
      ))}
    </div>
  );
}

export function SearchTypedResults({ items = [] }) {
  return (
    <div className="mt-4 grid gap-1" aria-live="polite">
      {items.map((item) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} />)}
    </div>
  );
}

export function ResultCountAnnouncer({ count, query }) {
  return (
    <p className="sr-only" aria-live="polite">
      {count} results for {query}
    </p>
  );
}

export function SearchTypeNote({ type }) {
  if (type !== "saved") return null;
  return (
    <p className="mt-4 rounded-2xl border border-atseen-line bg-atseen-surface p-4 text-xs leading-5 text-atseen-muted">
      Saved search is private. This backend snapshot does not include a saved-item model yet, so no saved records are exposed or fabricated.
    </p>
  );
}
