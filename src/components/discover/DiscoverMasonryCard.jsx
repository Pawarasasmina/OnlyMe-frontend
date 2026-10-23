import { memo, useMemo, useState } from "react";
import { SeenNavIcon } from "../social/socialNavItems";
import { resolveMediaUrl } from "../../utils/media";
import { useRecommendationTracking } from "../../hooks/useRecommendationTracking";
import { analyticsService } from "../../services/analyticsService";

function WorldMark() {
  return <svg aria-label="Has a World" className="discover-world-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="4.5" /><ellipse cx="12" cy="12" rx="10" ry="3.6" transform="rotate(-18 12 12)" /></svg>;
}

function recommendationReason(card) {
  // Only describe facts present in the response. Legacy rotation-based reasons
  // (nearby/follow graph/rising) are not evidence for those claims.
  if (card.dream?.title && card.dream.status !== "completed") return `Dreams of: ${card.dream.title}`;
  if (card.reason?.code === "SAME_CITY" && card.city) return `Also in ${card.city}`;
  if (card.reason?.code === "SHARED_INTERESTS") return card.reason.detail;
  const status = String(card.creator?.status || card.status || "").toLowerCase();
  if (status === "at seen") return "On @seen right now";
  const legacyReasons = new Set(["POPULAR_NEARBY", "FOLLOW_GRAPH", "RISING_CREATOR", "RECENT_ACTIVITY", "WORLD_MATCH"]);
  if (!legacyReasons.has(card.reason?.code) && card.recommendationReason) return card.recommendationReason;
  const seen = card.featuredSeen || card.latestSeen;
  if (seen?.title) return `Shares ${seen.category || "Seens"}`;
  if (card.featuredOffer?.title) return `Shares ${card.featuredOffer.title}`;
  return card.category ? `Explore ${card.category}` : "Discover their profile";
}

function DiscoverMasonryCard({ card, index = 0, onOpen }) {
  const [failed, setFailed] = useState(0);
  const portrait = resolveMediaUrl(card.avatar || card.creator?.avatar);
  const fallbackImage = resolveMediaUrl(card.media?.type === "video" ? card.media.poster || card.creator?.cover : card.coverImage || card.media?.url || card.creator?.cover);
  const imageUrl = [...new Set([portrait, fallbackImage].filter(Boolean))][failed];
  const name = card.displayName || card.creator?.name || card.username || "Creator";
  const firstName = name.trim().split(/\s+/)[0];
  const category = card.category || card.creator?.category || "";
  const place = card.city || card.creator?.location?.city || String(card.location || "").split(",")[0];
  const creatorId = card.userId || card.creator?.id || card.creatorId || card.id || "";
  const topics = useMemo(() => [category].filter(Boolean), [category]);
  const trackingRef = useRecommendationTracking({ creatorId, entityId: creatorId, entityType: "profile", position: index, topics });
  const seen = card.featuredSeen || card.latestSeen;
  const world = card.world || card.featuredOffer;
  const live = String(card.creator?.status || card.status || "").toLowerCase() === "at seen";
  const members = world?.peopleCount ?? world?.memberCount ?? card.worldMembers ?? card.rankSignals?.worldMembers;

  return (
    <button aria-label={`Open ${name}'s discover story`} className="discover-orb-card" onClick={() => { void analyticsService.trackProfileView({ profileUserId: creatorId, source: "discover" }); onOpen?.(index); }} ref={trackingRef} type="button">
      {imageUrl ? <img alt={`${name} portrait`} loading="lazy" onError={() => setFailed((count) => count + 1)} src={imageUrl} /> : <span className="discover-orb-card-fallback" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "@"}</span>}
      <span className="discover-orb-card-shade" aria-hidden="true" />
      {live ? <span className="discover-orb-live-dot" aria-label="At seen right now" /> : null}
      <span className="discover-orb-card-copy">
        <strong><span>{firstName}</span>{world ? <WorldMark /> : null}</strong>
        <small>{[category, place].filter(Boolean).join(" · ")}</small>
        <em>{recommendationReason(card)}</em>
        {seen?.title ? <span className="discover-orb-doing"><SeenNavIcon aria-hidden="true" /><span>{seen.title}</span></span> : world ? <span className="discover-orb-doing">World{members != null ? ` · ${Number(members).toLocaleString()} members` : ""}</span> : null}
      </span>
    </button>
  );
}

export default memo(DiscoverMasonryCard);
