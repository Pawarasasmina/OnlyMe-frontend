export function defaultDestinationFor(role) {
  return role === "admin" ? "/admin/dashboard" : "/wall";
}

export function isConsumerRole(role) {
  return role === "fan" || role === "creator";
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
  return ["light-your-world", "complete"].includes(user?.onboarding?.currentStep);
}

export function destinationForUser(user) {
  if (!user) return "/login";
  if (user.role === "admin") return "/admin/dashboard";
  if (!isOnboardingComplete(user)) return onboardingPathFor(user);
  return defaultDestinationFor(user.role);
}

export function socialCapabilitiesFor(user) {
  const isAuthenticated = Boolean(user);
  const isConsumer = isConsumerRole(user?.role);
  const isApprovedCreator = isConsumer && user?.creatorApprovalStatus === "approved";

  return {
    isAuthenticated,
    role: user?.role || null,
    isCreator: isApprovedCreator,
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
