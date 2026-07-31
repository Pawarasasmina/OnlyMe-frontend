import axiosInstance from "../api/axiosInstance";

export const onboardingService = {
  getOnboardingState: () => axiosInstance.get("/onboarding"),
  saveWelcomeStep: () => axiosInstance.put("/onboarding/welcome"),
  saveInterests: (interestIds) => axiosInstance.put("/onboarding/interests", { interestIds }),
  saveInstincts: (discoveryPreferences) => axiosInstance.put("/onboarding/instincts", { discoveryPreferences }),
  getSuggestedPeople: (params = {}) => axiosInstance.get("/onboarding/suggestions", { params }),
  saveSuggestedPeople: (targetUserIds) => axiosInstance.put("/onboarding/people", { targetUserIds }),
  acknowledgeChecklist: () => axiosInstance.put("/onboarding/checklist"),
  completeOnboarding: () => axiosInstance.post("/onboarding/complete"),
  skipOnboarding: () => axiosInstance.post("/onboarding/skip"),
  getChecklist: () => axiosInstance.get("/onboarding/checklist"),
  trackChecklistEvent: (event) => axiosInstance.post("/onboarding/checklist/events", { event }),
  dismissChecklist: () => axiosInstance.post("/onboarding/checklist/dismiss"),
};
