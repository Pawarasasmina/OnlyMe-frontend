export const WALL_EDIT_MS = 15 * 60000;

export function wallEditDeadlineMs(post) {
  if (!post) return NaN;
  return post.editUntil ? new Date(post.editUntil).getTime() : new Date(post.publishedAt || post.createdAt).getTime() + WALL_EDIT_MS;
}

export function wallEditMinutesRemaining(post, now = Date.now()) {
  const remaining = wallEditDeadlineMs(post) - now;
  return Number.isFinite(remaining) ? Math.min(15, Math.max(0, Math.ceil(remaining / 60000))) : 0;
}
