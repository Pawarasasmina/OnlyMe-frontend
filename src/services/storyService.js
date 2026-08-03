import axiosInstance from "../api/axiosInstance";
import { atseenCreators, atseenStories } from "../data/atseenMockData";
import { resolveMediaUrl } from "../utils/media";

const STORY_API_ENABLED = import.meta.env.VITE_STORY_API_ENABLED !== "false";
const STORY_MOCKS_ENABLED = import.meta.env.VITE_ENABLE_STORY_MOCKS !== "false";
const REACTIONS_KEY = "atseen_story_reactions";
const SEEN_KEY = "atseen_seen_stories";
const MOCK_STORIES_KEY = "atseen_mock_story_metadata";
const MOCK_MEDIA = window.__ATSEEN_STORY_MOCK_MEDIA__ || new Map();
window.__ATSEEN_STORY_MOCK_MEDIA__ = MOCK_MEDIA;

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

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function isExpired(story) {
  return story?.expiresAt ? new Date(story.expiresAt).getTime() <= Date.now() : false;
}

function timeAgo(value) {
  const created = new Date(value).getTime();
  if (!created) {
    return "Now";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function normalizeOwner(story = {}) {
  const sourceId = story.owner?.id || story.ownerId || story.creatorId;
  const creator = atseenCreators[sourceId] || {};
  const name = story.owner?.name || story.owner?.displayName || story.name || creator.name || "Creator";

  return {
    id: sourceId || story.owner?.username || story.username || name.toLowerCase().replace(/\s+/g, ""),
    name,
    username: story.owner?.username || story.username || creator.username || name.toLowerCase().replace(/\s+/g, ""),
    avatar: resolveMediaUrl(story.owner?.avatar || story.avatar || creator.avatar || story.image || story.mediaUrl),
    verified: Boolean(story.owner?.verified || story.verified || story.brand || creator.verified),
    role: story.owner?.role || "creator",
  };
}

function normalizeStory(story = {}) {
  const createdAt = story.createdAt || new Date().toISOString();
  const mediaUrl = story.mediaUrl || story.image || story.url || "";
  const owner = normalizeOwner(story);
  const id = story.id || story._id || `${owner.id}-${createdAt}`;

  return {
    id,
    owner,
    name: story.name || owner.name,
    username: story.username || owner.username,
    avatar: owner.avatar,
    verified: owner.verified,
    brand: Boolean(story.brand),
    mediaType: story.mediaType || (String(mediaUrl).match(/\.(mp4|mov|webm)(\?|$)/i) ? "video" : "image"),
    mediaUrl: resolveMediaUrl(mediaUrl),
    image: resolveMediaUrl(mediaUrl),
    thumbnailUrl: resolveMediaUrl(story.thumbnailUrl || story.thumbnail || story.avatar || mediaUrl),
    caption: story.caption || "",
    duration: Number(story.duration) || (story.mediaType === "video" ? 15 : 5),
    editorMetadata: story.editorMetadata || {
      transform: { scale: 1, translateX: 0, translateY: 0, rotation: 0 },
      textOverlays: [],
      stickers: [],
      drawing: [],
    },
    audience: story.audience || "everyone",
    allowReactions: story.allowReactions !== false,
    // Existing backend stories predate this flag and historically allowed replies.
    allowReplies: story.allowReplies !== false,
    allowSharing: story.allowSharing !== false,
    createdAt,
    expiresAt: story.expiresAt || addHours(new Date(createdAt), 24),
    viewed: Boolean(story.viewed || readStore(SEEN_KEY)[id]),
    viewCount: Number(story.viewCount) || 0,
    reactionCount: Number(story.reactionCount) || 0,
    replyCount: Number(story.replyCount) || 0,
    insights: story.insights || null,
    statusEmoji: story.statusEmoji || "",
    timeAgo: story.timeAgo || timeAgo(createdAt),
    isOwner: Boolean(story.isOwner || story.isOwn),
    isOwn: Boolean(story.isOwner || story.isOwn),
  };
}

function normalizeApiList(data) {
  const list = data?.data?.items || data?.data || data?.items || data || [];
  return Array.isArray(list) ? list.map(normalizeStory).filter((story) => !isExpired(story)) : [];
}

function mockBaseStories() {
  return atseenStories.map((story) => {
    const createdAt = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    return normalizeStory({
      ...story,
      ownerId: story.id,
      createdAt,
      expiresAt: addHours(new Date(createdAt), 24),
    });
  });
}

function readMockStories() {
  const stored = Object.values(readStore(MOCK_STORIES_KEY));
  return stored
    .map((story) => {
      const mediaUrl = MOCK_MEDIA.get(story.id) || story.mediaUrl;
      return mediaUrl ? normalizeStory({ ...story, mediaUrl, isOwner: true }) : null;
    })
    .filter(Boolean);
}

function writeMockStory(story) {
  const stories = readStore(MOCK_STORIES_KEY);
  const persistable = { ...story, mediaUrl: story.mediaUrl };
  writeStore(MOCK_STORIES_KEY, { ...stories, [story.id]: persistable });
}

function deleteMockStory(storyId) {
  const stories = readStore(MOCK_STORIES_KEY);
  delete stories[storyId];
  writeStore(MOCK_STORIES_KEY, stories);
  const mediaUrl = MOCK_MEDIA.get(storyId);
  if (mediaUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(mediaUrl);
  }
  MOCK_MEDIA.delete(storyId);
}

function requireMocks() {
  if (!STORY_MOCKS_ENABLED) {
    throw new Error("Story API is not enabled.");
  }
}

export const storyService = {
  getStory: async (storyId) => {
    const response = await axiosInstance.get(`/stories/${storyId}`);
    return normalizeStory(response.data?.data?.story || response.data?.data || response.data);
  },

  getActiveStories: async () => {
    if (STORY_API_ENABLED) {
      return axiosInstance.get("/stories/active").then((response) => normalizeApiList(response.data));
    }

    requireMocks();
    return [...mockBaseStories(), ...readMockStories()].filter((story) => !isExpired(story));
  },

  getCreatorStories: async (creatorId) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.get(`/stories/creators/${creatorId}`).then((response) => normalizeApiList(response.data));
    }

    requireMocks();
    return [...mockBaseStories(), ...readMockStories()].filter((story) => story.owner.id === creatorId && !isExpired(story));
  },

  getMyStories: async () => {
    if (STORY_API_ENABLED) {
      return axiosInstance.get("/stories/me").then((response) => normalizeApiList(response.data));
    }

    requireMocks();
    return readMockStories().filter((story) => !isExpired(story));
  },

  createStory: async ({ formData, onUploadProgress, signal }) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.post("/stories", formData, {
        onUploadProgress,
        signal,
      }).then((response) => normalizeStory(response.data?.data?.story || response.data?.data || response.data));
    }

    requireMocks();
    const media = formData.get("media");
    if (!(media instanceof File)) {
      throw new Error("Story media is required.");
    }

    onUploadProgress?.({ loaded: 20, total: 100 });
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    onUploadProgress?.({ loaded: 74, total: 100 });
    await new Promise((resolve) => window.setTimeout(resolve, 260));

    const createdAt = new Date().toISOString();
    const id = `story-${Date.now()}`;
    const mediaUrl = URL.createObjectURL(media);
    MOCK_MEDIA.set(id, mediaUrl);
    const story = normalizeStory({
      id,
      owner: JSON.parse(formData.get("owner") || "{}"),
      mediaType: formData.get("mediaType"),
      mediaUrl,
      thumbnailUrl: mediaUrl,
      caption: formData.get("caption"),
      duration: Number(formData.get("duration")) || undefined,
      audience: formData.get("audience"),
      allowReactions: formData.get("allowReactions") !== "false",
      allowReplies: formData.get("allowReplies") === "true",
      allowSharing: formData.get("allowSharing") !== "false",
      editorMetadata: JSON.parse(formData.get("editorMetadata") || "{}"),
      createdAt,
      expiresAt: addHours(new Date(createdAt), 24),
      isOwner: true,
    });

    writeMockStory(story);
    onUploadProgress?.({ loaded: 100, total: 100 });
    return story;
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

  replyToStory: async (storyId, message) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.post(`/stories/${storyId}/replies`, { body: message });
    }

    throw new Error("Story replies are not enabled in this environment.");
  },

  deleteStory: async (storyId) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.delete(`/stories/${storyId}`);
    }

    deleteMockStory(storyId);
    return { data: { data: { storyId, deleted: true } } };
  },

  getStoryInsights: async (storyId) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.get(`/stories/${storyId}/insights`).then((response) => response.data?.data || response.data);
    }

    const reactions = readStore(REACTIONS_KEY);
    return {
      storyId,
      totalViews: readStore(SEEN_KEY)[storyId] ? 1 : 0,
      uniqueViewers: readStore(SEEN_KEY)[storyId] ? 1 : 0,
      reactions: reactions[storyId] ? [{ reaction: reactions[storyId].reaction, count: 1 }] : [],
      replies: 0,
      shares: 0,
      completionRate: null,
      viewers: [],
      unavailable: true,
    };
  },

  reportStory: async (storyId, reason) => {
    if (STORY_API_ENABLED) {
      return axiosInstance.post(`/stories/${storyId}/reports`, { reason });
    }

    return { data: { data: { storyId, reason, reported: true } } };
  },
};
