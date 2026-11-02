export function invitationLinkPreview(message) {
  return `↪ Link — ${message.sharedContent?.title || "Invitation to @seen"}`;
}

export function isDefaultInvitationMessage(message) {
  return !message.body || ["Shared a invitation", "Shared an invitation", invitationLinkPreview(message)].includes(message.body);
}
