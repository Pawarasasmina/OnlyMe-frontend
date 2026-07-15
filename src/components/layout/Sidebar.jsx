import { NavLink } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

function Sidebar({ links }) {
  const { user } = useAuth();
  return <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
    <nav className="space-y-2">
      {links.map((link) => {
        const locked = link.requiresApproval && user?.creatorApprovalStatus !== "approved";
        if (locked) return <div className="flex cursor-not-allowed items-center justify-between rounded-2xl px-4 py-3 text-sm text-brand-mist/35" key={link.to} title="Creator verification approval is required."><span>{link.label}</span><FiLock aria-label="Creator verification approval is required" /></div>;
        return <NavLink key={link.to} className={({ isActive }) => `block rounded-2xl px-4 py-3 text-sm transition ${isActive ? "bg-brand-primary text-white" : "text-brand-mist/80 hover:bg-white/10"}`} to={link.to}>{link.label}</NavLink>;
      })}
    </nav>
  </aside>;
}

export default Sidebar;
