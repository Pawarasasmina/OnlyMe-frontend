import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { resolveMediaUrl } from "../../utils/media";

function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString();
}

function profileRoute(person = {}) {
  return person.profileUrl || (person.username ? `/profile/${encodeURIComponent(person.username)}` : "/search");
}

function DiscoverFollowButton({ disabled, onToggle, person }) {
  const handleClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle(person);
  }, [onToggle, person]);

  return (
    <button
      className={`discover-orb-follow-btn ${person.isFollowing || person.following ? "is-following" : ""}`}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {person.isFollowing || person.following ? "Following" : "Follow"}
    </button>
  );
}

function DiscoverActivityCard({ activity }) {
  if (!activity?.actor) return null;
  const actor = activity.actor;

  return (
    <Link className="discover-live-card" to={profileRoute(actor)}>
      <FanAvatar className="ring-2 ring-atseen-blue" name={actor.displayName || actor.name} size="h-[54px] w-[54px]" src={actor.avatar} />
      <span className="min-w-0 flex-1">
        <strong>Being seen right now</strong>
        <small>{activity.text || `${actor.displayName || actor.name} is At seen`}</small>
      </span>
      {activity.online ? <i aria-label="Online" /> : null}
    </Link>
  );
}

function SuggestedForYou({ disabled, onFollowToggle, people = [] }) {
  if (!people.length) return null;

  return (
    <section className="discover-rail-card" aria-labelledby="discover-suggested-title">
      <h2 id="discover-suggested-title">Suggested for you</h2>
      <div className="discover-suggestion-list">
        {people.map((person) => (
          <Link className="discover-suggestion-row" key={person.id || person.username} to={profileRoute(person)}>
            <FanAvatar name={person.displayName || person.name} size="h-[50px] w-[50px]" src={person.avatar} />
            <span className="min-w-0 flex-1">
              <strong>
                {person.displayName || person.name || person.username}
                {person.isVerified ? <VerifiedBadge /> : null}
              </strong>
              <small>{person.recommendationReason || [person.category, person.city || person.country].filter(Boolean).join(" \u00b7 ") || `@${person.username}`}</small>
            </span>
            <DiscoverFollowButton disabled={disabled} onToggle={onFollowToggle} person={person} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrendingSeen({ seen }) {
  if (!seen) return null;
  const cover = resolveMediaUrl(seen.coverImage || seen.cover);

  return (
    <Link className="discover-seen-feature" to={seen.route || `/seen/${seen.id}`}>
      {cover ? <img alt="" loading="lazy" src={cover} /> : <span aria-hidden="true" />}
      <span className="discover-seen-shade" aria-hidden="true" />
      <span className="discover-seen-copy">
        <small>TRENDING SEEN</small>
        <strong>{seen.title}</strong>
        <em>{seen.creator?.name || seen.creator?.displayName || "Creator"}{" \u00b7 "}{formatCount(seen.engagementCount ?? seen.viewCount)} interactions</em>
      </span>
    </Link>
  );
}

function FreshSeens({ seens = [] }) {
  if (!seens.length) return null;

  return (
    <section className="discover-rail-card discover-fresh-card" aria-labelledby="discover-fresh-title">
      <h2 id="discover-fresh-title">Fresh Seens</h2>
      <div className="discover-fresh-list">
        {seens.map((seen) => {
          const cover = resolveMediaUrl(seen.coverImage || seen.cover);
          return (
            <Link className="discover-fresh-row" key={seen.id} to={seen.route || `/seen/${seen.id}`}>
              {cover ? <img alt="" loading="lazy" src={cover} /> : <span aria-hidden="true" />}
              <span className="min-w-0">
                <strong>{seen.title}</strong>
                <small>{seen.creator?.name || seen.creator?.displayName || "Creator"}{" \u00b7 "}{seen.chapterCount} chapters</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DiscoverRailFooter() {
  return (
    <footer className="discover-rail-footer" aria-label="Discover links">
      <nav aria-label="About @seen">
        {["About", "Creators", "Terms", "Privacy", "Help"].map((item) => <span key={item}>{item}</span>)}
      </nav>
      <p>@seen - We see you. Every day.</p>
    </footer>
  );
}

function DiscoverRightSidebar({ activity, followPending = false, freshSeens, onFollowToggle, suggestedUsers, trendingSeen }) {
  return (
    <aside className="discover-right-rail" aria-label="Discover sidebar">
      <DiscoverActivityCard activity={activity} />
      <SuggestedForYou disabled={followPending} onFollowToggle={onFollowToggle} people={suggestedUsers} />
      <TrendingSeen seen={trendingSeen} />
      <FreshSeens seens={freshSeens} />
      <DiscoverRailFooter />
    </aside>
  );
}

export default memo(DiscoverRightSidebar);
