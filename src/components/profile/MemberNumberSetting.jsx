import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { memberTicketData, showMemberNumber } from "../../utils/memberTicket";
import { profileService } from "../../services/profileService";

export default function MemberNumberSetting() {
  __useUiLanguage();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const privacy = useQuery({ queryKey: ["settings", "privacy"], queryFn: () => profileService.getPrivacySettings().then((response) => response.data.data) });
  const visible = showMemberNumber(privacy.data || user || {});
  const ticket = memberTicketData(privacy.data || {}, user || {});
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
    onError: () => setError(__msg("profile.unableToSaveThisPreferencePleaseTryAgain")),
  });
  if (!ticket?.badgeEligible) return null;
  return <>
    <button aria-checked={visible} className="settings-index-row" disabled={mutation.isPending || privacy.isLoading || privacy.isError} onClick={() => mutation.mutate(!visible)} role="switch" type="button">
      <span className="settings-index-row-copy"><b>{__msg("profile.showMyNumber")}</b><small><bdi>{ticket.label}</bdi> · {__msg("profile.memberNumberNextToYourName")}</small></span>
      <span aria-hidden="true" className={`settings-member-switch ${visible ? "is-on" : ""}`}><span /></span>
    </button>
    {error ? <p role="alert">{__systemMessage(error)}</p> : null}
  </>;
}
