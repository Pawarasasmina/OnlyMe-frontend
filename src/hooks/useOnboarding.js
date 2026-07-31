import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "../services/onboardingService";
import { useAuth } from "./useAuth";

export const onboardingKeys = {
  state: (userId) => ["onboarding", userId],
  suggestions: (userId) => ["onboarding-suggestions", userId],
  checklist: (userId) => ["onboarding-checklist", userId],
};

function unpack(response) {
  return response.data.data;
}

export function useOnboarding() {
  const { setUser, user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const stateQuery = useQuery({
    queryKey: onboardingKeys.state(userId),
    queryFn: () => onboardingService.getOnboardingState().then(unpack),
    enabled: Boolean(userId),
  });

  const syncState = (data) => {
    if (data?.user) setUser((current) => ({ ...current, ...data.user }));
    queryClient.setQueryData(onboardingKeys.state(userId), data);
    queryClient.invalidateQueries({ queryKey: onboardingKeys.suggestions(userId) });
    queryClient.invalidateQueries({ queryKey: ["orbit"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["worlds"] });
  };

  const mutationOptions = {
    onSuccess: (response) => syncState(unpack(response)),
  };

  const completeMutation = useMutation({
    mutationFn: onboardingService.completeOnboarding,
    onSuccess: async (response) => {
      syncState(unpack(response));
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["onboarding-checklist"] });
    },
  });

  return {
    ...stateQuery,
    saveWelcome: useMutation({ mutationFn: onboardingService.saveWelcomeStep, ...mutationOptions }),
    saveInterests: useMutation({ mutationFn: onboardingService.saveInterests, ...mutationOptions }),
    saveInstincts: useMutation({ mutationFn: onboardingService.saveInstincts, ...mutationOptions }),
    savePeople: useMutation({ mutationFn: onboardingService.saveSuggestedPeople, ...mutationOptions }),
    acknowledgeChecklist: useMutation({ mutationFn: onboardingService.acknowledgeChecklist, ...mutationOptions }),
    skip: useMutation({ mutationFn: onboardingService.skipOnboarding, ...mutationOptions }),
    complete: completeMutation,
  };
}

export function useOnboardingSuggestions(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: onboardingKeys.suggestions(user?.id),
    queryFn: () => onboardingService.getSuggestedPeople({ limit: 12 }).then((response) => response.data.data.suggestions || []),
    enabled: Boolean(user?.id && enabled),
  });
}
