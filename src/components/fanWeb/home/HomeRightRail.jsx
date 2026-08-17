import { memo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VerifiedBadge from "../shared/VerifiedBadge";
import { resolveMediaUrl } from "../../../utils/media";

function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString();
}

function profileRoute(person = {}) {
  return person.profileUrl || (person.username ? `/profile/${encodeURIComponent(person.username)}` : "/discover");
}

function creatorName(person = {}) {
  return person.displayName || person.name || person.username || "Creator";
}

function creatorReason(person = {}) {
  return person.recommendationReason || [person.category, person.city || person.country].filter(Boolean).join(" - ") || `@${person.username}`;
}

function BeingSeenNowCard({ activity }) {
  const actor = activity?.actor;
  const title = "Being seen right now";
  const subtitle = activity?.text || (actor ? `${creatorName(actor)} is At seen` : "No one is At seen right now");
  const total = Number(activity?.count) || (actor ? 1 : 0);
  const avatars = actor ? [actor] : [];

  return (
    <Link className="home-rail-live-card" to={actor ? profileRoute(actor) : "/discover"}>
      <span className="home-rail-avatar-stack" aria-hidden="true">
        {avatars.length ? avatars.slice(0, 3).map((person) => (
          <FanAvatar className="ring-2 ring-[#11161c]" key={person.id || person.username} name={creatorName(person)} size="h-[54px] w-[54px]" src={person.avatar} />
        )) : <FanAvatar brand name="@seen" size="h-[54px] w-[54px]" />}
      </span>
      <span className="min-w-0 flex-1">
        <strong>{title}</strong>
        <small>{actor && total > 1 ? `${creatorName(actor).split(" ")[0]} and ${total - 1} others are At seen` : subtitle}</small>
      </span>
      <i aria-label={actor ? "Live now" : "No live activity"} className={actor ? "is-live" : ""} />
    </Link>
  );
}

function FollowButton({ disabled, onToggle, person }) {
  const following = Boolean(person.isFollowing || person.following);
  const handleClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle?.(person);
  }, [onToggle, person]);

  return (
    <button
      className={`home-rail-follow ${following ? "is-following" : ""}`}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

function SuggestedUsersCard({ disabled, onFollowToggle, people = [] }) {
  return (
    <section className="home-rail-card" aria-labelledby="home-rail-suggested-title">
      <h2 id="home-rail-suggested-title">Suggested for you</h2>
      {people.length ? (
        <div className="home-rail-suggestion-list">
          {people.slice(0, 4).map((person) => (
            <Link className="home-rail-suggestion-row" key={person.id || person.username} to={profileRoute(person)}>
              <FanAvatar name={creatorName(person)} size="h-[42px] w-[42px]" src={person.avatar} />
              <span className="min-w-0 flex-1">
                <strong>
                  {creatorName(person)}
                  {person.isVerified || person.verified ? <VerifiedBadge /> : null}
                </strong>
                <small>{creatorReason(person)}</small>
              </span>
              <FollowButton disabled={disabled} onToggle={onFollowToggle} person={person} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="home-rail-empty">No suggestions right now. Discover has more people to tune your orbit.</p>
      )}
    </section>
  );
}

function TrendingSeenCard({ seen }) {
  const location = useLocation();
  if (!seen) {
    return (
      <section className="home-rail-card home-rail-compact-empty" aria-labelledby="home-rail-trending-empty-title">
        <h2 id="home-rail-trending-empty-title">Trending Seen</h2>
        <p className="home-rail-empty">No public Seen is trending yet.</p>
      </section>
    );
  }

  const cover = resolveMediaUrl(seen.coverImage || seen.cover);
  const creator = seen.creator?.firstName || seen.creator?.name || seen.creator?.displayName || "Creator";
  const target = seen.route || `/seen/${seen.id}`;
  const alreadyHere = location.pathname === target && !location.search;

  return (
    <Link className="home-rail-trending" replace={alreadyHere} to={target}>
      {cover ? <img alt={`${seen.title} cover`} loading="lazy" src={cover} /> : <span className="home-rail-seen-fallback" aria-hidden="true" />}
      <span className="home-rail-trending-shade" aria-hidden="true" />
      <span className="home-rail-trending-copy">
        <small>TRENDING SEEN</small>
        <strong>{seen.title}</strong>
        <em>{creator.split(" ")[0]} - {formatCount(seen.engagementCount ?? seen.viewCount)} saw this</em>
      </span>
    </Link>
  );
}

function FreshSeensCard({ seens = [] }) {
  return (
    <section className="home-rail-card" aria-labelledby="home-rail-fresh-title">
      <h2 id="home-rail-fresh-title">Fresh Seens</h2>
      {seens.length ? (
        <div className="home-rail-fresh-list">
          {seens.slice(0, 3).map((seen) => {
            const cover = resolveMediaUrl(seen.coverImage || seen.cover);
            return (
              <Link className="home-rail-fresh-row" key={seen.id} to={seen.route || `/seen/${seen.id}`}>
                {cover ? <img alt={`${seen.title} cover`} loading="lazy" src={cover} /> : <span aria-hidden="true" />}
                <span className="min-w-0">
                  <strong>{seen.title}</strong>
                  <small>{seen.creator?.name || seen.creator?.displayName || "Creator"} - {Number(seen.chapterCount) || 0} chapters</small>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="home-rail-empty">Fresh public Seens will appear here.</p>
      )}
    </section>
  );
}

function HomeRailFooter() {
  const links = [
    ["About", "/explore"],
    ["Creators", "/discover"],
    ["Terms", "/settings"],
    ["Privacy", "/settings/privacy"],
    ["Help", "/settings"],
  ];

  return (
    <footer className="home-rail-footer" aria-label="@seen links">
      <nav aria-label="Home feed footer links">
        {links.map(([label, to]) => <Link key={label} to={to}>{label}</Link>)}
      </nav>
      <p>@seen - We see you. Every day.</p>
    </footer>
  );
}

function HomeRightRail({ activity, className = "", followPending = false, freshSeens, onFollowToggle, suggestedUsers, trendingSeen }) {
  return (
    <aside className={`home-right-rail ${className}`.trim()} aria-label="Home sidebar">
      <BeingSeenNowCard activity={activity} />
      <SuggestedUsersCard disabled={followPending} onFollowToggle={onFollowToggle} people={suggestedUsers} />
      <TrendingSeenCard seen={trendingSeen} />
      <FreshSeensCard seens={freshSeens} />
      <HomeRailFooter />
      <Link className="home-rail-discover-link" to="/discover">
        More to see <FiArrowRight aria-hidden="true" />
      </Link>
    </aside>
  );
}

export default memo(HomeRightRail);
