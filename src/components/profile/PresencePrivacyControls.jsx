import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { profileService } from "../../services/profileService";
import "./PresencePrivacyControls.css";

export default function PresencePrivacyControls() {
  const { t } = useLanguage();
  const { setUser } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings", "privacy"], queryFn: () => profileService.getPrivacySettings().then(response => response.data.data) });
  const mutation = useMutation({
    mutationFn: ({ key, value }) => profileService.updatePrivacySettings({ privacySettings: { [key]: value } }),
    onSuccess: response => {
      client.setQueryData(["settings", "privacy"], response.data.data);
      const preferences = response.data.data.privacySettings;
      setUser?.(user => user ? { ...user, activity_status: preferences.activityStatus !== false, read_receipts: preferences.readReceipts !== false } : user);
      client.invalidateQueries({ queryKey: ["messages"] });
      window.dispatchEvent(new Event("onlyme-privacy-updated"));
    },
  });
  return <>
    {[["activityStatus", "presence.activityStatus", "presence.activityStatusHelp"], ["readReceipts", "presence.readReceipts", "presence.readReceiptsHelp"]].map(([key, label, detail]) => {
      const checked = query.data?.privacySettings?.[key] !== false;
      return <button aria-checked={checked} className="settings-index-row presence-privacy-row" disabled={query.isPending || query.isError || mutation.isPending} key={key} onClick={() => mutation.mutate({ key, value: !checked })} role="switch" type="button">
        <span className="settings-index-row-copy"><b>{t(label)}</b><small>{t(detail)}</small></span><span aria-hidden="true" className={`presence-privacy-switch${checked ? " is-on" : ""}`}><i /></span>
      </button>;
    })}
    {query.isError || mutation.isError ? <p role="alert">{t("settings.unableToSaveYourDetails")}</p> : null}
  </>;
}
