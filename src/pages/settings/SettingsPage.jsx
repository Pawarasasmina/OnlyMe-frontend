import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBarChart2, FiBell, FiChevronRight, FiCreditCard, FiEdit3, FiGlobe, FiHelpCircle, FiInfo, FiLogOut, FiMessageCircle, FiShield, FiTrash2, FiUserCheck } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";

function SettingsRow({ icon: Icon, subtitle, title, to }) {
  const content = <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-atseen-line bg-atseen-surface-2 text-atseen-blue"><Icon /></span><span className="min-w-0 flex-1"><b className="block text-sm font-bold text-white">{title}</b>{subtitle ? <small className="mt-1 block truncate text-xs text-atseen-muted">{subtitle}</small> : null}</span><FiChevronRight className="shrink-0 text-atseen-dim" /></>;
  return <Link className="flex items-center gap-3 border-b border-atseen-line px-4 py-3.5 last:border-0 hover:bg-white/[0.03]" to={to}>{content}</Link>;
}

function SettingsGroup({ children, title }) {
  return <section className="mt-6"><h2 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-atseen-dim">{title}</h2><div className="overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface">{children}</div></section>;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      {user?.role === "creator" ? <SettingsRow icon={FiUserCheck} subtitle={user.creatorApprovalStatus === "approved" ? "Verified creator" : "For people who really create"} title={user.creatorApprovalStatus === "approved" ? "Creator ✓" : "Creator — apply"} to="/creator/verification" /> : null}
      <SettingsRow icon={FiEdit3} subtitle="Identity, photos and contact options" title="Edit profile" to="/settings/profile" />
      <SettingsRow icon={FiGlobe} subtitle="Language, time zone and password" title="Account preferences" to="/settings/account" />
    </SettingsGroup>

    {user?.role === "creator" ? <SettingsGroup title="Creator"><SettingsRow icon={FiMessageCircle} subtitle="Messages, calls and pricing" title="Direct Access" to="/messages?tab=direct" /><SettingsRow icon={FiBarChart2} subtitle="Insights, audience and earnings" title="Professional dashboard" to="/studio" /></SettingsGroup> : null}

    <SettingsGroup title="Preferences"><SettingsRow icon={FiBell} subtitle="Comments, reactions, messages and income" title="Notifications" to="/settings/notifications" /></SettingsGroup>
    <SettingsGroup title="Payments"><SettingsRow icon={FiCreditCard} subtitle="Stars and transaction history" title="Wallet" to="/wallet" /></SettingsGroup>
    <SettingsGroup title="Privacy & safety"><SettingsRow icon={FiShield} subtitle="Visibility, messaging and blocked accounts" title="Privacy & blocked users" to="/settings/privacy" /></SettingsGroup>
    <SettingsGroup title="Support"><SettingsRow icon={FiHelpCircle} subtitle="Security and password settings" title="Account security" to="/settings/security" /><SettingsRow icon={FiInfo} subtitle="The deal, the rules and your data" title="Terms & privacy" to="/settings/privacy" /></SettingsGroup>

    {error ? <p className="mt-5 rounded-xl bg-atseen-danger/10 p-3 text-sm text-atseen-danger" role="alert">{error}</p> : null}
    <div className="mt-7 grid gap-2"><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 py-3.5 text-sm font-bold disabled:opacity-50" disabled={busy} onClick={signOut} type="button"><FiLogOut /> Log out</button><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 py-3.5 text-sm font-bold text-atseen-danger disabled:opacity-50" disabled={busy} onClick={() => setDeleteOpen(true)} type="button"><FiTrash2 /> Delete account</button><small className="mt-2 text-center text-[10px] text-atseen-dim">@seen by Atseen</small></div>

    {deleteOpen ? <div className="edit-profile-delete-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDeleteOpen(false); }}><section aria-labelledby="settings-delete-title" aria-modal="true" className="edit-profile-delete-sheet" role="dialog"><span className="edit-profile-delete-handle" /><FiTrash2 className="edit-profile-delete-icon" /><h2 id="settings-delete-title">Delete account?</h2><p>Your profile and content will be disabled immediately. Your deletion request will be recorded for permanent removal.</p><button className="edit-profile-delete-confirm" disabled={busy} onClick={deleteAccount} type="button">{busy ? "Requesting deletion..." : "Delete my account"}</button><button className="edit-profile-delete-cancel" disabled={busy} onClick={() => setDeleteOpen(false)} type="button">Keep it</button></section></div> : null}
  </main>;
}
