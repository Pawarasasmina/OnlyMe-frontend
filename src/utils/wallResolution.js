// Resolution changes must preserve share captions, engagement, and identity.
export function patchWallResolution(current, post) {
  if (!current) return current;
  const patch = (item) => String(item.originalPostId || item.id || "") === String(post.originalPostId || post.id)
    ? { ...item, resolvedAt: post.resolvedAt || null, canResolve: post.canResolve, ...(Object.hasOwn(post, "isClosed") ? { isClosed: post.isClosed, closedReason: post.closedReason } : {}) }
    : item;
  if (Array.isArray(current.items)) return { ...current, items: current.items.map(patch) };
  return patch(current);
}

export function wallCloseLabels(postType) {
  return ({
    "Buy & Sell": { action: "Mark as sold", state: "Sold" },
    Offering: { action: "No longer available", state: "Not available" },
    Recommendation: { action: "Mark as outdated", state: "Outdated" },
    Event: { action: "End event", state: "Ended" },
  })[postType] || { action: "Mark as solved", state: "Solved" };
}
