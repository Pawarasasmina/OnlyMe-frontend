export function defaultDestinationFor(role) {
  return role === "admin" ? "/admin/dashboard" : "/seen";
}

export function isConsumerRole(role) {
  return role === "fan" || role === "creator";
}

export function professionalProfileType(user) {
  return user?.profileAccountType || user?.profileType || (user?.creatorApprovalStatus === "approved" ? "creator" : "personal");
}

export function hasCreatorAccess(user) {
  return isConsumerRole(user?.role) && (
    user?.creatorApprovalStatus === "approved"
    || ["creator", "business"].includes(professionalProfileType(user))
  );
}

export function isOnboardingComplete(user) {
  if (!isConsumerRole(user?.role)) return true;
  const status = user?.onboarding?.status;
  return status === "completed" || status === "skipped" || !status;
}

export function onboardingPathFor(user) {
  if (!user || isOnboardingComplete(user)) return defaultDestinationFor(user?.role);
  const step = user.onboarding?.currentStep || "welcome";
  const routeStep = step === "completed" ? "complete" : step;
  return `/onboarding/${routeStep}`;
}

export function canAccessAppDuringOnboarding(user) {
  if (isOnboardingComplete(user)) return true;
  return ["ticket", "complete"].includes(user?.onboarding?.currentStep);
}

export function destinationForUser(user) {
  if (!user) return "/login";
  if (user.role === "admin") return user.adminTwoFactorEnabled ? (user.adminRole === "FINANCE" ? "/admin/financial" : "/admin/dashboard") : "/admin/security";
  if (!isOnboardingComplete(user)) return onboardingPathFor(user);
  return defaultDestinationFor(user.role);
}

export function socialCapabilitiesFor(user) {
  const isAuthenticated = Boolean(user);
  const isConsumer = isConsumerRole(user?.role);
  const profileType = professionalProfileType(user);
  const isApprovedCreator = isConsumer && hasCreatorAccess(user);

  return {
    isAuthenticated,
    role: user?.role || null,
    isCreator: isApprovedCreator,
    profileType,
    isBusiness: profileType === "business",
    isApprovedCreator,
    canCreate: isConsumer,
    canAccessStudio: isApprovedCreator,
    canAccessVerification: isConsumer,
    isProfileOwner: isAuthenticated,
  };
}

export function canAccessSharedSocial(role) {
  return role === "fan" || role === "creator";
}
