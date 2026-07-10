import { NavLink } from "react-router-dom";

function Sidebar({ links }) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-3 text-sm transition ${isActive ? "bg-brand-primary text-white" : "text-brand-mist/80 hover:bg-white/10"}`
            }
            to={link.to}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
