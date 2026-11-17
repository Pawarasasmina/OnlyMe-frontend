import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wallExpiryTime } from "../utils/wallLifecycle";

// Expire a mounted Wall at its next boundary; also refresh prompt countdowns.
export function useWallLifecycleClock(posts = []) {
  const [now, setNow] = useState(Date.now);
  const queryClient = useQueryClient();
  const deadlines = [...new Set(posts.map(wallExpiryTime).filter(Number.isFinite))].sort((a, b) => a - b).join(",");
  useEffect(() => {
    const times = deadlines ? deadlines.split(",").map(Number) : [];
    let previous = Date.now();
    let timer;
    const refresh = () => {
      const stamp = Date.now();
      if (times.some(time => time > previous && time <= stamp)) {
        queryClient.invalidateQueries({ queryKey: ["feed-posts", "need-counts"] });
      }
      previous = stamp;
      setNow(stamp);
      window.clearTimeout(timer);
      const next = times.find(time => time > stamp);
      timer = window.setTimeout(refresh, Math.min(60000, next ? Math.max(1, next - stamp) : 60000));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [deadlines, queryClient]);
  return now;
}
