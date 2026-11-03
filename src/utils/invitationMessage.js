import { msg as __msg } from "../i18n/runtime.js";
export function invitationLinkPreview(message) {
  return `↪ Link — ${message.sharedContent?.title || __msg("invitationMessage.invitationToSeen")}`;
}

export function isDefaultInvitationMessage(message) {
  return !message.body || ["Shared a invitation", "Shared an invitation", invitationLinkPreview(message)].includes(message.body);
}
