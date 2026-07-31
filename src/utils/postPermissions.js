import { ROLES } from "./constants";

export function canCreateFeedPost(user) {
  return user?.role === ROLES.CREATOR;
}

export function canManageFeedPost(user, post) {
  const userId = user?.id || user?._id || user?.userId;
  const authorId = post?.author?.id || post?.authorId || post?.creatorId;
  return Boolean(canCreateFeedPost(user) && userId && authorId && String(userId) === String(authorId));
}
