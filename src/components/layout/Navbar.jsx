import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import Button from "../common/Button";
import { NAV_LINKS } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";
import { resolveMediaUrl } from "../../utils/media";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const dashboardPath = user?.role === "creator" ? "/creator/studio" : user?.role === "admin" ? "/admin/dashboard" : "/fan/dashboard";
  const profilePath = user?.role === "fan" ? "/fan/profile" : "/settings/profile";

  const closeMobile = () => setMobileOpen(false);
  const logoutAndClose = async () => {
    await logout();
    closeMobile();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link className="text-xl font-black uppercase tracking-[0.28em]" to="/">
          OnlyMe
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) => (isActive ? "text-brand-secondary" : "text-brand-mist/80")}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link className="flex items-center gap-3 text-sm font-semibold text-brand-secondary" to={profilePath}>
                <span className="h-9 w-9 overflow-hidden rounded-full bg-white/10">
                  {user.avatar ? (
                    <img alt="" className="h-full w-full object-cover" src={resolveMediaUrl(user.avatar)} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs uppercase">{user.name?.slice(0, 1)}</span>
                  )}
                </span>
                <span className="hidden max-w-32 truncate lg:inline">{user.name || user.username}</span>
              </Link>
              <Link className="text-sm font-semibold capitalize text-brand-secondary" to={dashboardPath}>{user.role} dashboard</Link>
              <Button onClick={logout} variant="ghost">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button>Join Now</Button>
              </Link>
            </>
          )}
        </div>
        <button
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="rounded-full border border-white/10 p-2 md:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
        >
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
      {mobileOpen ? (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2 py-3">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold ${isActive ? "bg-brand-primary text-white" : "bg-white/5 text-brand-mist/80"}`
                }
                onClick={closeMobile}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mx-auto grid max-w-7xl gap-2">
            {user ? (
              <>
                <Link className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold text-brand-secondary" onClick={closeMobile} to={profilePath}>
                  {user.name || user.username}
                </Link>
                <Link className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold capitalize text-brand-secondary" onClick={closeMobile} to={dashboardPath}>
                  {user.role} dashboard
                </Link>
                <Button onClick={logoutAndClose} variant="ghost">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link onClick={closeMobile} to="/login">
                  <Button className="w-full" variant="ghost">Sign in</Button>
                </Link>
                <Link onClick={closeMobile} to="/register">
                  <Button className="w-full">Join Now</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
