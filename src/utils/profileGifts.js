// Freshly received gifts lead the shelf; then featured gifts and the viewer's gifts.
export function sortedProfileGifts(gifts, viewerId) {
  const receivedAt = (gift) => new Date(gift.createdAt || gift.receivedAt || 0).getTime() || 0;
  const mine = (gift) => Boolean(viewerId && String(gift.sender?.id || gift.sender?._id || "") === String(viewerId));
  const fresh = (gift) => receivedAt(gift) > Date.now() - 60000;
  return [...gifts].sort((a, b) => Number(fresh(b)) - Number(fresh(a))
    || (fresh(a) && fresh(b) ? receivedAt(b) - receivedAt(a) : 0)
    || Number(Boolean(b.featuredOnProfile)) - Number(Boolean(a.featuredOnProfile))
    || Number(mine(b)) - Number(mine(a))
    || receivedAt(b) - receivedAt(a));
}

// Seed only confirmed sends, then let the received-gifts endpoint reconcile them.
export function cacheSentProfileGift(queryClient, { recipient, sender, gift, receiptId, visibility, source, message }) {
  const profiles = queryClient.getQueriesData({ queryKey: ["unified-profile"] });
  const matchingProfile = profiles.find(([, data]) => String(data?.profile?.ownerUserId || "") === String(recipient.id))?.[1]?.profile;
  const username = recipient.username || matchingProfile?.username;
  if (!username) return;
  const key = ["profile", "received-gifts", username];
  const receipt = { ...gift, giftId: gift.giftId || gift.id, id: receiptId, sender: { id: sender?.id || sender?._id, name: sender?.name || sender?.displayName, username: sender?.username }, visibility, source, message, createdAt: new Date().toISOString() };
  queryClient.setQueryData(key, (current) => {
    const gifts = current?.gifts || [];
    if (gifts.some((item) => item.id === receipt.id)) return current;
    return { ...current, gifts: [receipt, ...gifts], total: Number(current?.total ?? gifts.length) + 1 };
  });
}
