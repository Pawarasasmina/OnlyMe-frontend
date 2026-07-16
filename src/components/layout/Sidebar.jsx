import { NavLink } from "react-router-dom";

function Sidebar({ links }) {
  return (
    <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-3 md:sticky md:top-24">
      <nav className="grid gap-2 sm:grid-cols-2 md:block md:space-y-2" aria-label="Dashboard navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive ? "bg-brand-primary text-white" : "text-brand-mist/80 hover:bg-white/10"
              }`
            }
            to={link.to}
          >
            {link.icon ? <link.icon className="shrink-0" /> : null}
            <span className="truncate">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
