import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { shareService } from "../../services/shareService";

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

export function useShareRecipients({ enabled = false, query = "", viewerId = "" } = {}) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  return useQuery({
    enabled,
    queryKey: ["share-recipients", viewerId, debouncedQuery],
    queryFn: () => shareService.getRecipients({ q: debouncedQuery, limit: debouncedQuery ? 30 : 16 }).then((response) => response.data.data.people || []),
    staleTime: debouncedQuery ? 15_000 : 60_000,
  });
}
