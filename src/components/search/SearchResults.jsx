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

function trackResult(item, position, searchCategory) {
  if (!item?.id) return;
  void analyticsService.trackSearchResultClick({
    entityId: item.id,
    entityType: item.type === "person" ? "profile" : item.type === "post" ? "feed_post" : item.type,
    position,
    searchCategory,
  });
}

function SeenResults({ items, preview = false }) {
  return <div className={preview ? "search-seen-strip atseen-hide-scrollbar" : "search-seen-grid"}>
    {items.map((item, index) => {
      const chapters = item.metadata?.chapters || [];
      const chapterCount = Number(item.metadata?.chapterCount) || chapters.length;
      const creator = item.metadata?.creator || {};
      return <Link aria-label={`Open Seen ${item.title}`} className="search-seen-card" key={`${item.type}-${item.id}`} onClick={() => trackResult(item, index + 1, "seens")} to={item.route || "/search"}>
        <span className="search-seen-media">
          {item.coverMedia ? <PublicationCoverMedia alt="" autoPlay className="search-result-cover-media" loading="lazy" loop media={item.coverMedia} preload="metadata" /> : resolveMediaUrl(item.image) ? <img alt="" loading="lazy" src={resolveMediaUrl(item.image)} /> : <span className="search-result-media-fallback"><FiFileText /></span>}

        </span>
        <span className="search-seen-copy">
          {item.category ? <small className="search-seen-category">{item.category}</small> : null}
          <strong>{item.title}</strong>
          {chapters.length ? <span className="search-seen-chapters">
            {chapters.slice(0, 2).map((chapter, chapterIndex) => <span key={chapter.id || chapterIndex}><b>{String(chapterIndex + 1).padStart(2, "0")}</b><em>{typeof chapter === "string" ? chapter : chapter.title || chapter.preview || chapter.p}</em></span>)}
          </span> : null}
        </span>
        <span className="search-seen-byline"><FanAvatar name={creator.name || "Creator"} size="h-4 w-4" src={creator.avatar} /><span>{creator.name?.split(" ")[0] || "Creator"} · {chapterCount} chapters</span></span>
      </Link>;
    })}
  </div>;
}

function ExperienceResults({ items }) {
  return <div className="search-experience-grid">
    {items.map((item, index) => <Link className="search-experience-card" key={`${item.type}-${item.id}`} onClick={() => trackResult(item, index + 1, "experiences")} to={item.route || "/search"}>
      <span className="search-experience-cover">
        {item.coverMedia ? <PublicationCoverMedia alt="" autoPlay className="search-result-cover-media" loading="lazy" loop media={item.coverMedia} preload="metadata" /> : resolveMediaUrl(item.image) ? <img alt="" loading="lazy" src={resolveMediaUrl(item.image)} /> : <span className="search-result-media-fallback"><FiGrid /></span>}
      </span>
      <span className="search-experience-copy">
        <strong>{item.title}</strong>
        <span>{[item.metadata?.creator?.name?.split(" ")[0], item.description].filter(Boolean).join(" \u00b7 ")}</span>
      </span>
      <span className="search-experience-price">{item.metadata?.unlocked ? "\u2713" : Number(item.metadata?.price) > 0 ? <><img alt="coins" src="/brand/goldcoin.png" />{Number(item.metadata.price).toLocaleString()}</> : "Free"}</span>
    </Link>)}
  </div>;
}

function WallResults({ items }) {
  return <div className="search-wall-list">
    {items.map((item, index) => {
      const author = item.metadata?.author || {};
      const authorName = item.metadata?.isOwn ? "You" : author.name || "User";
      return <Link className="search-wall-result" key={`${item.type}-${item.id}`} onClick={() => trackResult(item, index + 1, "wall_notes")} to={item.route || "/wall"}>
        <span className="search-wall-result-copy">
          <span className="search-wall-result-text">{item.description || item.title}</span>
          <span className="search-wall-result-byline">
            <FanAvatar className="search-wall-avatar" name={authorName} size="h-6 w-6" src={author.avatar} />
            <strong>{authorName}</strong>
            <time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</time>
          </span>
          <span className="search-wall-result-meta">{item.category ? <em>#{item.category.replace(/^#/u, "")}</em> : null}{item.location?.city ? <small><FiMapPin />{item.location.city}</small> : null}</span>
        </span>
        <FiChevronRight aria-hidden="true" className="search-wall-open" />
      </Link>;
    })}
  </div>;
}

function WorldResults({ items }) {
  return <div className="search-world-list">
    {items.map((item, index) => <Link className="search-world-card" key={`${item.type}-${item.id}`} onClick={() => trackResult(item, index + 1, "worlds")} to={item.route || "/search"}>
      <span className="search-world-cover">{item.coverMedia ? <PublicationCoverMedia alt="" autoPlay className="search-result-cover-media" loading="lazy" loop media={item.coverMedia} preload="metadata" /> : resolveMediaUrl(item.image) ? <img alt="" loading="lazy" src={resolveMediaUrl(item.image)} /> : <FiGrid />}</span>
      <span className="search-world-copy">
        <small>World by {item.metadata?.creator?.name || "Creator"}</small>
        <strong>{item.title}</strong>
        {item.description ? <span>{item.description}</span> : null}
        <em>{item.metadata?.subscriptionPriceCents ? `$${(Number(item.metadata.subscriptionPriceCents) / 100).toFixed(2)}/month` : "Open World"}{item.metadata?.chapterCount ? ` · ${item.metadata.chapterCount} chapters` : ""}</em>
      </span>
      <FiChevronRight aria-hidden="true" />
    </Link>)}
  </div>;
}

export function SearchResultRow({ item, position = 0, searchCategory = "" }) {
  const isPerson = item.type === "person";
  const personRoute = isPerson && (item.id === "seen" || item.metadata?.username === "seen" || item.route === "/profile/seen") ? "/profile/seen" : item.route || "/search";
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(Boolean(item.saved));
  const [error, setError] = useState("");
  const personSubtitle = [item.metadata?.profileCategory || item.category, item.location?.city].filter(Boolean).join(" · ") || item.subtitle;
  const status = item.metadata?.activeStatus || item.metadata?.status;
  const statusLabel = typeof status === "string" ? status : status?.label || status?.text || "";
  const statusEmoji = typeof status === "object" ? status?.emoji : item.metadata?.statusEmoji;
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
      <div className="search-person-row group flex items-center gap-3">
        <Link className="flex min-w-0 flex-1 items-center gap-3" onClick={trackClick} to={personRoute}>
          <span className={`search-person-avatar ${item.metadata?.hasActiveStory ? "has-story" : ""}`}><ResultThumb item={item} />{statusEmoji ? <span className="search-person-status-badge">{statusEmoji}</span> : null}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-extrabold text-atseen-text"><span className="truncate">{item.title}</span>{item.verified ? <VerifiedBadge /> : null}</span>
            <span className="mt-0.5 block truncate text-xs font-medium text-[#78869b]">{statusLabel ? <><em className="search-person-status">{statusLabel}</em>{personSubtitle ? " \u00b7 " : ""}</> : null}{personSubtitle}</span>

          </span>
        </Link>
        <Link aria-label={`Open ${item.title}`} className="grid h-9 w-9 place-items-center text-lg text-white/25 transition hover:text-atseen-blue" onClick={trackClick} to={personRoute}><FiChevronRight /></Link>
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
    wall_notes: "Wall",
    saved: "Saved",
    seens: "Seen",
    experiences: "Experiences",
    worlds: "Worlds",
  }[type] || type;
}

export function SearchSection({ data, type, preview = false }) {
  const items = data?.items || [];
  if (!items.length) return null;
  return (
    <section className="search-results-section" aria-labelledby={`search-section-${type}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="search-results-heading" id={`search-section-${type}`}>
          {sectionLabel(type)}
        </h2>
      </div>
      {type === "seens" ? <SeenResults items={items} preview={preview} /> : null}
      {type === "experiences" ? <ExperienceResults items={items} /> : null}
      {type === "worlds" ? <WorldResults items={items} /> : null}
      {["posts", "wall_notes"].includes(type) ? <WallResults items={items} /> : null}
      {!["experiences", "posts", "seens", "wall_notes", "worlds"].includes(type) ? <div className="grid gap-1">{items.map((item, index) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} position={index + 1} searchCategory={type} />)}</div> : null}
    </section>
  );
}

export function SearchAllResults({ sections = {} }) {
  const sectionOrder = ["people", "experiences", "seens", "wall_notes", "worlds"]
    .filter((type, index, items) => items.indexOf(type) === index);
  return (
    <div aria-live="polite">
      {sectionOrder.map((type) => (
        <SearchSection data={sections[type]} key={type} type={type} preview />
      ))}
    </div>
  );
}

export function SearchTypedResults({ items = [] }) {
  const type = items[0]?.type === "seen" ? "seens" : items[0]?.type === "experience" ? "experiences" : items[0]?.type === "post" ? "wall_notes" : items[0]?.type === "world" || items[0]?.type === "book" ? "worlds" : "";
  if (type) return <SearchSection data={{ items }} type={type} />;
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
