import assert from "node:assert/strict";
import test from "node:test";
import {
  firstUnseenStoryIndex,
  friendFirstName,
  friendProfileRoute,
  hasActiveFriendStory,
  hasUnseenFriendStory,
} from "./discoverFriends.js";

test("friend helpers select the first unseen story", () => {
  const friend = {
    displayName: "Lina Morgan",
    firstUnseenStoryId: "story-2",
    stories: [
      { id: "story-1", viewed: true },
      { id: "story-2", viewed: false },
    ],
  };

  assert.equal(friendFirstName(friend), "Lina");
  assert.equal(hasActiveFriendStory(friend), true);
  assert.equal(hasUnseenFriendStory(friend), true);
  assert.equal(firstUnseenStoryIndex(friend), 1);
});

test("friend helpers route no-story friends to profile", () => {
  const friend = { username: "zoe", stories: [] };

  assert.equal(hasActiveFriendStory(friend), false);
  assert.equal(hasUnseenFriendStory(friend), false);
  assert.equal(firstUnseenStoryIndex(friend), 0);
  assert.equal(friendProfileRoute(friend), "/profile/zoe");
});
