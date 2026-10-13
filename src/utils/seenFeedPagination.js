export function nextSeenFeedPage(lastPage) {
  return lastPage.pagination?.hasMore ? (lastPage.pagination.page || 1) + 1 : undefined;
}

export function updateSeenFeedPages(current, updateItems) {
  if (!current) return current;
  return { ...current, pages: current.pages.map((page) => ({ ...page, items: updateItems(page.items || []) })) };
}
