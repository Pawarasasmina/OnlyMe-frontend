import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg, systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { memo, useEffect, useMemo, useState } from "react";
import { createLongPressGesture } from "../../utils/longPressGesture";
import { SeenNavIcon } from "../social/socialNavItems";
import { resolveMediaUrl } from "../../utils/media";
import { useRecommendationTracking } from "../../hooks/useRecommendationTracking";
import { analyticsService } from "../../services/analyticsService";
import { selectDiscoverReason } from "../../utils/discoverReason";

function WorldMark() {
  __useUiLanguage();
  return <svg aria-label={__msg("discover.hasAWorld")} className="discover-world-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="4.5" /><ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-18 12 12)" /></svg>;
}

function recommendationReason(card) {
  const reason = selectDiscoverReason(card);
  switch (reason.code) {
    case "DREAM": return __msg("discover.dreamsOfValue0", { value0: reason.title });
    case "SAME_CITY": return __msg("discover.alsoInValue0", { value0: reason.city });
    case "ACTIVE_NOW": return __msg("discover.onSeenRightNow");
    case "SEEN_SAVED": return __msg("discover.seenSavedCount", { count: new Intl.NumberFormat(__uiLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(reason.count) });
    case "FOLLOWED_BY": return __msg("discover.followedByName", { name: reason.name });
    case "SHARES": return __msg("discover.sharesValue0", { value0: reason.category || __msg("profile.seens") });
    default: return __msg("discover.discoverTheirProfile");
  }
}

function DiscoverMasonryCard({ card, index = 0, onOpen, onQuickActions }) {
  __useUiLanguage();
  const [failed, setFailed] = useState(0);
  const [pressed, setPressed] = useState(false);
  const portrait = resolveMediaUrl(card.avatar || card.creator?.avatar);
  const fallbackImage = resolveMediaUrl(card.media?.type === "video" ? card.media.poster || card.creator?.cover : card.coverImage || card.media?.url || card.creator?.cover);
  const imageUrl = [...new Set([portrait, fallbackImage].filter(Boolean))][failed];
  const name = card.displayName || card.creator?.name || card.username || __msg("discover.creator");
  const username = card.username || card.creator?.username || "";
  const category = card.category || card.creator?.category || "";
  const place = card.city || card.creator?.location?.city || String(card.location || "").split(",")[0];
  const creatorId = card.userId || card.creator?.id || card.creatorId || card.id || "";
  const topics = useMemo(() => [category].filter(Boolean), [category]);
  const trackingRef = useRecommendationTracking({ creatorId, entityId: creatorId, entityType: "profile", position: index, topics });
  const seen = card.featuredSeen || card.latestSeen;
  const world = card.world || card.featuredOffer;
  const live = String(card.creator?.status || card.status || "").toLowerCase() === "at seen";
  const members = world?.peopleCount ?? world?.memberCount ?? card.worldMembers ?? card.rankSignals?.worldMembers;
  const gesture = useMemo(() => createLongPressGesture({ onLongPress: target => onQuickActions?.(card, target), onPressChange: setPressed }), [card, onQuickActions]);
  useEffect(() => () => gesture.dispose(), [gesture]);

  return (
    <button aria-label={__msg("discover.openSDiscoverStory", { value0: name })} aria-haspopup="dialog" className={`discover-orb-card${pressed ? " is-pressed" : ""}`} onPointerDown={gesture.start} onPointerMove={gesture.move} onPointerUp={gesture.end} onPointerCancel={gesture.cancel} onPointerLeave={gesture.cancel}
      onContextMenu={event => { event.preventDefault(); gesture.cancel(); onQuickActions?.(card, event.currentTarget); }}
      onKeyDown={event => { if (event.key === "ContextMenu" || event.shiftKey && event.key === "F10") { event.preventDefault(); onQuickActions?.(card, event.currentTarget); } }}
      onClick={() => { if (gesture.consumeClick()) return; void analyticsService.trackProfileView({ profileUserId: creatorId, source: "discover" }); onOpen?.(index); }} ref={trackingRef} type="button">
      {imageUrl ? <img alt={__msg("discover.portrait", { value0: name })} draggable={false} loading="lazy" onError={() => setFailed((count) => count + 1)} src={imageUrl} /> : <span className="discover-orb-card-fallback" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "@"}</span>}
      <span className="discover-orb-card-shade" aria-hidden="true" />
      {live ? <span className="discover-orb-live-dot" aria-label={__msg("discover.atSeenRightNow")} /> : null}
      <span className="discover-orb-card-copy">
        <strong><span>{username ? <><i className="identity-at">@</i>{username}</> : name}</span>{world ? <WorldMark /> : null}</strong>
        <small>{[category ? __systemMessage(category) : "", place].filter(Boolean).join(" · ")}</small>
        <em>{recommendationReason(card)}</em>
        {seen?.title ? <span className="discover-orb-doing"><SeenNavIcon aria-hidden="true" /><span dir="auto">{seen.title}</span></span> : world ? <span className="discover-orb-doing">{__msg("admin.world")}{members != null ? __msg("discover.members_079fce", { value0: Number(members).toLocaleString(__uiLocale()) }) : ""}</span> : null}
      </span>
    </button>
  );
}

export default memo(DiscoverMasonryCard);
