import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discoverService } from "../services/discoverService";
import { orbitService } from "../services/orbitService";
import { profileService } from "../services/profileService";

export const discoverKeys = {
  all: ["discover"],
  home: (params = {}) => ["discover", "home", params],
  slides: (params = {}) => ["discover", "slides", params],
};

function requestParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([key]) => !key.startsWith("_")));
}

function updateCreator(list, username, updater) {
  return (list || []).map((creator) => creator.username === username ? updater(creator) : creator);
}

function updateDiscoverCreator(current, username, updater) {
  if (!current) return current;
  const updateRecommendation = (slide) => {
    if (slide.creator?.username !== username && slide.username !== username) return slide;
    const next = updater(slide);
    const following = Boolean(next.following ?? next.isFollowing);
    return {
      ...slide,
      ...next,
      creator: slide.creator ? { ...slide.creator, following } : slide.creator,
      actions: slide.actions ? { ...slide.actions, following } : slide.actions,
    };
  };
  return {
    ...current,
    recommendations: (current.recommendations || []).map(updateRecommendation),
    friends: updateCreator(current.friends, username, updater),
    following: updateCreator(current.following, username, updater),
    suggestedUsers: updateCreator(current.suggestedUsers, username, updater),
    featuredCreators: updateCreator(current.featuredCreators, username, updater),
    recommendedCreators: updateCreator(current.recommendedCreators, username, updater),
    nearbyCreators: updateCreator(current.nearbyCreators, username, updater),
    risingCreators: updateCreator(current.risingCreators, username, updater),
    newCreators: updateCreator(current.newCreators, username, updater),
    friendsOfFriends: updateCreator(current.friendsOfFriends, username, updater),
  };
}

function updateDiscoverData(data, username, updater) {
  if (!data) return data;
  if (data.pages) {
    return {
      ...data,
      pages: data.pages.map((page) => updateDiscoverCreator(page, username, updater)),
    };
  }
  return updateDiscoverCreator(data, username, updater);
}

function updateAllDiscoverQueries(queryClient, username, updater) {
  queryClient.getQueriesData({ queryKey: discoverKeys.all }).forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, updateDiscoverData(data, username, updater));
  });
}

function updateSlidePages(queryClient, updater) {
  queryClient.getQueriesData({ queryKey: discoverKeys.all }).forEach(([queryKey, data]) => {
    if (!data?.pages) return;
    queryClient.setQueryData(queryKey, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        recommendations: (page.recommendations || []).map(updater).filter(Boolean),
      })),
    });
  });
}

function updateSlide(current, targetUserId, updater) {
  if (!current) return current;
  const apply = (slide) => slide.creator?.id === targetUserId ? updater(slide) : slide;
  if (current.pages) {
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        recommendations: (page.recommendations || []).map(apply),
      })),
    };
  }
  return current;
}

export function useDiscoverQuery(params = {}) {
  return useQuery({
    queryKey: discoverKeys.home(params),
    queryFn: ({ signal }) => discoverService.getDiscover(requestParams(params), signal),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 20,
    cacheTime: 1000 * 60 * 20,
    retry: 1,
  });
}

export function useDiscoverSlidesQuery(params = {}) {
  return useInfiniteQuery({
    queryKey: discoverKeys.slides(params),
    queryFn: ({ pageParam, signal }) => discoverService.getDiscover({ ...requestParams(params), cursor: pageParam || undefined }, signal),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor || undefined,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    cacheTime: 1000 * 60 * 15,
    retry: 1,
  });
}

export function useDiscoverSettingsMutation(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discoverService.updateSettings,
    retry: false,
    onSuccess: (settings) => {
      queryClient.setQueryData(discoverKeys.home(params), (current) => current ? { ...current, settings } : current);
      queryClient.invalidateQueries({ queryKey: discoverKeys.all });
    },
  });
}

export function useResetDiscoverSettings(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discoverService.resetSettings,
    retry: false,
    onSuccess: (settings) => {
      queryClient.setQueryData(discoverKeys.home(params), (current) => current ? { ...current, settings } : current);
      queryClient.invalidateQueries({ queryKey: discoverKeys.all });
    },
  });
}

export function useDiscoverFollowMutation(_params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (creator) => profileService.toggleFollow(creator.username).then((response) => response.data?.data?.relationship),
    retry: false,
    onMutate: async (creator) => {
      await queryClient.cancelQueries({ queryKey: discoverKeys.all });
      const previous = queryClient.getQueriesData({ queryKey: discoverKeys.all });
      updateAllDiscoverQueries(queryClient, creator.username, (item) => {
        const wasFollowing = Boolean(item.following ?? item.isFollowing);
        const nextFollowing = !wasFollowing;
        const delta = wasFollowing ? -1 : 1;
        const followerTotal = Math.max(0, (item.followers ?? item.followersCount ?? 0) + delta);
        return {
          ...item,
          following: nextFollowing,
          isFollowing: nextFollowing,
          followers: followerTotal,
          followersCount: followerTotal,
        };
      });
      return { previous };
    },
    onError: (_error, _creator, context) => {
      context?.previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSuccess: (relationship, creator) => {
      updateAllDiscoverQueries(queryClient, creator.username, (item) => ({
        ...item,
        following: Boolean(relationship?.active),
        isFollowing: Boolean(relationship?.active),
        followers: Number(relationship?.followerCount) || item.followers,
        followersCount: Number(relationship?.followerCount) || item.followersCount,
      }));
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
    },
  });
}

export function useDiscoverSeeYouMutation(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId) => orbitService.sendSeeYouSignal(targetUserId).then((response) => response.data.data),
    retry: false,
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: discoverKeys.all });
      const previous = queryClient.getQueryData(discoverKeys.slides(params));
      queryClient.setQueryData(discoverKeys.slides(params), (current) => updateSlide(current, targetUserId, (slide) => ({
        ...slide,
        actions: { ...slide.actions, hasSeenSignal: true },
      })));
      return { previous };
    },
    onError: (_error, _targetUserId, context) => {
      if (context?.previous) queryClient.setQueryData(discoverKeys.slides(params), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
    },
  });
}

export function useDiscoverOfferSaveMutation(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicationId) => discoverService.toggleOfferSave(publicationId),
    retry: false,
    onMutate: async (publicationId) => {
      await queryClient.cancelQueries({ queryKey: discoverKeys.all });
      const previous = queryClient.getQueryData(discoverKeys.slides(params));
      queryClient.setQueryData(discoverKeys.slides(params), (current) => {
        if (!current?.pages) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            recommendations: (page.recommendations || []).map((slide) => {
              if (slide.featuredOffer?.id !== publicationId) return slide;
              const saved = !slide.actions?.saved;
              return {
                ...slide,
                featuredOffer: { ...slide.featuredOffer, saved },
                actions: { ...slide.actions, saved },
              };
            }),
          })),
        };
      });
      return { previous };
    },
    onError: (_error, _publicationId, context) => {
      if (context?.previous) queryClient.setQueryData(discoverKeys.slides(params), context.previous);
    },
    onSuccess: (result, publicationId) => {
      queryClient.setQueryData(discoverKeys.slides(params), (current) => {
        if (!current?.pages) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            recommendations: (page.recommendations || []).map((slide) => {
              if (slide.featuredOffer?.id !== publicationId) return slide;
              return {
                ...slide,
                featuredOffer: { ...slide.featuredOffer, saved: Boolean(result.saved) },
                actions: { ...slide.actions, saved: Boolean(result.saved) },
              };
            }),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
    },
  });
}

export function useHideDiscoverCreator(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId) => discoverService.hideCreator(targetUserId),
    retry: false,
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: discoverKeys.all });
      const previous = queryClient.getQueryData(discoverKeys.slides(params));
      queryClient.setQueryData(discoverKeys.slides(params), (current) => {
        if (!current?.pages) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            recommendations: (page.recommendations || []).filter((slide) => slide.creator?.id !== targetUserId),
          })),
        };
      });
      return { previous };
    },
    onError: (_error, _targetUserId, context) => {
      if (context?.previous) queryClient.setQueryData(discoverKeys.slides(params), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: discoverKeys.all });
    },
  });
}

export function useBlockDiscoverCreator(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId) => discoverService.blockCreator(targetUserId),
    retry: false,
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: discoverKeys.all });
      const previous = queryClient.getQueryData(discoverKeys.slides(params));
      updateSlidePages(queryClient, (slide) => slide.creator?.id === targetUserId ? null : slide);
      return { previous };
    },
    onError: (_error, _targetUserId, context) => {
      if (context?.previous) queryClient.setQueryData(discoverKeys.slides(params), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: discoverKeys.all });
    },
  });
}

export function useReportDiscoverCreator() {
  return useMutation({
    mutationFn: ({ userId, payload }) => discoverService.reportCreator(userId, payload),
    retry: false,
  });
}
