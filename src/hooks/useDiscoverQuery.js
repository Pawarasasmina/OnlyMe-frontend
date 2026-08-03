import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discoverService } from "../services/discoverService";
import { profileService } from "../services/profileService";

export const discoverKeys = {
  all: ["discover"],
  home: (params = {}) => ["discover", "home", params],
};

function updateCreator(list, username, updater) {
  return (list || []).map((creator) => creator.username === username ? updater(creator) : creator);
}

function updateDiscoverCreator(current, username, updater) {
  if (!current) return current;
  return {
    ...current,
    featuredCreators: updateCreator(current.featuredCreators, username, updater),
    recommendedCreators: updateCreator(current.recommendedCreators, username, updater),
    nearbyCreators: updateCreator(current.nearbyCreators, username, updater),
    risingCreators: updateCreator(current.risingCreators, username, updater),
    newCreators: updateCreator(current.newCreators, username, updater),
    friendsOfFriends: updateCreator(current.friendsOfFriends, username, updater),
  };
}

export function useDiscoverQuery(params = {}) {
  return useQuery({
    queryKey: discoverKeys.home(params),
    queryFn: ({ signal }) => discoverService.getDiscover(params, signal),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 20,
    cacheTime: 1000 * 60 * 20,
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

export function useDiscoverFollowMutation(params = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (creator) => profileService.toggleFollow(creator.username).then((response) => response.data?.data?.relationship),
    retry: false,
    onMutate: async (creator) => {
      await queryClient.cancelQueries({ queryKey: discoverKeys.all });
      const previous = queryClient.getQueryData(discoverKeys.home(params));
      queryClient.setQueryData(discoverKeys.home(params), (current) => updateDiscoverCreator(current, creator.username, (item) => ({
        ...item,
        following: !item.following,
        followers: Math.max(0, (item.followers || 0) + (item.following ? -1 : 1)),
      })));
      return { previous };
    },
    onError: (_error, _creator, context) => {
      if (context?.previous) queryClient.setQueryData(discoverKeys.home(params), context.previous);
    },
    onSuccess: (relationship, creator) => {
      queryClient.setQueryData(discoverKeys.home(params), (current) => updateDiscoverCreator(current, creator.username, (item) => ({
        ...item,
        following: Boolean(relationship?.active),
        followers: Number(relationship?.followerCount) || item.followers,
      })));
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
    },
  });
}
