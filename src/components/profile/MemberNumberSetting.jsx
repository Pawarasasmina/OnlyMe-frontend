import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { memberTicketData, showMemberNumber } from "../../utils/memberTicket";
import { profileService } from "../../services/profileService";

export default function MemberNumberSetting() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const privacy = useQuery({ queryKey: ["settings", "privacy"], queryFn: () => profileService.getPrivacySettings().then((response) => response.data.data) });
  const visible = showMemberNumber(privacy.data || user || {});
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (showMemberNumber) => profileService.updatePrivacySettings({ showMemberNumber }),
    onSuccess: (response) => {
      const data = response.data.data;
      queryClient.setQueryData(["settings", "privacy"], data);
      setUser((current) => ({ ...current, showMemberNumber: data.showMemberNumber }));
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      setError("");
    },
    onError: () => setError("Unable to save this preference. Please try again."),
  });
  if (!memberTicketData(privacy.data || {}, user || {})?.badgeEligible) return null;
  return <>
    <button aria-checked={visible} className="settings-index-row" disabled={mutation.isPending || privacy.isLoading || privacy.isError} onClick={() => mutation.mutate(!visible)} role="switch" type="button">
      <span className="settings-index-row-copy"><b>Show my number</b><small>Member number on your profile</small></span>
      <span>{visible ? "On" : "Off"}</span>
    </button>
    {error ? <p role="alert">{error}</p> : null}
  </>;
}
