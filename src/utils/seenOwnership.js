export function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value._id || value.id || value.userId || value.user?._id || value.user?.id || "");
}

export function isSeenOwner(currentUser, seen) {
  const userId = normalizeId(currentUser);
  if (!userId || !seen) return false;
  const creator = seen.creator || seen.author || seen.owner || seen.createdBy;
  const creatorId = normalizeId(creator) || normalizeId(seen.creatorId) || normalizeId(seen.ownerId) || normalizeId(seen.createdBy);
  return Boolean(creatorId && userId === creatorId);
}
