export const isGiftActivity = (item) => {
  const kind = `${item.type || ""} ${item.event || ""}`;
  return Boolean(/gift/i.test(kind) || item.metadata?.giftId || item.metadata?.giftImageUrl || item.giftImageUrl)
    && !/thank|refund|revers|report/i.test(kind);
};

function references(item) {
  const refs = new Set();
  const add = (value) => { if (value != null && String(value)) refs.add(String(value)); };
  add(item.reference?.id);
  add(item.transactionId);
  add(item.ledgerEntryId);
  add(item.walletLedgerId);
  add(item.messageId);
  for (const key of ["messageId", "chatMessageId", "dreamGiftId", "transactionId", "ledgerEntryId", "walletLedgerId"]) add(item.metadata?.[key]);
  if (/message|gift|transaction/i.test(item.target?.type || "")) add(item.target.id);
  if (/message|gift|transaction/i.test(item.relatedContent?.type || "")) add(item.relatedContent.id);
  if (item.dedupeKey) {
    add(item.dedupeKey);
    if (/^(chat.?gift|dream.?gift|gift|message)[:/]/i.test(item.dedupeKey)) add(item.dedupeKey.replace(/^[^:/]+[:/]/, ""));
  }
  return refs;
}

function sameGift(activity, ledger) {
  if (activity.direction !== ledger.direction || !isGiftActivity(activity) || !isGiftActivity(ledger)) return false;
  const activityRefs = references(activity);
  const ledgerRefs = references(ledger);
  if ([...activityRefs].some((id) => ledgerRefs.has(id))) return true;
  // Conflicting transaction references must never collapse separate sends.
  if (activityRefs.size && ledgerRefs.size) return false;
  const actor = (item) => item.relatedCreator?.id || item.relatedCreator?._id || item.relatedCreator?.username;
  const gift = (item) => item.metadata?.giftId || item.metadata?.giftImageUrl || item.giftImageUrl;
  const amount = Number(activity.starsChange);
  const timeGap = Math.abs(new Date(activity.createdAt).getTime() - new Date(ledger.createdAt).getTime());
  return Boolean(actor(activity) && actor(activity) === actor(ledger)
    && gift(activity) && gift(activity) === gift(ledger)
    && Number.isFinite(amount) && amount !== 0 && amount === Number(ledger.starsChange)
    && timeGap <= 2000);
}

// Match across sources one-to-one: repeated gifts in either source stay separate.
export function mergeActivitySources(activity, ledger) {
  const result = activity.map((item) => ({ ...item }));
  const matched = new Set();
  for (const entry of ledger) {
    const index = activity.findIndex((item, i) => !matched.has(i) && sameGift(item, entry));
    if (index < 0) { result.push(entry); continue; }
    matched.add(index);
    const notification = result[index];
    result[index] = {
      ...entry, ...notification,
      starsChange: notification.starsChange ?? entry.starsChange,
      metadata: { ...entry.metadata, ...notification.metadata },
      filterKeys: [...new Set([...(notification.filterKeys || []), ...(entry.filterKeys || [])])],
    };
  }
  return result;
}
