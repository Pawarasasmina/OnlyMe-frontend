import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiClock, FiGlobe } from "react-icons/fi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import SettingsNav from "./SettingsNav";
import { useLanguage } from "../../hooks/useLanguage";

const TIME_ZONES = (() => {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return ["UTC", ...zones.filter((zone) => zone !== "UTC")];
})();

function timezoneLabel(zone) {
  try {
    const offset = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts().find((part) => part.type === "timeZoneName")?.value || "";
    return `${zone.replaceAll("_", " ")} · ${offset}`;
  } catch {
    return zone;
  }
}

function TimezoneSelector({ label, onChange, value }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const preview = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: value || "UTC" }).format(now);
  return <label className="block text-sm font-medium text-brand-mist/80"><span className="flex items-center gap-2"><FiGlobe className="text-atseen-blue" />{label}</span><span className="relative mt-2 block"><select className="w-full appearance-none rounded-xl border border-white/10 bg-brand-dark px-4 py-3 pr-11 text-white outline-none transition hover:border-atseen-blue/30 focus:border-atseen-blue focus:ring-2 focus:ring-atseen-blue/10" name="timezone" onChange={onChange} value={value || "UTC"}>{TIME_ZONES.map((zone) => <option className="bg-atseen-bg text-white" key={zone} value={zone}>{timezoneLabel(zone)}</option>)}</select><span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-atseen-muted">⌄</span></span><small className="mt-2 flex items-center gap-2 rounded-lg bg-atseen-blue/[0.06] px-3 py-2 text-xs font-medium text-atseen-muted"><FiClock className="text-atseen-blue" />Local time: <b className="text-white">{preview}</b></small></label>;
}

function AccountSettingsPage() {
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
      setLanguage(query.data.preferences?.preferredLanguage || "en");
    }
  }, [dirty, query.data, setLanguage]);

  const accountMutation = useMutation({
    mutationFn: (payload) => profileService.updateAccountSettings(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "account"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setDirty(false);
      setError("");
      setMessage(t("Account preferences saved."));
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, "Your settings could not be saved. Please try again.").message);
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
      setError(normalizeApiError(err, "Unable to change password.").message);
    },
  });

  if (query.isLoading) return <Loader label={t("Loading account settings...")} />;
  if (query.isError) return <p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">{t("Unable to load account settings.")}</p>;

  const account = query.data.account;
  const role = account.role;
  const updatePreference = ({ target }) => {
    setDirty(true);
    setMessage("");
    setPreferences((current) => ({ ...current, [target.name]: target.value }));
    if (target.name === "preferredLanguage") setLanguage(target.value);
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
      setError("New password must be at least 8 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    passwordMutation.mutate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
  };

  return (
    <div className="space-y-6">
      <SettingsNav />
      {message ? <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      <form className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5" onSubmit={saveAccount}>
        <div>
          <h1 className="text-2xl font-semibold">{t("Account settings")}</h1>
          <p className="mt-1 text-sm text-brand-mist/60">{t("Account identifiers are shown here as read-only.")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input disabled label={t("Email")} value={account.email} />
          <Input disabled label={t("Role")} value={account.role} />
          <label className="block text-sm font-medium text-brand-mist/80">{t("Preferred language")}<select className="mt-2 w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 text-white outline-none transition hover:border-atseen-blue/30 focus:border-atseen-blue focus:ring-2 focus:ring-atseen-blue/10" name="preferredLanguage" onChange={updatePreference} value={language}><option value="en">English</option><option value="ar">العربية</option><option value="ru">Русский</option><option value="es">Español</option><option value="fr">Français</option><option value="pt">Português</option></select></label>
          <TimezoneSelector label={t("Time zone")} onChange={updatePreference} value={preferences.timezone} />
          {role === "admin" ? <Input label={t("Phone number")} name="phoneNumber" onChange={updatePreference} value={preferences.phoneNumber} /> : null}
        </div>
        <div className="flex justify-end">
          <Button disabled={!dirty || accountMutation.isPending} type="submit">{accountMutation.isPending ? t("Saving...") : t("Save account")}</Button>
        </div>
      </form>
      <form className="space-y-5 rounded-3xl border border-red-400/20 bg-red-500/10 p-5" onSubmit={changePassword}>
        <div>
          <h2 className="text-xl font-semibold">{t("Change password")}</h2>
          <p className="mt-1 text-sm text-brand-mist/70">{t("Your current password is required.")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input autoComplete="current-password" label={t("Current password")} name="currentPassword" onChange={updatePassword} required type="password" value={passwords.currentPassword} />
          <Input autoComplete="new-password" label={t("New password")} name="newPassword" onChange={updatePassword} required type="password" value={passwords.newPassword} />
          <Input autoComplete="new-password" label={t("Confirm new password")} name="confirmPassword" onChange={updatePassword} required type="password" value={passwords.confirmPassword} />
        </div>
        <div className="flex justify-end">
          <Button disabled={passwordMutation.isPending} type="submit">{passwordMutation.isPending ? t("Changing...") : t("Change password")}</Button>
        </div>
      </form>
    </div>
  );
}

export default AccountSettingsPage;
