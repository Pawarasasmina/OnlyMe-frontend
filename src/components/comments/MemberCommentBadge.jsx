export default function MemberCommentBadge({ author }) {
  const badge = author?.statusBadge;
  const name = String(author?.name || author?.displayName || author?.username || "").trim().split(/\s+/)[0];
  if (!name || !badge?.emoji) return null;
  const label = String(badge.label || name).replace(/^\p{Extended_Pictographic}(?:\uFE0F)?\s*/u, "") || name;
  return <span className="comment-member-badge" title={label}>
    <span className="comment-member-badge__icon" aria-hidden="true">{badge.emoji}</span>
    <bdi className="comment-member-badge__name">{label}</bdi>
  </span>;
}
