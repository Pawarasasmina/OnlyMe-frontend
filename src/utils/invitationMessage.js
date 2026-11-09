import { msg as __msg } from "../i18n/runtime.js";
export function invitationLinkPreview(message) {
  return __msg("invitationMessage.linkValue0", { value0: message.sharedContent?.title || __msg("invitationMessage.invitationToSeen") });
}

export function isDefaultInvitationMessage(message) {
  return !message.body || ["Shared a invitation", "Shared an invitation", invitationLinkPreview(message)].includes(message.body);
}
