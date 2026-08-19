import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiUserX, FiVolumeX } from "react-icons/fi";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import { resolveMediaUrl } from "../../utils/media";

const sheetCopy = {
  blocked: {
    title: "Blocked users",
    description: "Blocked people cannot find your profile, message you, or see your posts.",
    empty: "You haven't blocked anyone.",
  },
  muted: {
    title: "Muted",
    description: "You stay connected — their posts and stories just don't show. They never know.",
    empty: "No one muted.",
  },
};

function AccountAvatar({ account }) {
  const source = resolveMediaUrl(account.profilePhoto);
  if (source) return <img alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" src={source} />;
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-atseen-blue">{(account.displayName || account.username || "?").slice(0, 2).toUpperCase()}</span>;
}

export default function PrivacyQuickSettingsSheet({ isOpen, onClose, type }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const isAccounts = type === "blocked" || type === "muted";
  const queryKey = type === "blocked" ? ["settings", "blocked-accounts"] : ["settings", "muted-accounts"];
  const accountsQuery = useQuery({
    enabled: isOpen && isAccounts,
    queryKey,
    queryFn: () => (type === "blocked" ? profileService.getBlockedAccounts() : profileService.getMutedAccounts()).then((response) => response.data.data.items || []),
  });
  const privacyQuery = useQuery({
    enabled: isOpen && type === "messages",
    queryKey: ["settings", "privacy"],
    queryFn: () => profileService.getPrivacySettings().then((response) => response.data.data),
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    setError("");
    const close = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isOpen, onClose, type]);

  const accountMutation = useMutation({
    mutationFn: (account) => type === "blocked" ? profileService.unblockAccount(account.id) : profileService.unmuteAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      setError("");
    },
    onError: (requestError) => setError(normalizeApiError(requestError, `Unable to ${type === "blocked" ? "unblock" : "unmute"} this account.`).message),
  });

  const messagingMutation = useMutation({
    mutationFn: (allowDirectMessages) => {
      const current = privacyQuery.data?.privacySettings || {};
      return profileService.updatePrivacySettings({ privacySettings: { ...current, allowDirectMessages } });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "privacy"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setError("");
      onClose();
    },
    onError: (requestError) => setError(normalizeApiError(requestError, "Unable to update who can message you.").message),
  });

  if (!isOpen) return null;
  const copy = sheetCopy[type];
  const accounts = accountsQuery.data || [];
  const allowed = Boolean(privacyQuery.data?.privacySettings?.allowDirectMessages);

  return <div aria-labelledby="privacy-quick-sheet-title" aria-modal="true" className="fixed inset-0 z-[195] flex items-end justify-center" role="dialog">
    <button aria-label="Close privacy settings" className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} type="button" />
    <section className="relative z-10 max-h-[calc(100dvh-48px)] w-[min(460px,calc(100vw-24px))] overflow-y-auto rounded-t-[24px] border border-b-0 border-white/10 bg-[#1C212B] px-5 pb-8 pt-2 shadow-[0_-24px_80px_rgba(0,0,0,.65)]">
      <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-9 rounded-full bg-white/30" />
      <h2 className="text-[22px] font-black" id="privacy-quick-sheet-title">{type === "messages" ? "Who can message me" : copy.title}</h2>
      <p className="mt-2 text-xs leading-5 text-white/45">{type === "messages" ? "Choose whether other people can start a direct conversation with you." : copy.description}</p>

      {isAccounts && accountsQuery.isLoading ? <div className="mt-6 space-y-3">{Array.from({ length: 3 }, (_, index) => <div className="h-16 animate-pulse rounded-xl bg-white/5" key={index} />)}</div> : null}
      {isAccounts && accountsQuery.isError ? <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load accounts. <button className="font-bold text-atseen-blue" onClick={() => accountsQuery.refetch()} type="button">Try again</button></div> : null}
      {isAccounts && !accountsQuery.isLoading && !accountsQuery.isError && !accounts.length ? <div className="mt-8 grid justify-items-center gap-3 py-8 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.06] text-2xl text-white/45">{type === "blocked" ? <FiUserX /> : <FiVolumeX />}</span><p className="text-sm font-bold text-white/65">{copy.empty}</p></div> : null}
      {isAccounts && accounts.length ? <div className="mt-5 divide-y divide-white/[0.07]">{accounts.map((account) => <div className="flex items-center gap-3 py-3" key={account.id}><AccountAvatar account={account} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{account.displayName || `@${account.username}`}</b><small className="mt-0.5 block truncate text-xs text-white/40">@{account.username}</small></span><button className="rounded-full border border-atseen-blue/50 px-4 py-2 text-xs font-bold text-atseen-blue disabled:opacity-50" disabled={accountMutation.isPending} onClick={() => accountMutation.mutate(account)} type="button">{type === "blocked" ? "Unblock" : "Unmute"}</button></div>)}</div> : null}

      {type === "messages" && privacyQuery.isLoading ? <div className="mt-6 space-y-3"><div className="h-16 animate-pulse rounded-xl bg-white/5" /><div className="h-16 animate-pulse rounded-xl bg-white/5" /></div> : null}
      {type === "messages" && privacyQuery.isError ? <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load messaging privacy. <button className="font-bold text-atseen-blue" onClick={() => privacyQuery.refetch()} type="button">Try again</button></div> : null}
      {type === "messages" && privacyQuery.data ? <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">{[[true, "Everyone", "People can start a conversation with you"], [false, "No one", "Only existing conversations remain available"]].map(([value, title, subtitle]) => <button className="flex w-full items-center gap-3 border-b border-white/[0.07] px-4 py-4 text-left last:border-0 hover:bg-white/[0.03] disabled:opacity-50" disabled={messagingMutation.isPending} key={title} onClick={() => messagingMutation.mutate(value)} type="button"><span className="min-w-0 flex-1"><b className="block text-sm">{title}</b><small className="mt-1 block text-[11px] text-white/40">{subtitle}</small></span>{allowed === value ? <FiCheck className="text-lg text-atseen-blue" /> : null}</button>)}</div> : null}
      {error ? <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert">{error}</p> : null}
    </section>
  </div>;
}
