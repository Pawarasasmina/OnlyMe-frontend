import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiBookmark, FiChevronRight, FiCompass, FiFileText, FiGrid, FiMapPin, FiMessageCircle, FiUserCheck, FiUserPlus } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { profileService } from "../../services/profileService";
import { analyticsService } from "../../services/analyticsService";
import { savedService } from "../../services/savedService";
import { resolveMediaUrl } from "../../utils/media";
import { followInvalidationKeys } from "../../utils/savedPeople";

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

export function SearchResultRow({ item, position = 0, searchCategory = "" }) {
  const isPerson = item.type === "person";
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(Boolean(item.following ?? item.isFollowing ?? item.metadata?.following));
  const [saved, setSaved] = useState(Boolean(item.saved));
  const [error, setError] = useState("");
  const username = item.metadata?.username || item.username || "";
  const saveTarget = item.saveTarget || null;
  const follow = useMutation({
    mutationFn: () => profileService.toggleFollow(username),
    onSuccess: (response) => {
      const active = Boolean(response.data?.data?.relationship?.active);
      setFollowing(active);
      setError("");
      followInvalidationKeys().forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },
    onError: (requestError) => {
      setError(requestError.response?.data?.message || "Unable to update follow.");
    },
  });
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
    setFollowing(Boolean(item.following ?? item.isFollowing ?? item.metadata?.following));
  }, [item.following, item.isFollowing, item.metadata?.following]);

  useEffect(() => {
    setSaved(Boolean(item.saved));
  }, [item.saved]);

  const content = (
    <>
      <ResultThumb item={item} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-extrabold text-atseen-text">
          <span className="truncate">{item.title}</span>
          {item.verified ? <VerifiedBadge /> : null}
        </span>
        {item.subtitle ? <span className="mt-0.5 block truncate text-xs font-semibold text-atseen-muted">{item.subtitle}</span> : null}
        {item.description ? <span className="mt-1 block line-clamp-2 text-xs leading-5 text-atseen-muted">{item.description}</span> : null}
        <ResultMeta item={item} />
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
      <div className="group flex min-h-[64px] items-center gap-3 rounded-[14px] px-0 py-2 transition hover:bg-white/[0.035]">
        <Link className="flex min-w-0 flex-1 items-center gap-3" onClick={trackClick} to={item.route || "/search"}>
          {content}
        </Link>
        <button
          aria-label={`${following ? "Unfollow" : "Follow"} ${item.title}`}
          className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition ${following ? "border-white/15 bg-white/10 text-white" : "border-atseen-blue/35 bg-atseen-blue/10 text-atseen-blue hover:bg-atseen-blue/20"}`}
          disabled={follow.isPending || !username}
          onClick={() => follow.mutate()}
          type="button"
        >
          {following ? <FiUserCheck aria-hidden="true" /> : <FiUserPlus aria-hidden="true" />}
          {following ? "Following" : "Follow"}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex min-h-[64px] items-center gap-3 rounded-[14px] px-0 py-2 transition hover:bg-white/[0.035]">
      <Link className="flex min-w-0 flex-1 items-center gap-3" onClick={trackClick} to={item.route || "/search"}>
        {content}
      </Link>
      <span className="flex shrink-0 items-center gap-2">
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
        <Link aria-label={`Open ${item.title}`} className="grid h-9 w-9 place-items-center rounded-full text-atseen-dim transition hover:text-atseen-blue" onClick={trackClick} to={item.route || "/search"}>
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
        {items.map((item, index) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} position={index + 1} searchCategory={type} />)}
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
      {items.map((item, index) => <SearchResultRow item={item} key={`${item.type}-${item.id}`} position={index + 1} searchCategory={item.type} />)}
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
