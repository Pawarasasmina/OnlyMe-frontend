import { getLocale as __uiLocale } from "../../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { memo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VerifiedBadge from "../shared/VerifiedBadge";
import PublicationCoverMedia from "../../publication/PublicationCoverMedia";

function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return count.toLocaleString(__uiLocale());
}

function profileRoute(person = {}) {
  return person.profileUrl || (person.username ? `/profile/${encodeURIComponent(person.username)}` : "/discover");
}

function creatorName(person = {}) {
  return person.displayName || person.name || person.username || __msg("discover.creator");
}

function creatorReason(person = {}) {
  return person.recommendationReason || [person.category, person.city || person.country].filter(Boolean).join(" - ") || `@${person.username}`;
}

function BeingSeenNowCard({ activity }) {
  __useUiLanguage();
  const actor = activity?.actor;
  const title = __msg("discover.beingSeenRightNow");
  const subtitle = activity?.text || (actor ? __msg("discover.isAtSeen", { value0: creatorName(actor) }) : __msg("fanWeb.noOneIsAtSeenRightNow"));
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
        <small>{actor && total > 1 ? __msg("fanWeb.andOthersAreAtSeen", { value0: creatorName(actor).split(" ")[0], value1: total - 1 }) : subtitle}</small>
      </span>
      <i aria-label={actor ? __msg("fanWeb.liveNow") : __msg("fanWeb.noLiveActivity")} className={actor ? "is-live" : ""} />
    </Link>
  );
}

function FollowButton({ disabled, onToggle, person }) {
  __useUiLanguage();
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
      {following ? __msg("activity.following") : __msg("discover.follow")}
    </button>
  );
}

function SuggestedUsersCard({ disabled, onFollowToggle, people = [] }) {
  __useUiLanguage();
  return (
    <section className="home-rail-card" aria-labelledby="home-rail-suggested-title">
      <h2 id="home-rail-suggested-title">{__msg("discover.suggestedForYou")}</h2>
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
        <p className="home-rail-empty">{__msg("fanWeb.noSuggestionsRightNowDiscoverHasMorePeopleTo")}</p>
      )}
    </section>
  );
}

function TrendingSeenCard({ seen }) {
  __useUiLanguage();
  const location = useLocation();
  if (!seen) {
    return (
      <section className="home-rail-card home-rail-compact-empty" aria-labelledby="home-rail-trending-empty-title">
        <h2 id="home-rail-trending-empty-title">{__msg("fanWeb.trendingSeen")}</h2>
        <p className="home-rail-empty">{__msg("fanWeb.noPublicSeenIsTrendingYet")}</p>
      </section>
    );
  }

  const cover = seen.coverMedia?.secureUrl || seen.coverMedia?.url || seen.coverImage || seen.cover;
  const creator = seen.creator?.firstName || seen.creator?.name || seen.creator?.displayName || __msg("discover.creator");
  const target = seen.route || `/seen/${seen.id}`;
  const alreadyHere = location.pathname === target && !location.search;

  return (
    <Link className="home-rail-trending" replace={alreadyHere} to={target}>
      {cover ? <PublicationCoverMedia autoPlay loop alt={__msg("discover.cover", { value0: seen.title })} loading="lazy" media={seen.coverMedia || { secureUrl: cover }} /> : <span className="home-rail-seen-fallback" aria-hidden="true" />}
      <span className="home-rail-trending-shade" aria-hidden="true" />
      <span className="home-rail-trending-copy">
        <small>{__msg("discover.trendingSeen")}</small>
        <strong dir="auto">{seen.title}</strong>
        <em>{creator.split(" ")[0]} - {formatCount(seen.engagementCount ?? seen.viewCount)} {__msg("fanWeb.sawThis")}</em>
      </span>
    </Link>
  );
}

function FreshSeensCard({ seens = [] }) {
  __useUiLanguage();
  return (
    <section className="home-rail-card" aria-labelledby="home-rail-fresh-title">
      <h2 id="home-rail-fresh-title">{__msg("discover.freshSeens")}</h2>
      {seens.length ? (
        <div className="home-rail-fresh-list">
          {seens.slice(0, 3).map((seen) => {
            const cover = seen.coverMedia?.secureUrl || seen.coverMedia?.url || seen.coverImage || seen.cover;
            return (
              <Link className="home-rail-fresh-row" key={seen.id} to={seen.route || `/seen/${seen.id}`}>
                {cover ? <PublicationCoverMedia autoPlay loop alt={__msg("discover.cover", { value0: seen.title })} loading="lazy" media={seen.coverMedia || { secureUrl: cover }} /> : <span aria-hidden="true" />}
                <span className="min-w-0">
                  <strong dir="auto">{seen.title}</strong>
                  <small>{seen.creator?.name || seen.creator?.displayName || __msg("discover.creator")} - {Number(seen.chapterCount) || 0} {__msg("discover.chapters")}</small>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="home-rail-empty">{__msg("fanWeb.freshPublicSeensWillAppearHere")}</p>
      )}
    </section>
  );
}

function HomeRailFooter() {
  __useUiLanguage();
  const links = [
    ["About", "/settings/support/about"],
    ["Creators", "/discover"],
    ["Terms", "/settings/support/terms"],
    ["Privacy", "/settings/privacy"],
    ["Help", "/settings/support/help"],
  ];

  return (
    <footer className="home-rail-footer" aria-label={__msg("fanWeb.seenInformation")}>
      <div aria-label={__msg("fanWeb.homeFeedInformation")}>
        {links.map(([label, to]) => <Link key={label} to={to}>{label}</Link>)}
      </div>
      <p>{__msg("discover.seenWeSeeYouEveryDay")}</p>
    </footer>
  );
}

function HomeRightRail({ activity, className = "", followPending = false, freshSeens, onFollowToggle, suggestedUsers, trendingSeen, loading = false, failed = false, onRetry }) {
  __useUiLanguage();
  const hasContent = Boolean(activity || trendingSeen || freshSeens?.length || suggestedUsers?.length);
  return (
    <aside className={`home-right-rail ${className}`.trim()} aria-label={__msg("fanWeb.homeSidebar")}>
      {loading || failed ? <section className="home-rail-card" role={failed ? "alert" : "status"}>
        <p className="home-rail-empty">{__msg(loading ? "financial.loading" : "common.errorServer")}</p>
        {failed && <button className="home-rail-follow" type="button" onClick={onRetry}>{__msg("activity.retry")}</button>}
      </section> : null}
      {!loading && (!failed || hasContent) ? <>
      <BeingSeenNowCard activity={activity} />
      <SuggestedUsersCard disabled={followPending} onFollowToggle={onFollowToggle} people={suggestedUsers} />
      <TrendingSeenCard seen={trendingSeen} />
      <FreshSeensCard seens={freshSeens} />
      </> : null}
      <HomeRailFooter />
      <Link className="home-rail-discover-link" to="/discover">{__msg("fanWeb.moreToSee")}<FiArrowRight data-ui-directional="true" aria-hidden="true" />
      </Link>
    </aside>
  );
}

export default memo(HomeRightRail);
