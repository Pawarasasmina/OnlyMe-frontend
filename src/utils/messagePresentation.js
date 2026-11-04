export const CHAT_GIFT_TIP_KEY = "atseen:chat-gift-tip-dismissed:v1";

export function isGiftRequestMessage(message, mine = false) {
  if (!message || mine || message.deletedAt || message.mediaType === "gift") return false;
  if (message.giftRequest === true || message.messageKind === "CREATOR_GIFT_REQUEST") return true;
  return /\b(?:send|give|buy)\s+(?:me\s+)?(?:a\s+)?gift\b|\bgift\s+(?:me|request)\b/i.test(String(message.body || ""));
}

export function classifySharedUrl(value) {
  const text = String(value || "").trim();
  if (!/^https?:\/\/\S+$/i.test(text)) return null;
  try {
    const url = new URL(text);
    const gift = /\/@[^/]+\/gift\/?$/i.test(url.pathname) || /\/gift\/[^/]+\/?$/i.test(url.pathname);
    const profile = /\/(?:profile\/[^/]+|@[^/]+)\/?$/i.test(url.pathname);
    return {
      href: url.href,
      host: url.hostname.replace(/^www\./i, ""),
      kind: gift ? "gift" : profile ? "profile" : "link",
    };
  } catch {
    return null;
  }
}

export function shouldKeepLatestVisible({ distanceFromBottom, initialPositioning }) {
  return Boolean(initialPositioning) || Number(distanceFromBottom) <= 96;
}
