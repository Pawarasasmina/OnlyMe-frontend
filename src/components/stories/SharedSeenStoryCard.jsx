import { Link } from "react-router-dom";
import { FiEye } from "react-icons/fi";
import { sharedSeenCardData } from "../../utils/sharedSeenStoryCard";

function SharedSeenStoryCard({ className = "", disabled = false, onClick, seen = null, sharedCard = null, unavailable = false, variant }) {
  const card = sharedSeenCardData(seen || {}, sharedCard || {});
  const displayVariant = variant || card.variant || "compact";
  const isLong = displayVariant === "long";
  const style = {
    "--shared-seen-card-bg": card.cardBackgroundColor || "rgba(10,13,18,.82)",
    "--shared-seen-card-text": card.cardTextColor || "#fff",
  };
  const body = (
    <>
      <span className="shared-seen-story-card-media">
        {card.imageUrl && !unavailable ? (
          card.mediaType === "video"
            ? <video muted playsInline preload="metadata" src={card.imageUrl} />
            : <img alt="" src={card.imageUrl} />
        ) : (
          <span className="shared-seen-story-card-fallback"><FiEye aria-hidden="true" /></span>
        )}
      </span>
      <span className="shared-seen-story-card-copy">
        <strong>{unavailable ? "Seen unavailable" : card.title}</strong>
        {isLong && !unavailable && card.excerpt ? <span className="shared-seen-story-card-excerpt">{card.excerpt}</span> : null}
        {isLong && !unavailable && card.points?.length ? (
          <span className="shared-seen-story-card-points">
            {card.points.map((point, index) => <em key={`${point}-${index}`}>{String(index + 1).padStart(2, "0")} <b>{point}</b></em>)}
          </span>
        ) : null}
        <small>{unavailable ? "This Seen can no longer be opened." : card.subtitle}</small>
      </span>
    </>
  );
  const classNameValue = `shared-seen-story-card is-${displayVariant} ${className}`.trim();
  const handleKeyDown = (event) => {
    if (!onClick || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    onClick(event);
  };

  if (disabled || unavailable) {
    return <article className={classNameValue} onClick={onClick} onKeyDown={handleKeyDown} role={onClick ? "button" : undefined} style={style} tabIndex={onClick ? 0 : undefined}>{body}</article>;
  }

  return (
    <Link aria-label={`Open ${card.title}`} className={classNameValue} onClick={onClick} style={style} to={card.destinationRoute}>
      {body}
    </Link>
  );
}

export default SharedSeenStoryCard;
