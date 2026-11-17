import { wallClosedReason, wallExpiresAt } from "../../shared/wallLifecycle.js";
import { isWallHeld } from "./wallModerationPresentation.js";

export function wallIsClosed(post, now = Date.now()) {
  return Boolean(post.isClosed || post.closedReason || wallClosedReason(post, now) || (post.expiresAt && new Date(post.expiresAt).getTime() <= now));
}

export function wallExpiryTime(post) {
  const value = post.expiresAt || wallExpiresAt(post);
  return value ? new Date(value).getTime() : null;
}

export function activeWallPosts(posts, now = Date.now()) {
  return posts.filter(post => !wallIsClosed(post, now) && !isWallHeld(post));
}

export function wallSearchPost(item) {
  return { createdAt: item.createdAt, context: item.category, ...item.metadata };
}
