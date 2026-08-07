export function friendDisplayName(friend = {}) {
  return friend.displayName || friend.name || friend.username || "Friend";
}

export function friendFirstName(friend = {}) {
  return friend.firstName || friendDisplayName(friend).split(" ").filter(Boolean)[0] || "Friend";
}

export function friendProfileRoute(friend = {}) {
  return friend.profileUrl || (friend.username ? `/profile/${encodeURIComponent(friend.username)}` : "/search");
}

export function friendStories(friend = {}) {
  return Array.isArray(friend.stories) ? friend.stories : [];
}

export function hasActiveFriendStory(friend = {}) {
  return Boolean(friend.hasActiveStory || friend.storyAvailable || friendStories(friend).length);
}

export function hasUnseenFriendStory(friend = {}) {
  if (friend.hasUnseenStory) return true;
  return friendStories(friend).some((story) => !story.viewed);
}

export function firstUnseenStoryIndex(friend = {}) {
  const stories = friendStories(friend);
  const preferred = friend.firstUnseenStoryId
    ? stories.findIndex((story) => story.id === friend.firstUnseenStoryId)
    : -1;
  if (preferred >= 0) return preferred;
  const unseen = stories.findIndex((story) => !story.viewed);
  return unseen >= 0 ? unseen : 0;
}
