import { useEffect, useState } from "react";
import { wallIsClosed } from "../utils/wallLifecycle";
export function wallCanEdit(post, now = Date.now()) {
  if (!post || wallIsClosed(post, now) || post.moderationHiddenAt || ["PENDING_REVIEW", "REJECTED"].includes(post.moderationStatus)) return false;
  const deadline = post.editUntil || new Date(new Date(post.publishedAt || post.createdAt).getTime() + 900000);
  return now < new Date(deadline).getTime();
}
export function useWallEditClock(post) {
  const [now, setNow] = useState(Date.now);
  const deadline = post ? new Date(post.editUntil || new Date(post.publishedAt || post.createdAt).getTime() + 900000).getTime() : 0;
  useEffect(() => {
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
    let timer;
    const tick = () => { const time = Date.now(); setNow(time); if (time < deadline) timer = window.setTimeout(tick, Math.min(10000, deadline - time)); };
    tick();
    return () => window.clearTimeout(timer);
  }, [deadline]);
  return now;
}
