export default function MemberCommentBadge({ author, noteOwner }) {
  const badges = Array.isArray(author?.memberBadges) ? author.memberBadges : [];
  const name = String(author?.name || author?.displayName || author?.username || "").trim().split(/\s+/)[0];
  const ownerId = String(noteOwner?.id || noteOwner?._id || "");
  if (!name || !ownerId) return null;
  const badge = badges.find(item => item?.worldId && item.emoji);
  if (!badge) return null;
  const creator = String(noteOwner?.name || noteOwner?.displayName || noteOwner?.username || "").trim().split(/\s+/)[0];
  const label = creator ? `${name} - #${creator}` : name;
  return <span className="comment-member-badge" title={label}>
    <span className="comment-member-badge__icon" aria-hidden="true">{badge.emoji}</span>
    <bdi className="comment-member-badge__name">{label}</bdi>
  </span>;
}
