import axiosInstance from "../api/axiosInstance";

function unpack(response) {
  return response.data?.data || {};
}

function normalizeCreator(raw = {}) {
  return {
    ...raw,
    id: raw.id || raw._id || raw.username,
    username: raw.username || "",
    name: raw.name || raw.username || "Creator",
    avatar: raw.avatar || "",
    cover: raw.cover || raw.coverPhoto || "",
    tags: raw.tags || [],
    previewThumbnails: raw.previewThumbnails || [],
    followers: Number(raw.followers) || 0,
    subscribers: Number(raw.subscribers) || 0,
    worldMembers: Number(raw.worldMembers) || 0,
    following: Boolean(raw.following),
  };
}

function normalizeWorld(raw = {}) {
  return {
    ...raw,
    id: raw.id || raw._id,
    cover: raw.cover || "",
    owner: raw.owner || raw.creator || {},
    subscribers: Number(raw.subscribers) || 0,
  };
}

function normalizeStoryGroup(raw = {}) {
  return {
    ...raw,
    id: raw.id || raw.owner?.id || raw.owner?.username,
    owner: raw.owner || {},
    stories: raw.stories || [],
    live: Boolean(raw.live),
    seen: Boolean(raw.seen),
  };
}

function normalizeDiscover(data = {}) {
  return {
    featuredCreators: (data.featuredCreators || []).map(normalizeCreator),
    recommendedCreators: (data.recommendedCreators || []).map(normalizeCreator),
    nearbyCreators: (data.nearbyCreators || []).map(normalizeCreator),
    risingCreators: (data.risingCreators || []).map(normalizeCreator),
    newCreators: (data.newCreators || []).map(normalizeCreator),
    categories: data.categories || [],
    interestTags: data.interestTags || [],
    trendingTags: data.trendingTags || [],
    discoverReasons: data.discoverReasons || [],
    viewerLocation: data.viewerLocation || "",
    recentlyViewed: data.recentlyViewed || [],
    friendsOfFriends: (data.friendsOfFriends || []).map(normalizeCreator),
    popularWorlds: (data.popularWorlds || []).map(normalizeWorld),
    recommendedWorlds: (data.recommendedWorlds || []).map(normalizeWorld),
    creatorStories: (data.creatorStories || []).map(normalizeStoryGroup),
    featuredExperiences: (data.featuredExperiences || []).map(normalizeWorld),
    settings: data.settings || {},
  };
}

export const discoverService = {
  getDiscover: (params = {}, signal) => axiosInstance.get("/discover", { params, signal }).then((response) => normalizeDiscover(unpack(response))),
  updateSettings: (payload) => axiosInstance.patch("/discover/settings", payload).then((response) => unpack(response).settings || {}),
  resetSettings: () => axiosInstance.post("/discover/settings/reset").then((response) => unpack(response).settings || {}),
};
