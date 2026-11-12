import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiBarChart2, FiBell, FiChevronLeft, FiChevronRight, FiEdit3, FiFlag, FiGlobe, FiHelpCircle, FiInfo, FiMessageCircle, FiShield, FiUserX, FiUsers, FiVolumeX } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import NotificationSettingsSheet from "./NotificationSettingsSheet";
import PrivacyQuickSettingsSheet from "./PrivacyQuickSettingsSheet";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import CreatorVerificationPage from "../creator/CreatorVerificationPage";
import DeleteAccountSheet from "./DeleteAccountSheet";
import MemberNumberSetting from "../../components/profile/MemberNumberSetting";
import AccountTypeSetting from "../../components/profile/AccountTypeSetting";
import LanguageSetting from "../../components/profile/LanguageSetting";
import SettingsPayments from "./SettingsPayments";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import "./SettingsPage.css";

function SettingsRow({ onClick, subtitle, title, to, trailing, disabled }) {
  __useUiLanguage();
  const content = <><span className="settings-index-row-copy"><b>{title}</b>{subtitle ? <small>{subtitle}</small> : null}</span>{trailing || <FiChevronRight data-ui-directional="true" />}</>;
  if (onClick) return <button className="settings-index-row" disabled={disabled} onClick={onClick} type="button">{content}</button>;
  return <Link className="settings-index-row" to={to}>{content}</Link>;
}

function SettingsGroup({ children, title }) {
  __useUiLanguage();
  return <section className="settings-index-group"><h2>{title}</h2><div>{children}</div></section>;
}

export default function SettingsPage() {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout, trustedDeviceLogout, user } = useAuth();
  const { showToast } = useFanToast();
  const previewStorageKey = `onlyme_creator_preview:${user?.id || user?._id || ""}`;
  const [previewEnabled, setPreviewEnabled] = useState(() => sessionStorage.getItem(previewStorageKey) === "on");
  const toggleCreatorPreview = () => {
    const enabled = !previewEnabled;
    sessionStorage.setItem(previewStorageKey, enabled ? "on" : "off");
    setPreviewEnabled(enabled);
    if (enabled) navigate("/profile?preview=new");
  };
  const settingsMainRef = useRef(null);
  const [ownershipStep, setOwnershipStep] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [checkingEarnings, setCheckingEarnings] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [creatorApplyOpen, setCreatorApplyOpen] = useState(new URLSearchParams(window.location.search).has("verification"));
  const [verificationView, setVerificationView] = useState(new URLSearchParams(window.location.search).get("verification")?.startsWith("bank") ? (new URLSearchParams(window.location.search).get("verification") === "bank" ? "setup" : new URLSearchParams(window.location.search).get("verification")) : "verify");
  const [privacySheet, setPrivacySheet] = useState(null);
  const [privacyError, setPrivacyError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [error, setError] = useState("");

  const monetizationQuery = useQuery({ queryKey: ["monetization"], queryFn: () => authService.getMonetization().then(response => response.data.data) });
  const privacyQuery = useQuery({
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
  const messageAudience = privacyQuery.data?.privacySettings?.messageAudience
    || (privacyQuery.data?.privacySettings?.allowDirectMessages === false ? "no_one" : "everyone");
  const messageLabels = { everyone: __msg("onboarding.everyone"), following: __msg("settings.peopleIFollow"), no_one: __msg("settings.noOne") };
  const messageAudienceMutation = useMutation({
    mutationFn: audience => profileService.updatePrivacySettings({ privacySettings: { ...(privacyQuery.data?.privacySettings || {}), messageAudience: audience } }),
    onMutate: async audience => {
      await queryClient.cancelQueries({ queryKey: ["settings", "privacy"] });
      const previous = queryClient.getQueryData(["settings", "privacy"]);
      queryClient.setQueryData(["settings", "privacy"], current => ({ ...current, privacySettings: { ...current?.privacySettings, messageAudience: audience, allowDirectMessages: audience !== "no_one" } }));
      setPrivacyError("");
      return { previous };
    },
    onSuccess: response => {
      queryClient.setQueryData(["settings", "privacy"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    },
    onError: (error, _audience, context) => {
      if (context?.previous) queryClient.setQueryData(["settings", "privacy"], context.previous);
      setPrivacyError(normalizeApiError(error, __msg("settings.unableToUpdateWhoCanMessageYou")).message);
    },
  });
  const supportersMutation = useMutation({
    mutationFn: (showFollowers) => profileService.updatePrivacySettings({ privacySettings: { ...(privacyQuery.data?.privacySettings || {}), showFollowers } }),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "privacy"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      setPrivacyError("");
      showToast(`${__msg("settings.supporters")} ${__msg(response.data.data.privacySettings?.showFollowers ? "admin.shown" : "settings.hidden")}`, { duration: 2200 });
    },
    onError: (requestError) => setPrivacyError(normalizeApiError(requestError, __msg("settings.unableToUpdatePublicSupporters")).message),
  });

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (localStorage.getItem("onlyme_one_tap_enabled") === "true") trustedDeviceLogout();
      else await logout();
    } catch { /* Logout always clears local authentication. */ }
    finally { queryClient.clear(); navigate("/welcome", { replace: true }); }
  };

  const changeOwnershipStep = async (step) => {
    setError("");
    setOwnershipStep(step);
    if (step !== "check") return;
    setCheckingEarnings(true);
    try {
      const response = await authService.getAccountOwnership();
      const amount = response.data.data.unwithdrawnUsd;
      if (!Number.isFinite(amount) || amount < 0) throw new Error(__msg("settings.invalidEarningsResponse"));
      setEarnings(amount);
      setOwnershipStep(amount > 0 ? "earnings" : "delete");
    } catch (requestError) {
      setError(normalizeApiError(requestError, __msg("settings.unableToCheckYourEarnings_52c2da")).message);
    } finally { setCheckingEarnings(false); }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      if (ownershipStep === "deactivate") await authService.deactivateAccount();
      else await authService.deleteAccount({ acknowledgeEarningsLoss: earnings > 0 });
      try { await logout(); } catch { /* Local auth is cleared by logout even when the request fails. */ }
      queryClient.clear();
      navigate("/login", { replace: true, state: { message: ownershipStep === "deactivate" ? __msg("settings.accountDeactivatedLogBackInAnytimeToBring") : __msg("settings.deletionRequested30DaysToChangeYourMind") } });
    } catch (requestError) {
      if (requestError.response?.data?.code === "UNWITHDRAWN_EARNINGS") await changeOwnershipStep("check");
      else setError(normalizeApiError(requestError, ownershipStep === "deactivate" ? __msg("settings.unableToDeactivateYourAccountPleaseTryAgain") : __msg("settings.unableToRequestAccountDeletionPleaseTryAgain")).message);
      setBusy(false);
    }
  };

  return <main className="settings-index-page settings-prototype-index" ref={settingsMainRef}>
    <header className="settings-index-header"><button aria-label={__msg("profile.backToProfile")} onClick={() => navigate("/profile")} type="button"><FiChevronLeft data-ui-directional="true" /></button><h1>{__msg("profile.settings")}</h1></header>

    <SettingsGroup title={__msg("layouts.account")}>
      <AccountTypeSetting />
      <SettingsRow onClick={() => changeOwnershipStep("ownership")} subtitle={__msg("settings.deactivateOrDelete")} title={__msg("settings.accountOwnershipAndControl")} />
      <SettingsRow title={__msg("settings.monetization")} subtitle={monetizationQuery.isPending ? __msg("fanWeb.loading_5fabab") : monetizationQuery.isError ? __msg("settings.manageEarningAndPayouts") : monetizationQuery.data?.enabled ? __msg("settings.giftsAndDreamOn", { value0: monetizationQuery.data.payoutsReady ? "payouts ready" : "set up payouts" }) : __msg("settings.offCompleteEligibility")} to="/settings/monetization" />
      <SettingsRow icon={FiShield} onClick={() => { setVerificationView("verify"); setCreatorApplyOpen(true); }} subtitle={user?.isVerified ? __msg("settings.verifiedReviewedBySeen") : __msg("settings.identityReviewByTheSeenTeam")} title={__msg("social.verification")} />
      <SettingsRow icon={FiEdit3} title={__msg("fan.editProfile_15141e")} to="/settings/profile?from=settings" />
      <LanguageSetting />
      <MemberNumberSetting />
    </SettingsGroup>

    {user?.creatorApprovalStatus === "approved" || ["creator", "business"].includes(user?.profileType) ? <SettingsGroup title={user?.profileType === "business" ? __msg("profile.business") : __msg("discover.creator")}>
      <SettingsRow icon={FiMessageCircle} subtitle={__msg("settings.messagesCallsAndPricing")} title="Direct Access" to="/settings/direct-access" />
      <SettingsRow icon={FiBarChart2} subtitle={__msg("settings.insightsAudienceAndEarnings")} title={__msg("settings.professionalDashboard")} to="/studio" />
      {user?.creatorApprovalStatus === "approved" ? <button className="settings-index-row" role="switch" aria-checked={previewEnabled} onClick={toggleCreatorPreview} type="button">
        <span className="settings-index-row-copy"><b>{__msg("settings.previewAsANewCreator")}</b><small>{__msg("settings.seeTheOnboardingAndEarningExamples")}</small></span>
        <span className={`settings-preview-status${previewEnabled ? " is-on" : ""}`}>{previewEnabled ? __msg("fanWeb.on") : __msg("fanWeb.off")}</span>
      </button> : null}
    </SettingsGroup> : null}
    <SettingsGroup title={__msg("orbit.preferences")}><SettingsRow icon={FiBell} onClick={() => setNotificationsOpen(true)} subtitle={__msg("settings.commentsReactionsMessagesAndIncome")} title={__msg("settings.notifications")} /><SettingsRow icon={FiGlobe} subtitle={__msg("settings.topicsPeopleAndWhatYouSee")} title={__msg("settings.contentPreferences")} to="/settings/content" /><SettingsRow icon={FiGlobe} subtitle={__msg("settings.timeZoneAndPassword")} title={__msg("settings.accountPreferences")} to="/settings/account" /></SettingsGroup>
    <SettingsPayments />
    <SettingsGroup title={__msg("settings.privacySafety")}>
      <SettingsRow icon={FiUserX} onClick={() => setPrivacySheet("blocked")} subtitle={blockedQuery.isLoading ? __msg("admin.loading") : blockedQuery.data?.length ? __msg("settings.blocked", { value0: blockedQuery.data.length }) : __msg("settings.youHavenTBlockedAnyone")} title={__msg("settings.blockedUsers")} />
      <SettingsRow icon={FiVolumeX} onClick={() => setPrivacySheet("muted")} subtitle={mutedQuery.isLoading ? __msg("admin.loading") : mutedQuery.data?.length ? __msg("settings.muted_548bb9", { value0: mutedQuery.data.length }) : __msg("settings.noOneMuted")} title={__msg("settings.muted")} />
      <SettingsRow icon={FiMessageCircle} disabled={privacyQuery.isPending || privacyQuery.isError || messageAudienceMutation.isPending} onClick={() => messageAudienceMutation.mutate({ everyone: "following", following: "no_one", no_one: "everyone" }[messageAudience])} subtitle={privacyQuery.isPending ? __msg("admin.loading") : messageLabels[messageAudience]} title={__msg("settings.whoCanMessageMe")} />
      <SettingsRow icon={FiUsers} onClick={() => !supportersMutation.isPending && supportersMutation.mutate(!privacyQuery.data?.privacySettings?.showFollowers)} subtitle={privacyQuery.data?.privacySettings?.showFollowers ? __msg("settings.shownOnYourProfile") : __msg("admin.hidden_d4c279")} title={__msg("settings.publicSupporters")} />
    </SettingsGroup>
    <SettingsGroup title={__msg("fanWeb.support")}>
      <SettingsRow icon={FiHelpCircle} subtitle={__msg("settings.coinsWorldsPayoutsAndSafety")} title={__msg("settings.helpCenter")} to="/settings/support/help" />
      <SettingsRow icon={FiShield} subtitle={__msg("settings.theDealTheRulesYourData")} title={__msg("settings.termsPrivacy")} to="/settings/support/terms" />
      <SettingsRow icon={FiFlag} subtitle={__msg("settings.aHumanReadsEveryReport")} title={__msg("settings.reportAProblem")} to="/settings/support/report" />
      <SettingsRow icon={FiInfo} subtitle={__msg("settings.beSeenGetPaid")} title={__msg("settings.about")} to="/settings/support/about" />
    </SettingsGroup>

    {error || privacyError ? <p className="mt-5 rounded-xl bg-atseen-danger/10 p-3 text-sm text-atseen-danger" role="alert">{error || privacyError}</p> : null}
    <div className="settings-index-footer"><button className="settings-index-logout" disabled={busy} onClick={() => setLogoutOpen(true)} type="button">{__msg("layouts.logOut")}</button><small>{__msg("settings.seenByAtseen")}</small></div>
    {logoutOpen ? <DeleteAccountSheet anchorRef={settingsMainRef} busy={busy} step="logout" onClose={() => setLogoutOpen(false)} onConfirm={signOut} /> : null}

    {ownershipStep ? <DeleteAccountSheet anchorRef={settingsMainRef} busy={busy || checkingEarnings} error={__systemMessage(error)} step={ownershipStep} earnings={earnings} loading={checkingEarnings} onRetry={() => changeOwnershipStep("check")} onStep={changeOwnershipStep} onClose={() => { setOwnershipStep(null); setError(""); }} onConfirm={deleteAccount} onPayouts={() => { setOwnershipStep(null); setVerificationView("payouts"); setCreatorApplyOpen(true); }} /> : null}
    <NotificationSettingsSheet anchorRef={settingsMainRef} isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    <PrivacyQuickSettingsSheet anchorRef={settingsMainRef} isOpen={Boolean(privacySheet)} onClose={() => setPrivacySheet(null)} type={privacySheet} />
    {creatorApplyOpen ? <CreatorVerificationPage initialView={verificationView} onClose={() => { setCreatorApplyOpen(false); window.history.replaceState(null, "", "/settings"); }} /> : null}
  </main>;
}
