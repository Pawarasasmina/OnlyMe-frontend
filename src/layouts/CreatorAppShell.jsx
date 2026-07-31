import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiDollarSign, FiFileText, FiGrid, FiHome, FiLogOut, FiMenu, FiSettings, FiUser, FiX } from "react-icons/fi";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { resolveMediaUrl } from "../utils/media";

const nav = [
  { to: "/creator/dashboard", label: "Overview", icon: FiHome },
  { to: "/creator/studio", label: "Studio", icon: FiGrid, approval: true },
  { to: "/creator/content", label: "Content", icon: FiFileText, approval: true },
  { to: "/creator/earnings", label: "Earnings", icon: FiDollarSign, approval: true },
  { to: "/creator/verification", label: "Verification", icon: FiCheckCircle },
  { to: "/creator/profile", label: "Profile", icon: FiUser },
  { to: "/creator/settings", label: "Settings", icon: FiSettings },
];

export default function CreatorAppShell() {
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

  return <div className="creator-shell">
    <header className="creator-mobile-header"><NavLink className="creator-logo" to="/creator/studio">ONLYME</NavLink><button aria-label="Open navigation" onClick={() => setOpen(true)}><FiMenu /></button></header>
    <aside className={`creator-sidebar ${open ? "is-open" : ""}`}>
      <div className="flex items-center justify-between"><NavLink className="creator-logo" to="/creator/studio">ONLYME</NavLink><button className="lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}><FiX /></button></div>
      <div className="creator-account-card">
        <div className="creator-avatar">{avatar ? <img alt="" src={avatar} /> : (user?.name?.[0] || "C").toUpperCase()}</div>
        <div className="min-w-0"><p className="truncate font-semibold">{user?.name || "Creator"}</p><p className="truncate text-xs text-slate-400">@{user?.username || "creator"}</p></div>
      </div>
      <nav className="creator-nav">{links}</nav>
      <button className="creator-signout" onClick={signOut} type="button"><FiLogOut /> Sign out</button>
    </aside>
    {open ? <button aria-label="Close navigation" className="creator-backdrop" onClick={() => setOpen(false)} /> : null}
    <main className="creator-main"><Outlet /></main>
    <nav className="creator-bottom-nav">{visibleNav.slice(0, 5).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon /><span>{label}</span></NavLink>)}</nav>
  </div>;
}
