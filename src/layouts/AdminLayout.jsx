/* i18n-source-migrated */
import { msg as __msg } from "../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../hooks/useLanguage.js";
import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { FiActivity, FiAlertTriangle, FiBarChart2, FiCreditCard, FiFileText, FiGift, FiHome, FiLogOut, FiMail, FiMenu, FiSettings, FiShield, FiSliders, FiStar, FiUsers, FiX } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { resolveMediaUrl } from "../utils/media";
import CenterRouteLoading, { CenterRefreshOverlay } from "../components/common/CenterRouteLoading";

const navigation = [
  { get title() { return __msg("stories.overview"); }, links: [{ get label() { return __msg("layouts.dashboard"); }, to: "/admin/dashboard", icon: FiHome }, { get label() { return __msg("layouts.analytics"); }, to: "/admin/analytics", icon: FiBarChart2 }, { get label() { return __msg("discover.recommendations"); }, to: "/admin/recommendations", icon: FiSliders }] },
  { get title() { return __msg("search.people"); }, links: [{ get label() { return __msg("layouts.users"); }, to: "/admin/users", icon: FiUsers }, { get label() { return __msg("layouts.identityVerification"); }, to: "/admin/identity-verifications", icon: FiShield }, { get label() { return __msg("layouts.creatorApplications"); }, to: "/admin/creator-verifications", icon: FiShield }, { get label() { return __msg("layouts.verifiedCreators"); }, to: "/admin/verified-creators", icon: FiStar }] },
  { get title() { return __msg("layouts.trustSafety"); }, links: [{ label: "Safety Center", to: "/admin/safety", icon: FiAlertTriangle }, { get label() { return __msg("layouts.messageReports"); }, to: "/admin/message-reports", icon: FiAlertTriangle }, { get label() { return __msg("layouts.userReports"); }, to: "/admin/user-reports", icon: FiAlertTriangle }, { get label() { return __msg("layouts.postReports"); }, to: "/admin/post-reports", icon: FiFileText }] },
  { get title() { return __msg("layouts.commerce"); }, links: [{ get label() { return __msg("layouts.financialOperations"); }, to: "/admin/financial", icon: FiCreditCard }, { label: "User money history", to: "/admin/finance/users", icon: FiCreditCard }, { get label() { return __msg("layouts.bankReviews"); }, to: "/admin/bank-reviews", icon: FiCreditCard }, { get label() { return __msg("layouts.giftCatalog"); }, to: "/admin/gifts", icon: FiGift }] },
  { get title() { return __msg("layouts.communication"); }, links: [{ get label() { return __msg("layouts.welcomeEmail"); }, to: "/admin/welcome-email", icon: FiMail }] },
  { title: "Administration", links: [{ label: "Admin team & access", to: "/admin/staff", icon: FiUsers }, { label: "Governance", to: "/admin/governance", icon: FiShield }, { label: "Export Center", to: "/admin/content-export", icon: FiFileText }] },
];

const financePaths = new Set(["/admin/financial", "/admin/finance/users", "/admin/bank-reviews"]);
const mainOnlyPaths = new Set(["/admin/staff", "/admin/content-export", "/admin/recommendations", "/admin/gifts", "/admin/welcome-email"]);
const canSee = (role, path) => role === "MAIN_ADMIN" || (role === "FINANCE" ? financePaths.has(path) : !financePaths.has(path) && !mainOnlyPaths.has(path));

function AdminLayout() {
  __useUiLanguage();
  const { logout, user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const adminRole = user?.adminRole || "MAIN_ADMIN";
  const visibleNavigation = navigation.map((section) => ({ ...section, links: section.links.filter((item) => canSee(adminRole, item.to)) })).filter((section) => section.links.length);
  const activeItem = visibleNavigation.flatMap((section) => section.links).find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  return (
    <div className="admin-shell min-h-screen bg-slate-100 text-slate-900">
      {open && <button aria-label={__msg("layouts.closeNavigation")} className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} type="button" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link className="flex items-center gap-3" to="/admin/dashboard"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-black text-white">{__msg("layouts.o")}</span><span><strong className="block leading-none">{__msg("layout.onlyme")}</strong><small className="text-xs text-slate-400">{__msg("layouts.adminConsole")}</small></span></Link>
          <button className="rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)} type="button"><FiX /></button>
        </div>
        <nav className="admin-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {visibleNavigation.map((section) => <section key={section.title}><p dir="auto" className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{section.title}</p>{section.links.map((item) => <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`} key={item.to} onClick={() => setOpen(false)} to={item.to}><item.icon className="text-lg" /><span>{item.label}</span></NavLink>)}</section>)}
          <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{__msg("layouts.account")}</p>
          <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`} to="/admin/profile"><FiSettings className="text-lg" />{__msg("layouts.profileSettings")}</NavLink>
          <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`} to="/admin/security"><FiShield className="text-lg" />Security &amp; 2FA</NavLink>
          <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" to="/"><FiActivity className="text-lg" />{__msg("layouts.viewPlatform")}</Link>
        </nav>
        <div className="border-t border-slate-100 p-3"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={logout} type="button"><FiLogOut className="text-lg" />{__msg("layouts.logOut")}</button></div>
      </aside>
      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3"><button aria-label={__msg("layouts.openAdminNavigation")} className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)} type="button"><FiMenu /></button><div><p className="text-sm font-bold">{activeItem?.label || __msg("layouts.administration")}</p><p className="hidden text-xs text-slate-400 sm:block">{__msg("layouts.onlymeAdminConsole")}</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden text-end sm:block"><p dir="auto" className="text-sm font-semibold">{user?.name}</p><p className="text-xs capitalize text-slate-400">{adminRole.replace("_", " ").toLowerCase()}</p></div><span className="grid h-9 w-9 overflow-hidden rounded-full bg-slate-900 text-sm font-bold text-white">{user?.avatar ? <img alt={user.name} className="h-full w-full object-cover" src={resolveMediaUrl(user.avatar)} /> : <span className="grid place-items-center">{user?.name?.slice(0, 1)}</span>}</span></div>
        </header>
        <main className="admin-main relative min-h-[calc(100vh-4rem)] p-4 sm:p-6 xl:p-8"><CenterRefreshOverlay light /><Suspense fallback={<CenterRouteLoading light />}><Outlet /></Suspense></main>
      </div>
    </div>
  );
}

export default AdminLayout;


