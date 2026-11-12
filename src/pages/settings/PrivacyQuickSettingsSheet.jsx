import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck } from "react-icons/fi";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import { resolveMediaUrl } from "../../utils/media";
import "./PrivacyQuickSettingsSheet.css";

const sheetCopy = {
  blocked: {
    get title() { return __msg("settings.blockedUsers"); },
    get description() { return __msg("settings.blockedPeopleCannotFindYourProfileMessageYouOr"); },
    empty: "You haven't blocked anyone.",
  },
  muted: {
    get title() { return __msg("settings.muted"); },
    get description() { return __msg("settings.youStayConnectedTheirPostsAndStoriesJustDon"); },
    get empty() { return __msg("settings.youHaveNotMutedAnyone"); },
  },
};

function AccountAvatar({ account }) {
  __useUiLanguage();
  const source = resolveMediaUrl(account.profilePhoto);
  if (source) return <img alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" src={source} />;
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-atseen-blue">{(account.displayName || account.username || "?").slice(0, 2).toUpperCase()}</span>;
}

export default function PrivacyQuickSettingsSheet({ anchorRef, isOpen, onClose, type }) {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [anchorBounds, setAnchorBounds] = useState(null);
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

  useEffect(() => {
    if (!isOpen) return undefined;
    const syncBounds = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) {
        setAnchorBounds(null);
        return;
      }
      setAnchorBounds({ left: rect.left, width: rect.width });
    };
    syncBounds();
    window.addEventListener("resize", syncBounds);
    return () => window.removeEventListener("resize", syncBounds);
  }, [anchorRef, isOpen]);

  const accountMutation = useMutation({
    mutationFn: (account) => type === "blocked" ? profileService.unblockAccount(account.id) : profileService.unmuteAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["muted-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      setError("");
    },
    onError: (requestError) => setError(normalizeApiError(requestError, __msg("settings.unableToThisAccount", { value0: type === "blocked" ? "unblock" : "unmute" })).message),
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
    onError: (requestError) => setError(normalizeApiError(requestError, __msg("settings.unableToUpdateWhoCanMessageYou")).message),
  });

  if (!isOpen) return null;
  const copy = sheetCopy[type];
  const accounts = accountsQuery.data || [];
  const allowed = Boolean(privacyQuery.data?.privacySettings?.allowDirectMessages);

  return <div
    aria-labelledby="privacy-quick-sheet-title"
    aria-modal="true"
    className="profile-notification-layer settings-notification-layer"
    role="dialog"
    style={anchorBounds ? {
      "--settings-notification-left": `${anchorBounds.left}px`,
      "--settings-notification-width": `${anchorBounds.width}px`,
    } : undefined}
  >
    <button aria-label={__msg("settings.closePrivacySettings")} className="profile-notification-dim" onClick={onClose} type="button" />
    <section className={`profile-notification-sheet settings-notification-sheet${isAccounts ? " is-blocked-users" : ""}`}>
      <span aria-hidden="true" className="profile-notification-grab" />
      <h2 className="text-[26px] font-black tracking-[-0.02em]" id="privacy-quick-sheet-title">{type === "messages" ? __msg("settings.whoCanMessageMe") : copy.title}</h2>
      {type !== "blocked" ? <p className="mt-2 text-xs leading-5 text-white/45">{type === "messages" ? __msg("settings.chooseWhetherOtherPeopleCanStartADirectConversation") : copy.description}</p> : null}

      {isAccounts && accountsQuery.isLoading ? <div className="mt-6 space-y-3">{Array.from({ length: 3 }, (_, index) => <div className="h-16 animate-pulse rounded-xl bg-white/5" key={index} />)}</div> : null}
      {isAccounts && accountsQuery.isError ? <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">{__msg("settings.unableToLoadAccounts")} <button className="font-bold text-atseen-blue" onClick={() => accountsQuery.refetch()} type="button">{__msg("discover.tryAgain")}</button></div> : null}
      {isAccounts && !accountsQuery.isLoading && !accountsQuery.isError && !accounts.length ? <p className={`blocked-users-empty${type === "muted" ? " muted-users-empty" : ""}`}>{copy.empty}</p> : null}
      {isAccounts && accounts.length ? <div className="mt-5 divide-y divide-white/[0.07]">{accounts.map((account) => <div className="flex items-center gap-3 py-3" key={account.id}><AccountAvatar account={account} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{account.displayName || `@${account.username}`}</b><small dir="auto" className="mt-0.5 block truncate text-xs text-white/40">{account.muteTypes?.length ? account.muteTypes.map(value => __msg(`settings.muteScope.${value}`)).join(" \u00b7 ") : account.username ? `@${account.username}` : ""}</small></span><button className="rounded-full border border-atseen-blue/50 px-4 py-2 text-xs font-bold text-atseen-blue disabled:opacity-50" disabled={accountMutation.isPending} onClick={() => accountMutation.mutate(account)} type="button">{type === "blocked" ? __msg("fan.unblock") : __msg("profile.unmute")}</button></div>)}</div> : null}

      {type === "messages" && privacyQuery.isLoading ? <div className="mt-6 space-y-3"><div className="h-16 animate-pulse rounded-xl bg-white/5" /><div className="h-16 animate-pulse rounded-xl bg-white/5" /></div> : null}
      {type === "messages" && privacyQuery.isError ? <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">{__msg("settings.unableToLoadMessagingPrivacy")} <button className="font-bold text-atseen-blue" onClick={() => privacyQuery.refetch()} type="button">{__msg("discover.tryAgain")}</button></div> : null}
      {type === "messages" && privacyQuery.data ? <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">{[[true, __msg("onboarding.everyone"), __msg("system.copy.ce09710d3614")], [false, __msg("settings.noOne"), __msg("system.copy.eae52765eb8a")]].map(([value, title, subtitle]) => <button className="flex w-full items-center gap-3 border-b border-white/[0.07] px-4 py-4 text-start last:border-0 hover:bg-white/[0.03] disabled:opacity-50" disabled={messagingMutation.isPending} key={title} onClick={() => messagingMutation.mutate(value)} type="button"><span className="min-w-0 flex-1"><b className="block text-sm">{title}</b><small className="mt-1 block text-[11px] text-white/40">{subtitle}</small></span>{allowed === value ? <FiCheck className="text-lg text-atseen-blue" /> : null}</button>)}</div> : null}
      {error ? <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert">{__systemMessage(error)}</p> : null}
    </section>
  </div>;
}
