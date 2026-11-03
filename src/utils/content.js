import { enumLabel } from "../i18n/runtime.js";
import { msg as __msg } from "../i18n/runtime.js";
export const CONTENT_TYPES = ["IMAGE", "VIDEO", "AUDIO", "TEXT"];
export const ACCESS_LEVELS = ["PUBLIC", "SUBSCRIBER_ONLY", "PAY_PER_VIEW"];
export const CONTENT_STATUSES = ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"];
export const EDITABLE_STATUSES = ["DRAFT", "CHANGES_REQUESTED"];
export const formatContentLabel = (value = "") => enumLabel(value);
export const contentError = (error, fallback = __msg("content.somethingWentWrong")) => {
  const status = error.response?.status; const message = error.response?.data?.message || error.message;
  if (status === 409) return __msg("content.value0RefreshAndReviewTheLatestVersion", { value0: message || __msg("content.thisContentChanged") });
  if (status === 413) return __msg("content.theSelectedFileIsTooLarge");
  if (status === 410) return __msg("content.theLegacyPublishingFlowIsNoLongerAvailable");
  if (status === 403) return message || __msg("content.yourCreatorAccountIsNotApprovedForThis");
  return message || fallback;
};
export const mediaAccept = { IMAGE: ".jpg,.jpeg,.png,.webp", VIDEO: ".mp4,.mov", AUDIO: ".mp3,.wav,.aac,.flac" };
