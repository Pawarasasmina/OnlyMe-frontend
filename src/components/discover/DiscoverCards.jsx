import { memo, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiEye, FiMapPin, FiMessageCircle, FiPlus, FiRefreshCw, FiUsers } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanCard from "../fanWeb/shared/FanCard";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import StoryViewer from "../stories/StoryViewer";
import { resolveMediaUrl } from "../../utils/media";
import { compactNumber } from "./discoverFormat";

function MediaBackdrop({ className = "", src, title = "" }) {
  const image = resolveMediaUrl(src);
  if (image) {
    return <img alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" src={image} />;
  }

  return (
    <div aria-hidden="true" className={`grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_18%,rgba(138,184,255,.34),transparent_32%),linear-gradient(135deg,#111827,#07090d)] ${className}`}>
      <span className="text-3xl font-black text-white/20">{title.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

function ActionButton({ children, className = "", disabled = false, onClick, to, variant = "ghost" }) {
  const classes = `inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-atseen-blue ${
    variant === "primary"
      ? "bg-atseen-blue text-atseen-bg shadow-[0_12px_30px_rgba(94,155,255,.2)] hover:bg-white"
      : "border border-atseen-line bg-white/[0.045] text-atseen-text hover:border-atseen-blue/40 hover:bg-white/[0.075]"
  } ${className}`;
  if (to) return <Link className={classes} to={to}>{children}</Link>;
  return <button className={classes} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

export const DiscoverHeader = memo(function DiscoverHeader({ onRefresh, onSettings, onSearchChange, refreshing, search }) {
  return (
    <header className="sticky top-[57px] z-20 -mx-4 border-b border-atseen-line bg-atseen-bg/92 px-4 pb-4 pt-1 backdrop-blur md:top-0 md:-mx-6 md:px-6 md:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-atseen-blue">Discover</p>
          <h1 className="mt-1 text-[32px] font-black leading-none text-white">Discover</h1>
          <p className="mt-2 text-sm font-semibold text-atseen-muted">Personalized recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton onClick={onSettings}>Recommendation Settings</ActionButton>
          <button
            aria-label="Refresh Discover"
            className="grid h-10 w-10 place-items-center rounded-full border border-atseen-line bg-white/[0.045] text-atseen-muted transition hover:border-atseen-blue/40 hover:text-white disabled:opacity-50"
            disabled={refreshing}
            onClick={onRefresh}
            type="button"
          >
            <FiRefreshCw aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <label className="mt-4 block">
        <span className="sr-only">Search Discover</span>
        <input
          className="h-12 w-full rounded-[15px] border border-atseen-line bg-[#11151b] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-atseen-blue"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search creators, worlds, tags, categories, experiences"
          type="search"
          value={search}
        />
      </label>
    </header>
  );
});

export const DiscoverFilters = memo(function DiscoverFilters({ active, filters, onChange }) {
  return (
    <nav aria-label="Discover filters" className="atseen-hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-4 md:-mx-1 md:px-1">
      {filters.map((filter) => {
        const selected = active === filter;
        return (
          <button
            aria-pressed={selected}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
              selected
                ? "border-atseen-blue bg-atseen-blue text-atseen-bg shadow-[0_10px_28px_rgba(94,155,255,.22)]"
                : "border-atseen-line bg-white/[0.035] text-atseen-muted hover:border-atseen-blue/40 hover:text-white"
            }`}
            key={filter}
            onClick={() => onChange(filter)}
            type="button"
          >
            {filter}
          </button>
        );
      })}
    </nav>
  );
});

export const FeaturedCreatorCard = memo(function FeaturedCreatorCard({ creator, followPending, onFollow }) {
  if (!creator) return null;
  return (
    <FanCard className="group overflow-hidden p-0 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-atseen-blue/28">
      <div className="relative min-h-[330px] overflow-hidden">
        <MediaBackdrop src={creator.cover || creator.previewThumbnails?.[0]} title={creator.name} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-atseen-bg/35 to-atseen-bg" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-end gap-4">
            <FanAvatar className="ring-4 ring-atseen-bg" name={creator.name} size="h-20 w-20" src={creator.avatar} />
            <div className="min-w-0 flex-1 pb-1">
              <p className="inline-flex rounded-full border border-atseen-blue/30 bg-atseen-blue/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-atseen-blue">
                {creator.whyRecommended || "Recommended"}
              </p>
              <h2 className="mt-3 flex items-center gap-2 text-3xl font-black text-white">
                <span className="truncate">{creator.name}</span>
                {creator.verified ? <VerifiedBadge className="h-5 w-5 text-xs" /> : null}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/58">@{creator.username}</p>
            </div>
          </div>
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/72">{creator.bio}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Followers" value={compactNumber(creator.followers)} />
            <Metric label="Subscribers" value={compactNumber(creator.subscribers)} />
            <Metric label="World members" value={compactNumber(creator.worldMembers)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(creator.tags || []).map((tag) => <TagPill key={tag}>{tag}</TagPill>)}
            {creator.location ? <TagPill icon={<FiMapPin />}>{creator.location}</TagPill> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton disabled={followPending} onClick={() => onFollow(creator)} variant="primary">{creator.following ? "Following" : "Follow"}</ActionButton>
            <ActionButton to={`/messages?user=${encodeURIComponent(creator.username)}`}><FiMessageCircle aria-hidden="true" /> Message</ActionButton>
            <ActionButton to={`/profile/${encodeURIComponent(creator.username)}`}>Visit World</ActionButton>
          </div>
        </div>
      </div>
    </FanCard>
  );
});

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/24 p-3 backdrop-blur">
      <strong className="block text-lg font-black text-white">{value}</strong>
      <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/42">{label}</span>
    </div>
  );
}

function TagPill({ children, icon = null }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[11px] font-bold text-white/72">{icon}{children}</span>;
}

export const DiscoverCreatorCard = memo(function DiscoverCreatorCard({ creator, followPending, onFollow }) {
  return (
    <article className="group w-[252px] shrink-0 overflow-hidden rounded-[20px] border border-atseen-line bg-[#101319] transition duration-300 hover:-translate-y-1 hover:border-atseen-blue/28 hover:shadow-glow">
      <Link aria-label={`View ${creator.name}`} className="block" to={`/profile/${encodeURIComponent(creator.username)}`}>
        <div className="relative h-28 overflow-hidden">
          <MediaBackdrop src={creator.cover || creator.previewThumbnails?.[0]} title={creator.name} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#101319]" />
          <FanAvatar className="absolute -bottom-7 left-4 ring-4 ring-[#101319]" name={creator.name} size="h-14 w-14" src={creator.avatar} />
        </div>
        <div className="px-4 pb-4 pt-9">
          <h3 className="flex items-center gap-1.5 text-base font-black text-white">
            <span className="truncate">{creator.name}</span>
            {creator.verified ? <VerifiedBadge /> : null}
          </h3>
          <p className="mt-0.5 truncate text-xs font-bold text-atseen-muted">@{creator.username}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate rounded-full bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-extrabold text-atseen-blue">{creator.category}</span>
            <span className="truncate text-[10px] font-bold text-white/40">{creator.location || "Global"}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-white/48">
            <span><strong className="text-white">{compactNumber(creator.followers)}</strong> followers</span>
            <span><strong className="text-white">{creator.subscriptionPrice}</strong></span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {(creator.previewThumbnails || []).slice(0, 3).map((thumb, index) => (
              <span className="h-12 flex-1 overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]" key={`${thumb}-${index}`}>
                <MediaBackdrop src={thumb} title={creator.name} />
              </span>
            ))}
            {!creator.previewThumbnails?.length ? <span className="h-12 flex-1 rounded-xl border border-dashed border-white/10 bg-white/[0.025]" /> : null}
          </div>
        </div>
      </Link>
      <div className="flex gap-2 px-4 pb-4">
        <ActionButton className="flex-1 px-3" disabled={followPending} onClick={() => onFollow(creator)} variant={creator.following ? "ghost" : "primary"}>{creator.following ? "Following" : "Follow"}</ActionButton>
        <ActionButton className="flex-1 px-3" to={`/profile/${encodeURIComponent(creator.username)}`}>View Profile</ActionButton>
      </div>
    </article>
  );
});

export const DiscoverSection = memo(function DiscoverSection({ children, title }) {
  const ref = useRef(null);
  const scroll = (direction) => {
    ref.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-white/42">{title}</h2>
        <div className="flex items-center gap-2">
          <button className="text-xs font-extrabold text-atseen-blue hover:text-white" type="button">See All</button>
          <button aria-label={`Scroll ${title} left`} className="hidden h-8 w-8 place-items-center rounded-full border border-atseen-line bg-white/[0.035] text-atseen-muted hover:text-white sm:grid" onClick={() => scroll(-1)} type="button"><FiArrowLeft /></button>
          <button aria-label={`Scroll ${title} right`} className="hidden h-8 w-8 place-items-center rounded-full border border-atseen-line bg-white/[0.035] text-atseen-muted hover:text-white sm:grid" onClick={() => scroll(1)} type="button"><FiArrowRight /></button>
        </div>
      </div>
      <div className="atseen-hide-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:-mx-1 md:px-1" ref={ref}>
        {children}
      </div>
    </section>
  );
});

export const CategoryCard = memo(function CategoryCard({ category, onClick }) {
  return (
    <button
      className="relative h-40 w-[220px] shrink-0 overflow-hidden rounded-[20px] border border-atseen-line p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-atseen-blue/30 hover:shadow-glow"
      onClick={() => onClick(category.title)}
      style={{ background: category.image }}
      type="button"
    >
      <span className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/72" />
      <span className="relative mt-16 block text-xl font-black text-white">{category.title}</span>
      <span className="relative mt-1 block text-xs font-bold text-white/65">{compactNumber(category.creatorCount)} creators</span>
    </button>
  );
});

export const WorldCard = memo(function WorldCard({ world }) {
  return (
    <article className="w-[270px] shrink-0 overflow-hidden rounded-[20px] border border-atseen-line bg-[#101319] transition duration-300 hover:-translate-y-1 hover:border-atseen-blue/28 hover:shadow-glow">
      <Link className="block" to={world.route || `/world/${world.id}`}>
        <div className="relative h-36 overflow-hidden">
          <MediaBackdrop src={world.cover} title={world.title} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#101319]" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <FanAvatar name={world.owner?.name} size="h-8 w-8" src={world.owner?.avatar} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-xs font-bold text-white">{world.owner?.name || "Creator"}{world.owner?.verified ? <VerifiedBadge /> : null}</p>
              <p className="truncate text-[10px] text-white/42">@{world.owner?.username}</p>
            </div>
          </div>
          <h3 className="mt-3 truncate text-lg font-black text-white">{world.title}</h3>
          <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-atseen-muted">{world.preview || "Preview this creator world."}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white/48"><FiUsers /> {compactNumber(world.subscribers)} members</span>
            <span className="rounded-full bg-atseen-blue px-3 py-1.5 text-[10px] font-black text-atseen-bg">Enter World</span>
          </div>
        </div>
      </Link>
    </article>
  );
});

export const ExperienceCard = memo(function ExperienceCard({ experience }) {
  return (
    <Link className="relative h-48 w-[270px] shrink-0 overflow-hidden rounded-[20px] border border-atseen-line transition duration-300 hover:-translate-y-1 hover:border-atseen-blue/28 hover:shadow-glow" to={experience.route || `/world/${experience.id}`}>
      <MediaBackdrop src={experience.cover} title={experience.title} />
      <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/80" />
      <span className="absolute bottom-4 left-4 right-4">
        <span className="rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-atseen-blue">{experience.reason || experience.category}</span>
        <strong className="mt-3 block text-lg font-black text-white">{experience.title}</strong>
        <small className="mt-1 block text-xs font-bold text-white/60">{experience.creator?.name || experience.owner?.name}</small>
      </span>
    </Link>
  );
});

export const StoryStrip = memo(function StoryStrip({ groups }) {
  const [viewer, setViewer] = useState({ groupId: null, index: 0 });
  const activeGroup = useMemo(() => groups.find((group) => group.id === viewer.groupId), [groups, viewer.groupId]);

  if (!groups.length) return null;

  return (
    <>
      <section className="mt-5">
        <h2 className="sr-only">Recommended Stories</h2>
        <div className="atseen-hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:-mx-1 md:px-1">
          {groups.map((group) => (
            <button className="w-[74px] shrink-0 text-center" key={group.id} onClick={() => setViewer({ groupId: group.id, index: 0 })} type="button">
              <span className={`relative mx-auto grid h-[66px] w-[66px] place-items-center rounded-full p-[3px] ${group.seen ? "bg-white/12" : "bg-[conic-gradient(from_180deg,#8AB8FF,#6ECF97,#F0B764,#8AB8FF)]"}`}>
                <FanAvatar className="ring-2 ring-atseen-bg" name={group.owner?.name} size="h-full w-full" src={group.owner?.avatar} />
                {group.live ? <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-atseen-danger px-1.5 py-0.5 text-[8px] font-black text-white">LIVE</span> : null}
              </span>
              <span className="mt-2 block truncate text-[11px] font-bold text-atseen-muted">{group.owner?.name || "Story"}</span>
            </button>
          ))}
        </div>
      </section>
      <StoryViewer
        initialIndex={viewer.index}
        isOpen={Boolean(activeGroup)}
        onClose={() => setViewer({ groupId: null, index: 0 })}
        stories={activeGroup?.stories || []}
      />
    </>
  );
});

export function DiscoverSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <div className="h-28 animate-pulse rounded-[22px] border border-atseen-line bg-atseen-surface-2" />
      <div className="h-[330px] animate-pulse rounded-[24px] border border-atseen-line bg-atseen-surface-2" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => <div className="h-72 w-[252px] shrink-0 animate-pulse rounded-[20px] border border-atseen-line bg-atseen-surface-2" key={index} />)}
      </div>
      <span className="sr-only">Loading Discover</span>
    </div>
  );
}

export function DiscoverEmpty({ onRefresh, onSettings }) {
  return (
    <FanCard className="mt-7 overflow-hidden p-8 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-atseen-blue/25 bg-atseen-blue/10 text-3xl text-atseen-blue">
        <FiEye aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-black text-white">No recommendations yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-atseen-muted">Update your interests or refresh Discover after more creators publish public profiles.</p>
      <div className="mt-5 flex justify-center gap-2">
        <ActionButton onClick={onSettings}>Update interests</ActionButton>
        <ActionButton onClick={onRefresh} variant="primary">Refresh</ActionButton>
      </div>
    </FanCard>
  );
}

export function DiscoverError({ error, onRetry }) {
  return (
    <FanCard className="mt-7 border-atseen-danger/25 bg-atseen-danger/10 p-5">
      <h2 className="text-lg font-black text-white">Discover could not load</h2>
      <p className="mt-2 text-sm text-atseen-danger">{error?.response?.data?.message || "Please retry in a moment."}</p>
      <ActionButton className="mt-4" onClick={onRetry} variant="primary">Retry</ActionButton>
    </FanCard>
  );
}

export function FloatingAddButton({ onClick }) {
  return (
    <button
      aria-label="Add interest"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-atseen-blue text-atseen-bg shadow-glow transition hover:bg-white md:hidden"
      onClick={onClick}
      type="button"
    >
      <FiPlus aria-hidden="true" />
    </button>
  );
}
