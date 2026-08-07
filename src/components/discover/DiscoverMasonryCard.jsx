import { memo, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { resolveMediaUrl } from "../../utils/media";

function initials(name = "") {
  return name.trim().slice(0, 1).toUpperCase() || "@";
}

function locationLabel(card) {
  return [card.city, card.country].filter(Boolean).join(", ") || card.location || "";
}

function DiscoverMasonryCard({ card, index = 0, onOpen }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveMediaUrl(card.coverImage || card.media?.url || card.creator?.cover);
  const name = card.displayName || card.creator?.name || card.username || "Creator";
  const category = card.category || card.creator?.category || "Creator";
  const sizeClass = index % 5 === 1 ? "is-wide" : index % 4 === 2 ? "is-short" : "is-tall";
  const place = locationLabel(card);

  return (
    <button
      aria-label={`Open ${name}'s discover story`}
      className={`discover-orb-card ${sizeClass}`}
      onClick={() => onOpen?.(index)}
      type="button"
    >
      {imageUrl && !failed ? (
        <img
          alt={card.media?.alt || `${name} cover`}
          loading="lazy"
          onError={() => setFailed(true)}
          src={imageUrl}
        />
      ) : (
        <span className="discover-orb-card-fallback" aria-hidden="true">{initials(name)}</span>
      )}
      <span className="discover-orb-card-shade" aria-hidden="true" />
      {card.storyAvailable ? <span className="discover-orb-story-dot" aria-label={`${name} has an active story`} /> : null}
      <span className="discover-orb-card-copy">
        <strong>
          {name}
          {card.isVerified ? <VerifiedBadge className="ml-1 align-middle" /> : null}
        </strong>
        <small>{category}{place ? ` \u00b7 ${place}` : ""}</small>
        {card.recommendationReason ? <em>{card.recommendationReason}</em> : null}
        {place ? (
          <span className="discover-orb-place">
            <FiMapPin aria-hidden="true" />
            {place}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default memo(DiscoverMasonryCard);
