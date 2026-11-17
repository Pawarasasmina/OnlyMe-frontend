import { wallCanBump, wallExpiresAt, wallNeedsExpiryPrompt, wallPromptKind } from "../../shared/wallLifecycle.js";

export function wallLifetimeMessage(postType, rightNow = false) {
  if (rightNow || postType === "Right Now") return { key: "wallLifetime.rightNow" };
  if (postType === "Recommendation") return { key: "wallLifetime.recommendation" };
  if (postType === "Event") return { key: "wallLifetime.event" };
  const days = { "Need Help": 7, "Looking for": 14, Question: 30, "Buy & Sell": 30, Offering: 30 }[postType];
  return days ? { key: "wallLifetime.days", values: { days } } : null;
}

export function wallExpiryPrompt(post, now = Date.now()) {
  if (post.rightNow || post.postType === "Right Now" || post.context === "Right now" || post.postType === "Event" || (!post.postType && post.context === "Events")) return null;
  if (!post.needsExpiryPrompt && !post.canBump && !wallNeedsExpiryPrompt(post, now)) return null;
  const kind = post.expiryPromptKind || wallPromptKind(post) || "availability";
  const expiry = post.expiresAt || wallExpiresAt(post);
  const expires = expiry ? new Date(expiry).getTime() : NaN;
  return {
    title: kind === "request" ? "wallLifetime.stillNeedIt" : kind === "recommendation" ? "wallLifetime.stillTrue" : "system.FeedPost.ead062ce71",
    keep: kind === "request" ? "wallLifetime.keepIt" : kind === "recommendation" ? "wallLifetime.yesStillTrue" : "system.FeedPost.1d22547907",
    close: kind === "request" ? "social.solved" : kind === "recommendation" ? "wallResolution.outdated" : "activity.close",
    canBump: (post.bumpCount || 0) < 3 && (!post.bumpedAt || now - new Date(post.bumpedAt).getTime() >= 7 * 86400000) && (post.canBump || wallCanBump(post, now)),
    hours: Number.isFinite(expires) ? Math.max(1, Math.ceil((expires - now) / 3600000)) : null,
  };
}
