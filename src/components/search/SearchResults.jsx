import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiBookmark, FiChevronRight, FiCompass, FiFileText, FiGrid, FiMapPin, FiMessageCircle } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import PublicationCoverMedia from "../publication/PublicationCoverMedia";
import { analyticsService } from "../../services/analyticsService";
import { savedService } from "../../services/savedService";
import { resolveMediaUrl } from "../../utils/media";

const resultIcons = {
  journey: FiCompass,
  book: FiFileText,
  place: FiMapPin,
  post: FiMessageCircle,
  saved: FiBookmark,
  seen: FiFileText,
  world: FiGrid,
};

function ResultThumb({ item }) {
  if (item.type === "person" || item.type === "post") {
    const author = item.metadata?.author;
    return <FanAvatar className="ring-1 ring-[#526681]" name={author?.name || item.title} size={item.type === "post" ? "h-10 w-10" : "h-11 w-11"} src={author?.avatar || item.image} />;
  }
  const Icon = resultIcons[item.type] || FiGrid;
  const image = resolveMediaUrl(item.image);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-atseen-surface-2 text-atseen-blue">
      {item.coverMedia ? <PublicationCoverMedia alt={`${item.title} cover`} autoPlay className="h-full w-full object-cover" loading="lazy" loop media={item.coverMedia} preload="metadata" /> : image ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={image} /> : <Icon aria-hidden="true" />}
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

export function SearchResultRow({ item, position = 0, searchCategory = "" }) {
  const isPerson = item.type === "person";
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(Boolean(item.saved));
  const [error, setError] = useState("");
  const personSubtitle = [item.metadata?.profileCategory || item.category, item.location?.city].filter(Boolean).join(" · ") || item.subtitle;
  const creatorName = item.metadata?.creator?.name || item.metadata?.author?.name || item.subtitle;
  const wallTitle = item.metadata?.isOwn ? "You" : item.metadata?.author?.name || "User";
  const saveTarget = item.saveTarget || null;
  const save = useMutation({
    mutationFn: async () => {
      if (!saveTarget?.id) return null;
      if (saveTarget.type === "place") return saved ? savedService.unsavePlace(saveTarget.id) : savedService.savePlace(saveTarget.id);
      if (saveTarget.type === "journey") return saved ? savedService.unsaveJourney(saveTarget.id) : savedService.saveJourney(saveTarget.id);
      if (saveTarget.type === "book") return saved ? savedService.unsaveBook(saveTarget.id) : savedService.saveBook(saveTarget.id);
      return null;
    },
    onSuccess: (response) => {
      const nextSaved = Boolean(response?.data?.data?.saved);
      setSaved(nextSaved);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
    onError: (requestError) => {
      setError(requestError.response?.data?.message || "Unable to update Saved.");
    },
  });

  useEffect(() => {
    setSaved(Boolean(item.saved));
  }, [item.saved]);

  const content = (
    <>
      <ResultThumb item={item} />
      <span className="min-w-0 flex-1">
        <span className={`flex items-center gap-1.5 truncate text-atseen-text ${searchCategory === "posts" ? "text-[13px] font-bold" : "text-sm font-extrabold"}`}>
          <span className="truncate">{searchCategory === "posts" ? wallTitle : item.title}</span>
          {item.verified ? <VerifiedBadge /> : null}
        </span>
        {searchCategory === "posts" && item.description ? <span className="mt-px block truncate text-[12px] font-normal leading-[17px] text-[#78869b]">{item.description}</span> : (isPerson ? personSubtitle : creatorName) ? <span className="mt-0.5 block truncate text-xs font-medium text-[#78869b]">{isPerson ? personSubtitle : creatorName}</span> : null}
        {searchCategory === "typed" ? <ResultMeta item={item} /> : null}
        {error ? <span className="mt-1 block text-[11px] font-semibold text-atseen-danger" role="alert">{error}</span> : null}
      </span>
    </>
  );
  const trackClick = () => {
    if (!item?.id) return;
    void analyticsService.trackSearchResultClick({
      entityId: item.id,
      entityType: item.type === "person" ? "profile" : item.type === "post" ? "feed_post" : item.type,
      position,
      searchCategory,
    });
  };

  if (isPerson) {
    return (
      <div className="group flex min-h-[56px] items-center gap-3 rounded-[12px] px-0 py-1.5 transition hover:bg-white/[0.035]">
        <Link className="flex min-w-0 flex-1 items-center gap-3" onClick={trackClick} to={item.route || "/search"}>
          {content}
        </Link>
        <Link aria-label={`Open ${item.title}`} className="grid h-9 w-9 place-items-center text-lg text-white/25 transition hover:text-atseen-blue" onClick={trackClick} to={item.route || "/search"}><FiChevronRight /></Link>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-3 overflow-hidden rounded-[12px] px-0 transition hover:bg-white/[0.035] ${searchCategory === "posts" ? "min-h-[57px] py-2" : "min-h-[56px] py-1.5"}`}>
      <Link className="flex min-w-0 flex-1 items-center gap-3" onClick={trackClick} to={item.route || "/search"}>
        {content}
      </Link>
      <span className="flex shrink-0 items-center gap-2">
        {searchCategory === "worlds" && item.metadata?.price ? <span className="text-xs font-black text-[#78baff]">✦{item.metadata.price}</span> : null}
        {saveTarget ? (
          <button
            aria-label={`${saved ? "Remove from" : "Save to"} Saved`}
            className={`grid h-9 w-9 place-items-center rounded-full border transition ${saved ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-white/[0.035] text-atseen-muted hover:text-white"}`}
            disabled={save.isPending}
            onClick={() => save.mutate()}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
        ) : saved ? <FiBookmark aria-label="Saved" className="text-atseen-blue" fill="currentColor" /> : null}
        <Link aria-label={`Open ${item.title}`} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:text-atseen-blue ${searchCategory === "posts" ? "text-white/25" : "text-atseen-dim"}`} onClick={trackClick} to={item.route || "/search"}>
          <FiChevronRight aria-hidden="true" />
        </Link>
      </span>
    </div>
  );
}

function sectionLabel(type) {
  return {
    journeys: "Journeys",
    people: "People",
    places: "Places",
    posts: "Wall",
    saved: "Saved",
    seens: "Seens",
    worlds: "Experiences",
  }[type] || type;
}

export function SearchSection({ data, type }) {
  const items = data?.items || [];
  if (!items.length) return null;
  return (
    <section className="mt-6" aria-labelledby={`search-section-${type}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7f8999]" id={`search-section-${type}`}>
          {sectionLabel(type)}
        </h2>
      </div>
      <div className={`grid ${type === "posts" ? "gap-0" : "gap-1"}`}>
        {items.map((item, index) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} position={index + 1} searchCategory={type} />)}
      </div>
    </section>
  );
}

export function SearchAllResults({ priority = "people", sections = {} }) {
  const sectionOrder = [priority, "people", "worlds", "seens", "posts"]
    .filter((type, index, items) => items.indexOf(type) === index);
  return (
    <div aria-live="polite">
      {sectionOrder.map((type) => (
        <SearchSection data={sections[type]} key={type} type={type} />
      ))}
    </div>
  );
}

export function SearchTypedResults({ items = [] }) {
  return (
    <div className="mt-4 grid gap-1" aria-live="polite">
      {items.map((item, index) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} position={index + 1} searchCategory="typed" />)}
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
      Saved search is private. Open Profile - Saved to browse your saved library categories.
    </p>
  );
}
