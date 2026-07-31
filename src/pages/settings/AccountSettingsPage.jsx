import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import SettingsNav from "./SettingsNav";

function AccountSettingsPage() {
  const queryClient = useQueryClient();
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
      setDirty(false);
      setError("");
      setMessage("Account preferences saved.");
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
      setMessage("Password changed successfully. Please sign in again on other devices.");
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, "Unable to change password.").message);
    },
  });

  if (query.isLoading) return <Loader label="Loading account settings..." />;
  if (query.isError) return <p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load account settings.</p>;

  const account = query.data.account;
  const role = account.role;
  const updatePreference = ({ target }) => {
    setDirty(true);
    setMessage("");
    setPreferences((current) => ({ ...current, [target.name]: target.value }));
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
          <h1 className="text-2xl font-semibold">Account settings</h1>
          <p className="mt-1 text-sm text-brand-mist/60">Account identifiers are shown here as read-only.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input disabled label="Email" value={account.email} />
          <Input disabled label="Role" value={account.role} />
          <Input label="Preferred language" name="preferredLanguage" onChange={updatePreference} value={preferences.preferredLanguage} />
          <Input label="Time zone" name="timezone" onChange={updatePreference} value={preferences.timezone} />
          {role === "admin" ? <Input label="Phone number" name="phoneNumber" onChange={updatePreference} value={preferences.phoneNumber} /> : null}
        </div>
        <div className="flex justify-end">
          <Button disabled={!dirty || accountMutation.isPending} type="submit">{accountMutation.isPending ? "Saving..." : "Save account"}</Button>
        </div>
      </form>
      <form className="space-y-5 rounded-3xl border border-red-400/20 bg-red-500/10 p-5" onSubmit={changePassword}>
        <div>
          <h2 className="text-xl font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-brand-mist/70">Your current password is required.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input autoComplete="current-password" label="Current password" name="currentPassword" onChange={updatePassword} required type="password" value={passwords.currentPassword} />
          <Input autoComplete="new-password" label="New password" name="newPassword" onChange={updatePassword} required type="password" value={passwords.newPassword} />
          <Input autoComplete="new-password" label="Confirm new password" name="confirmPassword" onChange={updatePassword} required type="password" value={passwords.confirmPassword} />
        </div>
        <div className="flex justify-end">
          <Button disabled={passwordMutation.isPending} type="submit">{passwordMutation.isPending ? "Changing..." : "Change password"}</Button>
        </div>
      </form>
    </div>
  );
}

export default AccountSettingsPage;
