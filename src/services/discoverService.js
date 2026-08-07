import axiosInstance from "../api/axiosInstance";
import { resolveMediaUrl } from "../utils/media";

function unpack(response) {
  return response.data?.data || {};
}

function normalizeCreator(raw = {}) {
  const displayName = raw.displayName || raw.name || raw.username || "Creator";
  return {
    ...raw,
    id: raw.id || raw._id || raw.username,
    username: raw.username || "",
    name: raw.name || displayName,
    displayName,
    firstName: raw.firstName || displayName.split(" ")[0],
    avatar: raw.avatar || "",
    cover: raw.cover || raw.coverImage || raw.coverPhoto || "",
    coverImage: raw.coverImage || raw.cover || raw.coverPhoto || "",
    tags: raw.tags || [],
    previewThumbnails: raw.previewThumbnails || [],
    followers: Number(raw.followers ?? raw.followersCount) || 0,
    followersCount: Number(raw.followersCount ?? raw.followers) || 0,
    subscribers: Number(raw.subscribers) || 0,
    worldMembers: Number(raw.worldMembers) || 0,
    following: Boolean(raw.following ?? raw.isFollowing),
    isFollowing: Boolean(raw.isFollowing ?? raw.following),
    isVerified: Boolean(raw.isVerified ?? raw.verified),
    isMutualFollow: Boolean(raw.isMutualFollow),
    recommendationReason: raw.recommendationReason || raw.whyRecommended || "",
    hasActiveStory: Boolean(raw.hasActiveStory ?? raw.storyAvailable),
    hasUnseenStory: Boolean(raw.hasUnseenStory),
    activeStoryCount: Number(raw.activeStoryCount) || 0,
    firstUnseenStoryId: raw.firstUnseenStoryId || null,
    storyAvailable: Boolean(raw.storyAvailable ?? raw.hasActiveStory),
    storyViewed: Boolean(raw.storyViewed),
    stories: (raw.stories || []).map(normalizeDiscoverStory),
    hasPremiumOffering: Boolean(raw.hasPremiumOffering),
    profileUrl: raw.profileUrl || (raw.username ? `/profile/${encodeURIComponent(raw.username)}` : "/search"),
  };
}

function normalizeDiscoverStory(raw = {}) {
  const owner = raw.owner || {};
  return {
    ...raw,
    id: raw.id || raw._id,
    owner: {
      ...owner,
      id: owner.id || owner._id || raw.ownerId || raw.creatorId || "",
      name: owner.name || raw.name || "Creator",
      username: owner.username || raw.username || "",
      avatar: owner.avatar || raw.avatar || "",
      verified: Boolean(owner.verified || raw.verified),
      role: owner.role || "creator",
    },
    ownerId: raw.ownerId || raw.creatorId || owner.id || owner._id || "",
    creatorId: raw.creatorId || raw.ownerId || owner.id || owner._id || "",
    mediaUrl: resolveMediaUrl(raw.mediaUrl || raw.image || ""),
    image: resolveMediaUrl(raw.image || raw.mediaUrl || ""),
    thumbnailUrl: resolveMediaUrl(raw.thumbnailUrl || raw.mediaUrl || raw.image || ""),
    mediaType: raw.mediaType || "image",
    duration: Number(raw.duration) || (raw.mediaType === "video" ? 15 : 5),
    caption: raw.caption || "",
    allowReactions: raw.allowReactions !== false,
    allowReplies: raw.allowReplies !== false,
    allowSharing: raw.allowSharing !== false,
    viewed: Boolean(raw.viewed),
    viewerReaction: raw.viewerReaction || null,
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

function normalizeSlide(raw = {}) {
  const creator = raw.creator || {};
  const offer = raw.featuredOffer || null;
  const displayName = raw.displayName || creator.name || creator.username || "Creator";
  const city = raw.city || creator.location?.city || "";
  const country = raw.country || creator.location?.country || "";
  return {
    ...raw,
    id: raw.id || creator.id || creator.username,
    coverImage: raw.coverImage || raw.media?.url || creator.cover || "",
    avatar: raw.avatar || creator.avatar || "",
    displayName,
    username: raw.username || creator.username || "",
    category: raw.category || creator.category || "",
    city,
    country,
    recommendationReason: raw.recommendationReason || raw.reason?.detail || "",
    isVerified: Boolean(raw.isVerified ?? creator.verified),
    isFollowing: Boolean(raw.isFollowing ?? raw.actions?.following),
    followersCount: Number(raw.followersCount) || 0,
    storyAvailable: Boolean(raw.storyAvailable),
    profileUrl: raw.profileUrl || creator.profileRoute || (creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/search"),
    creator: {
      ...creator,
      id: creator.id || creator._id || "",
      name: creator.name || displayName,
      username: creator.username || "",
      avatar: creator.avatar || "",
      verified: Boolean(creator.verified),
      following: Boolean(creator.following ?? raw.isFollowing ?? raw.actions?.following),
      status: creator.status || "",
      location: creator.location || {},
      profileRoute: creator.profileRoute || (creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/search"),
    },
    media: {
      type: raw.media?.type || "fallback",
      url: raw.media?.url || "",
      poster: raw.media?.poster || null,
      alt: raw.media?.alt || `${creator.name || "Creator"} public media`,
    },
    reason: {
      code: raw.reason?.code || "RECOMMENDED",
      label: raw.reason?.label || "WHY YOU TWO",
      detail: raw.reason?.detail || "",
    },
    dream: raw.dream || null,
    featuredOffer: offer ? {
      ...offer,
      id: offer.id || offer._id,
      route: offer.route || (offer.id ? `/world/${offer.id}` : ""),
      saved: Boolean(offer.saved),
      isFree: Boolean(offer.isFree),
      viewerHasAccess: Boolean(offer.viewerHasAccess),
    } : null,
    actions: {
      hasSeenSignal: Boolean(raw.actions?.hasSeenSignal),
      saved: Boolean(raw.actions?.saved || offer?.saved),
      saveTarget: raw.actions?.saveTarget || (offer?.id ? { type: "publication", id: offer.id } : null),
      messageAllowed: Boolean(raw.actions?.messageAllowed),
      directAccessRequired: Boolean(raw.actions?.directAccessRequired),
      directAccessAvailable: Boolean(raw.actions?.directAccessAvailable),
      blocked: Boolean(raw.actions?.blocked),
      following: Boolean(raw.actions?.following ?? raw.isFollowing),
      reportable: raw.actions?.reportable !== false,
      hideable: raw.actions?.hideable !== false,
      blockable: raw.actions?.blockable !== false,
    },
  };
}

function normalizeSeen(raw = {}) {
  if (!raw) return null;
  const id = raw.id || raw._id;
  return {
    ...raw,
    id,
    title: raw.title || "Untitled Seen",
    cover: raw.cover || raw.coverImage || "",
    coverImage: raw.coverImage || raw.cover || "",
    route: raw.route || (id ? `/seen/${id}` : "/seen"),
    engagementCount: Number(raw.engagementCount ?? raw.viewCount) || 0,
    viewCount: Number(raw.viewCount) || 0,
    chapterCount: Number(raw.chapterCount) || 0,
    creator: raw.creator || {},
  };
}

function normalizeActivity(raw = null) {
  if (!raw) return null;
  return {
    ...raw,
    actor: raw.actor || {},
    count: Number(raw.count) || 0,
    online: Boolean(raw.online),
    text: raw.text || "",
  };
}

function normalizeDiscover(data = {}) {
  return {
    recommendations: (data.recommendations || []).map(normalizeSlide),
    pagination: data.pagination || { nextCursor: null, hasMore: false, sessionId: "" },
    filters: data.filters || [],
    friends: (data.friends || []).map(normalizeCreator),
    following: (data.following || []).map(normalizeCreator),
    suggestedUsers: (data.suggestedUsers || []).map(normalizeCreator),
    activity: normalizeActivity(data.activity),
    trendingSeen: normalizeSeen(data.trendingSeen),
    freshSeens: (data.freshSeens || []).map(normalizeSeen).filter(Boolean),
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
  hideCreator: (userId) => axiosInstance.post(`/discover/hidden-creators/${userId}`).then((response) => unpack(response)),
  toggleOfferSave: (publicationId) => axiosInstance.put(`/discover/offers/${publicationId}/save`).then((response) => unpack(response)),
  reportCreator: (userId, payload) => axiosInstance.post(`/discover/creators/${userId}/report`, payload).then((response) => unpack(response)),
  blockCreator: (userId) => axiosInstance.put(`/discover/creators/${userId}/block`).then((response) => unpack(response)),
};
