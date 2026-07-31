import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import SettingsNav from "./SettingsNav";

const roleOptions = {
  fan: [
    ["showOnlineStatus", "Show online status"],
    ["showActivityStatus", "Show activity status"],
    ["showLocation", "Show location"],
    ["allowDiscovery", "Allow profile discovery"],
    ["allowDirectMessages", "Allow direct messages"],
    ["allowMentions", "Allow mentions"],
  ],
  creator: [
    ["showOnlineStatus", "Show online status"],
    ["showActivityStatus", "Show activity status"],
    ["showLocation", "Show location"],
    ["allowDiscovery", "Allow creator discovery"],
    ["allowDirectMessages", "Allow direct messages"],
    ["allowMentions", "Allow mentions"],
    ["allowTags", "Allow tags"],
    ["showFollowers", "Show followers"],
  ],
  admin: [
    ["showOnlineStatus", "Show online status"],
    ["showActivityStatus", "Show activity status"],
    ["allowDirectMessages", "Allow direct messages"],
  ],
};

function Toggle({ checked, disabled, label, name, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm font-medium text-brand-mist/85">{label}</span>
      <input checked={checked} disabled={disabled} name={name} onChange={onChange} type="checkbox" />
    </label>
  );
}

function PrivacySettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ profileVisibility: "private", privacySettings: {} });
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["settings", "privacy"],
    queryFn: () => profileService.getPrivacySettings().then((response) => response.data.data),
  });

  useEffect(() => {
    if (query.data && !dirty) {
      setForm({
        profileVisibility: query.data.profileVisibility || "private",
        privacySettings: query.data.privacySettings || {},
      });
    }
  }, [dirty, query.data]);

  const mutation = useMutation({
    mutationFn: (payload) => profileService.updatePrivacySettings(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "privacy"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      setDirty(false);
      setError("");
      setMessage("Privacy settings saved.");
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, "Your settings could not be saved. Please try again.").message);
    },
  });

  if (query.isLoading) return <Loader label="Loading privacy settings..." />;
  if (query.isError) return <p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load privacy settings.</p>;

  const role = query.data?.role || "fan";
  const options = roleOptions[role] || roleOptions.fan;

  const updateToggle = ({ target }) => {
    setDirty(true);
    setMessage("");
    setForm((current) => ({
      ...current,
      privacySettings: { ...current.privacySettings, [target.name]: target.checked },
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <SettingsNav />
      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h1 className="text-2xl font-semibold">Privacy settings</h1>
            <p className="mt-1 text-sm text-brand-mist/60">Control profile visibility and social discovery.</p>
          </div>
          {role !== "admin" ? (
            <label className="block space-y-2">
              <span className="text-sm text-brand-mist/80">Profile visibility</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary"
                onChange={(event) => {
                  setDirty(true);
                  setMessage("");
                  setForm((current) => ({ ...current, profileVisibility: event.target.value }));
                }}
                value={form.profileVisibility}
              >
                <option className="bg-brand-dark" value="public">Public</option>
                <option className="bg-brand-dark" value="private">Private</option>
              </select>
            </label>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {options.map(([key, label]) => (
              <Toggle checked={Boolean(form.privacySettings[key])} key={key} label={label} name={key} onChange={updateToggle} />
            ))}
          </div>
        </section>
        {message ? <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="flex justify-end">
          <Button disabled={!dirty || mutation.isPending} type="submit">{mutation.isPending ? "Saving..." : "Save privacy"}</Button>
        </div>
      </form>
    </div>
  );
}

export default PrivacySettingsPage;
