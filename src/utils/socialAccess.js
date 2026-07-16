export function defaultDestinationFor(role) {
  return role === "admin" ? "/admin/dashboard" : "/wall";
}

export function socialCapabilitiesFor(user) {
  const isAuthenticated = Boolean(user);
  const isCreator = user?.role === "creator";
  const isApprovedCreator = isCreator && user.creatorApprovalStatus === "approved";

  return {
    isAuthenticated,
    role: user?.role || null,
    isCreator,
    isApprovedCreator,
    canCreate: isApprovedCreator,
    canAccessStudio: isApprovedCreator,
    canAccessVerification: isCreator,
    isProfileOwner: isAuthenticated,
  };
}

export function canAccessSharedSocial(role) {
  return role === "fan" || role === "creator";
}
