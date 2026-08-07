import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storyService } from "../services/storyService";

export const storyKeys = {
  active: ["stories", "active"],
  wall: (viewerId, location = "") => ["wall-stories", viewerId || "viewer", location || ""],
  creator: (creatorId) => ["stories", "creator", creatorId],
  mine: ["stories", "mine"],
  insights: (storyId) => ["stories", storyId, "insights"],
};

function invalidateStoryLists(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["stories"] });
  queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
}

function markStoryViewedInStory(story, storyId) {
  return story?.id === storyId ? { ...story, viewed: true } : story;
}

function setStoryReactionInStory(story, storyId, reaction) {
  return story?.id === storyId ? { ...story, viewerReaction: reaction, viewed: true } : story;
}

function markStoryViewedInDiscoverPage(page, storyId) {
  if (!page) return page;
  const friends = (page.friends || []).map((friend) => {
    const stories = (friend.stories || []).map((story) => markStoryViewedInStory(story, storyId));
    if (stories === friend.stories) return friend;
    const hasActiveStory = stories.length > 0 || friend.hasActiveStory;
    const hasUnseenStory = stories.some((story) => !story.viewed);
    return {
      ...friend,
      stories,
      hasActiveStory,
      storyAvailable: hasActiveStory,
      hasUnseenStory,
      storyViewed: hasActiveStory && !hasUnseenStory,
      firstUnseenStoryId: stories.find((story) => !story.viewed)?.id || null,
    };
  });
  return { ...page, friends };
}

function setStoryReactionInDiscoverPage(page, storyId, reaction) {
  if (!page) return page;
  return {
    ...page,
    friends: (page.friends || []).map((friend) => {
      const stories = (friend.stories || []).map((story) => setStoryReactionInStory(story, storyId, reaction));
      const hasActiveStory = stories.length > 0 || friend.hasActiveStory;
      const hasUnseenStory = stories.some((story) => !story.viewed);
      return {
        ...friend,
        stories,
        hasActiveStory,
        storyAvailable: hasActiveStory,
        hasUnseenStory,
        storyViewed: hasActiveStory && !hasUnseenStory,
        firstUnseenStoryId: stories.find((story) => !story.viewed)?.id || null,
      };
    }),
  };
}

function markStoryViewedInQueryData(data, storyId) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((story) => markStoryViewedInStory(story, storyId));
  if (data.pages) return { ...data, pages: data.pages.map((page) => markStoryViewedInDiscoverPage(page, storyId)) };
  return markStoryViewedInDiscoverPage(data, storyId);
}

function setStoryReactionInQueryData(data, storyId, reaction) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map((story) => setStoryReactionInStory(story, storyId, reaction));
  if (data.pages) return { ...data, pages: data.pages.map((page) => setStoryReactionInDiscoverPage(page, storyId, reaction)) };
  return setStoryReactionInDiscoverPage(data, storyId, reaction);
}

export function useActiveStories(options = {}) {
  return useQuery({
    queryKey: storyKeys.active,
    queryFn: storyService.getActiveStories,
    retry: false,
    ...options,
  });
}

export function useCreatorStories(creatorId, options = {}) {
  return useQuery({
    queryKey: storyKeys.creator(creatorId),
    queryFn: () => storyService.getCreatorStories(creatorId),
    enabled: Boolean(creatorId),
    retry: false,
    ...options,
  });
}

export function useMyStories(options = {}) {
  return useQuery({
    queryKey: storyKeys.mine,
    queryFn: storyService.getMyStories,
    retry: false,
    ...options,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storyService.createStory,
    retry: false,
    onSuccess: () => invalidateStoryLists(queryClient),
  });
}

export function useMarkStoryViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storyService.markStoryViewed,
    retry: false,
    onMutate: async (storyId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["stories"] }),
        queryClient.cancelQueries({ queryKey: ["discover"] }),
      ]);
      const previousStories = queryClient.getQueriesData({ queryKey: ["stories"] });
      const previousDiscover = queryClient.getQueriesData({ queryKey: ["discover"] });
      queryClient.setQueriesData({ queryKey: ["stories"] }, (current) => markStoryViewedInQueryData(current, storyId));
      queryClient.setQueriesData({ queryKey: ["discover"] }, (current) => markStoryViewedInQueryData(current, storyId));
      return { previousDiscover, previousStories };
    },
    onError: (_error, _storyId, context) => {
      context?.previousStories?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      context?.previousDiscover?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSuccess: (_result, storyId) => {
      queryClient.setQueriesData({ queryKey: ["stories"] }, (current) => markStoryViewedInQueryData(current, storyId));
      queryClient.setQueriesData({ queryKey: ["discover"] }, (current) => markStoryViewedInQueryData(current, storyId));
      invalidateStoryLists(queryClient);
    },
  });
}

export function useWallStories({ fallbackUser, location = "", viewerId } = {}, options = {}) {
  return useQuery({
    queryKey: storyKeys.wall(viewerId || fallbackUser?.id || fallbackUser?._id, location),
    queryFn: () => storyService.getWallStories({ fallbackUser }),
    retry: false,
    ...options,
  });
}

export function useReactToStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reaction, storyId }) => storyService.reactToStory(storyId, reaction),
    retry: false,
    onMutate: async ({ reaction, storyId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["stories"] }),
        queryClient.cancelQueries({ queryKey: ["discover"] }),
      ]);
      const previousStories = queryClient.getQueriesData({ queryKey: ["stories"] });
      const previousDiscover = queryClient.getQueriesData({ queryKey: ["discover"] });
      queryClient.setQueriesData({ queryKey: ["stories"] }, (current) => setStoryReactionInQueryData(current, storyId, reaction));
      queryClient.setQueriesData({ queryKey: ["discover"] }, (current) => setStoryReactionInQueryData(current, storyId, reaction));
      return { previousDiscover, previousStories };
    },
    onError: (_error, _payload, context) => {
      context?.previousStories?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      context?.previousDiscover?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSuccess: (_result, { reaction, storyId }) => {
      queryClient.setQueriesData({ queryKey: ["stories"] }, (current) => setStoryReactionInQueryData(current, storyId, reaction));
      queryClient.setQueriesData({ queryKey: ["discover"] }, (current) => setStoryReactionInQueryData(current, storyId, reaction));
      invalidateStoryLists(queryClient);
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storyService.deleteStory,
    retry: false,
    onSuccess: () => invalidateStoryLists(queryClient),
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storyService.updateStatus,
    retry: false,
    onMutate: async (payload) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["wall-stories"] }),
        queryClient.cancelQueries({ queryKey: ["profile"] }),
      ]);
      const previousWallStories = queryClient.getQueriesData({ queryKey: ["wall-stories"] });
      const optimisticStatus = payload?.clear ? null : {
        color: payload.color || "#9CCBFF",
        emoji: payload.emoji || "",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        isCustom: Boolean(payload.isCustom),
        label: payload.label || "",
        presetKey: payload.presetKey || "",
        startedAt: new Date().toISOString(),
      };
      queryClient.setQueriesData({ queryKey: ["wall-stories"] }, (current) => {
        if (!current?.viewer) return current;
        return { ...current, viewer: { ...current.viewer, activeStatus: optimisticStatus } };
      });
      return { previousWallStories };
    },
    onError: (_error, _payload, context) => {
      context?.previousWallStories?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSuccess: (activeStatus) => {
      queryClient.setQueriesData({ queryKey: ["wall-stories"] }, (current) => {
        if (!current?.viewer) return current;
        return { ...current, viewer: { ...current.viewer, activeStatus } };
      });
      queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useStoryInsights(storyId, options = {}) {
  return useQuery({
    queryKey: storyKeys.insights(storyId),
    queryFn: () => storyService.getStoryInsights(storyId),
    enabled: Boolean(storyId),
    retry: false,
    ...options,
  });
}
