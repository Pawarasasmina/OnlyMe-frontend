export function profileOwnerActionKeys(capabilities = {}, role) {
  if (!capabilities.isOwner) return [];
  const actions = ["edit", "settings", "security"];
  if (role === "creator") {
    actions.push("direct");
    if (capabilities.canCreate) actions.push("create", "content");
    if (capabilities.canAccessStudio) actions.push("studio");
    if (capabilities.canAccessVerification) actions.push("verification");
  }
  return actions;
}
