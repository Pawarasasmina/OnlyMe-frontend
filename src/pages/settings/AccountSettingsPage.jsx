import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { UI_LANGUAGES } from "../../utils/uiLanguages";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiClock, FiGlobe, FiLock, FiSettings } from "react-icons/fi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import SettingsNav from "./SettingsNav";
import { useLanguage } from "../../hooks/useLanguage";
import AccountTwoFactorCard from "../../components/settings/AccountTwoFactorCard";

const TIME_ZONES = (() => {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return ["UTC", ...zones.filter((zone) => zone !== "UTC")];
})();

function timezoneLabel(zone) {
  try {
    const offset = new Intl.DateTimeFormat(__uiLocale(), { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts().find((part) => part.type === "timeZoneName")?.value || "";
    return `${zone.replaceAll("_", " ")} · ${offset}`;
  } catch {
    return zone;
  }
}

function TimezoneSelector({ label, onChange, value }) {
  __useUiLanguage();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const preview = new Intl.DateTimeFormat(__uiLocale(), { dateStyle: "medium", timeStyle: "short", timeZone: value || "UTC" }).format(now);
  return <label className="block text-sm font-medium text-brand-mist/80"><span className="flex items-center gap-2"><FiGlobe className="text-atseen-blue" />{label}</span><span className="relative mt-2 block"><select className="w-full appearance-none rounded-xl border border-white/10 bg-brand-dark px-4 py-3 pe-11 text-white outline-none transition hover:border-atseen-blue/30 focus:border-atseen-blue focus:ring-2 focus:ring-atseen-blue/10" name="timezone" onChange={onChange} value={value || "UTC"}>{TIME_ZONES.map((zone) => <option className="bg-atseen-bg text-white" key={zone} value={zone}>{timezoneLabel(zone)}</option>)}</select><span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-atseen-muted">⌄</span></span><small className="mt-2 flex items-center gap-2 rounded-lg bg-atseen-blue/[0.06] px-3 py-2 text-xs font-medium text-atseen-muted"><FiClock className="text-atseen-blue" />{__msg("settings.localTime")} <b className="text-white">{preview}</b></small></label>;
}

function AccountSettingsPage() {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();
  const [preferences, setPreferences] = useState({ preferredLanguage: "en", timezone: "UTC", phoneNumber: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["settings", "account"],
    queryFn: () => profileService.getAccountSettings().then((response) => response.data.data),
  });

  useEffect(() => {
    if (query.data && !dirty) {
      setPreferences((current) => ({ ...current, ...(query.data.preferences || {}) }));
    }
  }, [dirty, query.data]);

  const accountMutation = useMutation({
    mutationFn: (payload) => profileService.updateAccountSettings(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "account"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["wall-language"] });
      setDirty(false);
      setError("");
      setMessage(t("Account preferences saved."));
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, __msg("settings.yourSettingsCouldNotBeSavedPleaseTryAgain")).message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => profileService.changePassword(payload),
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setError("");
      setMessage(t("Password changed successfully. Please sign in again on other devices."));
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, __msg("settings.unableToChangePassword")).message);
    },
  });

  if (query.isLoading) return <div className="space-y-6"><SettingsNav showTabs={false} /><Loader label={t("Loading account settings...")} /></div>;
  if (query.isError) return <div className="space-y-6"><SettingsNav showTabs={false} /><p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">{t("Unable to load account settings.")}</p></div>;

  const account = query.data.account;
  const updatePreference = ({ target }) => {
    setDirty(true);
    setMessage("");
    setPreferences((current) => ({ ...current, [target.name]: target.name === "preferredLanguage" && target.value === "pt" ? "pt-PT" : target.value }));
    if (target.name === "preferredLanguage") setLanguage(target.value.split("-")[0]);
  };
  const updatePassword = ({ target }) => setPasswords((current) => ({ ...current, [target.name]: target.value }));

  const saveAccount = (event) => {
    event.preventDefault();
    accountMutation.mutate(preferences);
  };

  const changePassword = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (passwords.newPassword.length < 8) {
      setError(__msg("creator.newPasswordMustBeAtLeast8Characters"));
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError(__msg("creator.newPasswordsDoNotMatch"));
      return;
    }
    passwordMutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
  };

  return (
    <div className="space-y-6">
      <SettingsNav showTabs={false} />
      {message ? <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{__systemMessage(error)}</p> : null}
      <form className="space-y-6 rounded-3xl border border-white/10 bg-brand-dark/60 p-5 sm:p-6" onSubmit={saveAccount}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-atseen-blue/10 text-atseen-blue"><FiSettings size={19} /></span>
          <div>
            <h1 className="text-2xl font-semibold">{t("Account settings")}</h1>
            <p className="mt-1 text-sm text-brand-mist/60">{t("Manage your account language and time zone.")}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
          <Input disabled label={t("Email")} value={account.email} />
          <p className="mt-2 text-xs text-brand-mist/50">{t("Your email address cannot be changed here.")}</p>
        </div>
        <div className="grid gap-4 border-t border-white/[0.07] pt-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-brand-mist/80">{t("Preferred language")}<select className="mt-2 w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 text-white outline-none transition hover:border-atseen-blue/30 focus:border-atseen-blue focus:ring-2 focus:ring-atseen-blue/10" name="preferredLanguage" onChange={updatePreference} value={language}>{UI_LANGUAGES.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></label>
          <TimezoneSelector label={t("Time zone")} onChange={updatePreference} value={preferences.timezone} />
        </div>
        <div className="flex justify-end">
          <Button disabled={!dirty || accountMutation.isPending} type="submit">{accountMutation.isPending ? t("Saving...") : t("Save account")}</Button>
        </div>
      </form>
      <AccountTwoFactorCard />
      <form className="space-y-6 rounded-3xl border border-white/10 bg-brand-dark/60 p-5 sm:p-6" onSubmit={changePassword}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-atseen-blue/10 text-atseen-blue"><FiLock size={18} /></span>
          <div>
            <h2 className="text-xl font-semibold">{t("Change password")}</h2>
            <p className="mt-1 text-sm text-brand-mist/60">{t("Use your current password to set a new one.")}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="md:max-w-[calc(50%-0.5rem)]"><Input autoComplete="current-password" label={t("Current password")} name="currentPassword" onChange={updatePassword} required type="password" value={passwords.currentPassword} /></div>
          <div className="grid gap-4 border-t border-white/[0.07] pt-4 md:grid-cols-2">
            <Input autoComplete="new-password" label={t("New password")} name="newPassword" onChange={updatePassword} required type="password" value={passwords.newPassword} />
            <Input autoComplete="new-password" label={t("Confirm new password")} name="confirmPassword" onChange={updatePassword} required type="password" value={passwords.confirmPassword} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button disabled={passwordMutation.isPending} type="submit">{passwordMutation.isPending ? t("Changing...") : t("Change password")}</Button>
        </div>
      </form>
    </div>
  );
}

export default AccountSettingsPage;
