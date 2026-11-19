// Older API responses still get stable variation until the backend is deployed.
export function selectDiscoverReason(card) {
  if (card.cardReason?.code) return card.cardReason;
  const candidates = [];
  if (card.dream?.title && card.dream.status === "active") candidates.push({ code: "DREAM", title: card.dream.title });
  if (card.reason?.code === "SAME_CITY" && card.city) candidates.push({ code: "SAME_CITY", city: card.city });
  const seen = card.featuredSeen || card.latestSeen;
  if (seen?.title) candidates.push({ code: "SHARES", category: seen.category });
  if (!candidates.length) return { code: "DISCOVER_PROFILE" };
  let hash = 0;
  for (const character of String(card.userId || card.creator?.id || card.creatorId || card.id || card.username || "")) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return candidates[hash % candidates.length];
}
