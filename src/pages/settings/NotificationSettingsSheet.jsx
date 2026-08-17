import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";

const definitions = {
  email: ["Email notifications", "Important updates sent to your inbox"],
  inApp: ["Activity notifications", "Comments, reactions and new followers"],
  messages: ["Messages", "New chats and message requests"],
  directAccess: ["Direct Access & income", "Requests, replies and creator earnings"],
  marketing: ["Product announcements", "Occasional Atseen news and features"],
  security: ["Security alerts", "Required protection for administrator accounts"],
};

export default function NotificationSettingsSheet({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [error, setError] = useState("");
  const query = useQuery({
    enabled: isOpen,
    queryKey: ["settings", "notifications"],
    queryFn: () => profileService.getNotificationSettings().then((response) => response.data.data),
  });

  useEffect(() => {
    if (query.data) setPreferences(query.data.notificationPreferences || {});
  }, [query.data]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isOpen, onClose]);

  const mutation = useMutation({
    mutationFn: (notificationPreferences) => profileService.updateNotificationSettings({ notificationPreferences }),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "notifications"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setError("");
    },
    onError: (requestError, _payload, context) => {
      if (context?.previous) setPreferences(context.previous);
      setError(normalizeApiError(requestError, "Unable to save notification settings.").message);
    },
  });

  if (!isOpen) return null;
  const role = query.data?.role || "fan";
  const keys = role === "admin" ? ["email", "inApp", "security"] : ["email", "inApp", "messages", "directAccess", "marketing"];
  const toggle = (key) => {
    if (role === "admin" && key === "security") return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setError("");
    mutation.mutate(next, { context: { previous } });
  };

  return <div aria-labelledby="notification-sheet-title" aria-modal="true" className="fixed inset-0 z-[190] flex items-end justify-center" role="dialog">
    <button aria-label="Close notification settings" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} type="button" />
    <section className="relative z-10 max-h-[calc(100dvh-48px)] w-[min(460px,calc(100vw-24px))] overflow-y-auto rounded-t-[24px] border border-b-0 border-white/10 bg-[#1C212B] px-5 pb-8 pt-2 shadow-[0_-24px_80px_rgba(0,0,0,.65)]">
      <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-9 rounded-full bg-white/30" />
      <h2 className="text-[22px] font-black" id="notification-sheet-title">Notifications</h2>
      {query.isLoading ? <div className="mt-6 space-y-3">{Array.from({ length: 5 }, (_, index) => <div className="h-16 animate-pulse rounded-xl bg-white/5" key={index} />)}</div> : null}
      {query.isError ? <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200"><p>Unable to load notification settings.</p><button className="mt-3 font-bold text-atseen-blue" onClick={() => query.refetch()} type="button">Try again</button></div> : null}
      {!query.isLoading && !query.isError ? <div className="mt-3 divide-y divide-white/[0.07]">{keys.map((key) => {
        const [title, subtitle] = definitions[key];
        const locked = role === "admin" && key === "security";
        const checked = locked || Boolean(preferences[key]);
        return <button aria-checked={checked} className="flex min-h-[62px] w-full items-center gap-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-70" disabled={locked || mutation.isPending} key={key} onClick={() => toggle(key)} role="switch" type="button"><span className="min-w-0 flex-1"><b className="block text-sm font-bold text-white">{title}</b><small className="mt-1 block text-[11px] leading-4 text-white/40">{subtitle}</small></span><span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-[#8FC4FF]" : "bg-white/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-[#0A0C0F] shadow transition ${checked ? "left-6" : "left-1"}`} /></span></button>;
      })}</div> : null}
      {error ? <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert">{error}</p> : null}
      <p className="mt-4 text-center text-[10px] text-white/35">Saved automatically · views are always silent</p>
    </section>
  </div>;
}
