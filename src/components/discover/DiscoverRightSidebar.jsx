import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import PublicationCoverMedia from "../publication/PublicationCoverMedia";

function formatCount(value = 0) {
  return new Intl.NumberFormat(__uiLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function profileRoute(person = {}) {
  return person.profileUrl || (person.username ? `/profile/${encodeURIComponent(person.username)}` : "/search");
}

function DiscoverFollowButton({ disabled, onToggle, person }) {
  __useUiLanguage();
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
      {person.isFollowing || person.following ? __msg("activity.following") : __msg("discover.follow")}
    </button>
  );
}

function DiscoverActivityCard({ activity }) {
  __useUiLanguage();
  if (!activity?.actor) return null;
  const actor = activity.actor;

  return (
    <Link className="discover-live-card" to={profileRoute(actor)}>
      <FanAvatar className="ring-2 ring-atseen-blue" name={actor.displayName || actor.name} size="h-[54px] w-[54px]" src={actor.avatar} />
      <span className="min-w-0 flex-1">
        <strong>{__msg("discover.beingSeenRightNow")}</strong>
        <small>{activity.text || __msg("discover.isAtSeen", { value0: actor.displayName || actor.name })}</small>
      </span>
      {activity.online ? <i aria-label={__msg("discover.online")} /> : null}
    </Link>
  );
}

function SuggestedForYou({ disabled, onFollowToggle, people = [] }) {
  __useUiLanguage();
  if (!people.length) return null;

  return (
    <section className="discover-rail-card" aria-labelledby="discover-suggested-title">
      <h2 id="discover-suggested-title">{__msg("discover.suggestedForYou")}</h2>
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
  __useUiLanguage();
  if (!seen) return null;
  const cover = seen.coverMedia?.secureUrl || seen.coverMedia?.url || seen.coverImage || seen.cover;

  return (
    <Link className="discover-seen-feature" to={seen.route || `/seen/${seen.id}`}>
      {cover ? <PublicationCoverMedia autoPlay loop alt={__msg("discover.cover", { value0: seen.title })} loading="lazy" media={seen.coverMedia || { secureUrl: cover }} /> : <span aria-hidden="true" />}
      <span className="discover-seen-shade" aria-hidden="true" />
      <span className="discover-seen-copy">
        <small>{__msg("discover.trendingSeen")}</small>
        <strong dir="auto">{seen.title}</strong>
        <em>{seen.creator?.name || seen.creator?.displayName || __msg("discover.creator")}{" \u00b7 "}{formatCount(seen.engagementCount ?? seen.viewCount)} {__msg("discover.interactions")}</em>
      </span>
    </Link>
  );
}

function FreshSeens({ seens = [] }) {
  __useUiLanguage();
  if (!seens.length) return null;

  return (
    <section className="discover-rail-card discover-fresh-card" aria-labelledby="discover-fresh-title">
      <h2 id="discover-fresh-title">{__msg("discover.freshSeens")}</h2>
      <div className="discover-fresh-list">
        {seens.map((seen) => {
          const cover = seen.coverMedia?.secureUrl || seen.coverMedia?.url || seen.coverImage || seen.cover;
          return (
            <Link className="discover-fresh-row" key={seen.id} to={seen.route || `/seen/${seen.id}`}>
              {cover ? <PublicationCoverMedia autoPlay loop alt={__msg("discover.cover", { value0: seen.title })} loading="lazy" media={seen.coverMedia || { secureUrl: cover }} /> : <span aria-hidden="true" />}
              <span className="min-w-0">
                <strong dir="auto">{seen.title}</strong>
                <small>{seen.creator?.name || seen.creator?.displayName || __msg("discover.creator")}{" \u00b7 "}{seen.chapterCount} {__msg("discover.chapters")}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DiscoverRailFooter() {
  __useUiLanguage();
  return (
    <footer className="discover-rail-footer" aria-label={__msg("discover.discoverLinks")}>
      <nav aria-label={__msg("discover.aboutSeen")}>
        {["About", "Creators", "Terms", "Privacy", "Help"].map((item) => <span key={item}>{item}</span>)}
      </nav>
      <p>{__msg("discover.seenWeSeeYouEveryDay")}</p>
    </footer>
  );
}

function DiscoverRightSidebar({ activity, followPending = false, freshSeens, onFollowToggle, suggestedUsers, trendingSeen }) {
  __useUiLanguage();
  return (
    <aside className="discover-right-rail" aria-label={__msg("discover.discoverSidebar")}>
      <DiscoverActivityCard activity={activity} />
      <SuggestedForYou disabled={followPending} onFollowToggle={onFollowToggle} people={suggestedUsers} />
      <TrendingSeen seen={trendingSeen} />
      <FreshSeens seens={freshSeens} />
      <DiscoverRailFooter />
    </aside>
  );
}

export default memo(DiscoverRightSidebar);
