import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { FiActivity, FiAlertTriangle, FiBarChart2, FiCreditCard, FiFileText, FiGift, FiHome, FiLogOut, FiMail, FiMenu, FiSettings, FiShield, FiStar, FiUsers, FiX } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { resolveMediaUrl } from "../utils/media";

const navigation = [
  { title: "Overview", links: [{ label: "Dashboard", to: "/admin/dashboard", icon: FiHome }, { label: "Analytics", to: "/admin/analytics", icon: FiBarChart2 }] },
  { title: "People", links: [{ label: "Fans", to: "/admin/fans", icon: FiUsers }, { label: "Creators", to: "/admin/creators", icon: FiStar }, { label: "Creator applications", to: "/admin/creator-verifications", icon: FiShield }, { label: "Verified creators", to: "/admin/verified-creators", icon: FiStar }] },
  { title: "Trust & safety", links: [{ label: "Message reports", to: "/admin/message-reports", icon: FiAlertTriangle }, { label: "User reports", to: "/admin/user-reports", icon: FiAlertTriangle }, { label: "Post reports", to: "/admin/post-reports", icon: FiFileText }] },
  { title: "Commerce", links: [{ label: "Financial operations", to: "/admin/financial", icon: FiCreditCard }, { label: "Gift catalog", to: "/admin/gifts", icon: FiGift }] },
  { title: "Communication", links: [{ label: "Welcome email", to: "/admin/welcome-email", icon: FiMail }] },
];

function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const activeItem = navigation.flatMap((section) => section.links).find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  return (
    <div className="admin-shell min-h-screen bg-slate-100 text-slate-900">
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} type="button" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link className="flex items-center gap-3" to="/admin/dashboard"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-black text-white">O</span><span><strong className="block leading-none">OnlyMe</strong><small className="text-xs text-slate-400">Admin console</small></span></Link>
          <button className="rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)} type="button"><FiX /></button>
        </div>
        <nav className="admin-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {navigation.map((section) => <section key={section.title}><p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{section.title}</p>{section.links.map((item) => <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`} key={item.to} onClick={() => setOpen(false)} to={item.to}><item.icon className="text-lg" /><span>{item.label}</span></NavLink>)}</section>)}
          <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Account</p>
          <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`} to="/admin/profile"><FiSettings className="text-lg" />Profile settings</NavLink>
          <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" to="/"><FiActivity className="text-lg" />View platform</Link>
        </nav>
        <div className="border-t border-slate-100 p-3"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={logout} type="button"><FiLogOut className="text-lg" />Log out</button></div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3"><button aria-label="Open admin navigation" className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)} type="button"><FiMenu /></button><div><p className="text-sm font-bold">{activeItem?.label || "Administration"}</p><p className="hidden text-xs text-slate-400 sm:block">OnlyMe admin console</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-400">Administrator</p></div><span className="grid h-9 w-9 overflow-hidden rounded-full bg-slate-900 text-sm font-bold text-white">{user?.avatar ? <img alt={user.name} className="h-full w-full object-cover" src={resolveMediaUrl(user.avatar)} /> : <span className="grid place-items-center">{user?.name?.slice(0, 1)}</span>}</span></div>
        </header>
        <main className="admin-main min-h-[calc(100vh-4rem)] p-4 sm:p-6 xl:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export default AdminLayout;


