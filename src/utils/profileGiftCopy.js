import { giftCaptions } from "../data/giftCaptions.js";

export function profileGiftCopy(gift = {}, { isOwner = false, viewerId } = {}) {
  const sender = gift.sender || {};
  const isSender = viewerId && String(sender.id || sender._id || "") === String(viewerId);
  const canSeeSender = gift.visibility !== "RECIPIENT_ONLY" || isOwner || isSender;
  return {
    caption: gift.tagline || gift.caption || giftCaptions[gift.name] || "",
    senderName: canSeeSender ? sender.name || sender.displayName || (sender.username ? `@${sender.username}` : "a supporter") : "a private supporter",
    note: canSeeSender ? gift.message || "" : "",
  };
}
