import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBarChart2, FiBell, FiChevronRight, FiCreditCard, FiEdit3, FiFlag, FiGlobe, FiHelpCircle, FiInfo, FiLogOut, FiMessageCircle, FiShield, FiTrash2, FiUserCheck, FiUserX, FiUsers, FiVolumeX } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import NotificationSettingsSheet from "./NotificationSettingsSheet";
import PrivacyQuickSettingsSheet from "./PrivacyQuickSettingsSheet";
import { profileService } from "../../services/profileService";
import { normalizeApiError } from "../../utils/apiErrors";
import CreatorVerificationPage from "../creator/CreatorVerificationPage";
import VerifiedCreatorPage from "../creator/VerifiedCreatorPage";

function SettingsRow({ icon: Icon, onClick, subtitle, title, to, trailing }) {
  const content = <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-atseen-line bg-atseen-surface-2 text-atseen-blue"><Icon /></span><span className="min-w-0 flex-1"><b className="block text-sm font-bold text-white">{title}</b>{subtitle ? <small className="mt-1 block truncate text-xs text-atseen-muted">{subtitle}</small> : null}</span>{trailing || <FiChevronRight className="shrink-0 text-atseen-dim" />}</>;
  if (onClick) return <button className="flex w-full items-center gap-3 border-b border-atseen-line px-4 py-3.5 text-left last:border-0 hover:bg-white/[0.03]" onClick={onClick} type="button">{content}</button>;
  return <Link className="flex items-center gap-3 border-b border-atseen-line px-4 py-3.5 last:border-0 hover:bg-white/[0.03]" to={to}>{content}</Link>;
}

function SettingsGroup({ children, title }) {
  return <section className="mt-6"><h2 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim">{title}</h2><div className="overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface">{children}</div></section>;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [creatorApplyOpen, setCreatorApplyOpen] = useState(false);
  const [verifiedApplyOpen, setVerifiedApplyOpen] = useState(false);
  const [privacySheet, setPrivacySheet] = useState(null);
  const [privacyError, setPrivacyError] = useState("");
  const [supportersSaved, setSupportersSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
  const supportersMutation = useMutation({
    mutationFn: (showFollowers) => profileService.updatePrivacySettings({ privacySettings: { ...(privacyQuery.data?.privacySettings || {}), showFollowers } }),
    onSuccess: (response) => {
      queryClient.setQueryData(["settings", "privacy"], response.data.data);
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      setPrivacyError("");
      setSupportersSaved(true);
      window.setTimeout(() => setSupportersSaved(false), 2200);
    },
    onError: (requestError) => setPrivacyError(normalizeApiError(requestError, "Unable to update public supporters.").message),
  });

  const signOut = async () => {
    setBusy(true);
    try { await logout(); } finally { navigate("/login", { replace: true }); }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await authService.deleteAccount();
      await logout();
      navigate("/login", { replace: true, state: { message: "Your account deletion request was received." } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to request account deletion. Please try again.");
      setBusy(false);
    }
  };

  return <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-5">
    <header className="flex items-center gap-3"><button aria-label="Back to profile" className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-xl" onClick={() => navigate("/profile")} type="button"><FiArrowLeft /></button><div><h1 className="text-2xl font-black">Settings</h1><p className="mt-0.5 text-xs text-atseen-muted">Account, preferences and privacy</p></div></header>

    <SettingsGroup title="Account">
      {["fan", "creator"].includes(user?.role) ? user.creatorApprovalStatus === "approved" ? <SettingsRow icon={FiUserCheck} subtitle="Approved creator access" title="Creator tools" to="/studio" /> : <SettingsRow icon={FiUserCheck} onClick={() => setCreatorApplyOpen(true)} subtitle={user.creatorApprovalStatus === "pending" ? "Application under review" : "For people who want to publish and earn"} title={user.creatorApprovalStatus === "pending" ? "Creator application" : "Apply as a creator"} /> : null}
      <SettingsRow icon={FiEdit3} subtitle="Identity, photos and contact options" title="Edit profile" to="/settings/profile?from=settings" />
      <SettingsRow icon={FiGlobe} subtitle="Language, time zone and password" title="Account preferences" to="/settings/account" />
    </SettingsGroup>

    {user?.creatorApprovalStatus === "approved" ? <SettingsGroup title="Creator"><SettingsRow icon={FiUserCheck} onClick={() => setVerifiedApplyOpen(true)} subtitle={user?.isVerified ? "Blue tick active · monthly plan" : "Apply separately for the blue tick"} title={user?.isVerified ? "Verified Creator" : "Apply for Verified Creator"} /><SettingsRow icon={FiMessageCircle} subtitle="Messages, calls and pricing" title="Direct Access" to="/messages?tab=direct" /><SettingsRow icon={FiBarChart2} subtitle="Insights, audience and earnings" title="Professional dashboard" to="/studio" /></SettingsGroup> : null}

    <SettingsGroup title="Preferences"><SettingsRow icon={FiBell} onClick={() => setNotificationsOpen(true)} subtitle="Comments, reactions, messages and income" title="Notifications" /><SettingsRow icon={FiGlobe} subtitle="Topics, people and what you see" title="Content preferences" to="/settings/content" /></SettingsGroup>
    <SettingsGroup title="Payments"><SettingsRow icon={FiCreditCard} subtitle="Stars and transaction history" title="Wallet" to="/wallet" /></SettingsGroup>
    <SettingsGroup title="Privacy & safety">
      <SettingsRow icon={FiUserX} onClick={() => setPrivacySheet("blocked")} subtitle={blockedQuery.isLoading ? "Loading..." : blockedQuery.data?.length ? `${blockedQuery.data.length} blocked` : "You haven't blocked anyone"} title="Blocked users" />
      <SettingsRow icon={FiVolumeX} onClick={() => setPrivacySheet("muted")} subtitle={mutedQuery.isLoading ? "Loading..." : mutedQuery.data?.length ? `${mutedQuery.data.length} muted` : "No one muted"} title="Muted" />
      <SettingsRow icon={FiMessageCircle} onClick={() => setPrivacySheet("messages")} subtitle={privacyQuery.isLoading ? "Loading..." : privacyQuery.data?.privacySettings?.allowDirectMessages ? "Everyone" : "No one"} title="Who can message me" />
      {privacyQuery.data?.role === "creator" ? <SettingsRow icon={FiUsers} onClick={() => !supportersMutation.isPending && supportersMutation.mutate(!privacyQuery.data?.privacySettings?.showFollowers)} subtitle={privacyQuery.data?.privacySettings?.showFollowers ? "Shown on your profile" : "Hidden"} title="Public supporters" trailing={<span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition ${privacyQuery.data?.privacySettings?.showFollowers ? "bg-[#8FC4FF]" : "bg-white/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-[#0A0C0F] transition ${privacyQuery.data?.privacySettings?.showFollowers ? "left-6" : "left-1"}`} /></span>} /> : null}
      <SettingsRow icon={FiShield} subtitle="More visibility and discovery controls" title="More privacy settings" to="/settings/privacy" />
    </SettingsGroup>
    <SettingsGroup title="Support">
      <SettingsRow icon={FiHelpCircle} subtitle="Coins, Worlds, payouts and safety" title="Help Center" to="/settings/support/help" />
      <SettingsRow icon={FiShield} subtitle="The deal, the rules, your data" title="Terms & Privacy" to="/settings/support/terms" />
      <SettingsRow icon={FiFlag} subtitle="A human reads every report" title="Report a problem" to="/settings/support/report" />
      <SettingsRow icon={FiInfo} subtitle="Be seen. Get paid." title="About" to="/settings/support/about" />
    </SettingsGroup>

    {error || privacyError ? <p className="mt-5 rounded-xl bg-atseen-danger/10 p-3 text-sm text-atseen-danger" role="alert">{error || privacyError}</p> : null}
    <div className="mt-7 grid gap-2"><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 py-3.5 text-sm font-bold disabled:opacity-50" disabled={busy} onClick={signOut} type="button"><FiLogOut /> Log out</button><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 py-3.5 text-sm font-bold text-atseen-danger disabled:opacity-50" disabled={busy} onClick={() => setDeleteOpen(true)} type="button"><FiTrash2 /> Delete account</button><small className="mt-2 text-center text-[10px] text-atseen-dim">@seen by Atseen</small></div>

    {deleteOpen ? <div className="edit-profile-delete-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDeleteOpen(false); }}><section aria-labelledby="settings-delete-title" aria-modal="true" className="edit-profile-delete-sheet" role="dialog"><span className="edit-profile-delete-handle" /><FiTrash2 className="edit-profile-delete-icon" /><h2 id="settings-delete-title">Delete account?</h2><p>Your profile and content will be disabled immediately. Your deletion request will be recorded for permanent removal.</p><button className="edit-profile-delete-confirm" disabled={busy} onClick={deleteAccount} type="button">{busy ? "Requesting deletion..." : "Delete my account"}</button><button className="edit-profile-delete-cancel" disabled={busy} onClick={() => setDeleteOpen(false)} type="button">Keep it</button></section></div> : null}
    <NotificationSettingsSheet isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    <PrivacyQuickSettingsSheet isOpen={Boolean(privacySheet)} onClose={() => setPrivacySheet(null)} type={privacySheet} />
    {creatorApplyOpen ? <><button aria-label="Close creator application" className="fixed inset-0 z-[189] cursor-default bg-black/65 backdrop-blur-[2px]" onClick={() => setCreatorApplyOpen(false)} type="button" /><CreatorVerificationPage /></> : null}
    {verifiedApplyOpen ? <><button aria-label="Close Verified Creator" className="fixed inset-0 z-[189] cursor-default bg-black/65 backdrop-blur-[2px]" onClick={() => setVerifiedApplyOpen(false)} type="button" /><VerifiedCreatorPage embedded onClose={() => setVerifiedApplyOpen(false)} /></> : null}
    {supportersSaved ? <div className="fixed bottom-6 left-1/2 z-[210] -translate-x-1/2 rounded-full border border-white/10 bg-[#1C212B] px-5 py-3 text-sm font-bold shadow-2xl">Supporters {privacyQuery.data?.privacySettings?.showFollowers ? "shown" : "hidden"}</div> : null}
  </main>;
}
