import { ROLES } from "./constants";

export function getUserRole(user) {
  return user?.role || "";
}

export function canCreateStory(user) {
  return getUserRole(user) === ROLES.CREATOR;
}

export function canDeleteStory(user, story) {
  return canCreateStory(user) && Boolean(story?.isOwn);
}

export function canViewStoryInsights(user, story) {
  return canCreateStory(user) && Boolean(story?.isOwn);
}
