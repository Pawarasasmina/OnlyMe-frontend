import axiosInstance from "../api/axiosInstance";
import { atseenCreators, atseenStories } from "../data/atseenMockData";

const STORY_API_ENABLED = import.meta.env.VITE_STORY_API_ENABLED === "true";
const REACTIONS_KEY = "atseen_story_reactions";
const SEEN_KEY = "atseen_seen_stories";

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeMockStory(story) {
  const creator = atseenCreators[story.id];

  return {
    mediaType: "image",
    timeAgo: "Now",
    verified: Boolean(story.brand || creator?.verified),
    ...story,
    avatar: story.avatar || creator?.avatar || story.image,
    username: creator?.username || story.name?.toLowerCase(),
  };
}

export const storyService = {
  getActiveStories: async () => {
    if (STORY_API_ENABLED) {
      return axiosInstance.get("/stories/active").then((response) => response.data.data);
    }

    return atseenStories.map(normalizeMockStory);
  },

  markStoryViewed: async (storyId) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.post(`/stories/${storyId}/views`);
    }

    const seen = readStore(SEEN_KEY);
    const nextSeen = { ...seen, [storyId]: true };
    writeStore(SEEN_KEY, nextSeen);
    return { data: { data: { storyId, viewed: true } } };
  },

  reactToStory: async (storyId, reaction) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.post(`/stories/${storyId}/reactions`, { reaction });
    }

    if (!storyId || !reaction) {
      throw new Error("Story and reaction are required.");
    }

    const reactions = readStore(REACTIONS_KEY);
    const nextReactions = {
      ...reactions,
      [storyId]: {
        reaction,
        reactedAt: new Date().toISOString(),
      },
    };
    writeStore(REACTIONS_KEY, nextReactions);
    return { data: { data: nextReactions[storyId] } };
  },
};
