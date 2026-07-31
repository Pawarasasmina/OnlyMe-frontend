import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "../services/onboardingService";
import { useAuth } from "./useAuth";
import { onboardingKeys } from "./useOnboarding";

export function useOnboardingChecklist(options = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: onboardingKeys.checklist(user?.id),
    queryFn: () => onboardingService.getChecklist().then((response) => response.data.data),
    enabled: Boolean(user?.id) && options.enabled !== false,
  });
}

export function useTrackChecklistEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingService.trackChecklistEvent,
    onSuccess: (response) => {
      queryClient.setQueryData(onboardingKeys.checklist(user?.id), response.data.data);
      queryClient.invalidateQueries({ queryKey: ["onboarding-checklist"] });
    },
  });
}

export function useDismissChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingService.dismissChecklist,
    onSuccess: (response) => {
      queryClient.setQueryData(onboardingKeys.checklist(user?.id), response.data.data);
    },
  });
}

