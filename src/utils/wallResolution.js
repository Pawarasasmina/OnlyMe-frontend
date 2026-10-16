// Resolution changes must preserve share captions, engagement, and identity.
export function patchWallResolution(current, post) {
  if (!current) return current;
  const patch = (item) => String(item.originalPostId || item.id || "") === String(post.originalPostId || post.id)
    ? { ...item, resolvedAt: post.resolvedAt || null, canResolve: post.canResolve }
    : item;
  if (Array.isArray(current.items)) return { ...current, items: current.items.map(patch) };
  return patch(current);
}
