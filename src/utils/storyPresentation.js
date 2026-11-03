import { msg as __msg } from "../i18n/runtime.js";
export function storyTextStyle(item = {}) {
  const style = Number(item.style) || 0;
  const background = Number(item.backgroundMode ?? (style === 2 ? 1 : 0));
  const color = item.color || "#FFFFFF";
  return {
    color: background === 1 ? (color === "#0A0C0F" ? "#fff" : "#0A0C0F") : style === 5 ? "#fff" : color,
    backgroundColor: background === 1 ? color : background === 2 ? `${color}66` : undefined,
    padding: background ? "6px 13px" : undefined,
    borderRadius: background ? "12px" : undefined,
    fontFamily: style === 3 ? __msg("storyPresentation.georgiaSerif") : style === 4 ? __msg("storyPresentation.consolasMonospace") : undefined,
    fontWeight: style === 1 || style === 2 ? 800 : 650,
    fontStyle: style === 3 ? "italic" : undefined,
    textAlign: item.align || "center",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    textShadow: background ? "none" : style === 5 ? `0 0 6px ${color}, 0 0 16px ${color}, 0 0 34px ${color}` : "0 2px 14px rgba(0,0,0,.55)",
  };
}

export function storyActivityRoute(item = {}) {
  const target = item.target;
  if (target?.type !== "STORY" || !/^[a-f\d]{24}$/i.test(String(target.id || ""))) return null;
  if (item.type === "story_reply" && /^[a-f\d]{24}$/i.test(String(target.conversationUserId || ""))) {
    const query = new URLSearchParams({ with: target.conversationUserId });
    if (/^[a-f\d]{24}$/i.test(String(target.messageId || ""))) query.set("message", target.messageId);
    return `/messages?${query}`;
  }
  return `/stories/${target.id}`;
}
