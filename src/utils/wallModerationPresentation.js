export function isWallHeld(post = {}) {
  return Boolean(post.moderationHiddenAt || ["PENDING_REVIEW", "REJECTED"].includes(post.moderationStatus) || post.visibility === "private");
}
