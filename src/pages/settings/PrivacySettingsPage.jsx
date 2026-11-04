import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiEyeOff, FiUserX, FiVolumeX } from "react-icons/fi";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import { resolveMediaUrl } from "../../utils/media";

const roleOptions = {
  fan: [
    __uiTuple(["showOnlineStatus", { __uiMessage: "settings.showOnlineStatus" }]),
    __uiTuple(["showActivityStatus", { __uiMessage: "settings.showActivityStatus" }]),
    __uiTuple(["showLocation", { __uiMessage: "settings.showLocation" }]),
    __uiTuple(["allowDiscovery", { __uiMessage: "settings.allowProfileDiscovery" }]),
    __uiTuple(["allowDirectMessages", { __uiMessage: "settings.allowDirectMessages" }]),
    __uiTuple(["allowMentions", { __uiMessage: "settings.allowMentions" }]),
  ],
  creator: [
    __uiTuple(["showOnlineStatus", { __uiMessage: "settings.showOnlineStatus" }]),
    __uiTuple(["showActivityStatus", { __uiMessage: "settings.showActivityStatus" }]),
    __uiTuple(["showLocation", { __uiMessage: "settings.showLocation" }]),
    __uiTuple(["allowDiscovery", { __uiMessage: "settings.allowCreatorDiscovery" }]),
    __uiTuple(["allowDirectMessages", { __uiMessage: "settings.allowDirectMessages" }]),
    __uiTuple(["allowMentions", { __uiMessage: "settings.allowMentions" }]),
    __uiTuple(["allowTags", { __uiMessage: "settings.allowTags" }]),
    __uiTuple(["showFollowers", { __uiMessage: "settings.showFollowers" }]),
  ],
  admin: [
    __uiTuple(["showOnlineStatus", { __uiMessage: "settings.showOnlineStatus" }]),
    __uiTuple(["showActivityStatus", { __uiMessage: "settings.showActivityStatus" }]),
    __uiTuple(["allowDirectMessages", { __uiMessage: "settings.allowDirectMessages" }]),
  ],
};

function Toggle({ checked, disabled, label, name, onChange }) {
  __useUiLanguage();
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm font-medium text-brand-mist/85">{label}</span>
      <input checked={checked} disabled={disabled} name={name} onChange={onChange} type="checkbox" />
    </label>
  );
}

function PrivacySettingsPage() {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ profileVisibility: "private", privacySettings: {} });
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["settings", "privacy"],
    queryFn: () => profileService.getPrivacySettings().then((response) => response.data.data),
  });

  const blockedQuery = useQuery({
    queryKey: ["settings", "blocked-accounts"],
    queryFn: () => profileService.getBlockedAccounts().then((response) => response.data.data.items || []),
  });

  const mutedQuery = useQuery({
    queryKey: ["settings", "muted-accounts"],
    queryFn: () => profileService.getMutedAccounts().then((response) => response.data.data.items || []),
  });

  const hiddenSeensQuery = useQuery({
    queryKey: ["settings", "hidden-seens"],
    queryFn: () => profileService.getHiddenSeens().then((response) => response.data.data.items || []),
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
      setMessage(__msg("settings.privacySettingsSaved"));
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, __msg("settings.yourSettingsCouldNotBeSavedPleaseTryAgain")).message);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (userId) => profileService.unblockAccount(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "blocked-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      setMessage(__msg("settings.accountUnblocked"));
      setError("");
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, __msg("settings.unableToUnblockThisAccountPleaseTryAgain")).message);
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (userId) => profileService.unmuteAccount(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "muted-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      queryClient.invalidateQueries({ queryKey: ["orbit"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["muted-accounts"] });
      setMessage(__msg("settings.accountUnmuted"));
      setError("");
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, __msg("settings.unableToUnmuteThisAccountPleaseTryAgain")).message);
    },
  });

  const showSeenAgainMutation = useMutation({
    mutationFn: (seenId) => profileService.showHiddenSeenAgain(seenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "hidden-seens"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["discover"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      setMessage(__msg("settings.seenWillBeShownAgain"));
      setError("");
    },
    onError: (err) => {
      setMessage("");
      setError(normalizeApiError(err, __msg("settings.unableToShowThisSeenAgainPleaseTryAgain")).message);
    },
  });

  if (query.isLoading) return <Loader label={__msg("settings.loadingPrivacySettings")} />;
  if (query.isError) return <p className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200">{__msg("settings.unableToLoadPrivacySettings")}</p>;

  const role = query.data?.role || "fan";
  const options = roleOptions[role] || roleOptions.fan;

  const updateToggle = ({ target }) => {
    setDirty(true);
    setMessage("");
    setForm((current) => ({
      ...current,
      privacySettings: { ...current.privacySettings, [target.name]: target.checked, ...(target.name === "allowDirectMessages" ? { messageAudience: target.checked ? "everyone" : "no_one" } : {}) },
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-mist/70 transition hover:text-white" to="/settings">
        <FiArrowLeft data-ui-directional="true" />{__msg("settings.backToSettings")}</Link>
      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-5 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div>
            <h1 className="text-2xl font-semibold">{__msg("settings.privacySettings")}</h1>
            <p className="mt-1 text-sm text-brand-mist/60">{__msg("settings.controlProfileVisibilityAndSocialDiscovery")}</p>
          </div>
          {role !== "admin" ? (
            <label className="block space-y-2">
              <span className="text-sm text-brand-mist/80">{__msg("settings.profileVisibility")}</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary"
                onChange={(event) => {
                  setDirty(true);
                  setMessage("");
                  setForm((current) => ({ ...current, profileVisibility: event.target.value }));
                }}
                value={form.profileVisibility}
              >
                <option className="bg-brand-dark" value="public">{__msg("settings.public")}</option>
                <option className="bg-brand-dark" value="private">{__msg("settings.private")}</option>
              </select>
            </label>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {options.map(([key, label]) => (
              <Toggle checked={Boolean(form.privacySettings[key])} key={key} label={label} name={key} onChange={updateToggle} />
            ))}
          </div>
        </section>
        <section className="space-y-4 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-brand-primary">
              <FiUserX />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{__msg("settings.blockedAccounts")}</h2>
              <p className="mt-1 text-sm text-brand-mist/60">{__msg("settings.accountsYouBlockedWillNotAppearInYourSocial")}</p>
            </div>
          </div>
          {blockedQuery.isLoading ? <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">{__msg("settings.loadingBlockedAccounts")}</p> : null}
          {blockedQuery.isError ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{__msg("settings.unableToLoadBlockedAccounts")}</p> : null}
          {!blockedQuery.isLoading && !blockedQuery.isError && !blockedQuery.data?.length ? (
            <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">{__msg("settings.noBlockedAccounts")}</p>
          ) : null}
          {blockedQuery.data?.length ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {blockedQuery.data.map((account) => (
                <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3" key={account.id}>
                  <FanAvatar name={account.displayName || account.username} src={account.profilePhoto} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{account.displayName || `@${account.username}`}</p>
                    <p dir="auto" className="truncate text-xs text-brand-mist/50">@{account.username} · {__enumLabel(account.role)}</p>
                  </div>
                  <Button
                    className="px-4 py-2"
                    disabled={unblockMutation.isPending}
                    onClick={() => unblockMutation.mutate(account.id)}
                    type="button"
                    variant="ghost"
                  >{__msg("fan.unblock")}</Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <section className="space-y-4 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-brand-primary">
              <FiVolumeX />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{__msg("settings.mutedAccounts")}</h2>
              <p className="mt-1 text-sm text-brand-mist/60">{__msg("settings.seensFromMutedAccountsWillStayOutOfYour")}</p>
            </div>
          </div>
          {mutedQuery.isLoading ? <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">{__msg("settings.loadingMutedAccounts")}</p> : null}
          {mutedQuery.isError ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{__msg("settings.unableToLoadMutedAccounts")}</p> : null}
          {!mutedQuery.isLoading && !mutedQuery.isError && !mutedQuery.data?.length ? (
            <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">{__msg("settings.noMutedAccounts")}</p>
          ) : null}
          {mutedQuery.data?.length ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {mutedQuery.data.map((account) => (
                <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3" key={account.id}>
                  <FanAvatar name={account.displayName || account.username} src={account.profilePhoto} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{account.displayName || `@${account.username}`}</p>
                    <p dir="auto" className="truncate text-xs text-brand-mist/50">@{account.username} · {__enumLabel(account.role)}</p>
                  </div>
                  <Button
                    className="px-4 py-2"
                    disabled={unmuteMutation.isPending}
                    onClick={() => unmuteMutation.mutate(account.id)}
                    type="button"
                    variant="ghost"
                  >{__msg("profile.unmute")}</Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <section className="space-y-4 rounded-3xl border border-white/10 bg-brand-dark/60 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-brand-primary">
              <FiEyeOff />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{__msg("settings.hiddenSeens")}</h2>
              <p className="mt-1 text-sm text-brand-mist/60">{__msg("settings.individualSeensMarkedNotInterestedStayOutOfYour")}</p>
            </div>
          </div>
          {hiddenSeensQuery.isLoading ? <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">{__msg("settings.loadingHiddenSeens")}</p> : null}
          {hiddenSeensQuery.isError ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{__msg("settings.unableToLoadHiddenSeens")}</p> : null}
          {!hiddenSeensQuery.isLoading && !hiddenSeensQuery.isError && !hiddenSeensQuery.data?.length ? (
            <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-brand-mist/60">{__msg("settings.noHiddenSeens")}</p>
          ) : null}
          {hiddenSeensQuery.data?.length ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {hiddenSeensQuery.data.map((seen) => {
                const coverUrl = resolveMediaUrl(seen.coverMedia?.secureUrl || seen.coverMedia?.url || seen.coverImage || seen.cover);
                const creatorName = seen.creator?.displayName || seen.creator?.name || seen.creator?.username || __msg("admin.unknownCreator");
                const creatorUsername = seen.creator?.username ? `@${seen.creator.username}` : __msg("fan.creatorUnavailable");

                return (
                  <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3" key={seen.id}>
                    <Link className="block h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/10" to={`/seen/${encodeURIComponent(seen.id)}`}>
                      {coverUrl ? <img alt="" className="h-full w-full object-cover" src={coverUrl} /> : <span className="grid h-full w-full place-items-center text-xs font-black text-brand-mist/50">Seen</span>}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link className="block truncate text-sm font-semibold text-white hover:text-brand-primary" to={`/seen/${encodeURIComponent(seen.id)}`}>
                        {seen.title || __msg("profile.untitledSeen")}
                      </Link>
                      <p className="truncate text-xs text-brand-mist/50">{creatorName} - {creatorUsername}</p>
                    </div>
                    <Button
                      className="px-4 py-2"
                      disabled={showSeenAgainMutation.isPending}
                      onClick={() => showSeenAgainMutation.mutate(seen.id)}
                      type="button"
                      variant="ghost"
                    >{__msg("settings.showAgain")}</Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
        {message ? <p role="status" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p role="alert" className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{__systemMessage(error)}</p> : null}
        <div className="flex justify-end">
          <Button disabled={!dirty || mutation.isPending} type="submit">{mutation.isPending ? __msg("admin.saving") : __msg("settings.savePrivacy")}</Button>
        </div>
      </form>
    </div>
  );
}

export default PrivacySettingsPage;
