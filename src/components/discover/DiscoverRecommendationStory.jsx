import { memo, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronUp, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { resolveMediaUrl } from "../../utils/media";

function displayName(card = {}) {
  return card.displayName || card.creator?.name || card.name || card.username || "Creator";
}

function firstName(card = {}) {
  return displayName(card).split(" ").filter(Boolean)[0] || "Creator";
}

function profileRoute(card = {}) {
  return card.profileUrl || card.creator?.profileRoute || (card.username || card.creator?.username ? `/profile/${encodeURIComponent(card.username || card.creator?.username)}` : "/search");
}

function placeLabel(card = {}) {
  return [card.city, card.country].filter(Boolean).join(", ") || card.location || [card.creator?.location?.city, card.creator?.location?.country].filter(Boolean).join(", ");
}

function storyLine(card = {}) {
  return card.creator?.status || card.status || card.recommendationReason || card.reason?.detail || card.category || "At seen";
}

function DiscoverRecommendationStory({
  card,
  followPending = false,
  onClose,
  onFollow,
}) {
  const navigate = useNavigate();
  const name = displayName(card);
  const first = firstName(card);
  const route = profileRoute(card);
  const imageUrl = resolveMediaUrl(card?.coverImage || card?.media?.url || card?.creator?.cover || card?.avatar);
  const avatar = resolveMediaUrl(card?.avatar || card?.creator?.avatar);
  const place = placeLabel(card);
  const detail = card?.dream?.title || card?.dream?.text || card?.quote || card?.recommendationReason || card?.reason?.detail || "";
  const caption = storyLine(card);
  const statusMeta = [card?.category || card?.creator?.status || "Creator", place].filter(Boolean).join(" - ");
  const following = Boolean(card?.following ?? card?.isFollowing ?? card?.actions?.following ?? card?.creator?.following);
  const relatedStoryCount = Math.max(1, card?.stories?.length || 1);
  const progressItems = useMemo(() => Array.from({ length: relatedStoryCount }), [relatedStoryCount]);

  const openProfile = useCallback((event) => {
    event.stopPropagation();
    navigate(route);
  }, [navigate, route]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!card) return null;

  return (
    <section className="discover-rec-story" aria-label={`${name} discover story`}>
      {imageUrl ? <img alt="" className="discover-rec-story-media" src={imageUrl} /> : <span className="discover-rec-story-fallback" aria-hidden="true">{first.slice(0, 1)}</span>}
      <span className="discover-rec-story-shade" aria-hidden="true" />

      <div className="discover-rec-story-progress" aria-label="Discover story position" role="group">
        {progressItems.map((_, index) => (
          <span className={index === 0 ? "is-filled" : ""} key={index} />
        ))}
      </div>

      <header className="discover-rec-story-head">
        <button className="discover-rec-story-identity" onClick={openProfile} type="button">
          <FanAvatar name={name} size="h-10 w-10" src={avatar} />
          <span className="min-w-0">
            <strong>{first}{card?.isVerified || card?.creator?.verified ? <VerifiedBadge className="ml-1 align-middle" /> : null}</strong>
            <small>{statusMeta}</small>
          </span>
        </button>
        <button
          className={`discover-rec-story-follow ${following ? "is-following" : ""}`}
          disabled={followPending}
          onClick={(event) => {
            event.stopPropagation();
            onFollow?.(card);
          }}
          type="button"
        >
          {following ? "Following" : "Follow"}
        </button>
        <button aria-label="Close discover story" className="discover-rec-story-close" onClick={onClose} type="button">
          <FiX aria-hidden="true" />
        </button>
      </header>

      <div className="discover-rec-story-copy">
        {detail ? (
          <div className="discover-rec-story-context">
            <span>Happening now</span>
            <strong>&quot;{detail}&quot;</strong>
          </div>
        ) : null}
        <h2>{caption}</h2>
        <button className="discover-rec-story-profile" onClick={openProfile} type="button">
          <FiChevronUp aria-hidden="true" />
          <span>Profile</span>
        </button>
        <small>1 / {relatedStoryCount}</small>
      </div>
    </section>
  );
}

export default memo(DiscoverRecommendationStory);
