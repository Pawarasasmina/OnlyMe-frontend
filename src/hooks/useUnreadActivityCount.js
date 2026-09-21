import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fanService } from "../services/fanService";
import { getMessageSocket } from "../services/messageSocket";

export function useUnreadActivityCount(enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["fan", "activity", "unread-count"],
    queryFn: () => fanService.getActivity({ direction: "received", filter: "all", limit: 1, page: 1 })
      .then((response) => Number(response.data.data.unreadCount) || 0),
    enabled,
    retry: false,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = getMessageSocket();
    if (!socket) return undefined;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
    socket.on("activity:updated", refresh);
    return () => socket.off("activity:updated", refresh);
  }, [enabled, queryClient]);

  return query.data || 0;
}
