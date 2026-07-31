export const CONTENT_TYPES = ["IMAGE", "VIDEO", "AUDIO", "TEXT"];
export const ACCESS_LEVELS = ["PUBLIC", "SUBSCRIBER_ONLY", "PAY_PER_VIEW"];
export const CONTENT_STATUSES = ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"];
export const EDITABLE_STATUSES = ["DRAFT", "CHANGES_REQUESTED"];
export const formatContentLabel = (value = "") => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const contentError = (error, fallback = "Something went wrong") => {
  const status = error.response?.status; const message = error.response?.data?.message || error.message;
  if (status === 409) return `${message || "This content changed."} Refresh and review the latest version.`;
  if (status === 413) return "The selected file is too large.";
  if (status === 410) return "The legacy publishing flow is no longer available. Use drafts and review submission.";
  if (status === 403) return message || "Your creator account is not approved for this action.";
  return message || fallback;
};
export const mediaAccept = { IMAGE: ".jpg,.jpeg,.png,.webp", VIDEO: ".mp4,.mov", AUDIO: ".mp3,.wav,.aac,.flac" };
