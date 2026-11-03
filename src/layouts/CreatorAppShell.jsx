/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiDollarSign, FiFileText, FiGrid, FiHome, FiLogOut, FiMenu, FiSettings, FiUser, FiX } from "react-icons/fi";
import { Suspense, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { resolveMediaUrl } from "../utils/media";
import { CallProvider } from "../context/CallContext";
import CenterRouteLoading, { CenterRefreshOverlay } from "../components/common/CenterRouteLoading";

const nav = [
  { to: "/creator/dashboard", get label() { return __msg("stories.overview"); }, icon: FiHome },
  { to: "/creator/studio", get label() { return __msg("layouts.studio"); }, icon: FiGrid, approval: true },
  { to: "/creator/content", get label() { return __msg("fan.content"); }, icon: FiFileText, approval: true },
  { to: "/creator/earnings", get label() { return __msg("layouts.earnings"); }, icon: FiDollarSign, approval: true },
  { to: "/creator/verification", get label() { return __msg("social.verification"); }, icon: FiCheckCircle },
  { to: "/creator/profile", get label() { return __msg("social.profile"); }, icon: FiUser },
  { to: "/creator/settings", get label() { return __msg("profile.settings"); }, icon: FiSettings },
];

export default function CreatorAppShell() {
  __useUiLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const approved = user?.creatorApprovalStatus === "approved" || user?.isVerified;
  const visibleNav = nav.filter((item) => !item.approval || approved);
  const avatar = resolveMediaUrl(user?.avatar || user?.profilePhoto);

  const signOut = async () => { await logout(); navigate("/login", { replace: true }); };
  const links = visibleNav.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} onClick={() => setOpen(false)} to={to} className={({ isActive }) => `creator-nav-link ${isActive || (to === "/creator/content" && location.pathname.startsWith("/creator/content")) ? "creator-nav-active" : ""}`}>
      <Icon aria-hidden="true" /><span>{label}</span>
    </NavLink>
  ));

  return <CallProvider user={user}><div className="user-app-shell creator-shell">
    <header className="creator-mobile-header"><NavLink className="creator-logo" to="/creator/studio">{__msg("layouts.onlyme")}</NavLink><button aria-label={__msg("layouts.openNavigation")} onClick={() => setOpen(true)}><FiMenu /></button></header>
    <aside className={`creator-sidebar ${open ? "is-open" : ""}`}>
      <div className="flex items-center justify-between"><NavLink className="creator-logo" to="/creator/studio">{__msg("layouts.onlyme")}</NavLink><button className="lg:hidden" aria-label={__msg("layouts.closeNavigation")} onClick={() => setOpen(false)}><FiX /></button></div>
      <div className="creator-account-card">
        <div className="creator-avatar">{avatar ? <img alt="" src={avatar} /> : (user?.name?.[0] || "C").toUpperCase()}</div>
        <div className="min-w-0"><p className="truncate font-semibold">{user?.name || __msg("discover.creator")}</p><p className="truncate text-xs text-slate-400">@{user?.username || __msg("financial.creator")}</p></div>
      </div>
      <nav className="creator-nav">{links}</nav>
      <button className="creator-signout" onClick={signOut} type="button"><FiLogOut /> {__msg("layouts.signOut")}</button>
    </aside>
    {open ? <button aria-label={__msg("layouts.closeNavigation")} className="creator-backdrop" onClick={() => setOpen(false)} /> : null}
    <main className="creator-main relative"><CenterRefreshOverlay /><Suspense fallback={<CenterRouteLoading />}><Outlet /></Suspense></main>
    <nav className="creator-bottom-nav">{visibleNav.slice(0, 5).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon /><span>{label}</span></NavLink>)}</nav>
  </div></CallProvider>;
}
