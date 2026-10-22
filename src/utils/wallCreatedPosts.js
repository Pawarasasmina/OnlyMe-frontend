// Keep confirmed new notes ahead of recommendations without duplicating feed entries.
export function prependCreatedWallPosts(items = [], created = []) {
  const ids = new Set(created.map((post) => String(post.id || post._id)));
  return [...created, ...items.filter((post) => !ids.has(String(post.id || post._id)))];
}
