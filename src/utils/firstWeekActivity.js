const DAY_MS = 24 * 60 * 60 * 1000;

// Display real received events only. Quiet days deliberately have no card.
export function firstWeekActivity(items, joinedAt) {
  const start = new Date(joinedAt).getTime();
  if (!Number.isFinite(start)) return [];
  const days = new Map();
  for (const item of [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
    const time = new Date(item.createdAt).getTime();
    const day = Math.floor((time - start) / DAY_MS) + 1;
    const text = item.title || item.description || item.message;
    if (day < 1 || day > 7 || !Number.isFinite(day) || !text || days.has(day)) continue;
    if (item.direction === 'sent' || ['profile_view', 'profile_viewed'].includes(item.type)) continue;
    days.set(day, { id: item.id || item._id || `${day}-${time}`, day, text, createdAt: item.createdAt });
  }
  return [...days.values()];
}

export async function loadFirstWeekActivity(getActivity, joinedAt, signal) {
  const start = new Date(joinedAt).getTime();
  if (!Number.isFinite(start)) return [];
  const items = [];
  let page = 1;
  while (!signal?.aborted) {
    const response = await getActivity({ direction: 'received', filter: 'all', limit: 50, page });
    const data = response.data.data;
    const batch = data.items || data.activity || [];
    items.push(...batch);
    if (!batch.length || !data.pageInfo?.hasMore || batch.some(item => new Date(item.createdAt).getTime() < start)) break;
    page += 1;
  }
  return firstWeekActivity(items, joinedAt);
}
