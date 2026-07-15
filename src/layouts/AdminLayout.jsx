import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { FiActivity, FiFileText, FiHome, FiLogOut, FiMenu, FiSettings, FiShield, FiStar, FiUsers, FiX } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { resolveMediaUrl } from "../utils/media";

const links = [
  { label: "Overview", to: "/admin/dashboard", icon: FiHome },
  { label: "Fans", to: "/admin/fans", icon: FiUsers },
  { label: "Creators", to: "/admin/creators", icon: FiStar },
  { label: "Creator verifications", to: "/admin/creator-verifications", icon: FiShield },
  { label: "Moderation", to: "/admin/moderation", icon: FiFileText },
];

function AdminLayout() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} type="button" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link className="flex items-center gap-3" to="/admin/dashboard"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-black text-white">O</span><span><strong className="block leading-none">OnlyMe</strong><small className="text-xs text-slate-400">Admin console</small></span></Link>
          <button className="rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setOpen(false)} type="button"><FiX /></button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          {links.map((item) => <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`} key={item.to} onClick={() => setOpen(false)} to={item.to}><item.icon className="text-lg" />{item.label}</NavLink>)}
          <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Account</p>
          <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`} to="/admin/profile"><FiSettings className="text-lg" />Profile settings</NavLink>
          <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50" to="/"><FiActivity className="text-lg" />View platform</Link>
        </nav>
        <div className="border-t border-slate-100 p-3"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={logout} type="button"><FiLogOut className="text-lg" />Log out</button></div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3"><button className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)} type="button"><FiMenu /></button><div><p className="text-sm font-bold">Administration</p><p className="hidden text-xs text-slate-400 sm:block">Manage your platform from one place</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-400">Administrator</p></div><span className="grid h-9 w-9 overflow-hidden rounded-full bg-slate-900 text-sm font-bold text-white">{user?.avatar ? <img alt={user.name} className="h-full w-full object-cover" src={resolveMediaUrl(user.avatar)} /> : <span className="grid place-items-center">{user?.name?.slice(0, 1)}</span>}</span></div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 xl:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export default AdminLayout;


