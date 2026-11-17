import { msg as __msg } from "../i18n/runtime.js";
import { wallClosedReason } from "../../shared/wallLifecycle.js";
import { wallIsClosed } from "./wallLifecycle.js";
// Resolution changes must preserve share captions, engagement, and identity.
export function patchWallResolution(current, post) {
  if (!current) return current;
  const patch = (item) => String(item.originalPostId || item.id || "") === String(post.originalPostId || post.id)
    ? { ...item, resolvedAt: post.resolvedAt || null, canResolve: post.canResolve, ...(Object.hasOwn(post, "isClosed") ? { isClosed: post.isClosed, closedReason: post.closedReason } : {}) }
    : item;
  if (Array.isArray(current.items)) return { ...current, items: current.items.map(patch) };
  return patch(current);
}

export function wallCloseLabels(postType, context = "") {
  if (!postType && ["Buy/Sell", "Shopping"].includes(context)) postType = "Buy & Sell";
  return ({
    "Buy & Sell": { action: __msg("wallResolution.markAsSold"), state: __msg("wallResolution.sold") },
    Offering: { action: __msg("wallResolution.noLongerAvailable"), state: __msg("admin.notAvailable") },
    Recommendation: { action: __msg("wallResolution.markAsOutdated"), state: __msg("wallResolution.outdated") },
    Event: { action: __msg("wallResolution.endEvent"), state: __msg("wallResolution.ended") },
  })[postType] || { action: __msg("wallResolution.markAsSolved"), state: __msg("social.solved") };
}

export function wallClosedLabel(post, now = Date.now()) {
  if (!wallIsClosed(post, now)) return "";
  const reason = post.closedReason || wallClosedReason(post, now);
  if (post.resolvedAt || reason === "resolved") return wallCloseLabels(post.postType, post.context).state;
  if (reason === "ended") return __msg("wallResolution.ended");
  if (reason === "outdated") return __msg("wallLifetime.mayBeOutdated");
  return __msg("fan.expired");
}
