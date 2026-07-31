import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { orbitService } from "../services/orbitService";

export function useOrbit(params = {}) {
  const { user } = useAuth();
  const limit = params.limit || 12;
  const cursor = params.cursor || "";
  const sessionId = params.sessionId || "";

  return useQuery({
    queryKey: ["orbit", user?.id, { limit, cursor, sessionId }],
    queryFn: () => orbitService.getOrbit({ limit, cursor: cursor || undefined, sessionId: sessionId || undefined }).then((response) => response.data.data),
    enabled: Boolean(user?.id),
    placeholderData: (previousData) => previousData,
  });
}

export function useCityProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["orbit-cities", user?.id],
    queryFn: () => orbitService.getCityProgress().then((response) => response.data.data.cities || []),
    enabled: Boolean(user?.id),
  });
}

export function useRefreshOrbit() {
  return useMutation({
    mutationFn: (params = {}) => orbitService.refreshOrbit(params).then((response) => response.data.data),
  });
}

function markSeen(orbit, targetUserId) {
  if (!orbit) return orbit;
  const update = (item) => item?.id === targetUserId ? { ...item, hasSeenSignal: true } : item;

  return {
    ...orbit,
    recommendations: (orbit.recommendations || []).map(update),
    todayEncounter: update(orbit.todayEncounter),
  };
}

export function useSendSeeYouSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId) => orbitService.sendSeeYouSignal(targetUserId).then((response) => response.data.data),
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ["orbit"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["orbit"] });

      snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, markSeen(data, targetUserId));
      });

      return { snapshots };
    },
    onError: (_error, _targetUserId, context) => {
      context?.snapshots?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
    },
  });
}
