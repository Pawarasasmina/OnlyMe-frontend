/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import StoryPresenceLabel from "../stories/StoryPresenceLabel";
import StoryStatusBadge from "../stories/StoryStatusBadge";
import { resolveMediaUrl } from "../../utils/media";
import {
  friendDisplayName,
  friendFirstName,
  friendProfileRoute,
  friendStories,
  hasActiveFriendStory,
  hasUnseenFriendStory,
} from "../../utils/discoverFriends";

function profileRoute(person) {
  return friendProfileRoute(person);
}

function PersonName({ person }) {
  __useUiLanguage();
  return <span>{friendFirstName(person)}</span>;
}

function FriendAvatarContent({ friend }) {
  __useUiLanguage();
  const active = hasActiveFriendStory(friend);
  const unseen = hasUnseenFriendStory(friend);
  const ringClass = active ? unseen ? "has-unseen-story" : "has-seen-story" : "has-no-story";
  return (
    <>
      <span className={`discover-friend-avatar ${active ? "presence-live-ring" : ""} ${ringClass}`}>
        <FanAvatar name={friendDisplayName(friend)} size="h-[52px] w-[52px]" src={friend.avatar} />
        {friend.hasPremiumOffering && !friend.activeStatus ? <i aria-label={__msg("discover.premiumAccessAvailable")} /> : null}
        <StoryStatusBadge status={friend.activeStatus} />
      </span>
      <small><PersonName person={friend} /></small>
      <StoryPresenceLabel status={friend.activeStatus} />
    </>
  );
}

function DiscoverFriendsSection({
  friends = [],
  suggestions = [],
  onOpenFriendStories,
  title = __msg("stories.friends_c11d5e"),
  subtitle,
}) {
  __useUiLanguage();
  if (!friends.length && !suggestions.length) return null;

  return (
    <section className="discover-orb-section" aria-labelledby="discover-friends-title">
      <div className="discover-orb-heading-row">
        <div className="discover-orb-heading-copy">
          <h2 id="discover-friends-title">{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="discover-friends-strip atseen-hide-scrollbar" role="list">
        {friends.map((friend) => {
          const stories = friendStories(friend);
          const key = friend.id || friend.username;
          return (
            <div className="discover-friend-item" key={key} role="listitem">
              {stories.length ? (
                <button
                  aria-label={__msg("discover.viewSStory", { value0: friendDisplayName(friend) })}
                  className="discover-friend-link"
                  onClick={(event) => onOpenFriendStories?.(friend, event.currentTarget)}
                  type="button"
                >
                  <FriendAvatarContent friend={friend} />
                </button>
              ) : (
                <Link aria-label={__msg("discover.openSProfile", { value0: friendDisplayName(friend) })} className="discover-friend-link" to={profileRoute(friend)}>
                  <FriendAvatarContent friend={friend} />
                </Link>
              )}
            </div>
          );
        })}
        {suggestions.map((person) => (
          <div className="discover-friend-item discover-suggestion-item" key={`suggested-${person.id || person.username}`} role="listitem">
            <Link className="discover-friend-link" to={profileRoute(person)}>
              <span className="discover-friend-avatar discover-suggestion-avatar">
                <FanAvatar name={friendDisplayName(person)} size="h-[52px] w-[52px]" src={person.avatar} />
              </span>
              <small><PersonName person={person} /></small>
              <span className="discover-suggestion-follow">{__msg("discover.follow")}</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function DiscoverFollowingSection({ following = [], onOpenFollowingStories }) {
  __useUiLanguage();
  const stripRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollBack: false, canScrollForward: false });

  const updateScrollState = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    setScrollState({
      canScrollBack: strip.scrollLeft > 1,
      canScrollForward: strip.scrollLeft < maxScrollLeft - 1,
    });
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return undefined;

    updateScrollState();
    strip.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(strip);
    }

    return () => {
      strip.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [following.length, updateScrollState]);

  const scrollFollowing = useCallback((direction) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: direction * Math.round(strip.clientWidth * 0.72), behavior: "smooth" });
  }, []);

  if (!following.length) return null;

  return (
    <section className="discover-orb-section" aria-labelledby="discover-following-title">
      <div className="discover-orb-heading-row">
        <div className="discover-orb-heading-copy">
          <h2 id="discover-following-title">{__msg("activity.following")}</h2>
          <p>{__msg("discover.peopleAndCreatorsYouFollow")}</p>
        </div>
        <div className="discover-orb-scroll-controls">
          <button
            aria-label={__msg("discover.scrollFollowingLeft")}
            className="discover-orb-scroll-button"
            disabled={!scrollState.canScrollBack}
            onClick={() => scrollFollowing(-1)}
            type="button"
          >
            <FiChevronLeft data-ui-directional="true" aria-hidden="true" />
          </button>
          <button
            aria-label={__msg("discover.scrollFollowingRight")}
            className="discover-orb-scroll-button"
            disabled={!scrollState.canScrollForward}
            onClick={() => scrollFollowing(1)}
            type="button"
          >
            <FiChevronRight data-ui-directional="true" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="discover-following-strip atseen-hide-scrollbar" ref={stripRef} role="list">
        {following.map((person) => {
          const cover = resolveMediaUrl(person.coverImage || person.cover || person.avatar);
          const stories = friendStories(person);
          const content = (
            <>
              {cover ? <img alt="" loading="lazy" src={cover} /> : <span aria-hidden="true">{(person.displayName || person.name || "@").slice(0, 1)}</span>}
              <strong><PersonName person={person} /></strong>
              {person.online ? <i aria-label={__msg("discover.online")} /> : null}
            </>
          );
          if (stories.length) {
            return (
              <button
                aria-label={__msg("discover.viewSStory", { value0: friendDisplayName(person) })}
                className="discover-following-card"
                key={person.id || person.username}
                onClick={(event) => onOpenFollowingStories?.(person, event.currentTarget)}
                role="listitem"
                type="button"
              >
                {content}
              </button>
            );
          }
          return (
            <Link className="discover-following-card" key={person.id || person.username} role="listitem" to={profileRoute(person)}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DiscoverPeopleSections({
  friends,
  suggestions,
  friendSectionTitle,
  friendSectionSubtitle,
  following,
  onOpenFriendStories,
  onOpenFollowingStories,
}) {
  __useUiLanguage();
  return (
    <>
      <DiscoverFriendsSection
        friends={friends}
        suggestions={suggestions}
        onOpenFriendStories={onOpenFriendStories}
        subtitle={friendSectionSubtitle}
        title={friendSectionTitle}
      />
      <DiscoverFollowingSection following={following} onOpenFollowingStories={onOpenFollowingStories} />
    </>
  );
}

export default memo(DiscoverPeopleSections);
