import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import SettingsNav from "./SettingsNav";

const labels = {
  email: "Email notifications",
  inApp: "In-app notifications",
  marketing: "Product announcements",
  security: "Security alerts",
  messages: "Messages",
  directAccess: "Direct Access requests",
};

function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["settings", "notifications"],
    queryFn: () => profileService.getNotificationSettings().then((response) => response.data.data),
  });

  useEffect(() => {
    if (query.data && !dirty) setPreferences(query.data.notificationPreferences || {});
  }, [dirty, query.data]);

  const mutation = useMutation({
    mutationFn: (payload) => profileService.updateNotificationSettings(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "notifications"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setDirty(false);
      setError("");
      setMessage("Notification settings saved.");
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, "Your settings could not be saved. Please try again.").message);
    },
  });

  if (query.isLoading) return <div className="space-y-6"><SettingsNav /><Loader label="Loading notification settings..." /></div>;
  if (query.isError) return <div className="space-y-6"><SettingsNav /><p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load notification settings.</p></div>;

  const role = query.data?.role || "fan";
  const keys = role === "admin" ? ["email", "inApp", "security"] : ["email", "inApp", "messages", "directAccess", "marketing"];

  const update = ({ target }) => {
    setDirty(true);
    setMessage("");
    setPreferences((current) => ({ ...current, [target.name]: target.checked }));
  };

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate({
      notificationPreferences: {
        ...preferences,
        ...(role === "admin" ? { security: true } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      <SettingsNav />
      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h1 className="text-2xl font-semibold">Notification settings</h1>
            <p className="mt-1 text-sm text-brand-mist/60">Choose the channels Atseen can use for account updates.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {keys.map((key) => (
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3" key={key}>
                <span>
                  <span className="block text-sm font-medium text-brand-mist/85">{labels[key]}</span>
                  {role === "admin" && key === "security" ? <span className="text-xs text-brand-mist/45">Required for administrators</span> : null}
                </span>
                <input checked={role === "admin" && key === "security" ? true : Boolean(preferences[key])} disabled={role === "admin" && key === "security"} name={key} onChange={update} type="checkbox" />
              </label>
            ))}
          </div>
        </section>
        {message ? <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        <div className="flex justify-end">
          <Button disabled={!dirty || mutation.isPending} type="submit">{mutation.isPending ? "Saving..." : "Save notifications"}</Button>
        </div>
      </form>
    </div>
  );
}

export default NotificationSettingsPage;
