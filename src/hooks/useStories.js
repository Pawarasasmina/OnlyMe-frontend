import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storyService } from "../services/storyService";

export const storyKeys = {
  active: ["stories", "active"],
  creator: (creatorId) => ["stories", "creator", creatorId],
  mine: ["stories", "mine"],
  insights: (storyId) => ["stories", storyId, "insights"],
};

function invalidateStoryLists(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["stories"] });
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
    onSuccess: () => invalidateStoryLists(queryClient),
  });
}

export function useReactToStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reaction, storyId }) => storyService.reactToStory(storyId, reaction),
    retry: false,
    onSuccess: () => invalidateStoryLists(queryClient),
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

export function useStoryInsights(storyId, options = {}) {
  return useQuery({
    queryKey: storyKeys.insights(storyId),
    queryFn: () => storyService.getStoryInsights(storyId),
    enabled: Boolean(storyId),
    retry: false,
    ...options,
  });
}
