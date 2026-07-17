const FULL_ACCESS = new Set(["OWNER", "ADMIN", "ENTITLED_WORLD", "ACTIVE_PREMIUM_MEMBER"]);

export function hasFullPublicationAccess(access) {
  return FULL_ACCESS.has(access);
}

export function publicationFinancialAction(publication) {
  if (!publication || hasFullPublicationAccess(publication.access)) return null;
  return publication.kind === "PREMIUM_WORLD" ? "JOIN_PREMIUM" : "PURCHASE_WORLD";
}
