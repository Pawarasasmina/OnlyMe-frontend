import { msg as __msg } from "../i18n/runtime.js";
// Shared by the note menu and share sheet so both start the same story draft.
export function wallNoteStoryDraft({ id, text = "", location = "", own = false, author = {}, transcript = "", translationText = "", translationLabel = "" }) {
  return { sharedCard: {
    kind: "note", displayMode: "text_only", imageUrl: "",
    destinationRoute: `/wall?note=${encodeURIComponent(id)}`,
    authorName: author.name || author.displayName || author.username || "",
    authorAvatar: author.avatar || author.avatarUrl || "",
    variant: "compact",
    eyebrow: [(author.name || author.displayName || author.username || "").split(" ")[0], "NOTE", location.split(",")[0].trim()].filter(Boolean).join(" \u00b7 "),
    title: String(transcript || text).slice(0, 400),
    subtitle: __msg("wallNoteStory.value0Tap", { value0: own ? __msg("wallNoteStory.fromMyWall") : __msg("wallNoteStory.fromTheWall") }),
    ...(transcript ? { originalTranscript: transcript } : {}),
    ...(translationText ? { translationText, translationLabel } : {}),
    x: 50, y: 40, scale: 1,
  } };
}
