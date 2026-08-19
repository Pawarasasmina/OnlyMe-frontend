import { ROLES } from "./constants";

export function getUserRole(user) {
  return user?.role || "";
}

export function getUserId(user) {
  return user?.id || user?._id || user?.userId || "";
}

export function getStoryOwnerId(story) {
  return story?.owner?.id || story?.ownerId || story?.creatorId || "";
}

export function isStoryOwner(user, story) {
  const userId = getUserId(user);
  const ownerId = getStoryOwnerId(story);
  return Boolean(story?.isOwner || story?.isOwn || (userId && ownerId && userId === ownerId));
}

export function canCreateStory(user) {
  return [ROLES.FAN, ROLES.CREATOR].includes(getUserRole(user));
}

export function canDeleteStory(user, story) {
  return canCreateStory(user) && isStoryOwner(user, story);
}

export function canViewStoryInsights(user, story) {
  return canCreateStory(user) && isStoryOwner(user, story);
}

export function canReactToStory(user, story) {
  if (!user || !story || isStoryOwner(user, story)) {
    return false;
  }

  return story.allowReactions !== false;
}

export function canReplyToStory(user, story) {
  if (!user || !story || isStoryOwner(user, story)) {
    return false;
  }

  return story.allowReplies !== false;
}
